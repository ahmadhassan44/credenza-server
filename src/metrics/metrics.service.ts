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
    // Create date filter
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

    // Check if the creator exists
    const creator = await this.prismaService.creator.findUnique({
      where: { id: getMetricsDto.creatorId },
    });

    if (!creator) {
      throw new NotFoundException(
        `Creator with ID ${getMetricsDto.creatorId} not found`,
      );
    }

    // Build platform filter
    const platformFilter = {};

    // If platformId is provided, filter by specific platform id
    if (getMetricsDto.platformId) {
      platformFilter['id'] = getMetricsDto.platformId;
    }
    // If platformType is provided but not platformId, filter by type
    else if (getMetricsDto.platformType) {
      platformFilter['type'] = getMetricsDto.platformType;
    }

    // Check if the platform exists when specific filters are provided
    if (Object.keys(platformFilter).length > 0) {
      // Create a proper where clause for Prisma
      const whereClause: any = {
        creatorId: getMetricsDto.creatorId,
      };

      // Only add properties that actually exist in platformFilter
      if ('type' in platformFilter) {
        whereClause.type = platformFilter['type'];
      }

      if ('id' in platformFilter) {
        whereClause.id = platformFilter['id'];
      }

      const platformExists = await this.prismaService.platform.findMany({
        where: {
          ...whereClause,
        },
      });

      if (!platformExists || platformExists.length === 0) {
        const filterType = getMetricsDto.platformId ? 'ID' : 'type';
        const filterValue =
          getMetricsDto.platformId || getMetricsDto.platformType;
        throw new NotFoundException(
          `Platform with ${filterType} ${filterValue} not connected to this creator`,
        );
      }
    }

    // Build the query
    const metrics = await this.prismaService.metric.findMany({
      where: {
        creatorId: getMetricsDto.creatorId,
        platformId: getMetricsDto.platformId,
      },
    });

    // If we have no metrics at all or missing months, generate the required data
    if (metrics.length === 0) {
      //   // Generate data for the entire range
      //   const generatedMetrics = await this.generateMetricsForDateRange(
      //     getMetricsDto.creatorId,
      //     getMetricsDto.startDate ||
      //       new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
      //     getMetricsDto.endDate || new Date(),
      //     getMetricsDto.platformType,
      //   );
      //   return generatedMetrics;
      // } else {
      //   // Check for missing months and generate data for them
      //   const completeMetrics = await this.fillMissingMonths(
      //     metrics,
      //     getMetricsDto.creatorId,
      //     getMetricsDto.startDate || new Date(metrics[0].date), // Use earliest date in results if not specified
      //     getMetricsDto.endDate || new Date(),
      //     getMetricsDto.platformType,
      //   );
      //   return completeMetrics;
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
