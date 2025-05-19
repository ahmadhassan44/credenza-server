import { Module } from '@nestjs/common';
import { MockingService } from './mocking.service';
import { MockingController } from './mocking.controller';
import { CreditScoringModule } from 'src/credit-scoring/credit-scoring.module';

@Module({
  imports: [CreditScoringModule],
  exports: [MockingService],
  providers: [MockingService],
  controllers: [MockingController],
})
export class MockingModule {}
