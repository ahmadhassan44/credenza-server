import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreditScoringService } from './credit-scoring.service';

@Injectable()
export class CreditScoringScheduler {
  private readonly logger = new Logger(CreditScoringScheduler.name);

  constructor(
    private prisma: PrismaService,
    private creditScoringService: CreditScoringService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyScores() {
    try {
      this.logger.log('Starting daily credit score generation');
      
      // Fetch all creators
      const creators = await this.prisma.creator.findMany({
        select: { id: true, name: true },
      });
      
      this.logger.log(`Found ${creators.length} creators for credit score generation`);
      
      // Generate scores for each creator
      for (const creator of creators) {
        try {
          await this.creditScoringService.generateCreatorScore(creator.id);
          this.logger.log(`Generated credit score for creator ${creator.name} (${creator.id})`);
        } catch (error) {
          this.logger.error(`Failed to generate credit score for creator ${creator.id}: ${error.message}`);
          // Continue with other creators even if one fails
        }
      }
      
      this.logger.log('Daily credit score generation completed');
    } catch (error) {
      this.logger.error(`Credit score generation failed: ${error.message}`);
    }
  }
}