import { Controller, Post, Body, Get, Param, UseGuards, Logger, Request, ForbiddenException } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('platforms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformController {
  private readonly logger = new Logger(PlatformController.name);

  constructor(private readonly platformService: PlatformService) {}

  @Post('connect')
  @Roles('CREATOR', 'ADMIN')
  async connectPlatform(
    @Body() connectDto: { type: string; creatorId: string; credentials: any },
    @Request() req,
  ) {
    // Verify user is authorized to connect this creator's platform
    if (req.user.role !== 'ADMIN' && req.user.creatorId !== connectDto.creatorId) {
      throw new ForbiddenException('You can only connect platforms for your own creator account');
    }
    
    this.logger.log(`Connecting to platform ${connectDto.type} for creator ${connectDto.creatorId}`);
    return this.platformService.connectPlatform(
      connectDto.type,
      connectDto.creatorId,
      connectDto.credentials,
    );
  }

  @Get()
  @Roles('ADMIN')
  async getAllPlatforms() {
    return this.platformService.getAllActivePlatforms();
  }

  @Post(':id/refresh')
  @Roles('CREATOR', 'ADMIN')
  async refreshMetrics(@Param('id') id: string, @Request() req) {
    // If not admin, verify user owns this platform
    if (req.user.role !== 'ADMIN') {
      const platform = await this.platformService.getPlatformById(id);
      if (!platform || platform.creatorId !== req.user.creatorId) {
        throw new ForbiddenException('You can only refresh metrics for your own platforms');
      }
    }
    
    this.logger.log(`Manually refreshing metrics for platform ${id}`);
    return this.platformService.refreshMetrics(id);
  }
}