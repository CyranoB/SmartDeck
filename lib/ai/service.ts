import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { getOpenAIConfig } from "@/lib/env"
import { prompts } from "./prompts"
import { ConfigurationError } from '@/lib/errors'

// Types for AI operations
export type AnalyzeParams = {
  transcript: string
  language: string
}

export type GenerateBatchParams = {
  courseData: { subject: string, outline: string[] }
  transcript: string
  count: number
  language: string
  difficulty?: number // Optional difficulty parameter (1-5)
  existingFlashcards?: any[] // Optional array of existing flashcards to avoid duplication
}

export type GenerateMCQBatchParams = {
  courseData: { subject: string, outline: string[] }
  transcript: string
  count: number
  language: string
  difficulty?: number // Optional difficulty parameter (1-5)
}

// Clean AI response from markdown formatting
export function cleanAIResponse(text: string): string {
  // Remove markdown code blocks (```json and ```)
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  return cleaned;
}

// Validate if a string is valid JSON
export function isValidJSON(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

// Attempt to repair incomplete JSON responses
export function attemptJSONRepair(text: string): string {
  // Check for common incomplete JSON patterns
  if (text.includes('"flashcards": [') && !text.endsWith(']}')) {
    try {
      // Try to find the last complete flashcard
      const lastCompleteCardIndex = text.lastIndexOf('"},');
      if (lastCompleteCardIndex > 0) {
        // Include the last complete card and close the JSON structure
        const partialJson = text.substring(0, lastCompleteCardIndex + 2);
        return `${partialJson}]}`;
      }
    } catch (e) {
      console.error("Error during JSON repair attempt:", e);
    }
  }
  
  // Similar handling for MCQ format
  if (text.includes('"questions": [') && !text.endsWith(']}')) {
    try {
      const lastCompleteQuestionIndex = text.lastIndexOf('"},');
      if (lastCompleteQuestionIndex > 0) {
        const partialJson = text.substring(0, lastCompleteQuestionIndex + 2);
        return `${partialJson}]}`;
      }
    } catch (e) {
      console.error("Error during JSON repair attempt:", e);
    }
  }
  
  return text;
}

// Generic function to handle AI requests and response parsing
async function makeAIRequest<T>(prompt: string, temperature = 0.5, maxTokens = 2048): Promise<T> {
  try {
    const { apiKey, model, baseURL } = getOpenAIConfig()
    
    const openai = createOpenAI({
      apiKey,
      baseURL,
    })

    const { text } = await generateText({
      model: openai(model),
      prompt,
      temperature,
      maxTokens,
    })

    try {
      const cleanedText = cleanAIResponse(text.trim());
      
      // Try parsing directly first
      if (isValidJSON(cleanedText)) {
        return JSON.parse(cleanedText) as T;
      }
      
      // If direct parsing fails, attempt repair
      console.warn("JSON parsing failed, attempting repair...");
      const repairedJSON = attemptJSONRepair(cleanedText);
      
      if (isValidJSON(repairedJSON)) {
        console.log("JSON repair successful");
        return JSON.parse(repairedJSON) as T;
      }
      
      // If repair fails, throw with detailed error
      console.error("Parse Error Details:");
      console.error("Raw AI Response:", text);
      console.error("Cleaned Text:", cleanedText);
      console.error("Repair Attempt:", repairedJSON);
      throw new Error("Failed to parse or repair AI response");
    } catch (parseError) {
      console.error("Parse Error Details:");
      console.error("Raw AI Response:", text);
      console.error("Parse Error:", parseError);
      throw new Error("Failed to parse AI response");
    }
  } catch (configError) {
    console.error("OpenAI Configuration Error:", configError);
    throw new ConfigurationError("API key configuration error");
  }
}

// Service functions for each operation type
export async function analyzeTranscript(params: AnalyzeParams) {
  const prompt = prompts.analyze(params.transcript, params.language);
  return makeAIRequest<{ subject: string, outline: string[] }>(prompt, 0.5, 2048);
}

// Helper function for dynamic batch sizing
function getBatchSizeForDifficulty(difficulty: number, requestedCount: number): number {
  if (difficulty >= 5) return Math.min(5, requestedCount);
  if (difficulty >= 4) return Math.min(7, requestedCount);
  return requestedCount; // No chunking for difficulty 3 and below
}

// Generate a single batch of flashcards
async function generateSingleFlashcardBatch(params: GenerateBatchParams): Promise<{ flashcards: any[] }> {
  const prompt = prompts.generateBatch(
    params.courseData, 
    params.transcript, 
    params.count, 
    params.language, 
    params.difficulty
  );
  
  const result = await makeAIRequest<{ flashcards: any[] }>(prompt, 0.9, 4096);
  return { flashcards: result.flashcards || [] };
}

export async function generateFlashcards(params: GenerateBatchParams) {
  // Use provided difficulty or default to medium (3)
  const difficulty = params.difficulty || 3;
  
  // Determine appropriate batch size based on difficulty
  const batchSize = getBatchSizeForDifficulty(difficulty, params.count);
  
  // If requested count is smaller than batch size, generate directly
  if (params.count <= batchSize) {
    return await generateSingleFlashcardBatch(params);
  }
  
  // Otherwise, generate in chunks
  console.log(`Generating ${params.count} flashcards in chunks of ${batchSize} (difficulty: ${difficulty})`);
  
  const totalBatches = Math.ceil(params.count / batchSize);
  let allFlashcards: any[] = [];
  
  for (let i = 0; i < totalBatches; i++) {
    const remainingCount = params.count - allFlashcards.length;
    const currentBatchSize = Math.min(batchSize, remainingCount);
    
    // Skip if we've already generated enough
    if (currentBatchSize <= 0) break;
    
    console.log(`Generating batch ${i+1}/${totalBatches} (${currentBatchSize} flashcards)`);
    
    // Emit event for progress tracking if in browser environment
    if (typeof window !== 'undefined') {
      const progressEvent = new CustomEvent('flashcardChunkProgress', {
        detail: { current: i+1, total: totalBatches }
      });
      window.dispatchEvent(progressEvent);
    }
    
    // Generate current batch
    const batchParams = { 
      ...params, 
      count: currentBatchSize,
      // Include existing flashcards to avoid duplication
      existingFlashcards: [...(params.existingFlashcards || []), ...allFlashcards]
    };
    
    try {
      const result = await generateSingleFlashcardBatch(batchParams);
      if (result && result.flashcards) {
        allFlashcards = [...allFlashcards, ...result.flashcards];
        console.log(`Successfully generated batch ${i+1}/${totalBatches}, total cards: ${allFlashcards.length}`);
      }
    } catch (error) {
      console.error(`Error generating batch ${i+1}/${totalBatches}:`, error);
      // Continue with partial results if we have any
      if (allFlashcards.length > 0) {
        console.log(`Continuing with ${allFlashcards.length} cards generated so far`);
        break;
      }
      throw error; // Re-throw if we have no results at all
    }
  }
  
  return { flashcards: allFlashcards };
}

// Generate a single batch of MCQs
async function generateSingleMCQBatch(params: GenerateMCQBatchParams): Promise<{ questions: any[] }> {
  const prompt = prompts.generateMCQBatch(
    params.courseData, 
    params.transcript, 
    params.count, 
    params.language,
    params.difficulty
  );
  
  const result = await makeAIRequest<{ questions: any[] }>(prompt, 0.7, 4096);
  return { questions: result.questions || [] };
}

export async function generateMCQs(params: GenerateMCQBatchParams) {
  // Use provided difficulty or default to medium (3)
  const difficulty = params.difficulty || 3;
  
  // Determine appropriate batch size based on difficulty
  const batchSize = getBatchSizeForDifficulty(difficulty, params.count);
  
  // If requested count is smaller than batch size, generate directly
  if (params.count <= batchSize) {
    const result = await generateSingleMCQBatch(params);
    return { mcqs: result.questions || [] };
  }
  
  // Otherwise, generate in chunks
  console.log(`Generating ${params.count} MCQs in chunks of ${batchSize} (difficulty: ${difficulty})`);
  
  const totalBatches = Math.ceil(params.count / batchSize);
  let allQuestions: any[] = [];
  
  for (let i = 0; i < totalBatches; i++) {
    const remainingCount = params.count - allQuestions.length;
    const currentBatchSize = Math.min(batchSize, remainingCount);
    
    // Skip if we've already generated enough
    if (currentBatchSize <= 0) break;
    
    console.log(`Generating MCQ batch ${i+1}/${totalBatches} (${currentBatchSize} questions)`);
    
    // Emit event for progress tracking if in browser environment
    if (typeof window !== 'undefined') {
      const progressEvent = new CustomEvent('mcqChunkProgress', {
        detail: { current: i+1, total: totalBatches }
      });
      window.dispatchEvent(progressEvent);
    }
    
    // Generate current batch
    const batchParams = { 
      ...params, 
      count: currentBatchSize
    };
    
    try {
      const result = await generateSingleMCQBatch(batchParams);
      if (result && result.questions) {
        allQuestions = [...allQuestions, ...result.questions];
        console.log(`Successfully generated MCQ batch ${i+1}/${totalBatches}, total questions: ${allQuestions.length}`);
      }
    } catch (error) {
      console.error(`Error generating MCQ batch ${i+1}/${totalBatches}:`, error);
      // Continue with partial results if we have any
      if (allQuestions.length > 0) {
        console.log(`Continuing with ${allQuestions.length} questions generated so far`);
        break;
      }
      throw error; // Re-throw if we have no results at all
    }
  }
  
  return { mcqs: allQuestions };
}
