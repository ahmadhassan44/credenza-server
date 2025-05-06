import { Module } from '@nestjs/common';
import { CreditScoringService } from './credit-scoring.service';
import { CreditScoringController } from './credit-scoring.controller';
import { CreditScoringScheduler } from './credit-scoring.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformModule } from '../platforms/platform.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule, 
    PlatformModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [CreditScoringController],
  providers: [CreditScoringService, CreditScoringScheduler],
  exports: [CreditScoringService],
})
export class CreditScoringModule {}