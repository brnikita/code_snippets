/**
 * Users Table API Controller
 * 
 * Provides server-side table data with:
 * - Pagination
 * - Sorting
 * - Global search
 * - Column filters
 */

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersTableService } from './users-table.service';
import { TableQueryDto, TableResponseDto, UserTableRow } from './table-query.dto';

@ApiTags('Users')
@Controller('users')
export class UsersTableController {
  constructor(private readonly usersTableService: UsersTableService) {}

  /**
   * Get paginated users list with sorting and filtering
   * 
   * Example requests:
   * - GET /users?page=1&pageSize=20
   * - GET /users?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
   * - GET /users?page=1&pageSize=20&search=john
   * - GET /users?page=1&pageSize=20&filters={"role":"admin"}
   */
  @Get()
  @ApiOperation({
    summary: 'Get users table data',
    description: 'Returns paginated, sorted, and filtered users for table display',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'john@example.com',
            name: 'John Doe',
            role: 'student',
            status: 'active',
            subscriptionStatus: 'active',
            lastLoginAt: '2025-01-14T10:30:00Z',
            createdAt: '2024-12-01T08:00:00Z',
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          total: 150,
          totalPages: 8,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
    },
  })
  async getUsers(
    @Query() query: TableQueryDto,
  ): Promise<TableResponseDto<UserTableRow>> {
    return this.usersTableService.getUsers(query);
  }
}

