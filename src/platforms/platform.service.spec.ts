import { Test, TestingModule } from '@nestjs/testing';
import { PlatformService } from './platform.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

describe('PlatformService', () => {
  let service: PlatformService;
  let prisma: PrismaService;
  let config: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformService,
        {
          provide: PrismaService,
          useValue: {
            platform: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            metric: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'youtube.clientId') return 'test-client-id';
              if (key === 'youtube.clientSecret') return 'test-client-secret';
              return null;
            }),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlatformService>(PlatformService);
    prisma = module.get<PrismaService>(PrismaService);
    config = module.get<ConfigService>(ConfigService);
  });

  describe('connectPlatform', () => {
    it('should connect to YouTube platform', async () => {
      // Mock the connectYouTube method
      const mockYouTubeData = {
        handle: 'test_youtube_user',
        metrics: [
          { type: 'FOLLOWERS', value: 1000 },
          { type: 'VIEWS', value: 50000 },
        ],
      };
      
      // Mock the internal methods
      jest.spyOn<any, any>(service, 'connectYouTube').mockResolvedValue(mockYouTubeData);
      jest.spyOn<any, any>(service, 'storePlatformData').mockResolvedValue({
        id: 'platform-id',
        type: 'YOUTUBE',
        handle: mockYouTubeData.handle,
        metrics: mockYouTubeData.metrics,
      });

      const result = await service.connectPlatform(
        'YOUTUBE',
        'creator-id',
        { accessToken: 'test-token' }
      );

      expect(result).toEqual({
        id: 'platform-id',
        type: 'YOUTUBE',
        handle: mockYouTubeData.handle,
        metrics: mockYouTubeData.metrics,
      });
      expect(service['connectYouTube']).toHaveBeenCalledWith('test-token');
      expect(service['storePlatformData']).toHaveBeenCalledWith(
        'creator-id',
        'YOUTUBE',
        mockYouTubeData
      );
    });

    it('should connect to Patreon platform', async () => {
      // Mock the connectPatreon method
      const mockPatreonData = {
        handle: 'test_patreon_creator',
        metrics: [
          { type: 'FOLLOWERS', value: 500 },
          { type: 'EARNINGS', value: 2500 },
        ],
      };
      
      // Mock the internal methods
      jest.spyOn<any, any>(service, 'connectPatreon').mockResolvedValue(mockPatreonData);
      jest.spyOn<any, any>(service, 'storePlatformData').mockResolvedValue({
        id: 'platform-id',
        type: 'PATREON',
        handle: mockPatreonData.handle,
        metrics: mockPatreonData.metrics,
      });

      const result = await service.connectPlatform(
        'PATREON',
        'creator-id',
        { accessToken: 'test-token' }
      );

      expect(result).toEqual({
        id: 'platform-id',
        type: 'PATREON',
        handle: mockPatreonData.handle,
        metrics: mockPatreonData.metrics,
      });
      expect(service['connectPatreon']).toHaveBeenCalledWith('test-token');
      expect(service['storePlatformData']).toHaveBeenCalledWith(
        'creator-id',
        'PATREON',
        mockPatreonData
      );
    });

    it('should connect to Instagram platform', async () => {
      // Mock the connectInstagram method
      const mockInstagramData = {
        handle: 'test_instagram_user',
        metrics: [
          { type: 'FOLLOWERS', value: 50000 },
          { type: 'ENGAGEMENT', value: 3.5 },
        ],
      };
      
      // Mock the internal methods
      jest.spyOn<any, any>(service, 'connectInstagram').mockResolvedValue(mockInstagramData);
      jest.spyOn<any, any>(service, 'storePlatformData').mockResolvedValue({
        id: 'platform-id',
        type: 'INSTAGRAM',
        handle: mockInstagramData.handle,
        metrics: mockInstagramData.metrics,
      });

      const result = await service.connectPlatform(
        'INSTAGRAM',
        'creator-id',
        { username: 'test_user', password: 'test_password' }
      );

      expect(result).toEqual({
        id: 'platform-id',
        type: 'INSTAGRAM',
        handle: mockInstagramData.handle,
        metrics: mockInstagramData.metrics,
      });
      expect(service['connectInstagram']).toHaveBeenCalledWith({ 
        username: 'test_user', 
        password: 'test_password' 
      });
      expect(service['storePlatformData']).toHaveBeenCalledWith(
        'creator-id',
        'INSTAGRAM',
        mockInstagramData
      );
    });

    it('should throw error for unsupported platform', async () => {
      await expect(
        service.connectPlatform('UNKNOWN', 'creator-id', {})
      ).rejects.toThrow('Failed to connect to UNKNOWN: Unsupported platform: UNKNOWN');
    });
  });

  describe('refreshMetrics', () => {
    it('should refresh metrics for a YouTube platform', async () => {
      // Mock platform find
      const mockPlatform = {
        id: 'platform-id',
        type: 'YOUTUBE',
        handle: 'youtube_user',
        creatorId: 'creator-id',
        creator: { id: 'creator-id', name: 'Test Creator' },
      };
      
      (prisma.platform.findUnique as jest.Mock).mockResolvedValue(mockPlatform);
      
      // Mock metric creation
      (prisma.metric.create as jest.Mock).mockImplementation(({ data }) => ({
        id: `metric-${Math.random()}`,
        ...data,
      }));

      const result = await service.refreshMetrics('platform-id');
      
      expect(prisma.platform.findUnique).toHaveBeenCalledWith({
        where: { id: 'platform-id' },
        include: { creator: true },
      });
      
      expect(result.length).toBeGreaterThan(0);
      expect(prisma.metric.create).toHaveBeenCalled();
    });

    it('should throw error when platform not found', async () => {
      (prisma.platform.findUnique as jest.Mock).mockResolvedValue(null);
      
      await expect(
        service.refreshMetrics('non-existent-id')
      ).rejects.toThrow('Platform with ID non-existent-id not found');
    });
  });
});