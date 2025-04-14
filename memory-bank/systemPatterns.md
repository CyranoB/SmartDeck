# System Patterns: AI Study Companion

## 1. Architecture Overview

-   **Monolith with API Routes:** A Next.js application serving both the frontend UI and backend API endpoints.
-   **Client-Side Rendering (CSR):** Primarily uses React components rendered in the browser ("use client").
-   **Serverless Functions:** Next.js API routes likely deploy as serverless functions (e.g., on Vercel).
-   **Background Jobs (Simple):** PDF text extraction is offloaded to a background process triggered by an API route (`/api/pdf-extract`). Status is tracked via Redis, polled by the client.

## 2. Key Technical Decisions & Patterns

-   **Configuration Management:** Centralized configuration loaded from environment variables (`lib/config.ts`), with specific variables exposed to the client using the `NEXT_PUBLIC_` prefix.
-   **Document Conversion:** Uses dedicated libraries for each format (`mammoth` for docx, `pdf-parse` for pdf). The utility function `lib/document-converter.ts` might need adjustment or is no longer used for PDFs if conversion is solely in the API route.
-   **PDF Processing:**
    -   Uses `pdf-parse` server-side within the API route (`/api/pdf-extract`). Switched from `pdf-text-extract` to ensure compatibility with Vercel's serverless environment (no external binaries needed).
    -   Processes the file buffer directly, eliminating the need for temporary file storage.
    -   Asynchronous processing initiated via API, status tracked in Redis (`pdf-job:{jobId}`).
    -   Client polls a status endpoint (`/api/pdf-extract/status/[jobId]`) to get progress and results.
-   **Error Handling:** Uses a custom `ErrorDialog` component triggered by a state variable in the `Upload` component. Specific error messages are sourced from translations (`lib/translations.ts`).
-   **Internationalization (i18n):** Uses a simple object structure in `lib/translations.ts` and a `useLanguage` hook to manage the current language and access translated strings.
-   **UI Components:** Leverages Shadcn UI library for pre-built components.
-   **AI Response Handling:** 
    -   Implements a tiered JSON parsing strategy in `lib/ai/service.ts`:
        1. **Direct Parsing:** First attempts standard `JSON.parse()` on cleaned AI response
        2. **Targeted Repair:** If parsing fails, applies structure-specific repair focused on flashcards and MCQ formats
        3. **Last-Resort Extraction:** If repair fails, uses regex-based pattern matching to extract and reconstruct valid objects
    -   Uses structure detection to determine if the response contains flashcards or MCQs
    -   Maintains robustness while avoiding unnecessary complexity in JSON handling
-   **Difficulty Management:**
    -   Implements a 1-5 scale difficulty system for content generation
    -   Uses a `DifficultyLevel` type (1-5) for type safety
    -   UI implementation via star-based `DifficultySelector` component
    -   Difficulty levels affect AI prompt instructions (vocabulary complexity, question length, cognitive depth)
    -   Higher difficulties (4-5) trigger smaller batch sizes for more reliable AI responses
-   **MCQ Generation & Structure:**
    -   MCQs follow a standardized format with question, 4 options (A-D), and correct answer
    -   Uses similar batch processing to flashcards, with generation split into chunks based on difficulty
    -   Questions vary in complexity, vocabulary, and cognitive level based on selected difficulty
    -   Session data tracks user progress through MCQs (selections, score, completion status)

## 3. Progress & State Management

-   **Progress Tracking:**
    -   Implements a React context (`ProgressContext`) for tracking generation progress
    -   Used for both flashcard and MCQ batch generation
    -   Tracks current chunk and total chunks during multi-batch generation
    -   Provides UI feedback during potentially lengthy generation operations

## 4. Component Relationships (Upload Flow Focus)

```mermaid
graph TD
    subgraph Browser
        UploadComponent[components/upload.tsx] -- Selects File --> Validate[validateAndSetFile]
        Validate -- Size/Type OK --> SetFileState[Updates File State]
        Validate -- PDF --> TriggerAPI[fetch /api/pdf-extract]
        TriggerAPI -- Receives Job ID --> SetJobIdState[Updates Job ID State]
        SetJobIdState -- Starts Polling --> PollAPI[fetch /api/pdf-extract/status/:jobId]
        PollAPI -- Receives Status/Progress --> UpdateProgress[Updates Progress State]
        PollAPI -- Receives Completed Status & Text --> StoreText[Stores Text (implicitly)]
        SetFileState -- Non-PDF --> ConvertDoc[convertDocumentToText]
        ConvertDoc -- Returns Text --> StoreText
        StoreText -- User Clicks Process --> HandleUpload[handleUpload]
        HandleUpload -- Stores Text --> SessionStorage[SessionStorage]
        HandleUpload -- Navigates --> ProcessingPage[/processing]
        Validate -- Error --> ShowError[showError updates ErrorDialog State]
        TriggerAPI -- Error --> ShowError
        PollAPI -- Error --> ShowError
        ConvertDoc -- Error --> ShowError
        HandleUpload -- Error --> ShowError
    end

    subgraph Server (API Routes)
        APIPdfExtract[/api/pdf-extract POST] -- Receives File --> ReadBuffer{Read File Buffer}
        ReadBuffer --> SetInitialRedis[Set Initial Job Status in Redis]
        SetInitialRedis --> StartAsyncProcess[processPdf (async)]
        StartAsyncProcess --> UpdateRedisProgress1[Update Redis Progress (30%)]
        StartAsyncProcess --> ExtractText[pdf-parse]
        ExtractText --> UpdateRedisProgress2[Update Redis Progress (70%)]
        ExtractText --> SetCompletedRedis[Set Completed Status & Text in Redis]
        ExtractText -- Error --> SetFailedRedis[Set Failed Status in Redis]
        APIPdfExtract --> ReturnJobId[Return Job ID]
        %% No Temp File Handling Needed %%

        APIPdfStatus[/api/pdf-extract/status/:jobId GET] -- Reads Job ID --> GetRedisStatus[Get Job Status from Redis]
        GetRedisStatus --> ReturnStatus[Return Status/Progress/Result]
    end

    subgraph External Services
        Redis[(Redis / Upstash)]
    end

    SetInitialRedis --> Redis
    UpdateRedisProgress1 --> Redis
    UpdateRedisProgress2 --> Redis
    SetCompletedRedis --> Redis
    SetFailedRedis --> Redis
    GetRedisStatus --> Redis
