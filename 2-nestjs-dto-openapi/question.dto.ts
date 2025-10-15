/**
 * Question DTOs with class-validator validation
 * 
 * All DTOs include:
 * - Validation decorators for runtime checks
 * - OpenAPI decorators for Swagger documentation
 * - Example values for API docs
 */

import { 
  IsString, 
  IsNotEmpty, 
  IsArray, 
  ArrayMinSize, 
  ArrayMaxSize,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  Length,
  IsBoolean,
  IsUUID
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum QuestionDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum QuestionCategory {
  MATH = 'MATH',
  SCIENCE = 'SCIENCE',
  HISTORY = 'HISTORY',
  LANGUAGE = 'LANGUAGE',
}

/**
 * DTO for creating a new question
 */
export class CreateQuestionDto {
  @ApiProperty({
    description: 'Question text',
    example: 'What is the capital of France?',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 500)
  text: string;

  @ApiProperty({
    description: 'Array of answer options',
    example: ['Paris', 'London', 'Berlin', 'Madrid'],
    minItems: 2,
    maxItems: 6,
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  options: string[];

  @ApiProperty({
    description: 'Index of the correct answer (0-based)',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  correctAnswerIndex: number;

  @ApiProperty({
    description: 'Question difficulty level',
    enum: QuestionDifficulty,
    example: QuestionDifficulty.MEDIUM,
  })
  @IsEnum(QuestionDifficulty)
  difficulty: QuestionDifficulty;

  @ApiProperty({
    description: 'Question category',
    enum: QuestionCategory,
    example: QuestionCategory.HISTORY,
  })
  @IsEnum(QuestionCategory)
  category: QuestionCategory;

  @ApiPropertyOptional({
    description: 'Optional explanation for the correct answer',
    example: 'Paris has been the capital of France since 987 AD.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  explanation?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['geography', 'europe', 'capitals'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * DTO for updating a question (all fields optional)
 */
export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}

/**
 * DTO for query parameters when listing questions
 */
export class ListQuestionsQueryDto {
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
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search query (searches in question text)',
    example: 'capital',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by difficulty',
    enum: QuestionDifficulty,
    example: QuestionDifficulty.MEDIUM,
  })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: QuestionCategory,
    example: QuestionCategory.HISTORY,
  })
  @IsOptional()
  @IsEnum(QuestionCategory)
  category?: QuestionCategory;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'difficulty', 'text'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * Response DTO for a single question
 */
export class QuestionResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Question UUID',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    example: 'What is the capital of France?',
  })
  text: string;

  @ApiProperty({
    example: ['Paris', 'London', 'Berlin', 'Madrid'],
    type: [String],
  })
  options: string[];

  @ApiProperty({
    example: 0,
    description: 'Only included for admin users',
  })
  correctAnswerIndex?: number;

  @ApiProperty({
    enum: QuestionDifficulty,
    example: QuestionDifficulty.MEDIUM,
  })
  difficulty: QuestionDifficulty;

  @ApiProperty({
    enum: QuestionCategory,
    example: QuestionCategory.HISTORY,
  })
  category: QuestionCategory;

  @ApiProperty({
    example: 'Paris has been the capital of France since 987 AD.',
    required: false,
  })
  explanation?: string;

  @ApiProperty({
    example: ['geography', 'europe', 'capitals'],
    type: [String],
    required: false,
  })
  tags?: string[];

  @ApiProperty({
    example: false,
    description: 'Soft delete flag',
  })
  isDeleted: boolean;

  @ApiProperty({
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    example: '2025-01-15T10:30:00Z',
  })
  updatedAt: string;

  @ApiProperty({
    example: '2025-01-15T10:30:00Z',
    required: false,
    description: 'When the question was soft-deleted',
  })
  deletedAt?: string;
}

