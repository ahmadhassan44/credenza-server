import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PlatformModule } from './platforms/platform.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { CreditScoringModule } from './credit-scoring/credit-scoring.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import configuration from './config/configuration';
import { MockingModule } from './mocking/mocking.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    PlatformModule,
    SchedulerModule,
    CreditScoringModule,
    AuthModule,
    UserModule,
    MockingModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
