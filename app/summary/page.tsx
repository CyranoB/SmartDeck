"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useLanguage } from "@/hooks/use-language"
import { translations } from "@/lib/translations"

interface Flashcard {
  question: string
  answer: string
}

export default function SummaryPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [lastCompletedIndex, setLastCompletedIndex] = useState(0)
  const router = useRouter()
  const { language } = useLanguage()
  const t = translations[language]

  useEffect(() => {
    const flashcardsData = sessionStorage.getItem("flashcards")
    const lastIndex = sessionStorage.getItem("lastCompletedIndex")

    if (!flashcardsData) {
      toast.error(t.errorTitle, {
        description: t.noFlashcards,
      })
      router.push("/")
      return
    }

    const allFlashcards = JSON.parse(flashcardsData)
    const lastIndexNum = lastIndex ? parseInt(lastIndex) : allFlashcards.length
    
    // Show only the last 10 flashcards studied
    const startIndex = Math.max(0, lastIndexNum - 10)
    const recentFlashcards = allFlashcards.slice(startIndex, lastIndexNum)
    
    setFlashcards(recentFlashcards)
    setLastCompletedIndex(lastIndexNum)
  }, [router, toast, t])

  const handleFinish = () => {
    router.push("/course-overview")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <h1 className="text-3xl font-bold text-center">{t.summaryTitle}</h1>

        <p className="text-center text-muted-foreground">
          {t.studiedCards}: {lastCompletedIndex}
        </p>

        <div className="space-y-4">
          {flashcards.map((card, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t.questionLabel} {index + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{t.questionLabel}:</p>
                  <p>{card.question}</p>
                </div>
                <div>
                  <p className="font-medium">{t.answerLabel}:</p>
                  <p>{card.answer}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          {/* "Do 10 More" button removed */}
          <Button size="lg" onClick={handleFinish}>
            {t.finishButton}
          </Button>
        </div>
      </div>
    </div>
  )
}
