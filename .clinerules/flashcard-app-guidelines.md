## Brief overview
This set of guidelines is specific to SmartDeck, an AI-powered study companion designed to help university students study more effectively. The application automatically analyzes course transcripts and generates flashcards and multiple-choice questions (MCQs) using OpenAI's GPT-4o-mini model. It supports multiple file formats (PDF, DOCX, TXT), offers multilingual support, and includes features like user authentication and progress tracking.

## Tech stack preferences
- Use Next.js 15 with App Router architecture (app/ directory) for all routing
- Implement TypeScript with strict type checking for robust code structure
- Style with Tailwind CSS following utility-first approach
- Utilize shadcn components for consistent UI elements
- Implement serverless backend functions for AI processing
- Configure OpenAI integration through environment variables with secure API key handling
- Use Redis for caching and session management
- Integrate Clerk for optional user authentication
- Use pdf-parse for PDF text extraction and mammoth for DOCX processing
- Implement LRU-cache for rate limiting and UUID for job IDs

## Project architecture
- Follow the App Router structure with nested route folders
- Organize API routes under app/api/ with Route Handlers for serverless operations
- Maintain clear separation between UI components and business logic
- Store AI-related code in lib/ai/ directory with separate controller, service, and prompts files
- Keep UI components in the components/ directory with shadcn UI components in components/ui/
- Use Redis for tracking asynchronous PDF extraction job status
- Implement modular architecture with clear separation of concerns (route handlers, controllers, services)
- Apply middleware for request validation, IP verification, and rate limiting
- Centralize error handling and standardized logging

## Application flow
- Start with upload screen for transcript submission (PDF, DOCX, or TXT)
- For PDF files, implement asynchronous server-side extraction with progress tracking
- Process transcripts with visual feedback (loading indicators)
- Generate course subject and outline automatically
- Allow users to select study mode (flashcards or MCQs) and difficulty level
- Present flashcards with simple navigation ("next" and "stop" actions)
- Offer MCQs with immediate feedback on answer selection
- Provide session summary with performance statistics before returning to upload screen
- Use client-side sessionStorage to maintain state between pages

## UI/UX guidelines
- Implement multilingual support (English and French)
- Provide visual feedback during all AI processing steps
- Maintain a clean, modern, and minimalist interface
- Ensure responsive design for various device sizes
- Use consistent theming across all pages with light and dark mode support
- Include proper loading states and error handling
- Use a warm, focused color palette with good contrast
- Implement a star-based difficulty selection system (1-5) with descriptive tooltips
- Provide enhanced visual feedback for correct/incorrect answers in MCQ mode
- Use progress indicators for multi-step processes

## AI integration
- Use OpenAI GPT-4o-mini model for transcript analysis
- Implement retry mechanisms and rate limit handling
- Process transcripts to determine course subject without additional user input
- Generate flashcards and MCQs based on transcript content
- Support file size limits (configurable, default 25MB) and word count limits (500-50,000 words)
- Secure API interactions by not exposing keys in client-side code
- Adjust content complexity based on selected difficulty level (1-5)
- Implement transcript chunking for large documents exceeding threshold
- Use dedicated prompt templates separated from business logic

## Development workflow
- Maintain comprehensive documentation in the memory-bank/ directory
- Follow TypeScript best practices with proper type definitions
- Implement server-side rendering where appropriate
- Use server actions for form submissions and data processing
- Test critical paths thoroughly, especially AI integration
- Keep environment variables secure and properly documented
- Use centralized configuration system for file size and word count limits
- Implement proper error handling with custom error types
- Follow RESTful API design principles
- Use Redis for tracking asynchronous job status

## Performance considerations
- Implement serverless architecture for automatic scaling
- Use asynchronous PDF processing to prevent API timeouts
- Apply frontend file size limits to prevent processing excessively large files
- Implement transcript chunking for large documents to optimize API usage
- Use Redis for fast access to job status during polling
- Apply rate limiting to prevent API abuse
- Implement proper caching mechanisms for AI responses
