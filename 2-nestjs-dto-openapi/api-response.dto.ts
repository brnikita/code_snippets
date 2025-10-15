/**
 * Standardized API Response Envelopes
 * 
 * Provides consistent response format across all endpoints:
 * - Success responses with data and metadata
 * - Error responses with structured error info
 * - Pagination metadata for list endpoints
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard success response wrapper
 */
export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiProperty({ required: false })
  meta?: PaginationMetaDto;

  @ApiProperty({ example: '2025-01-15T10:30:00Z' })
  timestamp: string;

  constructor(data: T, meta?: PaginationMetaDto) {
    this.success = true;
    this.data = data;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Pagination metadata
 */
export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 20, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 150, description: 'Total number of items' })
  total: number;

  @ApiProperty({ example: 8, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ example: true, description: 'Whether there is a next page' })
  hasNextPage: boolean;

  @ApiProperty({ example: false, description: 'Whether there is a previous page' })
  hasPreviousPage: boolean;
}

/**
 * Standard error response
 */
export class ApiErrorDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ 
    example: 'Validation failed',
    description: 'Error message' 
  })
  message: string;

  @ApiProperty({ 
    example: 'VALIDATION_ERROR',
    description: 'Machine-readable error code' 
  })
  code: string;

  @ApiProperty({ 
    example: 400,
    description: 'HTTP status code' 
  })
  statusCode: number;

  @ApiProperty({ 
    required: false,
    example: [
      { field: 'text', message: 'text should not be empty' }
    ],
    description: 'Validation error details' 
  })
  errors?: Array<{ field: string; message: string }>;

  @ApiProperty({ example: '2025-01-15T10:30:00Z' })
  timestamp: string;

  constructor(message: string, code: string, statusCode: number, errors?: any[]) {
    this.success = false;
    this.message = message;
    this.code = code;
    this.statusCode = statusCode;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
  }
}

