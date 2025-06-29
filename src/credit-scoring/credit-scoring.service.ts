import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { platform } from 'os';

// Define meaningful types for better code clarity
interface ScoringFactor {
  factor: string;
  score: number;
  weight: number;
  description?: string;
}

interface PlatformScoreData {
  platformId: string;
  platformType: string;
  platformHandle?: string;
  score: number;
  factors: ScoringFactor[];
}

export interface CreditScore {
  creatorId: string;
  overallScore: number;
  platformScores: PlatformScoreData[];
  timestamp: Date;
}

@Injectable()
export class CreditScoringService {
  private readonly logger = new Logger(CreditScoringService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate credit scores for a creator based on monthly metrics
   * This generates separate credit scores for each month with available metrics
   */
  async generateCreatorScore(creatorId: string): Promise<CreditScore[]> {
    this.logger.log(
      `Generating monthly credit scores for creator ${creatorId}`,
    );

    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      include: {
        platforms: true,
      },
    });

    if (!creator) {
      throw new Error(`Creator with ID ${creatorId} not found`);
    }

    // Get metrics for the past 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const metrics = await this.prisma.metric.findMany({
      where: {
        creatorId: creator.id,
        date: { gte: twelveMonthsAgo },
      },
      orderBy: { date: 'desc' },
    });

    if (!metrics || metrics.length === 0) {
      throw new NotFoundException(`No metrics found for creator ${creatorId}`);
    }

    // Group metrics by month
    const metricsByMonth = this.groupMetricsByMonth(metrics);

    // Get existing credit scores to avoid duplicates
    const existingScores = await this.prisma.creditScore.findMany({
      where: { creatorId },
      orderBy: { timestamp: 'desc' },
    });

    // Create a map of existing scores by month for quick lookup
    const existingScoresByMonth = new Map<string, boolean>();
    existingScores.forEach((score) => {
      const date = new Date(score.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      existingScoresByMonth.set(monthKey, true);
    });

    // Generate a credit score for each month
    const monthlyScores: CreditScore[] = [];

    for (const [monthKey, monthlyMetrics] of Object.entries(metricsByMonth)) {
      // Skip if we already have a score for this month
      if (existingScoresByMonth.has(monthKey)) {
        this.logger.debug(`Skipping existing score for month ${monthKey}`);
        continue;
      }

      // Extract date from month key (format: YYYY-MM)
      const [year, month] = monthKey.split('-').map((num) => parseInt(num));
      const scoreDate = new Date(year, month - 1); // JS months are 0-indexed

      // Group the month's metrics by platform
      const metricsByPlatform = this.groupMetricsByPlatform(monthlyMetrics);

      // Score each platform for this month
      const platformScores: PlatformScoreData[] = [];

      for (const platform of creator.platforms) {
        const platformMetrics = metricsByPlatform[platform.id] || [];
        if (platformMetrics.length > 0) {
          const score = await this.scorePlatform(platform, platformMetrics);
          platformScores.push(score);
        }
      }

      if (platformScores.length > 0) {
        // Calculate overall score for this month
        const overallScore = this.calculateOverallScore(platformScores);

        // Create and store the monthly credit score
        const creditScore = await this.prisma.creditScore.create({
          data: {
            score: overallScore,
            creator: { connect: { id: creatorId } },
            timestamp: scoreDate,
            platformScores: {
              create: platformScores.map((ps) => ({
                platformId: ps.platformId,
                platformType: ps.platformType,
                score: ps.score,
                factors: JSON.stringify(ps.factors),
              })),
            },
          },
          include: {
            platformScores: true,
          },
        });

        monthlyScores.push({
          creatorId,
          overallScore,
          platformScores,
          timestamp: creditScore.timestamp,
        });
      }
    }

    // Merge new scores with existing ones for a complete history
    const allScores = await this.getCreatorScoreHistory(creatorId);

    return allScores.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  /**
   * Group metrics by month (format: YYYY-MM)
   */
  private groupMetricsByMonth(metrics: any[]): Record<string, any[]> {
    return metrics.reduce((acc, metric) => {
      const date = new Date(metric.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(metric);
      return acc;
    }, {});
  }

  /**
   * Get creator's latest aggregated credit score
   * This aggregates the most recent months into a single score
   */
  async getCreatorLatestScore(creatorId: string): Promise<CreditScore | null> {
    // First check if there are any scores
    const scores = await this.prisma.creditScore.findMany({
      where: { creatorId },
      orderBy: { timestamp: 'desc' },
      take: 3, // Get the most recent 3 months for aggregation
      include: {
        platformScores: true,
      },
    });

    if (!scores || scores.length === 0) return null;

    // Calculate the average score for the recent months
    const overallScore = Math.round(
      scores.reduce((sum, score) => sum + score.score, 0) / scores.length,
    );

    // Aggregate platform scores
    const platformScoresMap = new Map<
      string,
      {
        platformId: string;
        platformType: string;
        platformHandle: string;
        scores: number[];
        allFactors: any[];
      }
    >();

    // Collect all platform scores
    scores.forEach((score) => {
      score.platformScores.forEach((ps) => {
        const key = ps.platformId;
        if (!platformScoresMap.has(key)) {
          platformScoresMap.set(key, {
            platformId: ps.platformId,
            platformType: ps.platformType,
            platformHandle: ps.platformHandle,
            scores: [],
            allFactors: [],
          });
        }

        const platformData = platformScoresMap.get(key);
        if (platformData) {
          platformData.scores.push(ps.score);
          platformData.allFactors.push(JSON.parse(ps.factors as string));
        }
      });
    });

    // Calculate aggregated platform scores
    const aggregatedPlatformScores: PlatformScoreData[] = [];

    platformScoresMap.forEach((data) => {
      const avgScore = Math.round(
        data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
      );

      // Aggregate factors (latest month's factors are kept for simplicity)
      const factors = data.allFactors[0];

      aggregatedPlatformScores.push({
        platformId: data.platformId,
        platformType: data.platformType,
        platformHandle: data.platformHandle,
        score: avgScore,
        factors,
      });
    });

    return {
      creatorId,
      overallScore,
      platformScores: aggregatedPlatformScores,
      timestamp: new Date(), // Current time as this is an aggregated view
    };
  }

  /**
   * Get creator's credit score history
   * This returns individual monthly credit scores
   */
  async getCreatorScoreHistory(creatorId: string): Promise<CreditScore[]> {
    const scoreHistory = await this.prisma.creditScore.findMany({
      where: { creatorId },
      orderBy: { timestamp: 'desc' },
      include: {
        platformScores: true,
      },
    });

    if (scoreHistory.length === 0) {
      return [];
    }

    return scoreHistory.map((score) => ({
      creatorId,
      overallScore: score.score,
      platformScores: score.platformScores.map((ps) => ({
        platformId: ps.platformId,
        platformType: ps.platformType,
        platformHandle: ps.platformHandle,
        score: ps.score,
        factors: JSON.parse(ps.factors as string),
      })),
      timestamp: score.timestamp,
    }));
  }

  /**
   * Group metrics by platform ID
   */
  private groupMetricsByPlatform(metrics: any[]): Record<string, any[]> {
    return metrics.reduce((acc, metric) => {
      if (!acc[metric.platformId]) {
        acc[metric.platformId] = [];
      }
      acc[metric.platformId].push(metric);
      return acc;
    }, {});
  }

  /**
   * Score a platform based on its metrics
   */
  private async scorePlatform(
    platform: any,
    metrics: any[],
  ): Promise<PlatformScoreData> {
    const { id, type } = platform;

    // Define scoring factors based on platform type and available metrics
    const factors = this.calculatePlatformFactors(type, metrics);

    // Calculate platform score (weighted average of factor scores)
    const score = this.calculatePlatformScore(factors);

    return {
      platformId: id,
      platformType: type,
      score,
      factors,
    };
  }

  /**
   * Calculate scoring factors for a platform based on metrics
   */
  private calculatePlatformFactors(
    platformType: string,
    metrics: any[],
  ): ScoringFactor[] {
    const factors: ScoringFactor[] = [];

    if (!metrics || metrics.length === 0) {
      return [
        {
          factor: 'Default Score',
          score: 50,
          weight: 1.0,
          description: 'Default score due to insufficient data',
        },
      ];
    }

    // Get most recent metric
    const latestMetric = metrics[0];

    // Calculate trend metrics (if we have enough history)
    const hasHistory = metrics.length > 1;
    const historyMetrics = metrics.slice(0, Math.min(6, metrics.length));

    // Common factors across all platforms

    // 1. Audience Size
    factors.push({
      factor: 'Audience Size',
      score: this.scoreAudienceSize(latestMetric.audienceSize),
      weight: 0.25,
      description: `Based on audience of ${latestMetric.audienceSize}`,
    });

    // 2. Engagement
    factors.push({
      factor: 'Engagement',
      score: this.scoreEngagementRate(latestMetric.engagementRatePct),
      weight: 0.3,
      description: `Based on engagement rate of ${latestMetric.engagementRatePct.toFixed(1)}%`,
    });

    // 3. Income Level
    factors.push({
      factor: 'Income Level',
      score: this.scoreIncomeLevel(latestMetric.estimatedRevenueUsd),
      weight: 0.25,
      description: `Based on monthly revenue of $${latestMetric.estimatedRevenueUsd.toFixed(2)}`,
    });

    // 4. Income Stability (if we have history)
    if (hasHistory) {
      const revenueHistory = historyMetrics.map((m) => m.estimatedRevenueUsd);
      const stabilityScore = this.scoreIncomeStability(revenueHistory);

      factors.push({
        factor: 'Income Stability',
        score: stabilityScore.score,
        weight: 0.2,
        description: stabilityScore.description,
      });
    }

    // Platform-specific additional factors
    switch (platformType) {
      case 'YOUTUBE':
        if (latestMetric.avgViewDurationSec) {
          factors.push({
            factor: 'View Duration',
            score: this.scoreViewDuration(latestMetric.avgViewDurationSec),
            weight: 0.15,
            description: `Based on avg view duration of ${Math.round(latestMetric.avgViewDurationSec / 60)} minutes`,
          });

          // Adjust weights for YouTube
          factors.forEach((f) => {
            if (f.factor === 'Audience Size') f.weight = 0.2;
            if (f.factor === 'Engagement') f.weight = 0.3;
            if (f.factor === 'Income Level') f.weight = 0.2;
            if (f.factor === 'Income Stability') f.weight = 0.15;
          });
        }
        break;

      case 'PATREON':
        // For Patreon, income stability is more important
        factors.forEach((f) => {
          if (f.factor === 'Audience Size') f.weight = 0.15;
          if (f.factor === 'Engagement') f.weight = 0.15;
          if (f.factor === 'Income Level') f.weight = 0.35;
          if (f.factor === 'Income Stability') f.weight = 0.35;
        });
        break;

      case 'INSTAGRAM':
        // For Instagram, engagement is key
        factors.forEach((f) => {
          if (f.factor === 'Audience Size') f.weight = 0.3;
          if (f.factor === 'Engagement') f.weight = 0.5;
          if (f.factor === 'Income Level') f.weight = 0.1;
          if (f.factor === 'Income Stability') f.weight = 0.1;
        });
        break;
    }

    // Normalize weights to ensure they sum to 1.0
    this.normalizeWeights(factors);

    return factors;
  }

  /**
   * Normalize weights to ensure they sum to 1.0
   */
  private normalizeWeights(factors: ScoringFactor[]): void {
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);

    if (totalWeight > 0 && Math.abs(totalWeight - 1.0) > 0.01) {
      factors.forEach((factor) => {
        factor.weight = factor.weight / totalWeight;
      });
    }
  }

  /**
   * Calculate platform score based on factors
   */
  private calculatePlatformScore(factors: ScoringFactor[]): number {
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);

    const weightedScore = factors.reduce(
      (sum, factor) => sum + factor.score * factor.weight,
      0,
    );

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
  }

  /**
   * Calculate overall score based on platform scores
   */
  private calculateOverallScore(platformScores: PlatformScoreData[]): number {
    // Define platform weights based on reliability for credit scoring
    const platformWeights = {
      YOUTUBE: 0.35,
      PATREON: 0.5,
      INSTAGRAM: 0.15,
      // Default for other platforms
      DEFAULT: 0.1,
    };

    let totalWeight = 0;
    let weightedScore = 0;

    platformScores.forEach((ps) => {
      const weight =
        platformWeights[ps.platformType] || platformWeights.DEFAULT;
      totalWeight += weight;
      weightedScore += ps.score * weight;
    });

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
  }

  /**
   * Scoring functions for various metrics
   */
  private scoreAudienceSize(followerCount: number): number {
    // On a scale of 0-100
    if (followerCount >= 1000000) return 100; // 1M+ followers
    if (followerCount >= 500000) return 90;
    if (followerCount >= 100000) return 80;
    if (followerCount >= 50000) return 70;
    if (followerCount >= 10000) return 60;
    if (followerCount >= 5000) return 50;
    if (followerCount >= 1000) return 40;
    if (followerCount >= 500) return 30;
    if (followerCount >= 100) return 20;
    return 10; // <100 followers
  }

  private scoreEngagementRate(rate: number): number {
    // On a scale of 0-100
    if (rate >= 10) return 100; // 10%+ engagement rate is excellent
    if (rate >= 7) return 90;
    if (rate >= 5) return 80;
    if (rate >= 3) return 70;
    if (rate >= 2) return 60;
    if (rate >= 1.5) return 50;
    if (rate >= 1) return 40;
    if (rate >= 0.5) return 30;
    if (rate >= 0.1) return 20;
    return 10; // <0.1% engagement rate
  }

  private scoreIncomeStability(earnings: number[]): {
    score: number;
    description: string;
  } {
    if (earnings.length < 2) {
      return {
        score: 50,
        description: 'Not enough historical data for stability assessment',
      };
    }

    // Calculate coefficient of variation (CV)
    const mean =
      earnings.reduce((sum, value) => sum + value, 0) / earnings.length;
    const sumSquaredDiff = earnings.reduce(
      (sum, value) => sum + Math.pow(value - mean, 2),
      0,
    );
    const standardDeviation = Math.sqrt(sumSquaredDiff / earnings.length);
    const cv = (standardDeviation / mean) * 100;

    // Calculate trend (positive/negative)
    const oldestValue = earnings[earnings.length - 1];
    const newestValue = earnings[0];
    const growthRate = ((newestValue - oldestValue) / oldestValue) * 100;

    let description = '';
    let bonusPoints = 0;

    // Add bonus for growth
    if (growthRate > 0) {
      if (growthRate > 20) {
        description = 'Strong growth trend (+20%)';
        bonusPoints = 10;
      } else if (growthRate > 10) {
        description = 'Moderate growth trend (+10%)';
        bonusPoints = 5;
      } else {
        description = 'Slight growth trend';
        bonusPoints = 2;
      }
    } else if (growthRate < 0) {
      if (growthRate < -20) {
        description = 'Strong declining trend (-20%)';
        bonusPoints = -10;
      } else if (growthRate < -10) {
        description = 'Moderate declining trend (-10%)';
        bonusPoints = -5;
      } else {
        description = 'Slight declining trend';
        bonusPoints = -2;
      }
    } else {
      description = 'Stable income (no change)';
    }

    // Base score on coefficient of variation
    let score = 0;
    if (cv < 5)
      score = 100; // Extremely stable
    else if (cv < 10) score = 90;
    else if (cv < 15) score = 80;
    else if (cv < 20) score = 70;
    else if (cv < 30) score = 60;
    else if (cv < 40) score = 50;
    else if (cv < 50) score = 40;
    else if (cv < 60) score = 30;
    else if (cv < 80) score = 20;
    else score = 10; // Very unstable

    // Apply growth/decline bonus (capped at 0-100)
    score = Math.min(100, Math.max(0, score + bonusPoints));

    description += ` (CV: ${cv.toFixed(1)}%)`;

    return { score, description };
  }

  private scoreIncomeLevel(monthlyIncome: number): number {
    // On a scale of 0-100
    if (monthlyIncome >= 20000) return 100; // $20K+/month
    if (monthlyIncome >= 10000) return 90;
    if (monthlyIncome >= 5000) return 80;
    if (monthlyIncome >= 3000) return 70;
    if (monthlyIncome >= 2000) return 60;
    if (monthlyIncome >= 1000) return 50;
    if (monthlyIncome >= 500) return 40;
    if (monthlyIncome >= 250) return 30;
    if (monthlyIncome >= 100) return 20;
    return 10; // <$100/month
  }

  private scoreViewDuration(avgDurationSec: number): number {
    const durationMin = avgDurationSec / 60;

    // On a scale of 0-100
    if (durationMin >= 15) return 100; // 15+ minutes
    if (durationMin >= 10) return 90;
    if (durationMin >= 5) return 80;
    if (durationMin >= 3) return 70;
    if (durationMin >= 2) return 60;
    if (durationMin >= 1) return 50;
    if (durationMin >= 0.5) return 40;
    if (durationMin >= 0.1) return 20;
    return 10; // <6 seconds
  }
}
