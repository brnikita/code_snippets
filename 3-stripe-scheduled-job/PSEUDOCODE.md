# Stripe Webhook → Scheduled Job Pseudocode

## High-Level Flow

```
┌─────────┐         ┌──────────┐         ┌───────┐         ┌──────────────┐
│ Stripe  │────────>│ Webhook  │────────>│ Queue │────────>│ Processor    │
│         │ webhook │ Handler  │  queue  │       │ delayed │ (5:05 AM ET) │
└─────────┘         └──────────┘         └───────┘         └──────────────┘
                         │                                         │
                         │ immediate ack                           │
                         ↓                                         ↓
                    ┌─────────┐                            ┌──────────────┐
                    │ Return  │                            │ Process      │
                    │ 200 OK  │                            │ Renewal      │
                    └─────────┘                            └──────────────┘
```

## Detailed Pseudocode

### 1. Webhook Handler

```python
def handle_stripe_webhook(request):
    # Verify signature
    signature = request.headers['stripe-signature']
    event = stripe.verify_webhook(request.body, signature, WEBHOOK_SECRET)
    
    if not event:
        return 400, "Invalid signature"
    
    # Handle event type
    if event.type == 'customer.subscription.updated':
        queue_renewal_job(event)
    elif event.type == 'invoice.payment_failed':
        queue_payment_failed_job(event)
    
    # Return immediately (Stripe requires < 5s response)
    return 200, {"received": true, "event_id": event.id}


def queue_renewal_job(event):
    subscription = event.data.object
    
    job_data = {
        "event_id": event.id,  # For idempotency
        "subscription_id": subscription.id,
        "customer_id": subscription.customer,
        "current_period_end": subscription.current_period_end,
        "amount": subscription.items[0].price.unit_amount,
        "currency": subscription.items[0].price.currency,
        "timestamp": now()
    }
    
    # Add to queue with job ID = event ID (ensures idempotency)
    queue.add(
        name="process-renewal",
        data=job_data,
        options={
            "job_id": event.id,  # Duplicate events won't create duplicate jobs
            "attempts": 5,
            "backoff": {
                "type": "exponential",
                "delay": 60000  # Start with 1 minute
            }
        }
    )
```

### 2. Job Processor with Scheduling

```python
def process_renewal_job(job):
    data = job.data
    event_id = data.event_id
    
    # Calculate target time: 5:05 AM America/New_York
    target_time = calculate_target_time()
    now = datetime.now(timezone='America/New_York')
    
    # If target time is in the future, delay the job
    delay_seconds = (target_time - now).total_seconds()
    
    if delay_seconds > 0:
        log(f"Delaying job until {target_time} ({delay_seconds}s)")
        job.delay(delay_seconds * 1000)  # Convert to milliseconds
        return {"status": "delayed", "target_time": target_time}
    
    # It's time to process!
    
    # Add jitter (0-30 seconds) to prevent thundering herd
    jitter_ms = random(0, 30000)
    if jitter_ms > 1000:
        sleep(jitter_ms)
    
    # Check idempotency - has this event been processed?
    if redis.exists(f"stripe:processed:{event_id}"):
        log(f"Event {event_id} already processed. Skipping.")
        return {"status": "skipped", "reason": "already_processed"}
    
    # Process the renewal
    try:
        result = process_renewal(data)
        
        # Mark as processed (7-day TTL)
        redis.setex(f"stripe:processed:{event_id}", 7 * 24 * 60 * 60, now())
        
        log(f"Renewal processed: {data.subscription_id}")
        return {"status": "success", "result": result}
        
    except Exception as error:
        log_error(f"Renewal failed: {error}")
        raise  # Trigger retry mechanism


def calculate_target_time():
    """
    Calculate next 5:05 AM America/New_York
    
    DST-safe: America/New_York timezone auto-handles DST transitions
    - Standard Time: 5:05 AM ET = 10:05 AM UTC
    - Daylight Time: 5:05 AM EDT = 9:05 AM UTC
    """
    now = datetime.now(timezone='America/New_York')
    
    # Set to 5:05 AM today
    target = now.replace(hour=5, minute=5, second=0, microsecond=0)
    
    # If we've passed 5:05 AM today, use tomorrow
    if now >= target:
        target = target + timedelta(days=1)
    
    return target


def process_renewal(data):
    """
    Actual renewal processing
    """
    subscription_id = data.subscription_id
    customer_id = data.customer_id
    
    # 1. Update database
    db.execute("""
        UPDATE subscriptions 
        SET 
            current_period_end = :period_end,
            status = 'active',
            last_renewal_at = NOW()
        WHERE stripe_subscription_id = :subscription_id
    """, {
        "period_end": data.current_period_end,
        "subscription_id": subscription_id
    })
    
    # 2. Update user access
    db.execute("""
        UPDATE users
        SET 
            subscription_status = 'active',
            access_expires_at = :expires_at
        WHERE stripe_customer_id = :customer_id
    """, {
        "expires_at": data.current_period_end,
        "customer_id": customer_id
    })
    
    # 3. Send confirmation email
    send_email(
        to=get_user_email(customer_id),
        template="subscription-renewed",
        data={
            "amount": data.amount / 100,
            "currency": data.currency,
            "next_billing_date": data.current_period_end
        }
    )
    
    # 4. Log to analytics
    analytics.track(
        event="subscription_renewed",
        user_id=get_user_id(customer_id),
        properties={
            "subscription_id": subscription_id,
            "amount": data.amount,
            "currency": data.currency
        }
    )
    
    return {
        "subscription_id": subscription_id,
        "renewed_at": now(),
        "next_billing_date": data.current_period_end
    }
```

