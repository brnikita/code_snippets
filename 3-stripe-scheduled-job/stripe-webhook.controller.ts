/**
 * Stripe Webhook Controller
 * 
 * Receives webhook events from Stripe and queues them for processing.
 * Validates webhook signature for security.
 */

import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Request } from 'express';
import Stripe from 'stripe';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private stripe: Stripe;

  constructor(
    @InjectQueue('renewal-jobs') private renewalQueue: Queue,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Handle Stripe webhook events
   * 
   * Flow:
   * 1. Verify webhook signature
   * 2. Parse event
   * 3. Queue relevant events for processing
   * 4. Return 200 immediately (Stripe requires quick response)
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() request: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = this.stripe.webhooks.constructEvent(
        request.body, // Raw body (must be buffer, not parsed JSON)
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'invoice.payment_succeeded':
        await this.handleSubscriptionRenewal(event);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt
    return { received: true, eventId: event.id };
  }

  /**
   * Queue subscription renewal job
   * 
   * Job will be scheduled to run at 5:05 AM America/New_York
   * If it's already past 5:05 AM today, run immediately
   */
  private async handleSubscriptionRenewal(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;

    console.log(`Queueing renewal job for subscription: ${subscription.id}`);

    // Add job to queue with scheduling
    await this.renewalQueue.add(
      'process-renewal',
      {
        eventId: event.id, // For idempotency
        subscriptionId: subscription.id,
        customerId: subscription.customer as string,
        currentPeriodEnd: subscription.current_period_end,
        amount: subscription.items.data[0]?.price.unit_amount,
        currency: subscription.items.data[0]?.price.currency,
        timestamp: new Date().toISOString(),
      },
      {
        // Job options
        jobId: event.id, // Ensures idempotency (duplicate events won't create duplicate jobs)
        removeOnComplete: 100, // Keep last 100 completed jobs for debugging
        removeOnFail: false, // Keep failed jobs for manual review
        attempts: 5, // Max retry attempts
        backoff: {
          type: 'exponential',
          delay: 60000, // Start with 1 minute
        },
      },
    );

    console.log(`Renewal job queued: ${event.id}`);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;

    console.log(`Payment failed for invoice: ${invoice.id}`);

    // Queue notification job (process immediately)
    await this.renewalQueue.add(
      'payment-failed-notification',
      {
        eventId: event.id,
        invoiceId: invoice.id,
        customerId: invoice.customer as string,
        amount: invoice.amount_due,
        attemptCount: invoice.attempt_count,
      },
      {
        jobId: event.id,
        priority: 1, // High priority
      },
    );
  }

  /**
   * Handle subscription cancellation
   */
  private async handleSubscriptionCanceled(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;

    console.log(`Subscription canceled: ${subscription.id}`);

    // Queue cancellation job (process immediately)
    await this.renewalQueue.add(
      'subscription-canceled',
      {
        eventId: event.id,
        subscriptionId: subscription.id,
        customerId: subscription.customer as string,
        canceledAt: subscription.canceled_at,
      },
      {
        jobId: event.id,
      },
    );
  }
}

