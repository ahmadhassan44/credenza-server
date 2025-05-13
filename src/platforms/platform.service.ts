import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OAuth2Client } from 'google-auth-library';
import { ConnectPlatformDto } from './dtos/connect-platform.dto';
import { connect } from 'http2';

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

  async connectPlatform(connectDto: ConnectPlatformDto) {
    try {
      //validate creatorId
      const validCreator = await this.prisma.creator.findUnique({
        where: { id: connectDto.creatorId },
      });
      if (!validCreator) {
        throw new Error('Invalid creator ID');
      }
      const platform = await this.prisma.platform.create({
        data: {
          type: connectDto.type,
          handle: connectDto.handle,
          creator: {
            connect: { id: connectDto.creatorId },
          },
        },
      });
      return platform;
    } catch (error) {
      this.logger.error(`Platform connection failed: ${error.message}`);
      throw new PlatformConnectionError(connectDto.type, error.message);
    }
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
  async getAllPlatformsForCreator(creatorId: string) {
    const platforms = await this.prisma.platform.findMany({
      where: { creatorId },
    });

    if (!platforms || platforms.length === 0) {
      throw new NotFoundException(
        `No platforms found for creator with ID ${creatorId}`,
      );
    }

    return platforms;
  }
}
