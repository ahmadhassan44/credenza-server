import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsScheduler } from './metrics.scheduler';
import { PlatformModule } from '../platforms/platform.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PlatformModule,
  ],
  providers: [MetricsScheduler],
  exports: [MetricsScheduler],
})
export class SchedulerModule {}