import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformService } from '../platforms/platform.service';

export interface CreditScore {
  creatorId: string;
  overallScore: number;
  platformScores: {
    platformId: string;
    platformType: string;
    score: number;
    factors: {
      factor: string;
      score: number;
      weight: number;
    }[];
  }[];
  timestamp: Date;
}

@Injectable()
export class CreditScoringService {
  private readonly logger = new Logger(CreditScoringService.name);

  constructor(
    private prisma: PrismaService,
    private platformService: PlatformService,
  ) {}

  /**
   * Generate a credit score for a creator based on their platform metrics
   */
  async generateCreatorScore(creatorId: string): Promise<CreditScore> {
    this.logger.log(`Generating credit score for creator ${creatorId}`);
    
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      include: {
        platforms: {
          include: {
            metrics: true,
          },
        },
      },
    });

    if (!creator) {
      throw new Error(`Creator with ID ${creatorId} not found`);
    }

    // Calculate platform-specific scores
    const platformScores = await Promise.all(
      creator.platforms.map(platform => this.scorePlatform(platform))
    );

    // Calculate overall score (weighted average of platform scores)
    const overallScore = this.calculateOverallScore(platformScores);

    // Create and store the credit score
    const creditScore = await this.prisma.creditScore.create({
      data: {
        score: overallScore,
        creator: { connect: { id: creatorId } },
        platformScores: {
          create: platformScores.map(ps => ({
            platformId: ps.platformId,
            platformType: ps.platformType,
            score: ps.score,
            factors: ps.factors,
          })),
        },
      },
    });

    return {
      creatorId,
      overallScore,
      platformScores,
      timestamp: creditScore.timestamp,
    };
  }

  /**
   * Score a platform based on its metrics
   */
  private async scorePlatform(platform: any): Promise<any> {
    const { id, type, metrics } = platform;
    
    // Group metrics by type for easier processing
    const metricsByType = this.groupMetricsByType(metrics);
    
    // Define scoring factors based on platform type
    const factors = this.getScoringFactors(type, metricsByType);
    
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
   * Group metrics by type
   */
  private groupMetricsByType(metrics: any[]): Record<string, any[]> {
    return metrics.reduce((acc, metric) => {
      if (!acc[metric.type]) {
        acc[metric.type] = [];
      }
      acc[metric.type].push(metric);
      return acc;
    }, {});
  }

  /**
   * Get scoring factors for a platform
   */
  private getScoringFactors(platformType: string, metricsByType: Record<string, any[]>): any[] {
    const factors = [];

    switch (platformType) {
      case 'YOUTUBE':
        // Audience Size: Subscriber count
        if (metricsByType.FOLLOWERS) {
          const followerCount = this.getLatestMetricValue(metricsByType.FOLLOWERS);
          factors.push({
            factor: 'Audience Size',
            score: this.scoreAudienceSize(followerCount),
            weight: 0.3,
          });
        }

        // Engagement: Views per video or view-to-subscriber ratio
        if (metricsByType.VIEWS) {
          const viewCount = this.getLatestMetricValue(metricsByType.VIEWS);
          const followerCount = this.getLatestMetricValue(metricsByType.FOLLOWERS) || 1;
          factors.push({
            factor: 'Engagement',
            score: this.scoreEngagementRatio(viewCount, followerCount),
            weight: 0.25,
          });
        }

        // Income Stability: Consistency in earnings
        if (metricsByType.EARNINGS) {
          const earnings = metricsByType.EARNINGS.map(m => m.value);
          factors.push({
            factor: 'Income Stability',
            score: this.scoreIncomeStability(earnings),
            weight: 0.45,
          });
        }
        break;

      case 'PATREON':
        // Patron Count: Number of supporters
        if (metricsByType.FOLLOWERS) {
          const patronCount = this.getLatestMetricValue(metricsByType.FOLLOWERS);
          factors.push({
            factor: 'Patron Count',
            score: this.scorePatronCount(patronCount),
            weight: 0.35,
          });
        }

        // Income Level: Monthly income
        if (metricsByType.EARNINGS) {
          const monthlyIncome = this.getLatestMetricValue(metricsByType.EARNINGS);
          factors.push({
            factor: 'Income Level',
            score: this.scoreIncomeLevel(monthlyIncome),
            weight: 0.4,
          });
        }

        // Income Stability: Consistency in earnings
        if (metricsByType.EARNINGS) {
          const earnings = metricsByType.EARNINGS.map(m => m.value);
          factors.push({
            factor: 'Income Stability',
            score: this.scoreIncomeStability(earnings),
            weight: 0.25,
          });
        }
        break;

      case 'INSTAGRAM':
        // Audience Size: Follower count
        if (metricsByType.FOLLOWERS) {
          const followerCount = this.getLatestMetricValue(metricsByType.FOLLOWERS);
          factors.push({
            factor: 'Audience Size',
            score: this.scoreAudienceSize(followerCount),
            weight: 0.4,
          });
        }

        // Engagement: Engagement rate
        if (metricsByType.ENGAGEMENT) {
          const engagementRate = this.getLatestMetricValue(metricsByType.ENGAGEMENT);
          factors.push({
            factor: 'Engagement',
            score: this.scoreEngagementRate(engagementRate),
            weight: 0.6,
          });
        }
        break;

      default:
        this.logger.warn(`Unknown platform type: ${platformType}`);
        break;
    }

    // Fill with default factor if no factors were calculated
    if (factors.length === 0) {
      factors.push({
        factor: 'Default Score',
        score: 50, // Neutral score
        weight: 1.0,
      });
    }

    return factors;
  }

  /**
   * Get the most recent metric value
   */
  private getLatestMetricValue(metrics: any[]): number {
    if (!metrics || metrics.length === 0) return 0;
    
    const sortedMetrics = [...metrics].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return sortedMetrics[0].value;
  }

  /**
   * Calculate platform score based on factors
   */
  private calculatePlatformScore(factors: any[]): number {
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    
    const weightedScore = factors.reduce(
      (sum, factor) => sum + (factor.score * factor.weight), 
      0
    );
    
    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
  }

  /**
   * Calculate overall score based on platform scores
   */
  private calculateOverallScore(platformScores: any[]): number {
    // Define platform weights based on reliability for credit scoring
    const platformWeights = {
      YOUTUBE: 0.35,
      PATREON: 0.5,
      INSTAGRAM: 0.15,
    };

    let totalWeight = 0;
    let weightedScore = 0;

    platformScores.forEach(ps => {
      const weight = platformWeights[ps.platformType] || 0.1;
      totalWeight += weight;
      weightedScore += ps.score * weight;
    });

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
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

  private scoreEngagementRatio(viewCount: number, followerCount: number): number {
    const ratio = viewCount / followerCount;
    // On a scale of 0-100
    if (ratio >= 5) return 100; // Very high engagement
    if (ratio >= 2) return 80;
    if (ratio >= 1) return 60;
    if (ratio >= 0.5) return 40;
    if (ratio >= 0.1) return 20;
    return 10; // Very low engagement
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

  private scoreIncomeStability(earnings: number[]): number {
    if (earnings.length < 2) return 50; // Not enough data
    
    // Calculate coefficient of variation (CV)
    const mean = earnings.reduce((sum, value) => sum + value, 0) / earnings.length;
    const sumSquaredDiff = earnings.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0);
    const standardDeviation = Math.sqrt(sumSquaredDiff / earnings.length);
    const cv = (standardDeviation / mean) * 100;
    
    // Lower CV = more stable income = higher score
    if (cv < 5) return 100; // Extremely stable
    if (cv < 10) return 90;
    if (cv < 15) return 80;
    if (cv < 20) return 70;
    if (cv < 30) return 60;
    if (cv < 40) return 50;
    if (cv < 50) return 40;
    if (cv < 60) return 30;
    if (cv < 80) return 20;
    return 10; // Very unstable
  }

  private scorePatronCount(patronCount: number): number {
    // On a scale of 0-100
    if (patronCount >= 5000) return 100; // 5K+ patrons
    if (patronCount >= 2000) return 90;
    if (patronCount >= 1000) return 80;
    if (patronCount >= 500) return 70;
    if (patronCount >= 250) return 60;
    if (patronCount >= 100) return 50;
    if (patronCount >= 50) return 40;
    if (patronCount >= 20) return 30;
    if (patronCount >= 10) return 20;
    return 10; // <10 patrons
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

  /**
   * Get creator's latest credit score
   */
  async getCreatorLatestScore(creatorId: string): Promise<CreditScore | null> {
    const latestScore = await this.prisma.creditScore.findFirst({
      where: { creatorId },
      orderBy: { timestamp: 'desc' },
      include: {
        platformScores: true,
      },
    });

    if (!latestScore) return null;

    return {
      creatorId,
      overallScore: latestScore.score,
      platformScores: latestScore.platformScores.map(ps => ({
        platformId: ps.platformId,
        platformType: ps.platformType,
        score: ps.score,
        factors: ps.factors,
      })),
      timestamp: latestScore.timestamp,
    };
  }

  /**
   * Get creator's credit score history
   */
  async getCreatorScoreHistory(creatorId: string): Promise<CreditScore[]> {
    const scoreHistory = await this.prisma.creditScore.findMany({
      where: { creatorId },
      orderBy: { timestamp: 'desc' },
      include: {
        platformScores: true,
      },
    });

    return scoreHistory.map(score => ({
      creatorId,
      overallScore: score.score,
      platformScores: score.platformScores.map(ps => ({
        platformId: ps.platformId,
        platformType: ps.platformType,
        score: ps.score,
        factors: ps.factors,
      })),
      timestamp: score.timestamp,
    }));
  }
}