### 3. Retry Strategy

```python
# Exponential backoff configuration
RETRY_CONFIG = {
    "attempts": 5,
    "backoff": {
        "type": "exponential",
        "delay": 60000,  # 1 minute base
        "max_delay": 21600000  # 6 hours max
    }
}

# Retry schedule:
# Attempt 1: immediate
# Attempt 2: +1 minute
# Attempt 3: +5 minutes (exponential)
# Attempt 4: +15 minutes
# Attempt 5: +1 hour
# Attempt 6: +6 hours (max)

def on_job_failed(job, error):
    attempts_made = job.attempts_made
    max_attempts = job.options.attempts
    
    log_error(f"Job {job.id} failed (attempt {attempts_made}/{max_attempts}): {error}")
    
    # If all retries exhausted, send alert
    if attempts_made >= max_attempts:
        send_alert(
            severity="critical",
            title=f"Renewal job {job.id} failed after {max_attempts} attempts",
            message=error,
            job_data=job.data
        )
```

### 4. Daily Backfill Sweeper

```python
@cron('0 6 * * *', timezone='America/New_York')  # 6:00 AM ET daily
def daily_renewal_sweeper():
    log("Starting daily renewal sweeper...")
    
    # Find all renewal events from last 48 hours
    start_time = now() - timedelta(hours=48)
    events = db.query("""
        SELECT * FROM stripe_events
        WHERE 
            type = 'customer.subscription.updated'
            AND created_at >= :start_time
        ORDER BY created_at ASC
    """, {"start_time": start_time})
    
    log(f"Found {len(events)} renewal events in last 48 hours")
    
    queued_count = 0
    skipped_count = 0
    
    for event in events:
        # Check if job already exists
        existing_job = queue.get_job(event.id)
        
        if existing_job:
            state = existing_job.state
            
            if state == 'completed':
                skipped_count += 1
                continue  # Already processed
            
            if state in ['active', 'waiting', 'delayed']:
                skipped_count += 1
                continue  # Still in queue
            
            if state == 'failed':
                # Retry failed job
                existing_job.retry()
                queued_count += 1
                continue
        
        # Job doesn't exist - create new one
        queue.add(
            name="process-renewal",
            data=event.data,
            options={
                "job_id": event.id,
                "attempts": 5,
                "backoff": {"type": "exponential", "delay": 60000}
            }
        )
        queued_count += 1
    
    log(f"Sweeper completed: {queued_count} queued, {skipped_count} skipped")
    
    # Send metrics
    metrics.gauge('renewal_sweeper.queued', queued_count)
    metrics.gauge('renewal_sweeper.skipped', skipped_count)
```

### 5. DST Handling Example

```python
# Example: DST transition on March 10, 2024 at 2:00 AM

# Before DST (March 9, 2024)
now = datetime(2024, 3, 9, 10, 0, 0, timezone='America/New_York')
# 10:00 AM EST = 3:00 PM UTC

target = calculate_target_time()
# Returns: 2024-03-10 05:05:00 EST = 10:05 AM UTC

# After DST (March 11, 2024)
now = datetime(2024, 3, 11, 10, 0, 0, timezone='America/New_York')
# 10:00 AM EDT = 2:00 PM UTC

target = calculate_target_time()
# Returns: 2024-03-12 05:05:00 EDT = 9:05 AM UTC

# The timezone library handles the conversion automatically!
```

## Key Points

1. **Idempotency**: Event ID used as job ID and Redis key
2. **DST Safety**: Use `America/New_York` timezone, not UTC offsets
3. **Jitter**: Random 0-30s delay prevents thundering herd
4. **Retries**: Exponential backoff with max 6 hours
5. **Backfill**: Daily sweeper catches missed jobs
6. **Fast Response**: Webhook returns 200 immediately
7. **Monitoring**: Alerts on exhausted retries

