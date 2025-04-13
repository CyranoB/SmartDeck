"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { translations } from "@/lib/translations"
import { generateMcqs } from "@/lib/ai"
import { McqQuestion, McqSessionData } from "@/types/mcq"
import { cn } from "@/lib/utils"
import { DifficultySelector } from "@/components/difficulty-selector"

export default function McqPage() {
  const [sessionData, setSessionData] = useState<McqSessionData | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string>("")
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState("")
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 1 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showDifficultySelector, setShowDifficultySelector] = useState(true)
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(0)
  const router = useRouter()
  const { toast } = useToast()
  const { language } = useLanguage()
  const t = translations[language]

  // Handle difficulty selection
  const handleDifficultySelected = (difficulty: number) => {
    setSelectedDifficulty(difficulty)
    setShowDifficultySelector(false)
    // Store the selected difficulty in session storage
    sessionStorage.setItem("selectedDifficulty", difficulty.toString())
    // Trigger MCQ generation
    initializeSession(difficulty)
  }

  // Memorize the MCQ generation function to prevent recreation on each render
  const initializeSession = useCallback(async (difficulty?: number) => {
    // Skip if already generating to avoid duplicate calls
    if (isGenerating) return

    const courseData = sessionStorage.getItem("courseData")
    const transcript = sessionStorage.getItem("transcript")

    if (!courseData || !transcript) {
      toast({
        title: t.errorTitle,
        description: t.noResults,
        variant: "destructive",
      })
      router.push("/")
      return
    }

    // Set generating flag to prevent duplicate calls
    setIsGenerating(true)
    
    // Use provided difficulty or fall back to selected difficulty or default (3)
    const difficultyToUse = difficulty !== undefined ? difficulty : selectedDifficulty || 3

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 500)

      setStatus(t.generating)
      console.log(`Generating MCQs in ${language} with difficulty ${difficultyToUse}`)
      
      // Set up event listener for chunk progress updates
      const handleChunkProgress = (event: CustomEvent) => {
        if (event.detail && event.detail.current && event.detail.total) {
          setChunkProgress({
            current: event.detail.current,
            total: event.detail.total
          });
          
          // Update progress bar based on chunk progress
          const chunkPercentage = (event.detail.current / event.detail.total) * 100;
          setProgress(Math.min(90, chunkPercentage));
        }
      };
      
      // Add event listener before API call
      window.addEventListener('mcqChunkProgress', handleChunkProgress as EventListener);
      
      // Make API call
      const questions = await generateMcqs(JSON.parse(courseData), transcript, language, 10, difficultyToUse);
      
      // Remove event listener after API call
      window.removeEventListener('mcqChunkProgress', handleChunkProgress as EventListener);

      // Complete the progress
      clearInterval(progressInterval)
      setProgress(100)
      setStatus(t.complete)

      // Initialize session after a short delay
      setTimeout(() => {
        setSessionData({
          questions,
          currentIndex: 0,
          score: 0,
          totalQuestions: questions.length,
          isComplete: false,
          startTime: Date.now(),
        })
      }, 1000)
    } catch (error) {
      console.error("Error generating MCQs:", error)
      toast({
        title: t.errorTitle,
        description: t.flashcardError,
        variant: "destructive",
      })
      router.push("/course-overview")
    } finally {
      // Clear the generating flag when done (or on error)
      setIsGenerating(false)
    }
  }, [language, router, toast, t, selectedDifficulty])

  // Check for course data and initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true)
    }
  }, [])

  // Start generating MCQs only when initialized and not already generating and difficulty is selected
  useEffect(() => {
    if (isInitialized && !isGenerating && !sessionData && !showDifficultySelector) {
      initializeSession()
    }
  }, [isInitialized, initializeSession, isGenerating, sessionData, showDifficultySelector])

  const handleAnswerSubmit = () => {
    if (!sessionData || !selectedAnswer) return

    const currentQuestion = sessionData.questions[sessionData.currentIndex]
    const isCorrect = selectedAnswer === currentQuestion.correct

    const updatedQuestions = [...sessionData.questions]
    updatedQuestions[sessionData.currentIndex] = {
      ...currentQuestion,
      userSelection: selectedAnswer,
      isCorrect,
    }

    setSessionData({
      ...sessionData,
      questions: updatedQuestions,
      score: isCorrect ? sessionData.score + 1 : sessionData.score,
    })
    setIsAnswerSubmitted(true)
  }

  const handleNext = () => {
    if (!sessionData) return

    const nextIndex = sessionData.currentIndex + 1
    if (nextIndex >= sessionData.questions.length) {
      // Save session data for summary
      sessionStorage.setItem("mcqSessionData", JSON.stringify({
        ...sessionData,
        isComplete: true,
      }))
      router.push("/mcq-summary")
      return
    }

    setSessionData({
      ...sessionData,
      currentIndex: nextIndex,
    })
    setSelectedAnswer("")
    setIsAnswerSubmitted(false)
  }

  const handleStop = () => {
    if (!sessionData) return

    sessionStorage.setItem("mcqSessionData", JSON.stringify({
      ...sessionData,
      isComplete: true,
    }))
    router.push("/mcq-summary")
  }

  // Show difficulty selector or loading state
  if (showDifficultySelector) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <h1 className="text-3xl font-bold text-center">{t.mcqTitle}</h1>
          <Card className="w-full">
            <CardContent className="pt-6">
              <DifficultySelector onDifficultySelected={handleDifficultySelected} />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  // Show loading state with progress
  if (!sessionData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col items-center space-y-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h1 className="text-2xl font-bold text-center">{t.mcqTitle}</h1>
          <Progress value={progress} className="w-full" />
          <p className="text-muted-foreground">
            {chunkProgress.total > 1 
              ? `${status} (${chunkProgress.current}/${chunkProgress.total})` 
              : status}
          </p>
        </div>
      </div>
    )
  }

  const currentQuestion = sessionData.questions[sessionData.currentIndex]
  const options = [
    { id: "A", text: currentQuestion.A },
    { id: "B", text: currentQuestion.B },
    { id: "C", text: currentQuestion.C },
    { id: "D", text: currentQuestion.D },
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t.mcqTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {t.mcqProgress.replace("{current}", String(sessionData.currentIndex + 1))
              .replace("{total}", String(sessionData.totalQuestions))}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={selectedAnswer}
              onValueChange={setSelectedAnswer}
              className="space-y-3"
              disabled={isAnswerSubmitted}
            >
              {options.map((option) => (
                <div
                  key={option.id}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg border p-4",
                    isAnswerSubmitted && option.id === currentQuestion.correct && "bg-emerald-100 border-emerald-500 dark:bg-emerald-900/30 dark:border-emerald-500",
                    isAnswerSubmitted && selectedAnswer === option.id && option.id !== currentQuestion.correct && "bg-rose-100 border-rose-500 dark:bg-rose-900/30 dark:border-rose-500"
                  )}
                >
                  <RadioGroupItem value={option.id} id={option.id} />
                  <label
                    htmlFor={option.id}
                    className="flex flex-1 cursor-pointer items-center justify-between"
                  >
                    <span>{option.text}</span>
                  </label>
                </div>
              ))}
            </RadioGroup>

            {isAnswerSubmitted && (
              <div className={cn(
                "p-4 rounded-lg font-medium",
                currentQuestion.isCorrect 
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-500" 
                  : "bg-rose-100 text-rose-800 border border-rose-500 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-500"
              )}>
                <p className="font-medium">
                  {currentQuestion.isCorrect ? t.correctAnswer : t.incorrectAnswer}
                  {!currentQuestion.isCorrect && currentQuestion[currentQuestion.correct]}
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleStop}
              >
                {t.stopButton}
              </Button>

              {!isAnswerSubmitted ? (
                <Button
                  onClick={handleAnswerSubmit}
                  disabled={!selectedAnswer}
                >
                  {t.submitAnswer}
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  {sessionData.currentIndex === sessionData.questions.length - 1
                    ? t.finishButton
                    : t.nextQuestion}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
