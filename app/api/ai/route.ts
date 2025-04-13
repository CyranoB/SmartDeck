import { NextRequest, NextResponse } from "next/server"
import { getClientIP, applyRateLimit, validateRequestBody } from "@/lib/middleware"
import { analyzeTranscript, generateFlashcards, generateMCQs } from "@/lib/ai/service"
import { config } from "@/lib/config"

/**
 * Counts words in a text string
 * @param text Text to count words in
 * @returns Word count
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Validate AI request body
 */
function validateAIRequestBody(body: any) {
  if (!body.type) {
    throw new Error("Missing required field: type");
  }
  
  if (body.type === "analyze" && !body.transcript) {
    throw new Error("Missing required field: transcript for analysis");
  }
  
  if ((body.type === "generate-batch" || body.type === "generate-mcq-batch") && !body.courseData) {
    throw new Error("Missing required field: courseData for generation");
  }

  if (body.existingQuestions && !Array.isArray(body.existingQuestions)) {
    throw new Error("existingQuestions must be an array if provided");
  }
}

/**
 * POST handler for AI operations
 */
export async function POST(req: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = getClientIP(req.headers);
    
    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: rateLimitResult.status || 429,
          headers: rateLimitResult.headers
        }
      );
    }
    
    // Validate request body size
    const bodySizeValidation = await validateRequestBody(req);
    if (!bodySizeValidation.success) {
      return NextResponse.json(
        { error: bodySizeValidation.error },
        { status: 413 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    
    // Validate request body content
    try {
      validateAIRequestBody(body);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Invalid request body" },
        { status: 400 }
      );
    }
    
    // Check transcript word count if present
    if (body.transcript) {
      const wordCount = countWords(body.transcript);
      
      // Check minimum word count
      if (wordCount < config.minWordCount) {
        return NextResponse.json(
          { 
            error: `Transcript too short. Minimum ${config.minWordCount} words required, but got ${wordCount} words.` 
          },
          { status: 400 }
        );
      }
      
      // Check maximum word count
      if (wordCount > config.maxWordCount) {
        return NextResponse.json(
          { 
            error: `Transcript too long. Maximum ${config.maxWordCount} words allowed, but got ${wordCount} words.` 
          },
          { status: 413 }
        );
      }
    }
    
    // Process based on operation type
    switch (body.type) {
      case "analyze": {
        const analysisResult = await analyzeTranscript({
          transcript: body.transcript,
          language: body.language || "en"
        });
        return NextResponse.json(analysisResult);
      }
        
      case "generate-batch": {
        const flashcardsResult = await generateFlashcards({
          courseData: body.courseData,
          transcript: body.transcript,
          count: body.count || 10,
          language: body.language || "en",
          difficulty: body.difficulty || 3, // Default to medium difficulty if not provided
        });
        return NextResponse.json(flashcardsResult);
      }
        
      case "generate-mcq-batch": {
        const mcqsResult = await generateMCQs({
          courseData: body.courseData,
          transcript: body.transcript,
          count: body.count || 10,
          language: body.language || "en",
          difficulty: body.difficulty || 3, // Default to medium difficulty if not provided
        });
        return NextResponse.json(mcqsResult);
      }
        
      default: {
        return NextResponse.json(
          { error: "Invalid operation type" },
          { status: 400 }
        );
      }
    }
  } catch (error: any) {
    console.error("API Error:", error);
    
    // Handle specific error types
    if (error.name === "ConfigurationError") {
      return NextResponse.json(
        { error: error.message || "Configuration error" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
