import { Controller, Get, Param, Post } from '@nestjs/common';
import { MockingService } from './mocking.service';

@Controller()
export class MockingController {
  constructor(private readonly mockingService: MockingService) {}

  @Get('mock/:creatorId')
  async getMockingData(@Param('creatorId') creatorId: string) {
    return this.mockingService.genrateCreatorMockData(creatorId);
  }
}
