/**
 * TanStack Table with Server-Side Processing
 * 
 * Features:
 * - Server-side pagination (only fetches current page)
 * - Server-side sorting (click column headers)
 * - Global search with debouncing
 * - Column-specific filters
 * - Loading/error/empty states
 * - Responsive design
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { UserTableRow, TableResponseDto } from './table-query.dto';

/**
 * Fetch users from API
 */
async function fetchUsers(params: {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}): Promise<TableResponseDto<UserTableRow>> {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    pageSize: params.pageSize.toString(),
    ...(params.sortBy && { sortBy: params.sortBy }),
    ...(params.sortOrder && { sortOrder: params.sortOrder }),
    ...(params.search && { search: params.search }),
  });

  const response = await fetch(`/api/users?${queryParams}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  
  return response.json();
}

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  const colors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800',
    canceled: 'bg-orange-100 text-orange-800',
    expired: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export default function UsersTable() {
  // Table state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0, // TanStack Table uses 0-based indexing
    pageSize: 20,
  });
  
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true }, // Default sort
  ]);
  
  const [globalFilter, setGlobalFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalFilter);
      setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [globalFilter]);

  // Fetch data from API
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      'users',
      pagination.pageIndex + 1, // Convert to 1-based for API
      pagination.pageSize,
      sorting[0]?.id,
      sorting[0]?.desc ? 'desc' : 'asc',
      debouncedSearch,
    ],
    queryFn: () =>
      fetchUsers({
        page: pagination.pageIndex + 1, // API expects 1-based
        pageSize: pagination.pageSize,
        sortBy: sorting[0]?.id,
        sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
        search: debouncedSearch,
      }),
    keepPreviousData: true, // Keep showing old data while fetching new
  });

  // Define columns
  const columns = useMemo<ColumnDef<UserTableRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (info) => (
          <div>
            <div className="font-medium text-gray-900">{info.getValue() as string}</div>
            <div className="text-sm text-gray-500">{info.row.original.email}</div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: (info) => (
          <span className="capitalize">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue() as string} />,
      },
      {
        accessorKey: 'subscriptionStatus',
        header: 'Subscription',
        cell: (info) => {
          const value = info.getValue() as string | null;
          return value ? <StatusBadge status={value} /> : <span className="text-gray-400">None</span>;
        },
      },
      {
        accessorKey: 'lastLoginAt',
        header: 'Last Login',
        cell: (info) => (
          <span className="text-sm text-gray-600">
            {formatDate(info.getValue() as string | null)}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined',
        cell: (info) => (
          <span className="text-sm text-gray-600">
            {formatDate(info.getValue() as string)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex gap-2">
            <button
              onClick={() => console.log('Edit', info.row.original.id)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => console.log('Delete', info.row.original.id)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // Initialize table
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
    manualPagination: true, // Server-side pagination
    manualSorting: true, // Server-side sorting
    manualFiltering: true, // Server-side filtering
  });

  return (
    <div className="w-full space-y-4">
      {/* Header with search and controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <p className="text-sm text-gray-600 mt-1">
            {data?.meta.total ?? 0} total users
          </p>
        </div>

        <div className="flex gap-3 items-center">
          {/* Search input */}
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search users..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Page size selector */}
          <select
            value={pagination.pageSize}
            onChange={(e) => {
              setPagination({ pageIndex: 0, pageSize: Number(e.target.value) });
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none flex items-center gap-2'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="text-gray-400">
                              {{
                                asc: '↑',
                                desc: '↓',
                              }[header.column.getIsSorted() as string] ?? '↕'}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {/* Loading state */}
              {isLoading && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600">Loading users...</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Error state */}
              {isError && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="text-red-600">
                      <p className="font-medium">Error loading users</p>
                      <p className="text-sm mt-1">{(error as Error).message}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!isLoading && !isError && table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <p className="font-medium">No users found</p>
                      <p className="text-sm mt-1">
                        {globalFilter
                          ? 'Try adjusting your search query'
                          : 'Get started by creating your first user'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!isLoading &&
                !isError &&
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {!isLoading && !isError && data && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
              {Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                data.meta.total
              )}{' '}
              of {data.meta.total} results
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!data.meta.hasPreviousPage}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ««
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!data.meta.hasPreviousPage}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              
              <span className="px-3 py-1 text-sm text-gray-600">
                Page {pagination.pageIndex + 1} of {data.meta.totalPages}
              </span>
              
              <button
                onClick={() => table.nextPage()}
                disabled={!data.meta.hasNextPage}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ›
              </button>
              <button
                onClick={() => table.setPageIndex(data.meta.totalPages - 1)}
                disabled={!data.meta.hasNextPage}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

