/**
 * Renewal Job Processor
 * 
 * Processes subscription renewal jobs at scheduled time (5:05 AM ET).
 * Handles scheduling logic, idempotency, retries, and jitter.
 */

import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { DateTime } from 'luxon'; // For timezone handling
import { RenewalService } from './renewal.service';

interface RenewalJobData {
  eventId: string;
  subscriptionId: string;
  customerId: string;
  currentPeriodEnd: number;
  amount: number;
  currency: string;
  timestamp: string;
}

@Processor('renewal-jobs')
export class RenewalJobProcessor {
  private readonly logger = new Logger(RenewalJobProcessor.name);

  // Configuration
  private readonly TIMEZONE = process.env.TIMEZONE || 'America/New_York';
  private readonly RENEWAL_HOUR = parseInt(process.env.RENEWAL_HOUR || '5', 10);
  private readonly RENEWAL_MINUTE = parseInt(process.env.RENEWAL_MINUTE || '5', 10);

  constructor(private readonly renewalService: RenewalService) {}

  /**
   * Main job processor for subscription renewals
   * 
   * Flow:
   * 1. Check if it's time to process (5:05 AM ET)
   * 2. If not, delay job until target time
   * 3. If yes, process renewal with idempotency check
   * 4. Add small jitter to prevent thundering herd
   */
  @Process('process-renewal')
  async handleRenewal(job: Job<RenewalJobData>) {
    const { eventId, subscriptionId, customerId } = job.data;

    this.logger.log(`Processing renewal job: ${job.id} (event: ${eventId})`);

    try {
      // Calculate target execution time (5:05 AM ET today or tomorrow)
      const targetTime = this.calculateTargetTime();
      const now = DateTime.now().setZone(this.TIMEZONE);
      const delayMs = targetTime.toMillis() - now.toMillis();

      // If target time is in the future, delay the job
      if (delayMs > 0) {
        this.logger.log(
          `Job ${job.id} scheduled for ${targetTime.toISO()}. Delaying ${Math.round(delayMs / 1000)}s`,
        );

        // Re-queue job with delay
        await job.moveToDelayed(Date.now() + delayMs);
        return { status: 'delayed', targetTime: targetTime.toISO() };
      }

      // Add small random jitter (0-30 seconds) to prevent all jobs hitting at once
      const jitterMs = Math.random() * 30 * 1000;
      if (jitterMs > 1000) {
        this.logger.log(`Adding jitter: ${Math.round(jitterMs / 1000)}s`);
        await this.sleep(jitterMs);
      }

      // Check idempotency - has this event been processed?
      const alreadyProcessed = await this.renewalService.isEventProcessed(eventId);
      if (alreadyProcessed) {
        this.logger.warn(`Event ${eventId} already processed. Skipping.`);
        return { status: 'skipped', reason: 'already_processed' };
      }

      // Process the renewal
      const result = await this.renewalService.processRenewal({
        eventId,
        subscriptionId,
        customerId,
        ...job.data,
      });

      // Mark event as processed (idempotency key)
      await this.renewalService.markEventProcessed(eventId);

      this.logger.log(`Renewal processed successfully: ${subscriptionId}`);

      return {
        status: 'success',
        subscriptionId,
        processedAt: new Date().toISOString(),
        result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process renewal job ${job.id}: ${error.message}`,
        error.stack,
      );

      // Throw error to trigger retry mechanism
      throw error;
    }
  }

  /**
   * Calculate target execution time (5:05 AM ET)
   * 
   * DST-safe: Uses America/New_York timezone which auto-adjusts for DST
   * 
   * Logic:
   * - If current time < 5:05 AM today → schedule for today 5:05 AM
   * - If current time >= 5:05 AM today → schedule for tomorrow 5:05 AM
   */
  private calculateTargetTime(): DateTime {
    const now = DateTime.now().setZone(this.TIMEZONE);

    // Target time today at 5:05 AM
    let target = now.set({
      hour: this.RENEWAL_HOUR,
      minute: this.RENEWAL_MINUTE,
      second: 0,
      millisecond: 0,
    });

    // If we've already passed 5:05 AM today, schedule for tomorrow
    if (now >= target) {
      target = target.plus({ days: 1 });
    }

    return target;
  }

  /**
   * Handle payment failed notification (immediate processing)
   */
  @Process('payment-failed-notification')
  async handlePaymentFailed(job: Job) {
    const { eventId, customerId, invoiceId, amount } = job.data;

    this.logger.log(`Processing payment failed notification: ${invoiceId}`);

    // Check idempotency
    const alreadyProcessed = await this.renewalService.isEventProcessed(eventId);
    if (alreadyProcessed) {
      return { status: 'skipped', reason: 'already_processed' };
    }

    // Send notification
    await this.renewalService.sendPaymentFailedEmail(customerId, {
      invoiceId,
      amount,
    });

    // Mark as processed
    await this.renewalService.markEventProcessed(eventId);

    return { status: 'success', notificationSent: true };
  }

  /**
   * Handle subscription cancellation (immediate processing)
   */
  @Process('subscription-canceled')
  async handleSubscriptionCanceled(job: Job) {
    const { eventId, subscriptionId, customerId } = job.data;

    this.logger.log(`Processing subscription cancellation: ${subscriptionId}`);

    // Check idempotency
    const alreadyProcessed = await this.renewalService.isEventProcessed(eventId);
    if (alreadyProcessed) {
      return { status: 'skipped', reason: 'already_processed' };
    }

    // Update database and send notification
    await this.renewalService.handleCancellation(subscriptionId, customerId);

    // Mark as processed
    await this.renewalService.markEventProcessed(eventId);

    return { status: 'success', canceled: true };
  }

  /**
   * Lifecycle hooks for monitoring
   */

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Job ${job.id} started processing`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${error.message}`,
    );

    // Send alert if all retries exhausted
    if (job.attemptsMade >= job.opts.attempts) {
      this.logger.error(`Job ${job.id} exhausted all retries. Manual intervention required.`);
      // TODO: Send alert to Sentry/PagerDuty
    }
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

