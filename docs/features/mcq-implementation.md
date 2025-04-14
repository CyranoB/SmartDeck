# MCQ Implementation Documentation

> **Key Points**
> - Comprehensive multiple-choice question generation and testing system
> - Difficulty-based complexity scaling (1-5 star rating system)
> - Progress tracking for batch generation operations
> - Robust JSON handling for AI-generated content
> - Consistent user experience with visual feedback and accessibility features

## 1. Overview

The Multiple-Choice Question (MCQ) feature in the AI Study Companion allows students to test their knowledge through automatically generated quizzes based on their course materials. The system creates questions with four options (A, B, C, D), tracks user responses, and provides instant feedback with performance metrics at the end of a session.

## 2. Core Components

### 2.1 Type Definitions (`types/mcq.ts`)

```typescript
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface McqOption {
  id: string
  text: string
  correct: boolean
}

export interface McqQuestion {
  question: string
  A: string
  B: string
  C: string
  D: string
  correct: "A" | "B" | "C" | "D"
  userSelection?: string
  isCorrect?: boolean
}

export interface McqSessionData {
  questions: McqQuestion[]
  currentIndex: number
  score: number
  totalQuestions: number
  isComplete: boolean
  startTime: number
  difficulty?: DifficultyLevel
}
```

### 2.2 Difficulty Selection (`components/difficulty-selector.tsx`)

- Interactive star-based UI for selecting difficulty level (1-5 stars)
- Fully keyboard accessible with arrow key navigation
- Internationalized descriptions for each level
- Visual feedback on hover and selection
- Accessibility features including proper ARIA attributes and keyboard support

### 2.3 MCQ Generation (`lib/ai/service.ts`)

- Generates questions based on transcript content and difficulty level
- Implements batch processing to handle large content chunks
- Adjusts batch size based on difficulty (smaller batches for higher difficulties)
- Uses three-tiered approach for handling AI response parsing:
  1. Direct JSON parsing with standard `JSON.parse()`
  2. Simple repair for common JSON syntax issues
  3. Structure-specific pattern extraction for severely malformed JSON

### 2.4 API Integration (`app/api/ai/route.ts`)

- Handles `generate-mcq-batch` operation type
- Validates request parameters including difficulty
- Processes text content and generates appropriate questions
- Returns structured question data to the client

### 2.5 Progress Tracking (`contexts/progress-context.tsx`)

- React context for tracking generation progress across components
- Tracks current batch and total batch count
- Provides UI feedback during multi-batch generation
- Simple API with `updateChunkProgress` and `resetProgress` functions

## 3. Difficulty System

The MCQ feature includes a 5-level difficulty system that affects question complexity:

| Level | Name | Description | Question Characteristics |
|-------|------|-------------|--------------------------|
| 1 | Very Easy | Extremely simple and basic concepts | Elementary vocabulary (<20 words per question, <10 per option), very straightforward, obvious answers, fundamental information only |
| 2 | Easy | Fairly simple with basic concepts | Common vocabulary (<25 words per question, <15 per option), accessible to beginners, minimal complexity |
| 3 | Medium | Standard academic level | Moderate complexity with standard vocabulary (<30 words per question, <20 per option), balanced mix of question types |
| 4 | Hard | Challenging, deeper understanding | Advanced vocabulary (<40 words per question, <25 per option), complex relationships between concepts, subtle distinctions |
| 5 | Expert | Very challenging, graduate level | Specialized terminology (<50 words per question, <30 per option), nuanced understanding required, critical analysis questions |

### 3.1 Implementation in Prompts (`lib/ai/prompts.ts`)

Each difficulty level has specifically tailored instructions that control:

- Vocabulary complexity (elementary → specialized)
- Question length constraints
- Conceptual complexity (basic recall → evaluation)
- Answer option distinctiveness (obvious → subtle differences)

Example of prompting pattern:
```typescript
case 1: // Very simple
  difficultyInstructions = `
    Keep questions extremely simple and basic.
    Use elementary vocabulary and straightforward concepts.
    Focus only on the most fundamental information.
    Avoid complex terminology - use simple words.
    Make all options clearly distinct from each other.
    Create very straightforward questions with obvious answers.
    IMPORTANT: Keep questions under 20 words.
    Keep each answer option under 10 words.
  `;
  break;
```

### 3.2 Dynamic Batch Sizing

For higher difficulty levels (4-5), the system automatically reduces batch size to ensure higher quality generation:

```typescript
function getBatchSizeForDifficulty(difficulty: number, requestedCount: number): number {
  if (difficulty >= 5) return Math.min(5, requestedCount);
  if (difficulty >= 4) return Math.min(7, requestedCount);
  return requestedCount; // No chunking for difficulty 3 and below
}
```

## 4. User Flow

1. **Selection**: User selects MCQ as study mode on results page
2. **Difficulty**: User sets desired difficulty level (1-5 stars)
3. **Generation**: System generates appropriate questions based on transcript and difficulty
4. **Quiz**: User answers questions and receives immediate feedback
5. **Summary**: User reviews performance metrics and all questions/answers

## 5. Visual Feedback

The MCQ interface provides clear visual feedback:
- Correct answers highlighted in emerald/green
- Incorrect answers highlighted in rose/red
- Different visual treatment for light and dark modes
- Progress indicators during generation
- Score and performance metrics in summary view

## 6. Technical Considerations

### 6.1 JSON Handling

MCQ generation must handle potentially malformed JSON from AI responses. The system employs a robust parsing strategy:

```typescript
// Direct parsing attempt
try {
  return JSON.parse(cleanedText) as T;
} catch (initialError) {
  // Advanced repair attempt if direct parsing fails
  const repairedJSON = attemptJSONRepair(cleanedText);
  
  try {
    return JSON.parse(repairedJSON) as T;
  } catch (repairError) {
    // Last-resort extraction if repair fails
    const extractedResult = extractKnownStructure<T>(cleanedText);
    
    if (extractedResult) {
      return extractedResult;
    }
    
    throw new Error("Failed to parse AI response after all repair attempts");
  }
}
```

### 6.2 Session Data Management

MCQ session data is stored in `sessionStorage` using the standardized `McqSessionData` interface, providing persistence between page navigations while maintaining a lightweight approach without server-side storage requirements.

## 7. Future Enhancements

Potential improvements for the MCQ feature:

1. **Explanation Generation**: Add AI-generated explanations for correct answers
2. **Topic Categorization**: Group questions by topic/concept for better learning focus
3. **Adaptive Difficulty**: Dynamically adjust difficulty based on user performance
4. **Spaced Repetition**: Implement smart repetition of missed questions
5. **Progress Persistence**: Add option to save progress beyond the current session

## 8. Related Components

- **Results Page**: Where user selects study mode and difficulty
- **MCQ Page**: Interactive quiz interface
- **MCQ Summary Page**: Performance review and question analysis
- **Progress Context**: Tracks generation progress
