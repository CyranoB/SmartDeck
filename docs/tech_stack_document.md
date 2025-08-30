# Tech Stack Document

> **Key Points**
> - Next.js 15 with App Router for modern React-based frontend
> - TypeScript for type safety and code reliability
> - Tailwind CSS with shadcn components for consistent UI
> - Server-side PDF text extraction using `pdf-parse` with background job status tracking via Redis (no temp files)
> - Serverless architecture for scalable, cost-effective processing
> - OpenAI API integration for AI-powered content generation
> - File-based prompt templates in `lib/ai/prompts/` for maintainability and localization
> - Client-side session storage for temporary data management
> - Clerk for authentication

This document explains the technology choices behind our modern flashcard website for university students, detailing how each component works together to achieve an intuitive, efficient, and visually appealing study assistant. The design employs clear, modern styling and leverages advanced AI integration, all while keeping the user experience uncomplicated and fast.

## Frontend Technologies

Our choice of frontend technologies ensures a responsive, accessible, and visually engaging interface:

*   **Next.js 15**

    *   Provides a modern React-based framework with server-side rendering, ensuring fast page loads and improved SEO.
    *   Utilizes the App Router for more intuitive and performant routing.

*   **TypeScript**

    *   Adds strong typing to our codebase, reducing errors and enhancing maintainability during development.

*   **Tailwind CSS**

    *   A utility-first CSS framework that enables quick, efficient styling for a clean, modern look without writing extensive custom CSS.

*   **shadcn Component Library**

    *   Offers a set of pre-built, customizable UI components which help speed up development while maintaining design consistency and accessibility.

*   **Frontend File Size Limit**
    *   Prevents users from uploading files exceeding a configurable limit (default 25MB, via `NEXT_PUBLIC_MAX_FILE_SIZE_MB`), providing immediate feedback and avoiding backend errors with large files.

These technologies work together to deliver a seamless user experience with a fast, intuitive interface that guides students through uploading transcripts and navigating their study sessions, while handling potentially long processing times gracefully.

## Backend Technologies

The backend leverages Next.js API routes deployed as serverless functions to handle dynamic processing and interactions:

*   **Serverless Architecture**

    *   Allows us to spin up computing resources only as needed, making it a cost-effective and scalable option. This is perfect for handling the temporary data while the AI processes the uploaded transcripts.

*   **PDF Text Extraction API (`/api/pdf-extract`)**
    *   Receives PDF file uploads.
    *   Reads the file buffer directly within the API route.
    *   Uses the `pdf-parse` library to extract text directly from the buffer (no temporary files needed). This library was chosen for its pure JS nature, avoiding Vercel deployment issues associated with binaries required by `pdf-text-extract`. **Note:** A patch (`pnpm patch`) was applied to `pdf-parse` to resolve build issues caused by debug code.
    *   Initiates this extraction as a background process (non-blocking response to the client).
*   **Background Job Status Tracking (Redis)**
    *   Uses Redis (specifically Upstash) to store the status (`processing`, `completed`, `failed`), progress percentage, and final result (extracted text) or error message for PDF extraction jobs, keyed by a unique job ID.
    *   An API route (`/api/pdf-extract/status/[jobId]`) allows the client to poll for the job status.
*   **AI Integration API (`/api/ai`)**

    *   Receives extracted text (from session storage).
    *   Responsible for analyzing transcript content using OpenAI models (e.g., GPT-4o-Mini) to generate the course subject, outline, and study materials (flashcards, MCQs).
*   **Authentication (Clerk)**
    *   Integrates with Clerk for user authentication, although the extent of its use in protecting routes or managing user-specific data needs further clarification.

The backend provides the critical support necessary for document processing and the dynamic generation of study aids, using Redis for managing the state of asynchronous PDF jobs.

## Infrastructure and Deployment

Our infrastructure choices are geared towards reliability, scalability, and effortless deployment:

