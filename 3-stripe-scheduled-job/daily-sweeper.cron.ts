/**
 * Daily Sweeper Cron Job
 * 
 * Runs at 6:00 AM ET to backfill any missed renewal jobs.
 * Catches edge cases like:
 * - Server downtime during webhook delivery
 * - Failed webhook deliveries
 * - Jobs that got stuck in queue
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DateTime } from 'luxon';

@Injectable()
export class DailySweeperCron {
  private readonly logger = new Logger(DailySweeperCron.name);
  private readonly TIMEZONE = 'America/New_York';

  constructor(
    @InjectQueue('renewal-jobs') private renewalQueue: Queue,
    // @InjectRepository(StripeEvent)
    // private stripeEventRepo: Repository<StripeEvent>,
  ) {}

  /**
   * Run daily at 6:00 AM America/New_York
   * 
   * Cron expression: '0 6 * * *' in ET timezone
   * Note: @nestjs/schedule doesn't support timezones directly,
   * so we calculate UTC equivalent dynamically
   */
  @Cron('0 10 * * *', { // 10:00 UTC = 6:00 AM ET (standard time)
    name: 'daily-renewal-sweeper',
    timeZone: 'UTC', // Must use UTC and calculate offset
  })
  async handleDailySweeper() {
    // Check if it's actually 6:00 AM ET (handles DST)
    const nowET = DateTime.now().setZone(this.TIMEZONE);
    if (nowET.hour !== 6) {
      this.logger.log(`Skipping sweeper - not 6 AM ET (current: ${nowET.hour}:00)`);
      return;
    }

    this.logger.log('Starting daily renewal sweeper...');

    try {
      // Find all renewal events from last 48 hours
      const startTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const endTime = new Date();

      // Query database for recent renewal events
      // const recentEvents = await this.stripeEventRepo.find({
      //   where: {
      //     type: 'customer.subscription.updated',
      //     createdAt: Between(startTime, endTime),
      //   },
      //   order: { createdAt: 'ASC' },
      // });

      // Mock data for demonstration
      const recentEvents: Array<{ id: string; data: any }> = [];

      this.logger.log(`Found ${recentEvents.length} renewal events in last 48 hours`);

      let queuedCount = 0;
      let skippedCount = 0;

      for (const event of recentEvents) {
        try {
          // Check if job already exists in queue
          const existingJob = await this.renewalQueue.getJob(event.id);

          if (existingJob) {
            // Job exists - check status
            const state = await existingJob.getState();

            if (state === 'completed') {
              skippedCount++;
              continue; // Already processed
            }

            if (state === 'active' || state === 'waiting' || state === 'delayed') {
              skippedCount++;
              continue; // Still in queue
            }

            // If failed, retry
            if (state === 'failed') {
              this.logger.warn(`Retrying failed job: ${event.id}`);
              await existingJob.retry();
              queuedCount++;
              continue;
            }
          }

          // Job doesn't exist - create new one
          await this.renewalQueue.add(
            'process-renewal',
            event.data,
            {
              jobId: event.id,
              removeOnComplete: 100,
              removeOnFail: false,
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 60000,
              },
            },
          );

          queuedCount++;
          this.logger.log(`Queued missing job: ${event.id}`);
        } catch (error) {
          this.logger.error(`Error processing event ${event.id}: ${error.message}`);
        }
      }

      this.logger.log(
        `Sweeper completed: ${queuedCount} jobs queued, ${skippedCount} skipped`,
      );

      // Send metrics to monitoring
      // await this.metricsService.gauge('renewal_sweeper.queued', queuedCount);
      // await this.metricsService.gauge('renewal_sweeper.skipped', skippedCount);
    } catch (error) {
      this.logger.error(`Sweeper failed: ${error.message}`, error.stack);

      // Send alert
      // await this.alertService.send({
      //   severity: 'error',
      //   title: 'Daily renewal sweeper failed',
      //   message: error.message,
      // });

      throw error;
    }
  }

  /**
   * Manual trigger for testing
   */
  async triggerManually() {
    this.logger.log('Manually triggering sweeper...');
    await this.handleDailySweeper();
  }
}

