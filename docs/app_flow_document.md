# AI Flashcard Generator - Application Flow Document

> **Key Points**
> - User journey follows a linear path: Upload → Processing → Results → Study Mode → Summary
> - Client-side storage (sessionStorage) maintains state between page transitions
> - AI operations are handled through a modular API architecture with dedicated controllers and file-based prompt templates
> - Multi-language support for both UI elements and generated content
> - Comprehensive error handling and visual feedback throughout the flow

## Overview

The AI Flashcard Generator is a Next.js application that uses OpenAI's API to analyze course transcripts and generate study materials including flashcards and multiple choice questions. The application follows a clear linear flow from document upload to interactive study sessions.

## System Initialization

Before any user interaction, the application performs a server-side check for proper OpenAI API configuration:

- **Component**: `ServerConfigCheck` in `/components/server-config-check.tsx`
- If API key is missing or invalid, displays configuration instructions
- If properly configured, renders the application content

## Application Flow

### 1. Home Page (Upload)

**Path**: `/app/page.tsx`  
**Primary Component**: `Upload` from `/components/upload.tsx`

**User Flow**:
- User lands on the homepage
- User can toggle language (English/French) and theme (Light/Dark)
- User uploads a document (TXT, DOCX, or PDF format)
- File is validated for format and size (client-side check against configurable limit, default 25MB). Word count limits (500-50,000) are also checked (upfront for TXT/DOCX, after extraction for PDF).
- For PDF files, a visual progress indicator shows extraction status based on polling.

**Technical Implementation**:
- **File Validation:** `components/upload.tsx` checks file type and size against limits defined in `lib/config.ts` (using `NEXT_PUBLIC_MAX_FILE_SIZE_MB`).
- **TXT/DOCX Processing:** Text is extracted directly using `lib/document-converter.ts` (which uses `mammoth` for DOCX). Word count is validated. If valid, text is stored in `sessionStorage` ("transcript") and user can proceed.
- **PDF Processing (Async Server-Side):**
  - If validation passes, the PDF file is POSTed to `/api/pdf-extract`.
  - The API route reads the file buffer directly, starts background extraction using `pdf-parse` (no temporary files needed), stores initial job status in Redis, and immediately returns a `jobId`.
  - The client (`components/upload.tsx`) receives the `jobId` and starts polling `/api/pdf-extract/status/[jobId]` every second.
  - The UI updates the progress bar based on the polled status (`processing`, `progress %`).
  - If polling returns `status: 'completed'`, the extracted text (`result`) is retrieved from the response. Word count is validated. If valid, the text is stored in `sessionStorage` ("transcript"), and the user can proceed to the next step (clicking "Process Transcript").
  - If polling returns `status: 'failed'`, an error is shown to the user.
- **Proceeding:** Once valid text is in `sessionStorage` (either from direct TXT/DOCX extraction or completed PDF extraction), the user clicks "Process Transcript", which stores the text and navigates to `/processing`.

### 2. Processing Page

**Path**: `/app/processing/page.tsx`

**User Flow**:
- User sees a loading indicator with progress bar
- System analyzes the transcript content
- Automatic redirection to results page when complete

**Technical Implementation**:
- Retrieves transcript from `sessionStorage`
- Calls `analyzeTranscript()` from `/lib/ai.ts` to process text
- Shows progress indicators (simulated incremental progress)
- Stores analysis results in `sessionStorage` as "courseData"
- Stores the content language in `sessionStorage` as "contentLanguage"
- Redirects to `/results` when processing completes

### 3. Results Page

**Path**: `/app/results/page.tsx`

**User Flow**:
- User sees the analyzed course subject
- User sees an outline of key points extracted from the document
- User can choose between flashcards or multiple choice questions
- User clicks "I'm Ready" to proceed to their chosen study mode

**Technical Implementation**:
- Retrieves course data from `sessionStorage`
- Displays subject and outline sections
- "I'm Ready" button redirects to either `/flashcards` or `/mcq` based on user selection

### 4a. Flashcards Page

**Path**: `/app/flashcards/page.tsx`

**User Flow**:
- User views flashcards generated from the document
- User can toggle between question and answer views
- User navigates to the next flashcard
- Additional flashcards are generated automatically as needed
- User can stop the session to see a summary

**Technical Implementation**:
- Retrieves course data and transcript from `sessionStorage`
- Uses `generateFlashcards()` to create batches of 10 flashcards
- Handles question/answer toggling with state management
- Automatically generates more cards when the user reaches the end of current set
- Stores all studied flashcards in `sessionStorage` when stopped
- Redirects to `/summary` when user stops the session

### 3b. Results Page - Difficulty Selection

**Path**: `/app/results/page.tsx`

**User Flow**:
- After choosing the study mode (flashcards or MCQ), user selects a difficulty level
- User sees a 1-5 star rating system with descriptive tooltip on hover
- Each difficulty level has a different description
- User selects the appropriate level for their needs
- User clicks "I'm Ready" to proceed with their chosen mode and difficulty

**Technical Implementation**:
- Uses `DifficultySelector` component from `/components/difficulty-selector.tsx`
- Star-based UI with keyboard navigation support (arrow keys)
- Internationalized descriptions from `lib/translations.ts` 
- Selected difficulty stored in state and passed to generation API calls
- Affects AI prompt construction and batch sizing

### 4b. MCQ Page

**Path**: `/app/mcq/page.tsx`

**User Flow**:
- User views multiple choice questions generated from the document
- Progress indicator shows current generation status if questions are being created in batches
- User selects an answer from four options (A, B, C, D)
- User receives immediate feedback on their answer choice with clear visual indicators:
  - Correct answers highlighted in emerald/green with improved contrast
  - Incorrect answers highlighted in rose/red with improved contrast
