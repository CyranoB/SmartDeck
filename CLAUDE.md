# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development Server
```bash
pnpm dev        # Start development server (preferred package manager)
npm run dev     # Alternative with npm
yarn dev        # Alternative with yarn
```

### Building and Testing
```bash
pnpm build      # Build for production
pnpm start      # Start production server
pnpm lint       # Run Next.js linting
pnpm test       # Run Jest tests
pnpm test:watch # Run tests in watch mode
pnpm test:coverage # Run tests with coverage report
```

### Testing Individual Components
```bash
pnpm test -- --testNamePattern="ComponentName"  # Run specific test
pnpm test -- path/to/test.ts                    # Run specific test file
```

## Application Architecture

### Core Technologies
- **Next.js 15** with App Router and React 19
- **TypeScript** with strict typing
- **Tailwind CSS** with shadcn/ui components
- **Clerk** for authentication (optional, conditionally enabled)
- **OpenAI API** for AI content generation
- **Redis (Upstash)** for background job status tracking
- **pnpm** as the preferred package manager

### Project Structure
```
app/                    # Next.js App Router pages and API routes
├── api/               # API endpoints
│   ├── ai/           # AI processing route
│   └── pdf-extract/  # PDF text extraction with background jobs
├── (pages)/          # Route pages (start, flashcards, mcq, etc.)
├── layout.tsx        # Root layout with conditional Clerk integration
└── globals.css       # Global styles

lib/                   # Core application logic
├── ai/               # AI service layer
│   ├── service.ts    # AI API integration with robust response parsing
│   ├── controller.ts # Request handling controllers
│   ├── prompts/      # File-based prompt templates (*.txt)
│   └── prompt-utils.ts # Prompt loading and interpolation
├── config.ts         # Centralized configuration
├── env.ts           # Environment variable handling
├── middleware.ts    # Rate limiting and validation
└── errors.ts        # Custom error types

components/           # React components
├── ui/              # shadcn/ui components
└── (custom)/        # Application-specific components

contexts/            # React context providers
hooks/              # Custom React hooks
docs/               # Comprehensive documentation
types/              # TypeScript type definitions
```

### API Architecture

The application uses a modular API architecture with clear separation of concerns:

- **Route Handlers** (`app/api/*/route.ts`): Handle HTTP requests, IP validation, rate limiting
- **Controllers** (`lib/ai/controller.ts`): Process operation-specific logic
- **Services** (`lib/ai/service.ts`): Core business logic with AI integration
- **Middleware** (`lib/middleware.ts`): Request validation, rate limiting, IP verification

### AI Integration
- **File-based Prompts**: Templates stored in `lib/ai/prompts/` as plain text files
- **Multi-language Support**: English and French prompt templates
- **Robust Response Parsing**: Three-tier JSON parsing with repair mechanisms
- **Difficulty Levels**: 1-5 scale with dynamic batch sizing for complex requests
- **Batch Processing**: Intelligent chunking for large generation requests

### Authentication
Authentication is **conditionally enabled** via environment variables:
- When `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set, Clerk authentication is active
- When not set, the app runs without authentication
- Check `isClerkEnabled` state in components before using Clerk hooks

### Background Job Processing
PDF extraction runs as background jobs tracked via Redis:
- Upload triggers background processing job
- Client polls `/api/pdf-extract/status/[jobId]` for status
- Status includes: `processing`, `completed`, `failed` with progress percentage

### Environment Configuration
Key environment variables:
```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional - Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Optional - Configuration
OPENAI_MODEL=gpt-4o-mini  # Default model
OPENAI_BASE_URL=https://api.openai.com/v1  # Default endpoint
RATE_LIMIT_REQUESTS_PER_MINUTE=10  # Default rate limit
NEXT_PUBLIC_MAX_FILE_SIZE_MB=25  # Default file size limit
```

## Development Guidelines

### Code Style
- Use TypeScript with strict mode enabled
- Follow existing naming conventions (camelCase for variables, PascalCase for components)
- Prefer `const` assertions and explicit typing where beneficial
- Use Tailwind CSS classes following existing patterns

### File Processing
- PDF processing uses `pdf-parse` with a custom patch applied (`pnpm patch`)
- DOCX processing uses `mammoth` library
- File uploads are validated on both client and server side
- Large text extraction results are stored temporarily in Redis

### Error Handling
- Use custom error types: `ValidationError`, `RateLimitError`, `ConfigurationError`
- All API routes implement comprehensive error handling
- Errors are logged with structured format including IP, timestamp, and context

### Security Considerations
- Rate limiting implemented via LRU cache per IP address
- Input validation on all API endpoints
- Content Security Policy configured via environment variables
- IP address validation and normalization
- File size limits enforced on upload

### Testing
- Jest configured for unit testing
- Test files should be placed in `__tests__/` directory
- Focus on testing utility functions and API logic
- Use TypeScript for test files

### AI Content Generation Best Practices
- Always validate and sanitize AI responses
- Use difficulty-appropriate batch sizes (higher difficulty = smaller batches)
- Include existing content context to avoid duplication
- Implement progress tracking for long-running operations
- Handle partial results gracefully when batch generation fails

## Important Notes

- The codebase uses **pnpm** as the preferred package manager
- Always run linting before committing changes
- The app can run with or without authentication depending on environment setup
- AI prompts are stored as separate text files for easy editing and localization
- Background PDF processing prevents API timeouts for large files
- Rate limiting protects against abuse while allowing reasonable usage patterns