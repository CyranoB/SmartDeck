# Backend Structure Document

> **Key Points**
> - Serverless architecture with Next.js API routes for scalability
> - Stateless design with client-side session storage for transcript text
> - RESTful API approach with operation-based routing
> - Server-side asynchronous PDF processing using `pdf-parse` and Redis for status tracking (no temp files)
> - OpenAI integration for AI processing
> - Comprehensive error handling and logging
> - Configurable file size (client-side enforced) and word count limits via environment variables

This document provides an overview of the backend structure for the AI Flashcard Generator, ensuring clarity in design for both technical and non-technical readers. It explains how the system processes course transcripts, interacts with AI, and manages temporary session data.

## Backend Architecture

The backend is built using serverless functions that operate in a stateless manner. The following design patterns and frameworks are used to ensure scalability, maintainability, and performance:

- **Next.js API Routes:** Core business logic (upload processing, AI analysis, flashcard generation, session management) is implemented as API routes within the Next.js framework, leveraging its built-in routing system.
- **Serverless Functions:** The API routes are deployed as serverless functions, promoting a decoupled architecture that scales on demand.
- **Configuration Management:** A centralized configuration system (`/lib/config.ts`) manages environment variables for file size limits, word counts, API keys, and other configurable parameters.
- **Stateless Sessions:** Session state for the final transcript text is managed client-side using `sessionStorage`.
- **Server-Side PDF Processing:** PDF text extraction is handled asynchronously by a dedicated API route (`/api/pdf-extract`). It uses the `pdf-parse` library directly within the API route (no temporary file storage needed) and tracks job status using Redis. This avoids blocking the client UI and handles potentially long-running extractions.

## Data Management

The project does not use a traditional persistent database. Instead, it focuses on transient data storage and efficient data processing during each session:

- **Client-Side Storage:** `sessionStorage` is used to store the final extracted transcript text before sending it for AI processing.
- **Server-Side Processing:** Data (like PDFs) is processed on-demand within serverless functions. AI processing also happens server-side.
- **PDF Processing State (Redis):** Redis (Upstash) is used server-side to store the state (`status`, `progress`, `result`, `error`) of asynchronous PDF extraction jobs, identified by a unique job ID. This allows the client to poll for updates without maintaining server-side session state.

## API Design and Endpoints

The API is designed with a RESTful approach, implemented as Next.js API routes:

- **PDF Extraction Trigger Endpoint (POST /api/pdf-extract):**
  - Accepts a PDF file upload (via FormData).
  - Reads the file buffer directly in the API route.
  - Initiates the text extraction process using `pdf-parse`.
  - Stores the initial job status in Redis.
  - Returns a unique `jobId` to the client immediately.
- **PDF Extraction Status Endpoint (GET /api/pdf-extract/status/[jobId]):**
  - Accepts a `jobId` as a path parameter.
  - Retrieves the current status, progress, result (text), or error for the specified job from Redis.
  - Allows the client to poll for updates on the background extraction process.
- **AI Processing Endpoint (POST /api/ai):**
  - Handles multiple operations: transcript analysis, flashcard generation, etc. (as previously described).
  - Accepts extracted text (retrieved from client-side `sessionStorage`).
  - Interacts with OpenAI's API.

## OpenAI Integration

The application integrates with OpenAI's API for natural language processing tasks:

- **AI SDK:** Utilizes the `@ai-sdk/openai` package for streamlined interaction with OpenAI's API.
- **Model Configuration:** Uses the GPT-4o-Mini model by default, configurable through environment variables.
- **Prompt Engineering:** Implements carefully crafted prompts for transcript analysis and flashcard generation, ensuring high-quality and relevant outputs.
- **Large Transcript Handling:** For transcripts exceeding the configured character threshold, the system automatically extracts a representative sample to optimize API usage.

## Configuration System

The application uses a centralized configuration system (`/lib/config.ts`) that provides:

