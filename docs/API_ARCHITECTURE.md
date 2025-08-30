# API Architecture Documentation


> **Key Points**
> - Modular architecture with clear separation of concerns (route handlers, controllers, services)
> - Robust middleware for request validation, IP verification, and rate limiting
> - Centralized error handling and standardized logging
> - Dedicated prompt templates separated from business logic, stored as plain text files and loaded/interpolated at runtime
> - Comprehensive response parsing with error recovery

This document outlines the architecture of the AI API implementation in the Flash Cards application, focusing on the recent refactoring for improved maintainability and the migration to file-based prompt templates.

## Overview

The AI API (`/api/ai`) is built using Next.js App Router with Route Handlers, providing a serverless architecture for AI operations like analyzing transcripts and generating study materials. The codebase follows a modular design with clear separation of concerns. All prompt templates are now stored as plain text files in `lib/ai/prompts/` and loaded/interpolated at runtime, which enables easy editing and localization without code changes.

**Note:** This API receives pre-processed text as input. Document upload and text extraction (including asynchronous PDF processing via `/api/pdf-extract` and Redis) are handled by separate components and API routes, as detailed in the Backend Structure Document.

## Directory Structure

```
/app
  /api
    /ai
      route.ts            # Main API route handler
/lib
  /ai
    controller.ts         # Operation-specific controllers
    prompts/              # AI prompt templates (plain text, file-based)
    service.ts            # AI service logic
  errors.ts               # Custom error types
  logging.ts              # Centralized logging
  middleware.ts           # Request validation and rate limiting
  env.ts                  # Environment configuration
  rate-limit.ts           # Rate limiting implementation
```

## Component Responsibilities

### Route Handler (`/app/api/ai/route.ts`)

The route handler serves as the entry point for all AI operations and has the following responsibilities:
- Extracting and validating client IP addresses
- Applying rate limiting
- Validating request bodies
- Routing requests to appropriate controllers
- Handling errors and generating appropriate HTTP responses

```typescript
export async function POST(request: Request) {
  // IP validation and rate limiting
  // Request body validation
  // Route to appropriate controller
  // Error handling
}
```

### Controllers (`/lib/ai/controller.ts`)

Controllers handle specific operation types and are responsible for:
- Extracting operation-specific parameters from request bodies
- Calling appropriate service functions
- Logging successful operations
- Handling operation-specific errors

```typescript
export async function handleAnalyze(body: any, ip: string) {
  // Extract parameters
  // Call service function
  // Log and return response
}
```

### Services (`/lib/ai/service.ts`)

The service layer contains the core business logic:
- Making AI requests with appropriate parameters
- Cleaning and parsing AI responses
- Handling AI-specific errors
- Providing typed interfaces for AI operations

```typescript
export async function analyzeTranscript(params: AnalyzeParams) {
  // Generate prompt
  // Make AI request
  // Parse and return response
}
```

### Prompt Templates (`/lib/ai/prompts.ts`)

This module contains all AI prompt templates:
- Separated by operation type
- Parameterized for dynamic content
- Includes language-specific instructions

```typescript
export const prompts = {
  analyze: (transcript: string, language: string) => `...`,
  generateBatch: (courseData, transcript, count, language) => `...`,
  // ...
}
```

### Middleware (`/lib/middleware.ts`)

The middleware module provides:
- IP validation and normalization
- Request body validation
- Rate limiting implementation
    - Type definitions for middleware operations
    - Validates difficulty parameters for both flashcard and MCQ generation

```typescript
export function isValidIP(ip: string): boolean {
  // Validate IP format
}

export function validateDifficulty(difficulty?: number): number {
  // Validate and normalize difficulty level (1-5)
  // Returns default (3) if not provided or invalid
}

export async function applyRateLimit(ip: string): Promise<RateLimitResult> {
  // Apply rate limiting
}
```

### Logging (`/lib/logging.ts`)

The logging module provides:
- Standardized log format
- Consistent timestamp generation
- Type-safe logging functions

```typescript
export function logApiRequest(type: string, ip: string, status: number, error?: string) {
  // Generate and log standardized format
}
```

## Error Handling

The application implements a comprehensive error handling strategy:
1. **Custom Error Types**: ValidationError, RateLimitError, ConfigurationError
2. **Operation-Specific Handling**: Each controller handles errors specific to its operation
3. **Fallback Handling**: The route handler provides fallback error handling
4. **Detailed Logging**: All errors are logged with relevant context

## Response Parsing

A key improvement in the refactored code is the robust handling of AI responses:
- The `cleanAIResponse` function removes markdown formatting
- JSON parsing follows a three-tiered approach:
  1. Direct parsing with standard `JSON.parse()`
  2. Simple repair for common JSON syntax issues
  3. Structure-specific pattern extraction for severely malformed responses
- Specialized extraction for both flashcard and MCQ formats
- The service layer provides type-safe parsing of responses

## Rate Limiting

Rate limiting is implemented using:
- LRU cache for tracking request counts by IP
- Configurable limits via environment variables
- Proper HTTP headers for rate limit information
- Graceful handling of rate limit errors

## Difficulty Management

The API incorporates a difficulty management system:
- **Type Definition**: Uses `DifficultyLevel` type (1-5) for type safety
- **Parameter Validation**: Validates and normalizes difficulty input in middleware
- **Batch Processing**: Adjusts batch sizes based on difficulty (smaller batches for higher difficulties)
- **Prompt Construction**: Modifies AI prompts based on difficulty level:
  - Lower difficulties (1-2): Simpler vocabulary, more basic concepts
  - Medium difficulty (3): Standard academic terminology
  - Higher difficulties (4-5): Advanced vocabulary, complex concepts
- **Default Handling**: Falls back to medium difficulty (3) when not specified

## Progress Tracking

For operations that may require multiple API calls (like generating large batches):
- Controllers support progress callback parameters
- Services track and report generation progress
- This enables frontend progress indicators via `ProgressContext`

## Future Improvements

Potential future improvements to the architecture:
1. **Schema Validation**: Add Zod or similar for request/response schema validation
2. **Unit Testing**: Add comprehensive unit tests for each module
3. **Metrics Collection**: Add performance metrics collection
4. **Caching Layer**: Add response caching for frequently requested operations
5. **Circuit Breaker**: Implement circuit breaker pattern for AI service calls
6. **Enhanced Progress Tracking**: Add more granular progress updates for PDF extraction
