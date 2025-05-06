import { Test, TestingModule } from '@nestjs/testing';
import { CreditScoringService } from './credit-scoring.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformService } from '../platforms/platform.service';
import { Logger } from '@nestjs/common';

describe('CreditScoringService', () => {
  let service: CreditScoringService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditScoringService,
        {
          provide: PrismaService,
          useValue: {
            creator: {
              findUnique: jest.fn(),
            },
            creditScore: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: PlatformService,
          useValue: {
            getAllActivePlatforms: jest.fn(),
            refreshMetrics: jest.fn(),
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

    service = module.get<CreditScoringService>(CreditScoringService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCreatorScore', () => {
    it('should generate a credit score for a creator', async () => {
      // Mock creator data
      const mockCreator = {
        id: 'creator-id',
        name: 'Test Creator',
        platforms: [
          {
            id: 'platform-id-1',
            type: 'YOUTUBE',
            metrics: [
              { type: 'FOLLOWERS', value: 10000, timestamp: new Date() },
              { type: 'VIEWS', value: 500000, timestamp: new Date() },
              { type: 'EARNINGS', value: 5000, timestamp: new Date() },
            ],
          },
          {
            id: 'platform-id-2',
            type: 'PATREON',
            metrics: [
              { type: 'FOLLOWERS', value: 500, timestamp: new Date() },
              { type: 'EARNINGS', value: 2500, timestamp: new Date() },
            ],
          },
        ],
      };

      // Mock the creditScore create response
      const mockCreditScore = {
        id: 'credit-score-id',
        creatorId: 'creator-id',
        score: 75,
        timestamp: new Date(),
      };

      // Set up mocks
      (prisma.creator.findUnique as jest.Mock).mockResolvedValue(mockCreator);
      (prisma.creditScore.create as jest.Mock).mockResolvedValue(mockCreditScore);

      // Call the method
      const result = await service.generateCreatorScore('creator-id');

      // Verify the result
      expect(result).toBeDefined();
      expect(result.creatorId).toBe('creator-id');
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.platformScores.length).toBe(2);
      expect(prisma.creator.findUnique).toHaveBeenCalledWith({
        where: { id: 'creator-id' },
        include: { platforms: { include: { metrics: true } } },
      });
      expect(prisma.creditScore.create).toHaveBeenCalled();
    });

    it('should throw an error when creator is not found', async () => {
      // Mock creator not found
      (prisma.creator.findUnique as jest.Mock).mockResolvedValue(null);

      // Verify the error
      await expect(service.generateCreatorScore('non-existent-id')).rejects.toThrow(
        'Creator with ID non-existent-id not found',
      );
    });
  });

  describe('getCreatorLatestScore', () => {
    it('should return the latest credit score for a creator', async () => {
      // Mock creditScore findFirst response
      const mockCreditScore = {
        id: 'credit-score-id',
        creatorId: 'creator-id',
        score: 75,
        timestamp: new Date(),
        platformScores: [
          {
            platformId: 'platform-id-1',
            platformType: 'YOUTUBE',
            score: 80,
            factors: [{ factor: 'Audience Size', score: 70, weight: 0.3 }],
          },
        ],
      };

      // Set up mock
      (prisma.creditScore.findFirst as jest.Mock).mockResolvedValue(mockCreditScore);

      // Call the method
      const result = await service.getCreatorLatestScore('creator-id');

      // Verify the result
      expect(result).toBeDefined();
      expect(result.creatorId).toBe('creator-id');
      expect(result.overallScore).toBe(75);
      expect(result.platformScores.length).toBe(1);
      expect(prisma.creditScore.findFirst).toHaveBeenCalledWith({
        where: { creatorId: 'creator-id' },
        orderBy: { timestamp: 'desc' },
        include: { platformScores: true },
      });
    });

    it('should return null when no credit score is found', async () => {
      // Mock no credit score found
      (prisma.creditScore.findFirst as jest.Mock).mockResolvedValue(null);

      // Call the method
      const result = await service.getCreatorLatestScore('creator-id');

      // Verify the result
      expect(result).toBeNull();
    });
  });

  describe('getCreatorScoreHistory', () => {
    it('should return credit score history for a creator', async () => {
      // Mock creditScore findMany response
      const mockCreditScores = [
        {
          id: 'credit-score-id-1',
          creatorId: 'creator-id',
          score: 75,
          timestamp: new Date(),
          platformScores: [
            {
              platformId: 'platform-id-1',
              platformType: 'YOUTUBE',
              score: 80,
              factors: [{ factor: 'Audience Size', score: 70, weight: 0.3 }],
            },
          ],
        },
        {
          id: 'credit-score-id-2',
          creatorId: 'creator-id',
          score: 70,
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          platformScores: [
            {
              platformId: 'platform-id-1',
              platformType: 'YOUTUBE',
              score: 75,
              factors: [{ factor: 'Audience Size', score: 65, weight: 0.3 }],
            },
          ],
        },
      ];

      // Set up mock
      (prisma.creditScore.findMany as jest.Mock).mockResolvedValue(mockCreditScores);

      // Call the method
      const result = await service.getCreatorScoreHistory('creator-id');

      // Verify the result
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].overallScore).toBe(75);
      expect(result[1].overallScore).toBe(70);
      expect(prisma.creditScore.findMany).toHaveBeenCalledWith({
        where: { creatorId: 'creator-id' },
        orderBy: { timestamp: 'desc' },
        include: { platformScores: true },
      });
    });

    it('should return an empty array when no credit score history is found', async () => {
      // Mock no credit score history found
      (prisma.creditScore.findMany as jest.Mock).mockResolvedValue([]);

      // Call the method
      const result = await service.getCreatorScoreHistory('creator-id');

      // Verify the result
      expect(result).toEqual([]);
    });
  });
});