- **File Size Limits:**
  - `NEXT_PUBLIC_MAX_FILE_SIZE_MB`: Maximum allowed file size in megabytes (default: 25MB). Prefix `NEXT_PUBLIC_` is required for client-side access where the check is enforced.
  - `maxFileSizeBytes`: Calculated value in bytes used in the configuration.

- **Word Count Limits:**
  - `MAX_WORD_COUNT`: Maximum allowed word count in a transcript (default: 50,000)
  - `MIN_WORD_COUNT`: Minimum required word count for meaningful analysis (default: 500)

- **Transcript Processing:**
  - `TRANSCRIPT_WORD_THRESHOLD`: Word-based threshold for transcript chunking (default: 15,000)
  - When a transcript exceeds this threshold, the system extracts a representative sample from beginning, middle, and end portions
  - Uses a `countWords` function that intelligently splits text by whitespace for accurate word counting

- **Rate Limiting:**
  - `RATE_LIMIT_REQUESTS_PER_MINUTE`: Maximum requests allowed per IP (default: 10)
  - `RATE_LIMIT_INTERVAL_MS`: Time window for rate limiting (default: 60,000ms)
  - `RATE_LIMIT_MAX_TRACKED_IPS`: Maximum number of tracked IPs (default: 500)

These configuration values can be adjusted via environment variables without code changes, allowing for flexible deployment in different environments.

## Language Support

The backend supports multilingual content generation:

- **Dynamic Language Selection:** The API accepts a `language` parameter to generate content in either English or French.
- **Localized Prompts:** AI prompts are dynamically adjusted based on the selected language.

## Security Measures

Security in this project is approached in several layers:

- **Environment Variables:** Sensitive configuration data, including the OpenAI API key, is stored in environment variables.
- **Server-Side Validation:** The `getOpenAIConfig` function in `/lib/env.ts` ensures proper configuration of OpenAI credentials before processing requests.
- **Input Validation:** API routes implement checks to ensure valid input data before processing.
- **Size Validation:** Requests are validated against configurable size limits to prevent resource exhaustion.
- **CORS:** By default, Next.js API routes are protected against cross-origin requests.

## Error Handling

The API implements comprehensive error handling:

- **Try-Catch Blocks:** All API operations are wrapped in try-catch blocks to catch and handle exceptions.
- **Specific Error Responses:** Different types of errors (e.g., configuration errors, processing errors) return appropriate HTTP status codes and error messages.
- **Size Limit Errors:** Provides clear error messages when file size or word count limits are exceeded.
- **Client-Side Feedback:** Errors are communicated back to the client for display to the user via toast notifications.

## Performance Considerations

Several measures are in place to optimize performance:

- **Serverless Architecture:** Enables automatic scaling based on demand.
- **Asynchronous PDF Processing:** Server-side extraction runs in the background, preventing API timeouts and keeping the client responsive. The client polls Redis via a status endpoint.
- **Frontend File Size Limit:** Prevents processing of excessively large files, mitigating potential errors (like Redis size limits) and providing faster user feedback.
- **Redis for State:** Provides fast access to job status for polling clients.
- **Transcript Chunking:** Large transcripts (post-extraction) are sampled before sending to AI to optimize API usage.
- **Configurable Limits:** File size (frontend) and word count limits can be adjusted.
- **Redis Size Limit Mitigation:** The frontend file size limit currently prevents storing excessively large extracted text blobs in Redis status, but this remains a potential area for improvement (e.g., using alternative storage like Vercel Blob/S3 for results).

## Monitoring and Maintenance

While specific monitoring tools are not explicitly implemented in the provided code, the serverless nature of the application allows for:

- **Automatic Scaling:** The serverless functions automatically scale based on demand.
- **Built-in Logging:** Next.js and the serverless platform provide built-in logging capabilities for debugging and monitoring.

## Conclusion

The backend of the AI Flashcard Generator is designed to be scalable, secure, and efficient. It leverages Next.js API routes and serverless functions to provide a robust platform for AI-powered flashcard generation. The stateless architecture, combined with client-side storage, ensures a responsive user experience while maintaining data privacy and minimizing server-side complexity.
