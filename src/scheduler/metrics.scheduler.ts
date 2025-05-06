import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlatformService } from '../platforms/platform.service';

@Injectable()
export class MetricsScheduler {
  private readonly logger = new Logger(MetricsScheduler.name);

  constructor(
    private platformService: PlatformService,
  ) {}

  @Cron('0 */6 * * *') // Run every 6 hours
  async collectMetrics() {
    try {
      this.logger.log('Starting scheduled metrics collection');
      const platforms = await this.platformService.getAllActivePlatforms();
      
      this.logger.log(`Found ${platforms.length} platforms to collect metrics from`);
      
      for (const platform of platforms) {
        try {
          await this.platformService.refreshMetrics(platform.id);
          this.logger.log(`Successfully refreshed metrics for platform ${platform.id} (${platform.type})`);
        } catch (error) {
          this.logger.error(`Failed to refresh metrics for platform ${platform.id}: ${error.message}`);
          // Continue with other platforms even if one fails
        }
      }
      
      this.logger.log('Scheduled metrics collection completed');
    } catch (error) {
      this.logger.error(`Metrics collection failed: ${error.message}`);
    }
  }
}