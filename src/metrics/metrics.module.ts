import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MockingService } from 'src/mocking/mocking.service';
import { MockingModule } from 'src/mocking/mocking.module';

@Module({
  imports: [MockingModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
