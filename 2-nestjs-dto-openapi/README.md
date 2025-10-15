# NestJS Controller/Service with DTOs and OpenAPI

## Overview
This example shows a production-ready NestJS implementation for managing practice exam questions with:
- **class-validator** DTOs for request/response validation
- **OpenAPI/Swagger** annotations for API documentation
- **Standardized error handling** with proper HTTP status codes
- **Service layer** separation for business logic

## Key Features
1. **Request Validation** - All inputs validated with class-validator decorators
2. **Response Envelopes** - Consistent API response format
3. **OpenAPI Documentation** - Auto-generated Swagger docs with examples
4. **Error Handling** - Standardized error responses with proper status codes
5. **Pagination** - Built-in pagination support with metadata

## API Endpoints
- `GET /questions` - List questions with pagination, search, filter
- `GET /questions/:id` - Get single question
- `POST /questions` - Create new question
- `PATCH /questions/:id` - Update question
- `DELETE /questions/:id` - Soft delete question

## Usage
Access Swagger UI at: `http://localhost:3000/api/docs`

## Files
- `question.dto.ts` - Request/response DTOs with validation
- `question.controller.ts` - REST API endpoints with OpenAPI annotations
- `question.service.ts` - Business logic layer
- `api-response.dto.ts` - Standardized response envelopes

