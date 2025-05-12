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
    //if we have data but not for all the months we generate dummy data for the missing months
  

    //else if we don't we generate dummy data for the creator for the given range and return it
  }
}
