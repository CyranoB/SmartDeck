# Tech Context: AI Study Companion

## 1. Core Technologies

-   **Framework:** Next.js (v15.2.3) with App Router
-   **Language:** TypeScript (v5)
-   **UI Library:** React (v19), Shadcn UI
-   **Styling:** Tailwind CSS
-   **Package Manager:** pnpm (v10.4.1)
-   **AI Integration:** `@ai-sdk/openai` (v1.2.5), `ai` (v4.1.61)
-   **State Management:** React Context API for progress tracking (`ProgressContext`) and theme handling
-   **Document Processing:**
    -   `.docx`: `mammoth` (v1.9.0)
    -   `.pdf`: `pdf-parse` (v1.1.1) - Replaced `pdf-text-extract` for Vercel compatibility. Does not require external binaries or temp files. `@types/pdf-parse` (v1.1.4) added. **Note:** A patch was applied using `pnpm patch` to remove debug code causing build issues.
-   **Background Job/State:** Redis via `@upstash/redis` (v1.34.6) - Used for tracking PDF extraction job status.
-   **Authentication:** Clerk (`@clerk/nextjs` v6.12.9)
-   **Linting/Formatting:** Likely ESLint/Prettier (inferred from standard Next.js setup, though not explicitly confirmed).

## 2. Development Setup

-   Run locally using `pnpm dev`.
-   Environment variables managed via `.env.local` (and potentially `.env`).
    -   `NEXT_PUBLIC_MAX_FILE_SIZE_MB`: Controls client-side file upload limit (default 25MB).
    -   Other variables likely exist for OpenAI API Key, Clerk keys, Redis connection, etc. (See `.env.example`).

## 3. Technical Constraints & Considerations

-   **PDF Library Compatibility:** Switched from `pdf-text-extract` to `pdf-parse` because `pdf-text-extract` relies on the `pdftotext` binary, which is unavailable in the Vercel serverless environment. `pdf-parse` is a pure JavaScript library, resolving the deployment issue and removing the need for temporary file storage. Previous issues noted with `pdf-parse` may have been related to earlier project configurations or versions.
-   **Redis Request Size Limit:** Storing large extracted text directly in Redis job status can exceed limits (e.g., Upstash's 1MB default). This was mitigated by adding a frontend file size limit, but storing large results might require alternative storage (e.g., Vercel Blob, S3) if the 25MB limit proves insufficient for valid use cases later.
-   **Client-Side Environment Variables:** Variables needed in client components (like `maxFileSizeMB`) must be prefixed with `NEXT_PUBLIC_`.
-   **JSON Repair Strategy:** AI responses sometimes return malformed JSON. The system employs a simplified, targeted repair strategy in `lib/ai/service.ts` using a three-tiered approach: 1) direct parsing, 2) simple repair for common syntax issues, and 3) last-resort pattern extraction specifically for flashcards and MCQs. This ensures robustness when handling AI responses while maintaining code maintainability.
-   **Difficulty System Implementation:** Implemented a 1-5 scale difficulty system using the `DifficultyLevel` type and a star-based `DifficultySelector` component. Difficulty affects AI prompting complexity and batch processing strategy (smaller batches for higher difficulties).
-   **Progress Tracking:** Uses React context (`ProgressContext`) to provide a centralized way to track and update generation progress across the application. This enables progress feedback during multi-batch generation processes.
-   **MCQ Type Structure:** Defined in `types/mcq.ts`, consists of standardized question format with 4 options (A-D), correct answer tracking, and session management (score, completion status).

## 4. Dependencies

-   See `package.json` for a full list. Key dependencies related to recent work are listed in section 1.
-   Note peer dependency warnings related to `react-day-picker`, `vaul`, `react`, and `date-fns` versions. These might need addressing later but don't seem critical for current functionality.
