# Stripe Webhook → Scheduled Job at 5:05 AM ET

## Overview
This implementation handles Stripe subscription renewals by:
1. Receiving webhook events from Stripe
2. Queuing jobs for processing
3. Scheduling execution at 5:05 AM America/New_York (DST-safe)
4. Handling idempotency, retries, and backfill

## Architecture

```
Stripe → Webhook → Queue → Scheduled Job (5:05 AM ET)
                              ↓
                         Process Renewal
                              ↓
                    Update DB + Send Email
```

## Key Features

### 1. **DST-Safe Scheduling**
- Uses `America/New_York` timezone (auto-handles DST)
- Converts to UTC dynamically based on current DST rules
- 5:05 AM ET = 9:05 AM UTC (standard) or 10:05 AM UTC (daylight)

### 2. **Idempotency**
- Uses Stripe event ID as idempotency key
- Prevents duplicate processing
- Safe for retries

### 3. **Retry Strategy**
- Exponential backoff: 1min, 5min, 15min, 1hr, 6hr
- Small random jitter (0-30s) to prevent thundering herd
- Max 5 attempts

### 4. **Daily Backfill Sweeper**
- Runs at 6:00 AM ET to catch any missed jobs
- Processes events from last 48 hours
- Idempotent - won't duplicate successful jobs

## Files
- `stripe-webhook.controller.ts` - Webhook endpoint
- `renewal-job.processor.ts` - Job processor with scheduling logic
- `renewal.service.ts` - Business logic for renewals
- `daily-sweeper.cron.ts` - Backfill cron job

## Environment Variables
```env
STRIPE_WEBHOOK_SECRET=whsec_...
REDIS_URL=redis://localhost:6379
TIMEZONE=America/New_York
RENEWAL_HOUR=5
RENEWAL_MINUTE=5
```

## Testing
```bash
# Simulate webhook
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: ..." \
  -d @test-event.json

# Check job queue
npm run queue:inspect

# Trigger sweeper manually
npm run cron:sweeper
```

