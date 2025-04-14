"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { useLanguage } from "@/hooks/use-language"
import { translations } from "@/lib/translations"
import { McqSessionData } from "@/types/mcq"
import { cn } from "@/lib/utils"

export default function McqSummaryPage() {
  const [sessionData, setSessionData] = useState<McqSessionData | null>(null)
  const router = useRouter()
  const { language } = useLanguage()
  const t = translations[language]

  useEffect(() => {
    const data = sessionStorage.getItem("mcqSessionData")

    if (!data) {
      toast.error(t.errorTitle, {
        description: t.noResults,
      })
      router.push("/start")
      return
    }

    setSessionData(JSON.parse(data))
  }, [router, toast, t])

  const handleStartNew = () => {
    // Clear session data
    sessionStorage.removeItem("mcqSessionData")
    router.push("/course-overview")
  }

  if (!sessionData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>{t.loading}</p>
      </div>
    )
  }

  const timeSpent = Math.round((Date.now() - sessionData.startTime) / 1000)
  const minutes = Math.floor(timeSpent / 60)
  const seconds = timeSpent % 60
  const scorePercentage = Math.round((sessionData.score / sessionData.totalQuestions) * 100)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <h1 className="text-3xl font-bold text-center">{t.mcqSummaryTitle}</h1>
        <p className="text-center text-muted-foreground">{t.mcqSummaryDesc}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.scoreLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{scorePercentage}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.timeSpent}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.correctAnswers}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{sessionData.score}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.incorrectAnswers}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-rose-600 dark:text-rose-400">
                {sessionData.totalQuestions - sessionData.score}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.reviewAnswers}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionData.questions.map((question, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{question.question}</CardTitle>
                  <CardDescription>
                    {question.isCorrect ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t.correctAnswer}</span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 font-medium">{t.incorrectAnswer}</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {["A", "B", "C", "D"].map((optionId) => (
                    <div
                      key={optionId}
                      className={cn(
                        "p-3 rounded-lg border",
                        optionId === question.userSelection && optionId === question.correct && "bg-emerald-100 border-emerald-500 dark:bg-emerald-900/30 dark:border-emerald-500",
                        optionId === question.userSelection && optionId !== question.correct && "bg-rose-100 border-rose-500 dark:bg-rose-900/30 dark:border-rose-500",
                        optionId === question.correct && optionId !== question.userSelection && "bg-emerald-100 border-emerald-500 dark:bg-emerald-900/30 dark:border-emerald-500"
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{optionId}:</span>
                        <span>{question[optionId as keyof typeof question]}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button size="lg" onClick={handleStartNew}>
            {t.startNew}
          </Button>
        </div>
      </div>
    </div>
  )
}
