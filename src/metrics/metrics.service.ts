import { Injectable } from '@nestjs/common';
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
    //first we check if we have dummy data for the creator for the given range if we do we return it

    const metrics = await this.prismaService.metric.findMany({
      where: {
        creatorId: getMetricsDto.creatorId,
        date: {
          gte: getMetricsDto.startDate,
          lte: getMetricsDto.endDate,
        },
        ...(getMetricsDto.platformType && {
          Platform: {
            type: getMetricsDto.platformType,
          },
        }),
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        Platform: true,
      },
    });

    // If we have no metrics at all or missing months, generate the required data
    if (metrics.length === 0) {
      // Generate data for the entire range
      const generatedMetrics = await this.generateMetricsForDateRange(
        getMetricsDto.creatorId,
        getMetricsDto.startDate,
        getMetricsDto.endDate,
        getMetricsDto.platformType,
      );
      return generatedMetrics;
    } else {
      // Check for missing months and generate data for them
      const completeMetrics = await this.fillMissingMonths(
        metrics,
        getMetricsDto.creatorId,
        getMetricsDto.startDate,
        getMetricsDto.endDate,
        getMetricsDto.platformType,
      );
      return completeMetrics;
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
