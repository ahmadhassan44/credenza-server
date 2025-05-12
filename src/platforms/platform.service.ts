import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OAuth2Client } from 'google-auth-library';

class PlatformConnectionError extends Error {
  constructor(platform: string, message: string) {
    super(`Failed to connect to ${platform}: ${message}`);
    this.name = 'PlatformConnectionError';
  }
}

@Injectable()
export class PlatformService {
  private readonly youtubeClient: OAuth2Client;
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    // Initialize YouTube OAuth client
    this.youtubeClient = new OAuth2Client(
      this.config.get('youtube.clientId'),
      this.config.get('youtube.clientSecret'),
      'http://localhost:3000/auth/youtube/callback',
    );
  }

  async connectPlatform(type: string, creatorId: string, credentials: any) {
    try {
      let platformData;
      switch (type) {
        case 'YOUTUBE':
          platformData = await this.connectYouTube(credentials.accessToken);
          break;
        case 'PATREON':
          platformData = await this.connectPatreon(credentials.accessToken);
          break;
        case 'INSTAGRAM':
          platformData = await this.connectInstagram(credentials);
          break;
        default:
          throw new Error(`Unsupported platform: ${type}`);
      }

      return await this.storePlatformData(creatorId, type, platformData);
    } catch (error) {
      this.logger.error(`Platform connection failed: ${error.message}`);
      throw new PlatformConnectionError(type, error.message);
    }
  }

  private async connectYouTube(accessToken: string) {
    try {
      this.youtubeClient.setCredentials({ access_token: accessToken });

      // Use YouTube Data API to fetch channel information
      // This is a placeholder that would be implemented with actual API calls
      const channelData = { handle: 'youtube_user', metrics: [] };

      // Get metrics like subscribers, views, etc.
      const subscriberCount = 10000; // Placeholder value
      const viewCount = 1000000; // Placeholder value
      const estimatedRevenue = 5000; // Placeholder value

      return {
        handle: channelData.handle,
        metrics: [
          { type: 'FOLLOWERS', value: subscriberCount },
          { type: 'VIEWS', value: viewCount },
          { type: 'EARNINGS', value: estimatedRevenue },
        ],
      };
    } catch (error) {
      this.logger.error(`YouTube connection failed: ${error.message}`);
      throw error;
    }
  }

  private async connectPatreon(accessToken: string) {
    try {
      // Use Patreon API to fetch creator information
      // This is a placeholder that would be implemented with actual API calls
      const creatorData = { handle: 'patreon_creator', metrics: [] };

      // Get metrics like patrons, pledges, etc.
      const patronCount = 500; // Placeholder value
      const monthlyIncome = 2500; // Placeholder value

      return {
        handle: creatorData.handle,
        metrics: [
          { type: 'FOLLOWERS', value: patronCount },
          { type: 'EARNINGS', value: monthlyIncome },
        ],
      };
    } catch (error) {
      this.logger.error(`Patreon connection failed: ${error.message}`);
      throw error;
    }
  }

  private async connectInstagram(credentials: any) {
    try {
      // Use Instagram Private API to fetch profile information
      // This is a placeholder that would be implemented with actual API calls
      const profileData = { handle: 'instagram_user', metrics: [] };

      // Get metrics like followers, engagement, etc.
      const followerCount = 50000; // Placeholder value
      const engagementRate = 3.5; // Placeholder value

      return {
        handle: profileData.handle,
        metrics: [
          { type: 'FOLLOWERS', value: followerCount },
          { type: 'ENGAGEMENT', value: engagementRate },
        ],
      };
    } catch (error) {
      this.logger.error(`Instagram connection failed: ${error.message}`);
      throw error;
    }
  }

  private async storePlatformData(creatorId: string, type: string, data: any) {
    return this.prisma.platform.create({
      data: {
        type,
        handle: data.handle,
        creator: { connect: { id: creatorId } },
        Metric: {
          create: data.metrics.map((metric: any) => ({
            type: metric.type,
            amount: metric.value, // Replace 'value' with the correct field name from your Prisma schema
          })),
        },
      },
      include: {
        Metric: true,
      },
    });
  }

  async getAllActivePlatforms() {
    return this.prisma.platform.findMany();
  }

  async getPlatformById(id: string) {
    const platform = await this.prisma.platform.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!platform) {
      throw new NotFoundException(`Platform with ID ${id} not found`);
    }

    return platform;
  }

  async refreshMetrics(platformId: string) {
    try {
      const platform = await this.prisma.platform.findUnique({
        where: { id: platformId },
        include: { creator: true },
      });

      if (!platform) {
        throw new Error(`Platform with ID ${platformId} not found`);
      }

      // Re-fetch metrics based on platform type
      let metrics;
      switch (platform.type) {
        case 'YOUTUBE':
          // Fetch refreshed YouTube metrics
          metrics = [
            { type: 'FOLLOWERS', value: 10500 }, // Updated placeholder
            { type: 'VIEWS', value: 1050000 }, // Updated placeholder
            { type: 'EARNINGS', value: 5250 }, // Updated placeholder
          ];
          break;
        case 'PATREON':
          // Fetch refreshed Patreon metrics
          metrics = [
            { type: 'FOLLOWERS', value: 520 }, // Updated placeholder
            { type: 'EARNINGS', value: 2600 }, // Updated placeholder
          ];
          break;
        case 'INSTAGRAM':
          // Fetch refreshed Instagram metrics
          metrics = [
            { type: 'FOLLOWERS', value: 51000 }, // Updated placeholder
            { type: 'ENGAGEMENT', value: 3.6 }, // Updated placeholder
          ];
          break;
        default:
          throw new Error(`Unsupported platform type: ${platform.type}`);
      }

      // Store the new metrics
      // const createdMetrics = await Promise.all(
      //   metrics.map((metric) =>
      //     this.prisma.metric.create({
      //       data: {},
      //     }),
      //   ),
      // );

      return;
    } catch (error) {
      this.logger.error(`Failed to refresh metrics: ${error.message}`);
      throw error;
    }
  }
}
