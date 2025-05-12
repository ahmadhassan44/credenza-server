import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MockingService } from './mocking.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class MockingController {
  constructor(private readonly mockingService: MockingService) {}

  @Post('mock/metric')
  async getMockingData(
    @Body()
    body: {
      creatorId: string;
      lastXMonths: number;
      platformType: string;
      metricsQuality: string;
    },
  ) {
    const { creatorId, lastXMonths } = body;
    const currDate = new Date(); // Current date reference

    // Create a separate date object for the start date
    const startDate = new Date();
    startDate.setMonth(currDate.getMonth() - lastXMonths);

    // Properly type the metrics array
    let metrics: Awaited<
      ReturnType<typeof this.mockingService.generateDummyMetrics>
    >[] = [];
    const endDate = new Date(currDate); // Create a copy of current date for comparison

    let currentDate = new Date(startDate); // Create a working copy that we'll increment
    while (currentDate <= endDate) {
      metrics.push(
        await this.mockingService.generateDummyMetrics(
          creatorId,
          new Date(currentDate), // Pass a copy of the date
          body.platformType,
          body.metricsQuality,
        ),
      );
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return metrics;
  }
}
