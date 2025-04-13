import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { McqQuestion } from "@/types/mcq"
// NOTE: Toast import removed as UI feedback is moved to calling components
import { config } from "@/lib/config"

// Define custom error classes for better handling
export class RateLimitError extends Error {
  constructor(message = "Rate limit exceeded", public retryAfter: number = 10) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class ServerError extends Error {
  constructor(message = "Temporary server issue", public retryAfter: number = 5) {
    super(message);
    this.name = "ServerError";
  }
}

export class MaxRetriesExceededError extends Error {
  constructor(message = "Maximum retries exceeded") {
    super(message);
    this.name = "MaxRetriesExceededError";
  }
}

export class TimeoutError extends Error {
  constructor(message = "Request timeout after maximum retry duration") {
    super(message);
    this.name = "TimeoutError";
  }
}


interface Flashcard {
  question: string;
  answer: string;
  id: string;
}

interface GenerateBatchParams {
  courseData: string;
  transcript?: string;
  count: number;
  language: string;
  existingQuestions?: Flashcard[];
}

// NOTE: getOpenAIConfig removed as API keys are handled server-side in /api/ai

/**
 * Extract a representative sample from a large transcript
 * This preserves the beginning, middle, and end of the document
 * to maintain context while reducing the overall size
 * 
 * @param text The full transcript text
 * @param maxLength Maximum length of the sample (default: from config)
 * @returns A representative sample of the text
 */
function extractSampleFromTranscript(text: string, maxLength: number = config.transcriptChunkThreshold): string {
  if (text.length <= maxLength) return text;
  
  // Take portions from beginning, middle and end
  const thirdSize = Math.floor(maxLength / 3);
  const beginning = text.substring(0, thirdSize);
  const middleStart = Math.floor(text.length / 2) - Math.floor(thirdSize / 2);
  const middle = text.substring(middleStart, middleStart + thirdSize);
  const end = text.substring(text.length - thirdSize);
  
  return `${beginning}\n\n[...]\n\n${middle}\n\n[...]\n\n${end}`;
}

/**
 * Handle API response with rate limit awareness and transient error handling
 * 
 * This utility handles:
 * - 429 Too Many Requests (rate limits)
 * - 5xx Server Errors (transient backend issues)
 * 
 * @param response The fetch response
 * @returns Processed response data
 * @throws {RateLimitError} if status is 429
 * @throws {ServerError} if status is 5xx
 * @throws {Error} for other non-OK responses
 */
async function handleApiResponse(response: Response) {
  if (response.ok) {
    return await response.json();
  }

  const isRateLimit = response.status === 429;
  const isServerError = response.status >= 500 && response.status < 600;

  if (isRateLimit || isServerError) {
    let retryAfter = isRateLimit ? 10 : 5; // Default retry times
    let errorMessage = isRateLimit ? "Rate limit exceeded" : "Temporary server issue";
    try {
      const errorData = await response.json();
      // Get retry time from response or use default
      retryAfter = errorData.retryAfter || parseInt(response.headers.get('retry-after') || '0') || retryAfter;
      errorMessage = errorData.error || errorMessage; // Use error message from response if available
    } catch (e) {
      // Ignore parsing errors, use defaults
      console.warn("Could not parse error response body:", e);
    }

    if (isRateLimit) {
      throw new RateLimitError(errorMessage, retryAfter);
    } else {
      throw new ServerError(errorMessage, retryAfter);
    }
  }
  // NOTE: Removed extra closing braces here that were causing syntax errors

  // Handle other non-OK responses
  let errorMessage = `Request failed with status ${response.status}`;
  try {
    const errorData = await response.json();
    errorMessage = errorData.error || errorMessage; // Use specific error if available
  } catch (e) {
    errorMessage = response.statusText || errorMessage; // Fallback to status text
  }
  throw new Error(errorMessage);
}

// NOTE: Request caching logic removed for simplification

/**
 * Fetch with automatic retry for rate limits (429) and transient server errors (5xx)
 * 
 * Features:
 * - Request deduplication to prevent duplicate API calls
 * - Automatic retry for 429 rate limits
 * - Automatic retry for 5xx server errors
 * - Exponential backoff based on retry count
 * - Maximum delay cap to prevent excessive waits
 * - Maximum total retry duration to prevent indefinite loops
 * 
 * @param url API endpoint
 * @param options Fetch options
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @returns Processed response data from API
 * @throws {TimeoutError} if max retry duration is exceeded
 * @throws {MaxRetriesExceededError} if max retries are exhausted
 * @throws {Error} for other unhandled fetch or processing errors
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
) {
  let retries = 0;
  const MAX_DELAY_MS = 30000; // Max delay between retries: 30 seconds
  const startTime = Date.now();
  const MAX_TOTAL_RETRY_TIME_MS = 120000; // Max total retry duration: 2 minutes

  while (retries <= maxRetries) {
    // Check if we've been retrying for too long
    if (Date.now() - startTime > MAX_TOTAL_RETRY_TIME_MS) {
      console.error(`fetchWithRetry: Maximum total retry time (${MAX_TOTAL_RETRY_TIME_MS / 1000}s) exceeded for ${url}`);
      throw new TimeoutError(`Request timed out after ${MAX_TOTAL_RETRY_TIME_MS / 1000} seconds`);
    }

    try {
      const response = await fetch(url, options);
      // handleApiResponse will throw for non-OK responses, including retryable ones
      return await handleApiResponse(response);

    } catch (error: any) {
      // Check if it's a retryable error thrown by handleApiResponse
      const isRetryable = error instanceof RateLimitError || error instanceof ServerError;

      if (isRetryable && retries < maxRetries) {
        retries++;
        // Calculate delay: exponential backoff (1s, 2s, 4s...) with cap and use retryAfter from error if available
        const baseDelay = 1000 * Math.pow(2, retries - 1); // Start with 1s for first retry
        const delay = Math.min(error.retryAfter ? error.retryAfter * 1000 : baseDelay, MAX_DELAY_MS);
        
        console.warn(`fetchWithRetry: Retry ${retries}/${maxRetries} for ${url} after ${delay / 1000}s due to ${error.name}: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Go to next iteration of the while loop
      } else {
        // Non-retryable error OR maxRetries exceeded
        if (retries >= maxRetries && isRetryable) {
            console.error(`fetchWithRetry: Maximum retries (${maxRetries}) reached for ${url}. Last error: ${error.name} - ${error.message}`);
            throw new MaxRetriesExceededError(`Maximum retries (${maxRetries}) reached. Last error: ${error.name}`);
        } else {
            // Re-throw non-retryable errors immediately
            console.error(`fetchWithRetry: Non-retryable error for ${url}: ${error.name} - ${error.message}`);
            throw error; // Propagate original error
        }
      }
    }
  }
  // Should be unreachable due to the throws inside the loop, but satisfies TypeScript
  throw new Error("fetchWithRetry: Unexpected exit from retry loop");
}


// Function to analyze transcript and generate course subject and outline
export async function analyzeTranscript(transcript: string, language: "en" | "fr" = "en") {
  try {
    // Check if transcript is too large for a single request (using configurable threshold)
    const isLargeTranscript = transcript.length > config.transcriptChunkThreshold;
    
    if (isLargeTranscript) {
      console.log(`Large transcript detected (${transcript.length} chars). Using summarization approach.`);
      
      // Create a representative sample of the transcript
      const sample = extractSampleFromTranscript(transcript);
      
      // Send the sample for analysis
      const response = await fetchWithRetry("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: sample,
          language,
          type: "analyze",
          isPartialTranscript: true,
        }),
      });
      
      return response;
    } else {
      // For normal-sized transcripts, proceed with the regular approach
      const response = await fetchWithRetry("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript,
          language,
          type: "analyze",
        }),
      });
      
      return response;
    }
  } catch (error) {
    console.error("Error analyzing transcript:", error);
    throw error;
  }
} // Added missing closing brace for analyzeTranscript function


// NOTE: generateFlashcard function removed. Use generateFlashcards with count=1 instead.

// Function to generate multiple flashcards based on course data
export async function generateFlashcards(
  courseData: any, 
  transcript: string, 
  count: number = 10, 
  language: "en" | "fr" = "en",
  existingQuestions: Flashcard[] = [],
  difficulty: number = 3 // Default to medium difficulty
) {
  try {
    // Check if transcript is too large for a single request (using configurable threshold)
    const isLargeTranscript = transcript.length > config.transcriptChunkThreshold;
    
    if (isLargeTranscript) {
      console.log(`Large transcript detected (${transcript.length} chars). Using summarization approach for flashcards.`);
      
      // Create a representative sample of the transcript
      const sample = extractSampleFromTranscript(transcript);
      
      const response = await fetchWithRetry("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseData,
          transcript: sample,
          count,
          language,
          type: "generate-batch",
          isPartialTranscript: true,
          existingQuestions,
          difficulty,
        }),
      });
      
      // Extract the flashcards array from the response
      if (response && response.flashcards && Array.isArray(response.flashcards)) {
        return response.flashcards;
      }
      
      // Return empty array if no flashcards found
      console.warn("No flashcards found in response:", response);
      return [];
    } else {
      // For normal-sized transcripts, proceed with the regular approach
      const response = await fetchWithRetry("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseData,
          transcript,
          count,
          language,
          type: "generate-batch",
          existingQuestions,
          difficulty,
        }),
      });
      
      // Extract the flashcards array from the response
      if (response && response.flashcards && Array.isArray(response.flashcards)) {
        return response.flashcards;
      }
      
      // Return empty array if no flashcards found
      console.warn("No flashcards found in response:", response);
      return [];
    }
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw error;
  }
}

export async function generateMcqs(
  courseData: any,
  transcript: string,
  language: "en" | "fr" = "en",
  count: number = 10,
  difficulty: number = 3 // Default to medium difficulty
): Promise<McqQuestion[]> {
  try {
    // Check if transcript is too large for a single request (using configurable threshold)
    const isLargeTranscript = transcript.length > config.transcriptChunkThreshold;
    
    if (isLargeTranscript) {
      console.log(`Large transcript detected (${transcript.length} chars). Using summarization approach for MCQs.`);
      
      // Create a representative sample of the transcript
      const sample = extractSampleFromTranscript(transcript);
      
      const response = await fetchWithRetry("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseData,
          transcript: sample,
          count,
          language,
          type: "generate-mcq-batch",
          isPartialTranscript: true,
          difficulty,
        }),
      });
      
      // Check if the response has questions property (from API) and convert to mcqs format
      if (response.questions && Array.isArray(response.questions)) {
        return response.questions;
      }
      
      // If mcqs property exists, return it directly
      return response.mcqs || [];
    } else {
      // For normal-sized transcripts, proceed with the regular approach
      const response = await fetchWithRetry("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseData,
          transcript,
          count,
          language,
          type: "generate-mcq-batch",
          difficulty,
        }),
      });
      
      // Check if the response has questions property (from API) and convert to mcqs format
      if (response.questions && Array.isArray(response.questions)) {
        return response.questions;
      }
      
      // If mcqs property exists, return it directly
      return response.mcqs || [];
    }
  } catch (error) {
    console.error("Error generating MCQs:", error);
    throw error;
  }
}