*   **Hosting with Vercel**

    *   Utilizes a modern platform optimized for Next.js applications, offering built-in support for serverless functions and seamless deployments.

*   **CI/CD Pipelines**

    *   Automated continuous integration and continuous deployment pipelines ensure that updates are reliable and testing is integrated into the development cycle. Tools like GitHub Actions or similar services may be used.

*   **Version Control**

    *   Git (with platforms such as GitHub or GitLab) is used to maintain code integrity, track changes, and facilitate collaborative development.

These infrastructure decisions help maintain a robust environment that scales on demand and supports a smooth, iterative development process.

## Third-Party Integrations

To enhance functionality and streamline processes, the project incorporates several third-party services and libraries:

*   **OpenAI API**
    *   The central AI component analyzes transcripts, generating course subjects, outlines, and study materials. Configurable via environment variables.
*   **Clerk**
    *   Provides user authentication services.
*   **Upstash Redis**
    *   Used as a managed Redis instance for tracking the status of background PDF extraction jobs.
*   **Upstash Redis**
    *   Used as a managed Redis instance for tracking the status of background PDF extraction jobs.
*   **`pdf-parse`**
    *   Node.js library used for server-side PDF text extraction (pure JS, patched).
*   **`mammoth`**
    *   Library used for converting `.docx` files to text.
*   **Configurable Settings**

    *   A configuration file allows administrators to set the OpenAI API key, select the model, and specify the default API URL. This flexibility ensures that the backend can be easily adapted to changes without affecting the frontend user experience.

These integrations allow us to deliver advanced features such as natural language processing and dynamic content generation without reinventing the wheel.

## Security and Performance Considerations

Security and performance are paramount in delivering a reliable and user-friendly experience:

*   **Security Measures:**
    *   Authentication is handled by Clerk.
    *   Cross-tenant access prevention needs careful consideration if user-specific data storage is added later.
    *   Sensitive configuration settings (API keys, Redis URL) are managed via environment variables.
*   **Performance Optimizations:**
    *   Server-side PDF extraction runs asynchronously, preventing blocking of the main API response. The client polls for status.
    *   Frontend file size limits prevent unnecessary processing of overly large files.
    *   Redis provides fast access to job status.
    *   The serverless architecture ensures processing resources scale on demand.
    *   Visual feedback (progress bars, loading indicators) keeps the user informed during potentially long operations (PDF extraction, AI processing).
    *   Caching mechanisms (observed in logs for AI responses) help reduce redundant processing.
*   **Potential Bottlenecks/Considerations:**
    *   Storing large extracted text in Redis can hit size limits (currently mitigated by frontend file size limit). Alternative storage (Vercel Blob, S3) might be needed.

Collectively, implementing robust security practices and focused performance enhancements guarantees that users enjoy a secure, fast, and efficient study session.

## Conclusion and Overall Tech Stack Summary

To summarize, our tech stack is carefully selected to match the project's goals and user needs:

*   **Frontend:**
    *   Next.js 15 (with App Router)
    *   React 19, TypeScript
    *   Tailwind CSS, shadcn/ui
    *   Client-side validation (file type, size)
*   **Backend:**
    *   Next.js API Routes (Serverless Functions)
    *   `pdf-parse` for PDF processing (server-side, async via Redis, patched)
    *   `mammoth` for DOCX processing
    *   Redis (Upstash) for job status tracking
    *   OpenAI API for AI analysis/generation
    *   Clerk for authentication

*   **Infrastructure:**

    *   Deployed on Vercel with CI/CD pipelines and version control via Git

*   **Third-Party Integrations:**
    *   OpenAI, Clerk, Upstash
*   **Security and Performance:**
    *   Frontend size limits, async processing, Redis status tracking, Clerk auth. Potential need for alternative large text storage.

These choices align with the project's requirement to provide an effective, accessible, and user-friendly flashcard website. The use of modern development tools and cloud services ensures that the platform is not only scalable and secure but also affable to non-technical users, making it a standout solution for university students seeking streamlined study aids.
