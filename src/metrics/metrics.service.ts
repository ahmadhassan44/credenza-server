import { Injectable, NotFoundException } from '@nestjs/common';
import { GetPlatfromMetricsDto } from './dtos/get-metrics.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Metric } from 'generated/prisma';
import { MockingService } from 'src/mocking/mocking.service';

@Injectable()
export class MetricsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mockingService: MockingService,
  ) {}
  async getMetrics(getMetricsDto: GetPlatfromMetricsDto) {
    const dateFilter = {};
    if (getMetricsDto.startDate) {
      const startDate = new Date(getMetricsDto.startDate);
      if (!isNaN(startDate.getTime())) {
        dateFilter['gte'] = startDate;
      }
    }
    if (getMetricsDto.endDate) {
      const endDate = new Date(getMetricsDto.endDate);
      if (!isNaN(endDate.getTime())) {
        dateFilter['lte'] = endDate;
      }
    }

    const creator = await this.prismaService.creator.findUnique({
      where: { id: getMetricsDto.creatorId },
    });

    if (!creator) {
      throw new NotFoundException(
        `Creator with ID ${getMetricsDto.creatorId} not found`,
      );
    }

    const allCreatorPlatforms = await this.prismaService.platform.findMany({
      where: { creatorId: getMetricsDto.creatorId },
    });

    if (!allCreatorPlatforms || allCreatorPlatforms.length === 0) {
      throw new NotFoundException(
        `No platforms found for creator with ID ${getMetricsDto.creatorId}`,
      );
    }

    let filteredPlatforms = [...allCreatorPlatforms];

    if (getMetricsDto.platformId) {
      filteredPlatforms = filteredPlatforms.filter(
        (platform) => platform.id === getMetricsDto.platformId,
      );

      if (filteredPlatforms.length === 0) {
        throw new NotFoundException(
          `Platform with ID ${getMetricsDto.platformId} not connected to this creator`,
        );
      }
    } else if (getMetricsDto.platformType) {
      filteredPlatforms = filteredPlatforms.filter(
        (platform) => platform.type === getMetricsDto.platformType,
      );

      if (filteredPlatforms.length === 0) {
        throw new NotFoundException(
          `No platforms with type ${getMetricsDto.platformType} connected to this creator`,
        );
      }
    }

    const platformIds = filteredPlatforms.map((platform) => platform.id);

    const metrics = await this.prismaService.metric.findMany({
      where: {
        creatorId: getMetricsDto.creatorId,
        platformId: { in: platformIds },
      },
    });

    if (metrics.length === 0) {
      throw new NotFoundException(
        `No metrics found for creator with ID ${getMetricsDto.creatorId}`,
      );
    } else {
      return metrics;
    }
  }

  // Helper method to generate metrics for each month in the date range
  private async generateMetricsForDateRange(
    creatorId: string,
    startDate: Date,
    endDate: Date,
    platformType: string,
  ): Promise<Metric[]> {
    const result: Metric[] = [];
    const currentDate = new Date(startDate);

    // Generate metrics for each month in the range
    while (currentDate <= endDate) {
      const metric = await this.mockingService.generateDummyMetrics(
        creatorId,
        new Date(currentDate),
        platformType,
      );
      result.push(metric);

      // Move to the next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Helper method to identify and fill missing months in the data
  private async fillMissingMonths(
    existingMetrics: Metric[],
    creatorId: string,
    startDate: Date,
    endDate: Date,
    platformType: string,
  ): Promise<Metric[]> {
    // Create a map of existing metrics by month for easy lookup
    const metricsMap = new Map<string, Metric>();
    existingMetrics.forEach((metric) => {
      const key = `${metric.date.getFullYear()}-${metric.date.getMonth()}`;
      metricsMap.set(key, metric);
    });

    // Generate metrics for each missing month
    const currentDate = new Date(startDate);
    const result = [...existingMetrics];

    while (currentDate <= endDate) {
      const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;

      if (!metricsMap.has(key)) {
        // This month is missing, generate data for it
        const metric = await this.mockingService.generateDummyMetrics(
          creatorId,
          new Date(currentDate),
          platformType,
        );
        result.push(metric);
      }

      // Move to the next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Return sorted by date
    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
