/**
 * Questions Controller with OpenAPI Documentation
 * 
 * Features:
 * - Full CRUD operations
 * - Request validation via DTOs
 * - Standardized responses
 * - OpenAPI/Swagger annotations
 * - RBAC guards (commented for reference)
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { QuestionService } from './question.service';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  ListQuestionsQueryDto,
  QuestionResponseDto,
} from './question.dto';
import { ApiResponseDto, ApiErrorDto } from './api-response.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';

@ApiTags('Questions')
@Controller('questions')
// @UseGuards(JwtAuthGuard) // Uncomment for authentication
// @ApiBearerAuth()
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  /**
   * List questions with pagination, search, and filters
   */
  @Get()
  @ApiOperation({ 
    summary: 'List questions',
    description: 'Get paginated list of questions with optional search and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
    type: ApiResponseDto<QuestionResponseDto[]>,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
    type: ApiErrorDto,
  })
  async findAll(
    @Query() query: ListQuestionsQueryDto,
  ): Promise<ApiResponseDto<QuestionResponseDto[]>> {
    const { data, meta } = await this.questionService.findAll(query);
    return new ApiResponseDto(data, meta);
  }

  /**
   * Get a single question by ID
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Get question by ID',
    description: 'Retrieve a single question by its UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'Question UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Question found',
    type: ApiResponseDto<QuestionResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
    type: ApiErrorDto,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<QuestionResponseDto>> {
    const question = await this.questionService.findOne(id);
    return new ApiResponseDto(question);
  }

  /**
   * Create a new question
   */
  @Post()
  // @Roles('admin', 'teacher') // Uncomment for RBAC
  // @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create question',
    description: 'Create a new question (admin/teacher only)',
  })
  @ApiBody({ type: CreateQuestionDto })
  @ApiResponse({
    status: 201,
    description: 'Question created successfully',
    type: ApiResponseDto<QuestionResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ApiErrorDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
    type: ApiErrorDto,
  })
  async create(
    @Body() createQuestionDto: CreateQuestionDto,
  ): Promise<ApiResponseDto<QuestionResponseDto>> {
    const question = await this.questionService.create(createQuestionDto);
    return new ApiResponseDto(question);
  }

  /**
   * Update an existing question
   */
  @Patch(':id')
  // @Roles('admin', 'teacher')
  // @UseGuards(RolesGuard)
  @ApiOperation({ 
    summary: 'Update question',
    description: 'Update an existing question (admin/teacher only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Question UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateQuestionDto })
  @ApiResponse({
    status: 200,
    description: 'Question updated successfully',
    type: ApiResponseDto<QuestionResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ApiErrorDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
    type: ApiErrorDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ): Promise<ApiResponseDto<QuestionResponseDto>> {
    const question = await this.questionService.update(id, updateQuestionDto);
    return new ApiResponseDto(question);
  }

  /**
   * Soft delete a question
   */
  @Delete(':id')
  // @Roles('admin')
  // @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Delete question',
    description: 'Soft delete a question (admin only). Can be restored within 30 days.',
  })
  @ApiParam({
    name: 'id',
    description: 'Question UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Question deleted successfully',
    type: ApiResponseDto<{ message: string; undoToken: string }>,
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
    type: ApiErrorDto,
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<{ message: string; undoToken: string }>> {
    const result = await this.questionService.softDelete(id);
    return new ApiResponseDto(result);
  }

  /**
   * Restore a soft-deleted question
   */
  @Post(':id/restore')
  // @Roles('admin')
  // @UseGuards(RolesGuard)
  @ApiOperation({ 
    summary: 'Restore deleted question',
    description: 'Restore a soft-deleted question using undo token',
  })
  @ApiParam({
    name: 'id',
    description: 'Question UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        undoToken: { 
          type: 'string',
          example: 'undo_abc123def456',
          description: 'Token received from delete operation',
        },
      },
      required: ['undoToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Question restored successfully',
    type: ApiResponseDto<QuestionResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired undo token',
    type: ApiErrorDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
    type: ApiErrorDto,
  })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('undoToken') undoToken: string,
  ): Promise<ApiResponseDto<QuestionResponseDto>> {
    const question = await this.questionService.restore(id, undoToken);
    return new ApiResponseDto(question);
  }
}