- User can navigate to the next question or stop the session
- Additional questions are generated automatically as needed
- Question difficulty matches user's selected difficulty level

**Technical Implementation**:
- Retrieves course data and transcript from `sessionStorage`
- Uses `generateMcqs()` to create a batch of questions based on selected difficulty
- Difficulty affects question complexity through the AI prompts system:
  - Lower difficulties (1-2): Simple vocabulary, straightforward questions
  - Medium difficulty (3): Standard academic vocabulary, moderate complexity
  - Higher difficulties (4-5): Complex questions, advanced vocabulary, subtle distinctions
- For higher difficulties (4-5), smaller batch sizes are used for improved reliability
- ProgressContext used to track and display generation progress for multi-batch operations
- Handles answer selection and validation
- Provides enhanced visual feedback for correct/incorrect answers:
  - Light mode: emerald-100/rose-100 backgrounds with emerald-500/rose-500 borders
  - Dark mode: emerald-900/rose-900 backgrounds with emerald-500/rose-500 borders
- Tracks user performance and session statistics
- Stores session data in `sessionStorage` when stopped
- Redirects to `/mcq-summary` when user stops the session

### 5a. Flashcard Summary Page

**Path**: `/app/summary/page.tsx`

**User Flow**:
- User sees a list of all flashcards studied in the session
- User can review all questions and answers
- User clicks "Finish" to end the session and go to the course overview

**Technical Implementation**:
- Retrieves flashcards from `sessionStorage`
- Displays all flashcards with questions and answers
- "Finish" button clears relevant `sessionStorage` and redirects to `/course-overview`

### 5b. MCQ Summary Page

**Path**: `/app/mcq-summary/page.tsx`

**User Flow**:
- User sees their quiz performance statistics:
  - Overall score percentage
  - Time spent on the quiz
  - Number of correct answers (highlighted in emerald)
  - Number of incorrect answers (highlighted in rose)
- User can review all questions with:
  - The question text
  - All answer options
  - Their selected answer
  - The correct answer
  - Enhanced visual indicators for correct/incorrect choices with improved contrast
- User clicks "Start New" to return to homepage

**Technical Implementation**:
- Retrieves MCQ session data from `sessionStorage`
- Calculates and displays performance metrics
- Shows detailed review of all questions and answers
- Provides enhanced visual feedback through color-coding:
  - Light mode:
    - Correct answers: emerald-100 background with emerald-500 border
    - Incorrect answers: rose-100 background with rose-500 border
  - Dark mode:
    - Correct answers: emerald-900/30 background with emerald-500 border
    - Incorrect answers: rose-900/30 background with rose-500 border
- "Start New" button clears `sessionStorage` and redirects to homepage

## Data Management

The application uses `sessionStorage` to maintain state between pages:

1. **transcript**: Final, validated text extracted from the uploaded document (available after successful TXT/DOCX processing or completed PDF background job).
2. **courseData**: JSON object with subject and outline generated by AI after processing the transcript.
3. **contentLanguage**: Language used for content generation (en/fr), typically set during the processing step.
4. **flashcards**: Array of all studied flashcards
5. **mcqSessionData**: Object containing MCQ session details:
   - questions: Array of all MCQ questions with user responses
   - score: Number of correct answers
   - totalQuestions: Total number of questions
   - startTime: Session start timestamp
   - isComplete: Session completion status

## API Integration

The application communicates with AI services through a modular API architecture:

**Main Endpoint**: `POST /api/ai/route.ts`

**Architecture**:
- **Route Handler**: Entry point that handles request validation, rate limiting, and routes to appropriate controllers
- **Controllers**: Operation-specific handlers in `/lib/ai/controller.ts`
- **Services**: Core AI functionality in `/lib/ai/service.ts`
- **Prompts**: Templated prompts in `/lib/ai/prompts.ts`

**Operations**:
- `analyze`: Processes transcript to extract subject and outline
  - Controller: `handleAnalyze()`
  - Service: `analyzeTranscript()`
  
- `generate-batch`: Creates multiple flashcards in one request (batch of 10)
  - Controller: `handleGenerateBatch()`
  - Service: `generateFlashcards()`
  
- `generate-mcq-batch`: Creates multiple choice questions with smart distractors
  - Controller: `handleGenerateMCQBatch()`
  - Service: `generateMCQs()`

**Security Features**:
- IP validation and rate limiting via `/lib/middleware.ts`
- Request body validation with size limits
- Comprehensive error handling and logging
- Response parsing with markdown cleaning for robust JSON handling

**Data Flow**:
1. Client sends request to `/api/ai` endpoint
2. Route handler validates request and applies rate limiting
3. Request is routed to the appropriate controller
4. Controller extracts parameters and calls service function
5. Service generates prompt using templates and makes AI request
6. Response is cleaned, parsed, and returned to client
7. Client receives JSON data for rendering

## Language Support

The application implements dual language support:

1. **UI Language**
   - Managed by `LanguageProvider` from `/hooks/use-language.tsx`
   - User can toggle between English and French
   - UI elements use translations from `/lib/translations.ts`

2. **Content Language**
   - Initially matches UI language
   - Used for generating AI content in the appropriate language
   - Persists throughout the session for consistency

## Error Handling

Each page includes comprehensive error handling:
- Checks for missing data in `sessionStorage` (redirects to home)
- Handles AI processing failures with error toasts
- Provides clear feedback for configuration issues

## User Experience Enhancements

- **Progress Indicators**: Visual feedback during AI processing
- **Loading States**: Clear indication when system is generating content
- **Toast Notifications**: Status updates and error messages
- **Mobile Optimization**: Responsive design for all device sizes
