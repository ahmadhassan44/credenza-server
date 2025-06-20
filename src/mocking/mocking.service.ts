import { Injectable, NotFoundException } from '@nestjs/common';
import { Metric } from 'generated/prisma';
import { CATEGORY_TAGS } from 'src/commons/content-category-tags';
import { CreditScoringService } from 'src/credit-scoring/credit-scoring.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MockingService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly creditScoringService: CreditScoringService,
  ) {}
  async genrateCreatorMockData(creatorId: string) {
    const creator = await this.prismaService.creator.findUnique({
      where: {
        userId: creatorId,
      },
    });
    const contentCategory = creator!.contentCategory;
    const contentTags = this.getRandomElements(CATEGORY_TAGS[contentCategory]);
  }

  private getRandomElements(array: string[]): string[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(3, shuffled.length));
  }
  async generateDummyMetrics(
    creatorId: string,
    forPeriod: Date,
    platformType: string,
    platformId: string = '',
    metricsQuality: string = 'NORMAL', // Default to NORMAL if not provided
  ): Promise<Metric> {
    // Get the creator with all relevant profile data
    const creator = await this.prismaService.creator.findUnique({
      where: { id: creatorId },
      include: {
        geographicLocation: true,
        platforms: {
          where: { type: platformType },
        },
      },
    });

    if (!creator) {
      throw new NotFoundException(`Creator with ID ${creatorId} not found`);
    }

    // Find the specific platform record to link metrics to
    const platform = creator.platforms.find(
      (platform) => platform.id === platformId,
    );
    if (!platform) {
      throw new Error(
        `No ${platformType} platform found for creator ${creatorId}`,
      );
    }

    // Calculate base metrics based on creator's profile
    const baseMetrics = this.calculateBaseMetrics(creator);

    // Apply platform-specific adjustments
    const platformMultiplier = this.getPlatformMultiplier(platformType);

    // Apply seasonal factors based on month
    const seasonalFactor = this.getSeasonalFactor(forPeriod);

    // Add lifecycle stage factor
    const lifecycleFactor = this.getLifecycleFactor(creator.lifecycleStage);

    // Apply quality multiplier based on requested metrics quality
    const qualityMultiplier = this.getQualityMultiplier(metricsQuality);

    // Add small random variations for realistic data
    const randomFactor = 0.9 + Math.random() * 0.2; // 0.9 to 1.1

    // Calculate final metrics values with quality factor
    const views = Math.round(
      baseMetrics.views *
        platformMultiplier.views *
        seasonalFactor *
        lifecycleFactor *
        qualityMultiplier.views *
        randomFactor,
    );

    const audienceSize = Math.round(
      baseMetrics.audienceSize *
        platformMultiplier.audienceSize *
        seasonalFactor *
        lifecycleFactor *
        qualityMultiplier.audience,
    );

    const postCount = Math.max(
      1,
      Math.round(
        baseMetrics.postCount *
          platformMultiplier.postCount *
          randomFactor *
          qualityMultiplier.activity,
      ),
    );

    const avgViewDurationSec = Math.round(
      baseMetrics.avgViewDuration *
        platformMultiplier.avgViewDuration *
        randomFactor *
        qualityMultiplier.engagement,
    );

    // Calculate engagement rate based on quality
    const engagementRatePct = this.calculateEngagementRate(
      platformType,
      qualityMultiplier.engagement,
    );

    // Calculate estimated revenue based on views, engagement and quality
    const estimatedRevenueUsd = this.calculateEstimatedRevenue(
      views,
      platformType,
      qualityMultiplier.revenue,
      creator.geographicLocation?.averageCpmUsd,
    );

    // Calculate revenue breakdowns based on platform type
    const { adRevenue, otherRevenue } = this.calculateRevenueBreakdown(
      estimatedRevenueUsd,
      platformType,
    );

    // Create the metric record
    const metric = await this.prismaService.metric.create({
      data: {
        creatorId,
        platformId: platform.id,
        date: forPeriod,
        views,
        audienceSize,
        postCount,
        avgViewDurationSec,
        engagementRatePct,
        estimatedRevenueUsd,
        adRevenueUsd: adRevenue,
        otherRevenueUsd: otherRevenue,
      },
    });
    await this.creditScoringService.generateCreatorScore(creatorId);
    return metric;
  }

  // Helper methods for metric calculations

  private calculateBaseMetrics(creator: any): any {
    // Default base metrics
    const baseMetrics = {
      views: 5000,
      audienceSize: 10000,
      postCount: 8,
      avgViewDuration: 180, // seconds
    };

    // Content category multipliers
    const categoryMultipliers = {
      COMPUTER_SCIENCE_TECH: { views: 1.3, audienceSize: 1.2 },
      GAMING_INTERACTIVE: { views: 1.5, audienceSize: 1.4 },
      ENTERTAINMENT_MEDIA: { views: 1.4, audienceSize: 1.5 },
      BUSINESS_FINANCE: { views: 0.9, audienceSize: 0.8 },
      LIFESTYLE_PERSONAL: { views: 1.1, audienceSize: 1.3 },
      MUSIC_AUDIO: { views: 1.2, audienceSize: 1.2 },
      HEALTH_WELLNESS: { views: 0.9, audienceSize: 1.0 },
      ARTS_CREATIVITY: { views: 1.0, audienceSize: 1.1 },
      KNOWLEDGE_LEARNING: { views: 0.8, audienceSize: 0.7 },
      SOCIETY_CULTURE: { views: 0.7, audienceSize: 0.8 },
    };

    // Apply category multipliers
    const category = creator.contentCategory || 'ENTERTAINMENT_MEDIA';
    const categoryMultiplier = categoryMultipliers[category] || {
      views: 1.0,
      audienceSize: 1.0,
    };

    baseMetrics.views *= categoryMultiplier.views;
    baseMetrics.audienceSize *= categoryMultiplier.audienceSize;

    // Apply location-based adjustments if available
    if (creator.geographicLocation) {
      // Region-specific audience multipliers
      const regionMultipliers = {
        US: 1.3,
        CA: 1.2,
        UK: 1.2,
        AU: 1.1,
        IN: 1.5, // Large audience potential
        BR: 1.3,
        DE: 1.1,
        FR: 1.0,
        JP: 1.0,
        KR: 1.1,
      };

      const region = creator.geographicLocation.countryCode || 'US';
      const regionMultiplier = regionMultipliers[region] || 1.0;

      baseMetrics.audienceSize *= regionMultiplier;
    }

    return baseMetrics;
  }

  private getPlatformMultiplier(platformType: string): any {
    // Different platforms have different metrics patterns
    const platformMultipliers = {
      YOUTUBE: {
        views: 1.0,
        audienceSize: 1.0,
        postCount: 0.7, // Fewer but higher quality posts
        avgViewDuration: 2.0, // Longest view duration
      },
      TIKTOK: {
        views: 2.5, // Highest views
        audienceSize: 1.8,
        postCount: 2.5, // Many short posts
        avgViewDuration: 0.4, // Very short duration
      },
      INSTAGRAM: {
        views: 1.3,
        audienceSize: 1.5,
        postCount: 1.8,
        avgViewDuration: 0.6,
      },
      PATREON: {
        views: 0.4, // Lower views
        audienceSize: 0.3, // Smaller but dedicated audience
        postCount: 1.0,
        avgViewDuration: 1.5, // Good engagement time
      },
      TWITCH: {
        views: 0.7,
        audienceSize: 0.6,
        postCount: 0.4, // Fewer streams
        avgViewDuration: 3.0, // Longest viewing sessions
      },
      SUBSTACK: {
        views: 0.5,
        audienceSize: 0.4,
        postCount: 0.6, // Weekly content typically
        avgViewDuration: 2.0, // Long-form reading
      },
    };

    return (
      platformMultipliers[platformType] || {
        views: 1.0,
        audienceSize: 1.0,
        postCount: 1.0,
        avgViewDuration: 1.0,
      }
    );
  }

  private getSeasonalFactor(date: Date): number {
    const month = date.getMonth();

    // Seasonal factors - Q4 is strongest, summer is weakest for most content
    const seasonalFactors = [
      1.1, // January - New year boost
      0.9, // February
      0.95, // March
      1.0, // April
      0.95, // May
      0.85, // June - Summer begins, engagement drops
      0.8, // July - Mid summer, lowest engagement
      0.85, // August
      1.1, // September - Back to school/work
      1.15, // October
      1.2, // November - Holiday season begins
      1.3, // December - Peak holiday engagement
    ];

    return seasonalFactors[month] || 1.0;
  }

  private getLifecycleFactor(lifecycleStage: string): number {
    // Different lifecycle stages have different baseline metrics
    const lifecycleFactors = {
      NEW: 0.4, // Just starting out
      GROWTH: 1.2, // Rapid growth phase
      STABLE: 1.8, // Mature, established creator
      DECLINE: 1.0, // Past peak but still significant
      INACTIVE: 0.5, // Minimal new content
    };

    return lifecycleFactors[lifecycleStage] || 1.0;
  }

  /**
   * Get quality multiplier based on requested metrics quality
   */
  private getQualityMultiplier(quality: string = 'NORMAL'): {
    views: number;
    audience: number;
    engagement: number;
    activity: number;
    revenue: number;
  } {
    switch (quality.toUpperCase()) {
      case 'GOOD':
        return {
          views: 1.5,
          audience: 1.3,
          engagement: 1.7,
          activity: 1.2,
          revenue: 2.0,
        };
      case 'BAD':
        return {
          views: 0.6,
          audience: 0.8,
          engagement: 0.5,
          activity: 0.7,
          revenue: 0.4,
        };
      case 'NORMAL':
      default:
        return {
          views: 1.0,
          audience: 1.0,
          engagement: 1.0,
          activity: 1.0,
          revenue: 1.0,
        };
    }
  }

  /**
   * Calculate engagement rate based on platform type and quality
   */
  private calculateEngagementRate(
    platformType: string,
    engagementFactor: number,
  ): number {
    // Base engagement rates by platform
    const baseEngagementRates = {
      YOUTUBE: 2.5,
      TIKTOK: 5.7,
      INSTAGRAM: 4.2,
      PATREON: 8.5,
      TWITCH: 3.2,
      SUBSTACK: 6.8,
    };

    const baseRate = baseEngagementRates[platformType] || 3.0;

    // Add some randomness
    const randomVariation = 0.7 + Math.random() * 0.6; // 0.7 to 1.3

    // Calculate final rate with one decimal precision
    return parseFloat(
      (baseRate * engagementFactor * randomVariation).toFixed(1),
    );
  }

  /**
   * Calculate estimated revenue based on views and platform
   */
  private calculateEstimatedRevenue(
    views: number,
    platformType: string,
    revenueFactor: number,
    averageCpmUsd?: number,
  ): number {
    // Base CPM rates by platform ($ per 1000 views)
    const baseCpmRates = {
      YOUTUBE: 2.0,
      TIKTOK: 1.0,
      INSTAGRAM: 1.5,
      PATREON: 50.0, // Subscription model - higher effective CPM
      TWITCH: 3.5,
      SUBSTACK: 40.0, // Subscription model
    };

    // Use geographic CPM if available, otherwise use platform default
    const baseCpm = averageCpmUsd || baseCpmRates[platformType] || 2.0;

    // Calculate revenue with random variation
    const randomVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

    // Calculate revenue based on views/1000 * CPM * quality factor
    const revenue = (views / 1000) * baseCpm * revenueFactor * randomVariation;

    // Return with 2 decimal places for currency
    return parseFloat(revenue.toFixed(2));
  }

  /**
   * Calculate revenue breakdown into ad revenue and other revenue
   */
  private calculateRevenueBreakdown(
    totalRevenue: number,
    platformType: string,
  ): { adRevenue: number; otherRevenue: number } {
    // Default 70% ad revenue, 30% other revenue
    let adRevenue = totalRevenue * 0.7;
    let otherRevenue = totalRevenue * 0.3;

    // Adjust ratios based on platform
    switch (platformType) {
      case 'PATREON':
      case 'SUBSTACK':
        adRevenue = totalRevenue * 0.4;
        otherRevenue = totalRevenue * 0.6;
        break;
      case 'YOUTUBE':
        adRevenue = totalRevenue * 0.8;
        otherRevenue = totalRevenue * 0.2;
        break;
      // TIKTOK and INSTAGRAM have more variable monetization, keep default
      default:
        break;
    }

    // Ensure non-negative revenues
    adRevenue = Math.max(0, adRevenue);
    otherRevenue = Math.max(0, otherRevenue);

    return { adRevenue, otherRevenue };
  }
}
