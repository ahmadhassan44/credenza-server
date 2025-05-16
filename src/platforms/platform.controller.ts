import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Logger,
  Request,
  ForbiddenException,
  Delete,
} from '@nestjs/common';
import { PlatformService } from './platform.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConnectPlatformDto } from './dtos/connect-platform.dto';

@Controller('platforms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformController {
  private readonly logger = new Logger(PlatformController.name);

  constructor(private readonly platformService: PlatformService) {}

  @Post('connect')
  @Roles('CREATOR', 'ADMIN')
  async connectPlatform(
    @Body() connectDto: ConnectPlatformDto,
    @Request() req: Request,
  ) {
    const { type, handle, creatorId } = connectDto;

    this.logger.log(
      `Connecting ${type} platform for creator ${creatorId} with handle ${handle}`,
    );

    // Validate the platform type
    if (!['YOUTUBE', 'PATREON', 'INSTAGRAM'].includes(type)) {
      throw new ForbiddenException('Invalid platform type');
    }
    return this.platformService.connectPlatform(connectDto);
  }

  @Get('all')
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
        throw new ForbiddenException(
          'You can only refresh metrics for your own platforms',
        );
      }
    }

    this.logger.log(`Manually refreshing metrics for platform ${id}`);
    return this.platformService.refreshMetrics(id);
  }

  @Get('creator')
  @Roles('CREATOR', 'ADMIN')
  async getAllPlatformsForCreator(@Param('creatorId') creatorId: string) {
    return this.platformService.getAllPlatformsForCreator(creatorId);
  }

  @Delete(':id')
  @Roles('CREATOR', 'ADMIN')
  async deletePlatform(@Param('id') id: string, @Request() req) {
    await this.platformService.deletePlatform(id, req.user.creatorId);
  }
}
