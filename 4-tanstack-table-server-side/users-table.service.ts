/**
 * Users Table Service
 * 
 * Handles database queries for table data with:
 * - Efficient pagination (LIMIT/OFFSET)
 * - Dynamic sorting
 * - Full-text search
 * - Column filtering
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Brackets } from 'typeorm';
import {
  TableQueryDto,
  TableResponseDto,
  TableMetaDto,
  UserTableRow,
} from './table-query.dto';

// TypeORM Entity (for reference)
// @Entity('users')
// export class User {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;
//
//   @Column()
//   email: string;
//
//   @Column()
//   name: string;
//
//   @Column({ type: 'enum', enum: ['admin', 'teacher', 'student'] })
//   role: string;
//
//   @Column({ type: 'enum', enum: ['active', 'inactive', 'suspended'] })
//   status: string;
//
//   @Column({ nullable: true })
//   subscriptionStatus: string;
//
//   @Column({ type: 'timestamp', nullable: true })
//   lastLoginAt: Date;
//
//   @CreateDateColumn()
//   createdAt: Date;
// }

@Injectable()
export class UsersTableService {
  // Whitelist of sortable columns (prevent SQL injection)
  private readonly SORTABLE_COLUMNS = [
    'name',
    'email',
    'role',
    'status',
    'subscriptionStatus',
    'lastLoginAt',
    'createdAt',
  ];

  // Whitelist of filterable columns
  private readonly FILTERABLE_COLUMNS = ['role', 'status', 'subscriptionStatus'];

  constructor(
    // @InjectRepository(User)
    // private userRepository: Repository<User>,
  ) {}

  /**
   * Get paginated users with sorting and filtering
   */
  async getUsers(query: TableQueryDto): Promise<TableResponseDto<UserTableRow>> {
    const { page = 1, pageSize = 20, sortBy, sortOrder, search, filters } = query;

    // Build query
    // const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Mock query builder for demonstration
    const queryBuilder = {
      where: () => queryBuilder,
      andWhere: () => queryBuilder,
      orderBy: () => queryBuilder,
      skip: () => queryBuilder,
      take: () => queryBuilder,
      getManyAndCount: async () => [[], 0],
    } as any;

    // Apply global search
    if (search && search.trim()) {
      this.applyGlobalSearch(queryBuilder, search);
    }

    // Apply column filters
    if (filters && Object.keys(filters).length > 0) {
      this.applyColumnFilters(queryBuilder, filters);
    }

    // Apply sorting
    if (sortBy && this.SORTABLE_COLUMNS.includes(sortBy)) {
      const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
      queryBuilder.orderBy(`user.${sortBy}`, order);
    } else {
      // Default sort
      queryBuilder.orderBy('user.createdAt', 'DESC');
    }

    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Execute query
    // const [users, total] = await queryBuilder.getManyAndCount();

    // Mock data for demonstration
    const users: UserTableRow[] = this.generateMockUsers(pageSize, page);
    const total = 150; // Mock total

    // Calculate metadata
    const meta: TableMetaDto = {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    };

    // Transform to response format
    const data = users.map((user) => this.transformUserToTableRow(user));

    return { data, meta };
  }

  /**
   * Apply global search across multiple columns
   * 
   * Searches in: name, email
   * Uses ILIKE for case-insensitive search (PostgreSQL)
   */
  private applyGlobalSearch(
    queryBuilder: SelectQueryBuilder<any>,
    search: string,
  ): void {
    const searchTerm = `%${search.toLowerCase()}%`;

    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where('LOWER(user.name) LIKE :search', { search: searchTerm })
          .orWhere('LOWER(user.email) LIKE :search', { search: searchTerm });
      }),
    );
  }

  /**
   * Apply column-specific filters
   * 
   * Example filters:
   * { role: 'admin', status: 'active' }
   */
  private applyColumnFilters(
    queryBuilder: SelectQueryBuilder<any>,
    filters: Record<string, string>,
  ): void {
    Object.entries(filters).forEach(([column, value]) => {
      // Only apply whitelisted filters
      if (this.FILTERABLE_COLUMNS.includes(column) && value) {
        queryBuilder.andWhere(`user.${column} = :${column}`, {
          [column]: value,
        });
      }
    });
  }

  /**
   * Transform User entity to UserTableRow DTO
   */
  private transformUserToTableRow(user: any): UserTableRow {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      subscriptionStatus: user.subscriptionStatus,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  /**
   * Generate mock users for demonstration
   */
  private generateMockUsers(pageSize: number, page: number): UserTableRow[] {
    const users: UserTableRow[] = [];
    const roles = ['admin', 'teacher', 'student'];
    const statuses = ['active', 'inactive', 'suspended'];
    const subscriptionStatuses = ['active', 'canceled', 'expired', null];

    for (let i = 0; i < pageSize; i++) {
      const index = (page - 1) * pageSize + i;
      users.push({
        id: `user-${index}`,
        email: `user${index}@example.com`,
        name: `User ${index}`,
        role: roles[index % roles.length] as any,
        status: statuses[index % statuses.length] as any,
        subscriptionStatus: subscriptionStatuses[index % subscriptionStatuses.length] as any,
        lastLoginAt:
          index % 3 === 0
            ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return users;
  }
}

