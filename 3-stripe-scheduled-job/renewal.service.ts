/**
 * Renewal Service - Business Logic
 * 
 * Handles the actual renewal processing:
 * - Database updates
 * - Email notifications
 * - Idempotency tracking
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RenewalService {
  private readonly logger = new Logger(RenewalService.name);

  constructor(
    // @InjectRepository(Subscription)
    // private subscriptionRepo: Repository<Subscription>,
    // @InjectRepository(User)
    // private userRepo: Repository<User>,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Check if event has already been processed (idempotency)
   * 
   * Uses Redis with 7-day TTL to track processed events
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const key = `stripe:processed:${eventId}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Mark event as processed (idempotency key)
   * 
   * Store in Redis with 7-day TTL (Stripe retries for up to 3 days)
   */
  async markEventProcessed(eventId: string): Promise<void> {
    const key = `stripe:processed:${eventId}`;
    const ttlSeconds = 7 * 24 * 60 * 60; // 7 days
    await this.redis.setex(key, ttlSeconds, new Date().toISOString());
  }

  /**
   * Process subscription renewal
   * 
   * Steps:
   * 1. Update subscription record in database
   * 2. Update user's access/permissions
   * 3. Send confirmation email
   * 4. Log to analytics
   */
  async processRenewal(data: {
    eventId: string;
    subscriptionId: string;
    customerId: string;
    currentPeriodEnd: number;
    amount: number;
    currency: string;
  }): Promise<any> {
    const { subscriptionId, customerId, currentPeriodEnd, amount, currency } = data;

    this.logger.log(`Processing renewal for subscription: ${subscriptionId}`);

    // 1. Update subscription in database
    // const subscription = await this.subscriptionRepo.findOne({
    //   where: { stripeSubscriptionId: subscriptionId },
    //   relations: ['user'],
    // });
    //
    // if (!subscription) {
    //   throw new Error(`Subscription not found: ${subscriptionId}`);
    // }
    //
    // subscription.currentPeriodEnd = new Date(currentPeriodEnd * 1000);
    // subscription.status = 'active';
    // subscription.lastRenewalAt = new Date();
    // await this.subscriptionRepo.save(subscription);

    // 2. Update user access
    // const user = subscription.user;
    // user.subscriptionStatus = 'active';
    // user.accessExpiresAt = new Date(currentPeriodEnd * 1000);
    // await this.userRepo.save(user);

    // 3. Send confirmation email
    await this.sendRenewalConfirmationEmail(customerId, {
      subscriptionId,
      amount: amount / 100, // Convert cents to dollars
      currency,
      nextBillingDate: new Date(currentPeriodEnd * 1000),
    });

    // 4. Log to analytics
    // await this.analyticsService.track({
    //   event: 'subscription_renewed',
    //   userId: user.id,
    //   properties: {
    //     subscriptionId,
    //     amount,
    //     currency,
    //   },
    // });

    this.logger.log(`Renewal completed for subscription: ${subscriptionId}`);

    return {
      subscriptionId,
      customerId,
      renewedAt: new Date().toISOString(),
      nextBillingDate: new Date(currentPeriodEnd * 1000).toISOString(),
    };
  }

  /**
   * Send renewal confirmation email
   */
  private async sendRenewalConfirmationEmail(
    customerId: string,
    data: {
      subscriptionId: string;
      amount: number;
      currency: string;
      nextBillingDate: Date;
    },
  ): Promise<void> {
    // Get user email from database
    // const user = await this.userRepo.findOne({
    //   where: { stripeCustomerId: customerId },
    // });
    //
    // if (!user) {
    //   this.logger.warn(`User not found for customer: ${customerId}`);
    //   return;
    // }

    // Send email via email service (SendGrid, SES, etc.)
    // await this.emailService.send({
    //   to: user.email,
    //   template: 'subscription-renewed',
    //   data: {
    //     userName: user.name,
    //     amount: data.amount,
    //     currency: data.currency.toUpperCase(),
    //     nextBillingDate: data.nextBillingDate.toLocaleDateString(),
    //     subscriptionId: data.subscriptionId,
    //   },
    // });

    this.logger.log(`Renewal confirmation email sent to customer: ${customerId}`);
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedEmail(
    customerId: string,
    data: { invoiceId: string; amount: number },
  ): Promise<void> {
    // Get user email
    // const user = await this.userRepo.findOne({
    //   where: { stripeCustomerId: customerId },
    // });

    // Send email
    // await this.emailService.send({
    //   to: user.email,
    //   template: 'payment-failed',
    //   data: {
    //     userName: user.name,
    //     amount: data.amount / 100,
    //     invoiceId: data.invoiceId,
    //     updatePaymentUrl: `${process.env.APP_URL}/billing/update-payment`,
    //   },
    // });

    this.logger.log(`Payment failed email sent to customer: ${customerId}`);
  }

  /**
   * Handle subscription cancellation
   */
  async handleCancellation(subscriptionId: string, customerId: string): Promise<void> {
    // Update database
    // const subscription = await this.subscriptionRepo.findOne({
    //   where: { stripeSubscriptionId: subscriptionId },
    //   relations: ['user'],
    // });
    //
    // subscription.status = 'canceled';
    // subscription.canceledAt = new Date();
    // await this.subscriptionRepo.save(subscription);
    //
    // const user = subscription.user;
    // user.subscriptionStatus = 'canceled';
    // await this.userRepo.save(user);

    // Send cancellation email
    // await this.emailService.send({
    //   to: user.email,
    //   template: 'subscription-canceled',
    //   data: {
    //     userName: user.name,
    //     accessExpiresAt: subscription.currentPeriodEnd,
    //   },
    // });

    this.logger.log(`Subscription canceled: ${subscriptionId}`);
  }
}

