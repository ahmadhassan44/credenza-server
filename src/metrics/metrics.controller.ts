import { Body, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetPlatfromMetricsDto } from './dtos/get-metrics.dto';

@UseGuards(JwtAuthGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}
  @Get()
  getMetrics(@Query() getMetricsDto: GetPlatfromMetricsDto) {
    return this.metricsService.getMetrics(getMetricsDto);
  }
}
  