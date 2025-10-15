# API Contract for Server-Side Table

## Overview
This document describes the API contract between the frontend (TanStack Table) and backend (NestJS) for server-side table operations.

## Endpoint
```
GET /api/users
```

## Request Parameters

### Query Parameters (all optional)

| Parameter | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `page` | number | 1 | Page number (1-based) | `1` |
| `pageSize` | number | 20 | Items per page | `20` |
| `sortBy` | string | - | Column to sort by | `createdAt` |
| `sortOrder` | enum | `desc` | Sort direction: `asc` or `desc` | `desc` |
| `search` | string | - | Global search query | `john` |
| `filters` | object | - | Column-specific filters (JSON) | `{"role":"admin"}` |

### Example Requests

**Basic pagination:**
```
GET /api/users?page=1&pageSize=20
```

**With sorting:**
```
GET /api/users?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
```

**With search:**
```
GET /api/users?page=2&pageSize=50&search=john
```

**With filters:**
```
GET /api/users?page=1&pageSize=20&filters={"role":"admin","status":"active"}
```

**Combined:**
```
GET /api/users?page=1&pageSize=20&sortBy=name&sortOrder=asc&search=doe&filters={"role":"teacher"}
```

## Response Format

### Success Response (200 OK)

```typescript
{
  data: UserTableRow[];  // Array of user objects for current page
  meta: {
    page: number;         // Current page number
    pageSize: number;     // Items per page
    total: number;        // Total number of items across all pages
    totalPages: number;   // Total number of pages
    hasNextPage: boolean; // Whether there is a next page
    hasPreviousPage: boolean; // Whether there is a previous page
  };
}
```

### Example Response

```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "role": "student",
      "status": "active",
      "subscriptionStatus": "active",
      "lastLoginAt": "2025-01-14T10:30:00Z",
      "createdAt": "2024-12-01T08:00:00Z"
    },
    {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "email": "jane.smith@example.com",
      "name": "Jane Smith",
      "role": "teacher",
      "status": "active",
      "subscriptionStatus": null,
      "lastLoginAt": "2025-01-15T09:15:00Z",
      "createdAt": "2024-11-15T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

## Data Types

### UserTableRow

```typescript
interface UserTableRow {
  id: string;                    // UUID
  email: string;                 // User email
  name: string;                  // Full name
  role: 'admin' | 'teacher' | 'student';
  status: 'active' | 'inactive' | 'suspended';
  subscriptionStatus: 'active' | 'canceled' | 'expired' | null;
  lastLoginAt: string | null;    // ISO 8601 timestamp
  createdAt: string;             // ISO 8601 timestamp
}
```

## Sorting

### Sortable Columns
- `name`
- `email`
- `role`
- `status`
- `subscriptionStatus`
- `lastLoginAt`
- `createdAt`

### Default Sort
If no `sortBy` is specified, defaults to `createdAt DESC` (newest first).

### Security
Only whitelisted columns can be sorted to prevent SQL injection.

## Filtering

### Filterable Columns
- `role` - Filter by user role
- `status` - Filter by account status
- `subscriptionStatus` - Filter by subscription status

### Filter Format
Filters are passed as a JSON object in the query string:
```
filters={"role":"admin","status":"active"}
```

### Multiple Filters
Multiple filters are combined with AND logic:
```
filters={"role":"teacher","status":"active"}
```
Returns only active teachers.

## Search

### Searchable Fields
Global search queries the following fields:
- `name` (case-insensitive)
- `email` (case-insensitive)

### Search Behavior
- Uses partial matching (LIKE '%query%')
- Case-insensitive
- Searches across multiple fields with OR logic

### Example
```
search=john
```
Returns users where name OR email contains "john".

## Pagination

### Page Numbering
- API uses **1-based** page numbering
- Frontend (TanStack Table) uses **0-based** indexing internally
- Conversion happens in the frontend

### Page Size Options
Recommended options: `10`, `20`, `50`, `100`

### Metadata Calculation
```typescript
totalPages = Math.ceil(total / pageSize)
hasNextPage = page < totalPages
hasPreviousPage = page > 1
```

## Performance Considerations

### Database Indexes
Recommended indexes for optimal performance:
```sql
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);
```

### Query Optimization
- Only fetches required page of data (not all records)
- Uses `LIMIT` and `OFFSET` for pagination
- Applies filters before pagination
- Uses indexed columns for sorting

### Expected Performance
- Response time: < 100ms for typical queries
- Scales to millions of rows with proper indexes
- Debounced search reduces API calls (500ms delay)

## Error Responses

### 400 Bad Request
Invalid query parameters:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "page",
      "message": "page must be a positive number"
    }
  ]
}
```

### 500 Internal Server Error
Server error:
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

## Frontend Integration

### TanStack Table Configuration

```typescript
const table = useReactTable({
  data: data?.data ?? [],
  columns,
  pageCount: data?.meta.totalPages ?? -1,
  state: {
    pagination,
    sorting,
    globalFilter,
  },
  onPaginationChange: setPagination,
  onSortingChange: setSorting,
  onGlobalFilterChange: setGlobalFilter,
  getCoreRowModel: getCoreRowModel(),
  manualPagination: true,  // Server-side pagination
  manualSorting: true,     // Server-side sorting
  manualFiltering: true,   // Server-side filtering
});
```

### React Query Integration

```typescript
const { data, isLoading, isError } = useQuery({
  queryKey: ['users', page, pageSize, sortBy, sortOrder, search],
  queryFn: () => fetchUsers({ page, pageSize, sortBy, sortOrder, search }),
  keepPreviousData: true,  // Keep showing old data while fetching
});
```

## Testing

### Example Test Cases

**Test pagination:**
```bash
curl "http://localhost:3000/api/users?page=1&pageSize=10"
curl "http://localhost:3000/api/users?page=2&pageSize=10"
```

**Test sorting:**
```bash
curl "http://localhost:3000/api/users?sortBy=name&sortOrder=asc"
curl "http://localhost:3000/api/users?sortBy=createdAt&sortOrder=desc"
```

**Test search:**
```bash
curl "http://localhost:3000/api/users?search=john"
```

**Test filters:**
```bash
curl "http://localhost:3000/api/users?filters=%7B%22role%22%3A%22admin%22%7D"
# Decoded: filters={"role":"admin"}
```

## Changelog

### v1.0.0 (2025-01-15)
- Initial API contract
- Support for pagination, sorting, search, and filters
- Standardized response format

