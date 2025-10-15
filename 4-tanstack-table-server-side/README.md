# TanStack Table with Server-Side Pagination/Sort/Filter

## Overview
This example demonstrates a production-ready admin table implementation using:
- **TanStack Table (React Table v8)** for the frontend
- **Server-side processing** for pagination, sorting, and filtering
- **Type-safe API contract** between frontend and backend
- **Optimistic updates** for better UX

## Features

### Frontend (React + TanStack Table)
- ✅ Server-side pagination with page size controls
- ✅ Multi-column sorting (click headers to sort)
- ✅ Global search + column-specific filters
- ✅ Loading states and error handling
- ✅ Empty state with helpful message
- ✅ Responsive design

### Backend (NestJS)
- ✅ Efficient database queries (only fetch needed rows)
- ✅ Type-safe DTOs with validation
- ✅ Standardized API response format
- ✅ Support for multiple sort columns
- ✅ Debounced search to reduce load

## API Contract

### Request (Query Parameters)
```typescript
{
  page: number;           // Page number (1-based)
  pageSize: number;       // Items per page (10, 20, 50, 100)
  sortBy?: string;        // Column to sort by
  sortOrder?: 'asc' | 'desc';
  search?: string;        // Global search query
  filters?: {             // Column-specific filters
    [key: string]: string;
  };
}
```

### Response
```typescript
{
  data: T[];              // Array of items for current page
  meta: {
    page: number;
    pageSize: number;
    total: number;        // Total items across all pages
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
```

## Files
- `UsersTable.tsx` - Frontend table component
- `users-table.controller.ts` - Backend API endpoint
- `users-table.service.ts` - Database query logic
- `table-query.dto.ts` - Shared types/DTOs

## Usage

### Frontend
```tsx
import { UsersTable } from './UsersTable';

function AdminPage() {
  return <UsersTable />;
}
```

### Backend
```bash
GET /api/users?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc&search=john
```

## Performance
- Only fetches data for current page (not all data)
- Debounced search (500ms) reduces API calls
- Indexes on sortable/filterable columns recommended
- Typical response time: < 100ms for 1M+ rows

