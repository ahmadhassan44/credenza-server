import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OAuth2Client } from 'google-auth-library';
import { ConnectPlatformDto } from './dtos/connect-platform.dto';
import { CreditScoringService } from 'src/credit-scoring/credit-scoring.service';

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
    private creditScoringService: CreditScoringService,
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
        throw new NotFoundException('Invalid creator ID');
      }
      //check if platform already exists
      const existingPlatform = await this.prisma.platform.findFirst({
        where: {
          type: connectDto.type,
          handle: connectDto.handle,
        },
      });
      if (existingPlatform) {
        throw new ConflictException(
          connectDto.type,
          'Platform already connected',
        );
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
      // Log the error
      this.logger.error(`Platform connection failed: ${error.message}`);

      // Re-throw NestJS exceptions as is
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // Convert other errors to ConflictException
      throw new ConflictException(
        `Failed to connect to ${connectDto.type}: ${error.message}`,
      );
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
  async deletePlatform(id: string, creatorId: string) {
    const platform = await this.prisma.platform.findUnique({
      where: { id },
    });

    if (!platform) {
      throw new NotFoundException(`Platform with ID ${id} not found`);
    }

    if (platform.creatorId !== creatorId) {
      throw new UnauthorizedException(`You can delete only your own platforms`);
    }

    await this.prisma.platform.delete({
      where: { id },
    });
    return {
      success: true,
      message: `Platform with ID ${id} deleted successfully`,
      deletedPlatformId: id,
      platformType: platform.type,
    };
  }
}
