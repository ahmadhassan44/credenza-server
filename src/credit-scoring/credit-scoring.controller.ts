import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { CreditScoringService, CreditScore } from './credit-scoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('credit-scoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreditScoringController {
  private readonly logger = new Logger(CreditScoringController.name);

  constructor(private readonly creditScoringService: CreditScoringService) {}

  @Post('generate/:creatorId')
  @Roles('CREATOR', 'ADMIN')
  async generateScore(
    @Param('creatorId') creatorId: string,
    @Request() req,
  ): Promise<CreditScore[]> {
    try {
      // Check if the user has permission to generate a score for this creator
      if (req.user.role !== 'ADMIN' && req.user.creatorId !== creatorId) {
        throw new ForbiddenException(
          'You can only generate credit scores for your own creator account',
        );
      }

      this.logger.log(
        `Generating monthly credit scores for creator ${creatorId}`,
      );
      return await this.creditScoringService.generateCreatorScore(creatorId);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`Failed to generate credit scores: ${error.message}`);
      throw new HttpException(
        `Failed to generate credit scores: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('latest/:creatorId')
  @Roles('CREATOR', 'ADMIN')
  async getLatestScore(
    @Param('creatorId') creatorId: string,
    @Request() req,
  ): Promise<CreditScore> {
    try {
      // Check if the user has permission to view scores for this creator
      if (req.user.role !== 'ADMIN' && req.user.creatorId !== creatorId) {
        throw new ForbiddenException(
          'You can only view credit scores for your own creator account',
        );
      }

      const score =
        await this.creditScoringService.getCreatorLatestScore(creatorId);

      if (!score) {
        throw new HttpException(
          `No credit score found for creator ${creatorId}`,
          HttpStatus.NOT_FOUND,
        );
      }

      return score;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to get latest credit score: ${error.message}`);
      throw new HttpException(
        `Failed to get latest credit score: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('history/:creatorId')
  @Roles('CREATOR', 'ADMIN')
  async getScoreHistory(
    @Param('creatorId') creatorId: string,
    @Request() req,
  ): Promise<CreditScore[]> {
    try {
      // Check if the user has permission to view score history for this creator
      if (req.user.role !== 'ADMIN' && req.user.creatorId !== creatorId) {
        throw new ForbiddenException(
          'You can only view credit score history for your own creator account',
        );
      }

      const history =
        await this.creditScoringService.getCreatorScoreHistory(creatorId);

      if (history.length === 0) {
        throw new HttpException(
          `No credit score history found for creator ${creatorId}`,
          HttpStatus.NOT_FOUND,
        );
      }

      return history;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Failed to get credit score history: ${error.message}`);
      throw new HttpException(
        `Failed to get credit score history: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
