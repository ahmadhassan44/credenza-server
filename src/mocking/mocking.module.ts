import { Module } from '@nestjs/common';
import { MockingService } from './mocking.service';
import { MockingController } from './mocking.controller';

@Module({
  exports: [MockingService],
  providers: [MockingService],
  controllers: [MockingController],
})
export class MockingModule {}
