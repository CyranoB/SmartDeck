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
