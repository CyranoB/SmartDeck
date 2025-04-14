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

/**
 * Simple, targeted JSON repair for known AI response structures
 * Specifically handles flashcards and MCQ question formats
 * @param text The potentially malformed JSON string
 * @returns A hopefully valid JSON string, or the original if repair failed
 */
export function attemptJSONRepair(text: string): string {
  try {
    // Step 1: Basic cleanup
    let cleaned = text
      .replace(/```json|```/g, '')  // Remove markdown code blocks
      .trim();
    
    // Step 2: Determine structure type
    const isFlashcards = cleaned.includes('"flashcards"');
    const isMCQs = cleaned.includes('"questions"');
    
    // Step 3: Basic JSON structure fixes
    
    // Ensure proper JSON object wrapper
    if (!cleaned.startsWith('{')) cleaned = '{' + cleaned;
    if (!cleaned.endsWith('}')) cleaned = cleaned + '}';
    
    // Fix common JSON syntax issues
    cleaned = cleaned
      // Convert single quotes to double quotes in property names
      .replace(/'([^']+)'(\s*:)/g, '"$1"$2')
      
      // Convert single quotes to double quotes in string values
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      
      // Fix unquoted property names
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3')
      
      // Remove trailing commas
      .replace(/,(\s*[}\]])/g, '$1');
    
    // Step 4: Structure-specific fixes
    if (isFlashcards) {
      // Ensure flashcards array is properly closed
      if (cleaned.includes('"flashcards": [') && !cleaned.match(/"flashcards"\s*:\s*\[[\s\S]*\]\s*}/)) {
        cleaned = ensureArrayClosure(cleaned, 'flashcards');
      }
    }
    
    if (isMCQs) {
      // Ensure questions array is properly closed
      if (cleaned.includes('"questions": [') && !cleaned.match(/"questions"\s*:\s*\[[\s\S]*\]\s*}/)) {
        cleaned = ensureArrayClosure(cleaned, 'questions');
      }
    }
    
    return cleaned;
  } catch (e) {
    console.error("JSON repair failed:", e);
    return text; // Return original if repair fails
  }
}

/**
 * Helper function to ensure arrays are properly closed
 */
function ensureArrayClosure(text: string, arrayName: string): string {
  // Find valid complete objects in the array
  const validObjects = extractValidObjects(text, arrayName);
  
  if (validObjects.length > 0) {
    // Rebuild with the valid objects we found
    const arrayStart = text.indexOf(`"${arrayName}": [`);
    const prefix = text.substring(0, arrayStart + arrayName.length + 5); // +5 for ": ["
    return `${prefix}${validObjects.join(',')}]}`;
  }
  
  // Fallback: just close the brackets
  return text + ']}';
}

/**
 * Extract valid JSON objects from partial JSON text
 */
function extractValidObjects(text: string, arrayName: string): string[] {
  const objects: string[] = [];
  const arraySplit = text.split(`"${arrayName}": [`);
  
  if (arraySplit.length < 2) return objects;
  
  const arrayContent = arraySplit[1];
  
  // Use simplified approach to extract object-like structures
  let objectsText = '';
  let depth = 0;
  let inString = false;
  let escape = false;
  
  for (let i = 0; i < arrayContent.length; i++) {
    const char = arrayContent[i];
    
    // Handle string state
    if (char === '"' && !escape) inString = !inString;
    if (char === '\\' && !escape) escape = true;
    else escape = false;
    
    // Track object depth
    if (!inString) {
      if (char === '{') {
        if (depth === 0) objectsText += '{'; // Start capturing
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          objectsText += '}|'; // End capturing and add separator
        } else if (depth > 0) {
          objectsText += '}';
        }
      } else if (depth > 0) {
        objectsText += char; // Only capture within objects
      }
    } else if (depth > 0) {
      objectsText += char; // Capture string content inside objects
    }
  }
  
  // Split captured objects and parse each one
  return objectsText
    .split('|')
    .filter(obj => obj.trim().startsWith('{') && obj.trim().endsWith('}'))
    .map(obj => {
      try {
        // Validate by parsing and stringify again for consistent format
        JSON.parse(obj);
        return obj;
      } catch {
        return ''; // Return empty if invalid
      }
    })
    .filter(Boolean);
}

/**
 * Last-resort extraction based on expected structure types
 */
function extractKnownStructure<T>(text: string): T | null {
  // Check for flashcards structure
  if (text.includes('"question"') && text.includes('"answer"')) {
    try {
      // Extract flashcard-like objects
      const cardMatches = text.match(/\{[^{}]*"question"\s*:[^{}]*"answer"\s*:[^{}]*\}/g);
      
      if (cardMatches && cardMatches.length > 0) {
        const cards = cardMatches
          .map(card => {
            try {
              // Fix common issues in individual cards
              let fixedCard = card
                .replace(/'/g, '"')
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
              
              return JSON.parse(fixedCard);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        
        if (cards.length > 0) {
          return { flashcards: cards } as unknown as T;
        }
      }
    } catch (e) {
      console.error("Flashcard extraction failed:", e);
    }
  }
  
  // Check for MCQ structure
  if (text.includes('"question"') && 
      (text.includes('"A"') || text.includes('"correct"'))) {
    try {
      // Extract MCQ-like objects with regex tuned to MCQ structure
      const mcqMatches = text.match(/\{[^{}]*"question"\s*:[^{}]*(?:"A"|"correct")[^{}]*\}/g);
      
      if (mcqMatches && mcqMatches.length > 0) {
        const questions = mcqMatches
          .map(q => {
            try {
              // Fix common issues in individual questions
              let fixedQuestion = q
                .replace(/'/g, '"')
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
              
              return JSON.parse(fixedQuestion);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        
        if (questions.length > 0) {
          return { questions: questions } as unknown as T;
        }
      }
    } catch (e) {
      console.error("MCQ extraction failed:", e);
    }
  }
  
  return null;
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
      
      // Try direct parsing first
      try {
        return JSON.parse(cleanedText) as T;
      } catch (initialError) {
        // Advanced repair attempt
        console.warn("Initial JSON parsing failed, attempting repair...");
        const repairedJSON = attemptJSONRepair(cleanedText);
        
        try {
          const result = JSON.parse(repairedJSON) as T;
          console.log("JSON repair successful");
          return result;
        } catch (repairError) {
          // If repair fails, try last-resort extraction
          console.error("JSON repair failed:", repairError);
          console.error("Original text:", cleanedText.substring(0, 500) + (cleanedText.length > 500 ? "..." : ""));
          console.error("Repaired attempt:", repairedJSON.substring(0, 500) + (repairedJSON.length > 500 ? "..." : ""));
          
          // Last resort: try to extract and reconstruct based on expected structure
          const extractedResult = extractKnownStructure<T>(cleanedText);
          
          if (extractedResult) {
            console.log("Extraction successful as last resort");
            return extractedResult;
          }
          
          // If all else fails
          throw new Error("Failed to parse AI response after all repair attempts");
        }
      }
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

export async function generateFlashcards(
  params: GenerateBatchParams,
  onProgress?: (current: number, total: number) => void
) {
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
    
    // Update progress through callback instead of events
    if (onProgress) {
      onProgress(i+1, totalBatches);
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

export async function generateMCQs(
  params: GenerateMCQBatchParams,
  onProgress?: (current: number, total: number) => void
) {
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
    
    // Update progress through callback instead of events
    if (onProgress) {
      onProgress(i+1, totalBatches);
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
