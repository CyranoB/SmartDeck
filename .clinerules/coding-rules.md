## Brief overview
This set of guidelines covers the coding standards, frameworks, and architectural patterns for the SmartDeck flashcard application. These rules ensure consistency across the codebase and align with the project's technical requirements for building an AI-powered study companion for university students.

## Framework and architecture
- Use Next.js 15 with App Router architecture exclusively for all routing
- Follow the directory structure with app/ for routes and lib/ for business logic
- Implement serverless architecture for all backend operations
- Separate API logic into route handlers, controllers, and services
- Use TypeScript with strict type checking throughout the codebase
- Implement modular architecture with clear separation of concerns

## Component structure
- Place reusable UI components in the components/ directory
- Store shadcn UI components in components/ui/
- Keep page components in app/[route]/page.tsx following Next.js App Router conventions
- Use server components by default, client components only when necessary
- Implement layout components for consistent UI scaffolding

## State management
- Use client-side sessionStorage for temporary data management between pages
- Implement React Context (ProgressContext) for tracking generation progress
- Clear sessionStorage appropriately when sessions end
- Store structured data with consistent naming conventions:
  - "transcript" for extracted document text
  - "courseData" for AI-generated subject and outline
  - "contentLanguage" for content generation language
  - "flashcards" for studied flashcards
  - "mcqSessionData" for MCQ session details

## API implementation
- Structure API routes under app/api/ with Route Handlers
- Implement comprehensive middleware for request validation and rate limiting
- Use centralized error handling and standardized logging
- Separate AI prompt templates from business logic
- Apply proper rate limiting with appropriate HTTP headers
- Implement robust response parsing with error recovery

## Styling
- Use Tailwind CSS with utility-first approach for all styling
- Maintain consistent theming with light and dark mode support
- Follow accessibility best practices for all UI components
- Use shadcn components for consistent UI elements
- Implement responsive design for all pages

## Error handling
- Implement comprehensive error handling for all operations
- Use custom error types (ValidationError, RateLimitError, ConfigurationError)
- Provide visual feedback for all errors
- Log all errors with relevant context
- Implement fallback error handling in route handlers

## Performance optimization
- Implement frontend file size limits to prevent processing large files
- Use asynchronous PDF processing to prevent API timeouts
- Apply transcript chunking for large documents
- Implement proper caching mechanisms for AI responses
- Use Redis for fast access to job status during polling


## Testing Standards
-   Unit tests required for business logic
-   Integration tests for API endpoints
-   E2E tests for critical user flows
