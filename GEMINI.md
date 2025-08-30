
# Gemini Code-aware AI Persona

This document provides a comprehensive guide for Gemini, Google's code-aware AI, to effectively assist in the development of the SmartDeck application. It outlines the project's architecture, conventions, and key workflows, ensuring that AI-generated contributions align with the existing codebase and best practices.

## Project Overview

SmartDeck is a web application that leverages artificial intelligence to help students create interactive study materials from their course transcripts. By uploading documents in formats such as PDF, DOCX, or TXT, users can generate flashcards and multiple-choice questions (MCQs) tailored to their coursework. With features like multilingual support, user authentication, and progress tracking, SmartDeck transforms traditional studying into an efficient, engaging experience.

## Tech Stack

- **Frontend**: Next.js (React framework), TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API routes, Redis for caching/session management
- **Authentication**: Clerk
- **AI Integration**: OpenAI API for content generation
- **File Processing**: pdf-parse (PDFs), mammoth (DOCX)
- **Icons**: Lucide React
- **Utilities**: LRU-cache for rate limiting, UUID for job IDs
- **Testing**: Jest

## Project Structure

The project follows a standard Next.js `app` directory structure.

- **`/app`**: Contains the application's pages and layouts.
  - **`/app/api`**: Houses the backend API routes for AI, PDF extraction, and other server-side logic.
  - **`/app/(pages)`**: Each subdirectory corresponds to a specific page/route in the application (e.g., `/app/flashcards`, `/app/mcq`).
- **`/components`**: Contains reusable React components.
  - **`/components/ui`**: Home to the shadcn/ui components used throughout the application.
- **`/lib`**: Core business logic, utility functions, and third-party service integrations.
  - **`/lib/ai`**: Contains the logic for interacting with the OpenAI API, including prompt generation and response parsing.
  - **`/lib/document-converter.ts`**: Handles the conversion of uploaded documents (PDF, DOCX) into plain text.
  - **`/lib/redis.ts`**: Manages the connection to the Redis server for caching and session management.
- **`/docs`**: Contains detailed documentation about the project's architecture, API, and development guidelines.
- **`/public`**: Static assets such as images and fonts.
- **`/__tests__`**: Contains the Jest tests for the application.

## Getting Started

1.  **Install dependencies**: `pnpm install`
2.  **Configure environment variables**: Create a `.env.local` file and add the necessary API keys (e.g., `OPENAI_API_KEY`, `CLERK_SECRET_KEY`).
3.  **Run the development server**: `pnpm dev`

## Key Workflows

### 1. Document Upload and Processing

- **Entry Point**: `components/upload.tsx`
- **Backend API**: `/app/api/pdf-extract/route.ts`
- **Logic**:
    1. The user selects a file (PDF, DOCX, or TXT) in the `upload.tsx` component.
    2. The file is sent to the `/api/pdf-extract` API endpoint.
    3. The `document-converter.ts` library is used to extract the text from the document.
    4. The extracted text is stored, and a `jobId` is returned to the client to track the processing status.

### 2. AI Content Generation (Flashcards and MCQs)

- **Entry Point**: `/app/course-overview/page.tsx`
- **Backend API**: `/app/api/ai/route.ts`
- **Logic**:
    1. After a document is processed, the user is redirected to the course overview page.
    2. The user can then choose to generate flashcards or MCQs.
    3. A request is sent to the `/api/ai` endpoint with the extracted text and the desired content type (flashcards or MCQs).
    4. The `lib/ai/service.ts` file handles the interaction with the OpenAI API, sending the appropriate prompt and processing the response.
    5. The generated content is returned to the client and displayed on the respective page (`/app/flashcards/page.tsx` or `/app/mcq/page.tsx`).

## Coding Conventions

- **Language**: TypeScript with strict mode enabled.
- **Styling**: Tailwind CSS for all styling.
- **UI Components**: Use shadcn/ui components whenever possible.
- **State Management**: For client-side state, use React hooks. For server-side state, use Next.js API routes and Redis.
- **API Routes**: Follow the existing structure in the `/app/api` directory.
- **Error Handling**: Use the `error-dialog.tsx` component to display errors to the user.
- **Logging**: Use the `logging.ts` utility for logging server-side events.

## Testing

- **Framework**: Jest
- **Run tests**: `pnpm test`
- **Test files**: Locate test files in the `__tests__` directory, mirroring the structure of the `lib` directory.
- **New tests**: When adding new features, please include corresponding tests.
