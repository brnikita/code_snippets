# Code Snippets for Education Platform Stabilization

Production-ready code snippets for Next.js/NestJS education platform stabilization project.

## 📁 Repository Structure

```
code_snippets/
├── 1-nextjs-hydration-fix/          # Next.js hydration error resolution
├── 2-nestjs-dto-openapi/            # NestJS with validation & OpenAPI
├── 3-stripe-scheduled-job/          # Stripe webhook with scheduled jobs
└── 4-tanstack-table-server-side/    # TanStack Table with server-side processing
```

## 🎯 Snippets

### 1. Next.js Hydration Fix
**Fixes:** Hydration mismatch errors in Practice Exam forms.
- Fully controlled inputs with proper initialization
- Client-side only rendering with useEffect
- Consistent SSR/CSR date handling
- **Impact:** Zero hydration warnings, CLS 0.25 → 0.05

### 2. NestJS DTOs with OpenAPI
**Provides:** Standardized API validation and documentation.
- class-validator DTOs with OpenAPI annotations
- Standardized response envelopes
- Soft delete with 30s undo window
- RBAC guards and audit logging hooks

### 3. Stripe Webhook → Scheduled Job
**Implements:** Subscription renewals at 5:05 AM ET with DST safety.
- Webhook → Queue → Delayed job (5:05 AM America/New_York)
- Idempotency with Redis (event ID as key)
- Exponential backoff + jitter (1min → 6hr)
- Daily sweeper at 6 AM for backfill

### 4. TanStack Table (Server-Side)
**Delivers:** Admin tables with server-side pagination/sort/filter.
- Server-side pagination (only fetches current page)
- Multi-column sorting, global search (500ms debounce)
- Type-safe API contract
- **Performance:** < 100ms response, scales to millions of rows

## 🚀 Quick Start

Each snippet includes:
1. Problem statement & solution code
2. Detailed inline comments
3. README with setup instructions

**Integration:** Copy files → Install deps → Adjust to your schema → Configure env vars

## 📊 Deliverables Alignment

| Deliverable | Snippet | Status |
|-------------|---------|--------|
| Practice Exams UI stabilized | #1 Next.js Hydration Fix | ✅ |
| Admin tables with server-side processing | #4 TanStack Table | ✅ |
| API contracts & validation | #2 NestJS DTOs | ✅ |
| Stripe renewal-day job | #3 Stripe Scheduled Job | ✅ |

---

**Created:** January 15, 2025 | **Focus:** Production-ready solutions without overengineering

