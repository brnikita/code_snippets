/**
 * Shared DTOs for Table API Contract
 * 
 * These types are shared between frontend and backend to ensure type safety.
 * In a monorepo, this would be in a shared package.
 */

import { IsInt, IsOptional, IsString, IsEnum, Min, Max, IsObject } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query parameters for table requests
 */
export class TableQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    enum: [10, 20, 50, 100],
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: 'Column to sort by',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Global search query',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Column-specific filters (JSON object)',
    example: { role: 'admin', status: 'active' },
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value;
  })
  @IsObject()
  filters?: Record<string, string>;
}

/**
 * Pagination metadata
 */
export interface TableMetaDto {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Standardized table response
 */
export interface TableResponseDto<T> {
  data: T[];
  meta: TableMetaDto;
}

/**
 * User data for table (example entity)
 */
export interface UserTableRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  status: 'active' | 'inactive' | 'suspended';
  subscriptionStatus: 'active' | 'canceled' | 'expired' | null;
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * Frontend table state (for reference)
 */
export interface TableState {
  pagination: {
    pageIndex: number; // 0-based for TanStack Table
    pageSize: number;
  };
  sorting: Array<{
    id: string;
    desc: boolean;
  }>;
  globalFilter: string;
  columnFilters: Array<{
    id: string;
    value: string;
  }>;
}

