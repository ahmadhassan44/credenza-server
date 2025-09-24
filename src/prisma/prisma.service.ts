import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'development') {
      // Clean up database for testing purposes
    }
  }
}
