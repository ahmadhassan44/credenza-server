import { Module } from '@nestjs/common';
import { CreditScoringService } from './credit-scoring.service';
import { CreditScoringController } from './credit-scoring.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformModule } from '../platforms/platform.module';
import { MetricsModule } from 'src/metrics/metrics.module';

@Module({
  imports: [PrismaModule, MetricsModule],
  controllers: [CreditScoringController],
  providers: [CreditScoringService],
  exports: [CreditScoringService],
})
export class CreditScoringModule {}
