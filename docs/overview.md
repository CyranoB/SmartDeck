# AI Flashcard Generator: System Overview

## Quick Reference

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js 15 (App Router) | Modern, responsive UI with server-side rendering |
| Styling | Tailwind CSS + shadcn | Clean, accessible design with utility-first approach |
| PDF Processing | Next.js API Routes + Redis + pdf-parse | Server-side async PDF text extraction with status tracking |
| AI Integration | OpenAI/Mistral API | Transcript analysis and content generation |
| Data Storage | Client-side sessionStorage | Temporary session data without server persistence |
| Architecture | Serverless | Scalable, cost-effective processing on demand |
| Configuration | Environment Variables | Configurable limits for file size and word counts |
| Progress Tracking | React Context API | Tracks generation progress across components |
| Difficulty System | 1-5 Star Rating | Configurable content complexity for study materials |

## User Journey Map

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌───────────────────┐
│  Home Page  │     │ Processing  │     │   Results   │     │   Study Mode      │
│  (Upload)   │────▶│    Page     │────▶│    Page     │────▶│ Flashcards or MCQ │
└─────────────┘     └─────────────┘     └─────────────┘     └───────────────────┘
      │                    │                                          │
      │                    │                                          │
      ▼                    ▼                                          ▼
┌─────────────┐     ┌─────────────┐                          ┌─────────────┐
│ File Upload │     │ AI Analysis │                          │   Summary   │
│ Processing  │     │ API Request │                          │    Page     │
└─────────────┘     └─────────────┘                          └─────────────┘
```

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                       │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ React UI    │  │ Session     │  │ User Interactions   │  │
│  │ Components  │  │ Storage     │  │ (Next, Prev, Select)│  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌─────────────────────┐  ┌───────────────────────────────┐ │
│  │ Context Providers   │  │ Difficulty & Progress         │ │
│  │ (Theme, Progress)   │  │ Management Components         │ │
│  └─────────────────────┘  └───────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                     │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Middleware  │  │ Controllers │  │ Service Layer       │  │
│  │ Rate Limit  │  │ (AI Ops)    │  │ AI Integration      │  │
│  │ Validation  │  │ Handlers    │  │ Response Processing │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌───────────────────┐  ┌───────────────────────────────┐  │
│  │ /api/pdf-extract  │  │ /api/pdf-extract/status/[jobId] │  │
│  │ (POST - Start Job)│  │ (GET - Poll Status)           │  │
│  └───────────────────┘  └───────────────────────────────┘  │
└───────────────────────────┬───────────────────────┬─────────┘
                            │                       │ ▲
                            │                       │ │ Polls
                            │ Calls                 │ │
                            ▼                       │ │ Gets Status
┌─────────────────────────────────────────────────┐ │ │┌──────────────────┐
│               External AI Service               │ │ ││ External Service │
│                                                 │ │ ││                  │
│ ┌─────────────────────────────────────────────┐ │ │ ││ ┌──────────────┐ │
│ │ OpenAI/Mistral API                          │ │ │ ││ │ Redis        │ │
│ │ (GPT-4o-Mini or similar model)              │ │ │ ││ │ (Job Status) │ │
│ └─────────────────────────────────────────────┘ │ │ ││ └──────────────┘ │
└─────────────────────────────────────────────────┘ │ │└──────────────────┘
                                                    │ │         ▲│
                                                    └─┼─────────┘│ Stores/Reads
                                                      └──────────┘
```

## Configuration System

The application uses a centralized configuration system that allows for easy adjustment of important parameters:

### File and Transcript Size Limits

- **Maximum File Size**: Configurable via `NEXT_PUBLIC_MAX_FILE_SIZE_MB` environment variable (default: 25MB) - Checked client-side.
- **Maximum Word Count**: Configurable via `MAX_WORD_COUNT` environment variable (default: 50,000 words)
- **Minimum Word Count**: Configurable via `MIN_WORD_COUNT` environment variable (default: 500 words)
- **Transcript Chunk Threshold**: Configurable via `TRANSCRIPT_CHUNK_THRESHOLD` environment variable (default: 30,000 characters)

These limits ensure optimal performance and prevent resource exhaustion while allowing flexibility for different deployment environments.

## Key Workflows

### 1. Transcript Analysis

1. User uploads transcript file (TXT, DOCX, PDF).
2. **For TXT/DOCX:** Client extracts text, validates word count, stores in `sessionStorage`.
3. **For PDF:**
    a. Client POSTs file to `/api/pdf-extract`.
    b. API starts background extraction using `pdf-parse`, stores initial status in Redis, returns `jobId`.
    c. Client polls `/api/pdf-extract/status/[jobId]`.
    d. Once status is 'completed', client retrieves text from status response, validates word count, stores in `sessionStorage`.
4. Once valid text is in `sessionStorage`, client sends request to `/api/ai` with `type: "analyze"`.
5. Middleware validates request and applies rate limiting
6. Controller routes to appropriate handler
7. AI service generates subject and outline
8. Response returned to client and displayed on Results page

### 2. Flashcard Generation

1. User selects "Flashcards" mode
2. Request sent to `/api/ai` with `type: "generate-batch"`
3. Controller extracts parameters and calls service
4. AI service generates batch of flashcards
5. Response returned to client for interactive study
6. Additional batches generated as needed

### 3. MCQ Generation

1. User selects "Multiple Choice" mode and difficulty level (1-5 stars)
2. Request sent to `/api/ai` with `type: "generate-mcq-batch"` and `difficulty` parameter
3. Controller processes request and calls service with parameters
4. AI service generates questions with answer options based on difficulty:
   - Lower difficulty (1-2): Simpler vocabulary, shorter questions, more obvious answers
   - Medium difficulty (3): Standard academic level questions
   - Higher difficulty (4-5): Complex questions, advanced vocabulary, subtle distinctions
   - Higher difficulties automatically use smaller batch sizes for more reliable generation
5. Progress context updates UI with generation progress
6. Response returned to client for interactive quiz
7. User performance tracked for summary

## Documentation Index

For detailed information, refer to these documents:

- [Application Flow](./app_flow_document.md) - Detailed user journey and page transitions
- [API Architecture](./API_ARCHITECTURE.md) - API structure and implementation details
- [Backend Structure](./backend_structure_document.md) - Server-side implementation
- [Frontend Guidelines](./frontend_guidelines_document.md) - UI/UX principles and implementation
- [Tech Stack](./tech_stack_document.md) - Technology choices and rationale
