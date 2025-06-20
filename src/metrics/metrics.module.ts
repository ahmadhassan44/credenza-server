import { forwardRef, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MockingModule } from 'src/mocking/mocking.module';

@Module({
  imports: [forwardRef(() => MockingModule)],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
