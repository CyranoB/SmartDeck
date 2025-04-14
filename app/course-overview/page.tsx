"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { useLanguage } from "@/hooks/use-language"
import { translations } from "@/lib/translations"
import { AuthHeader } from "@/components/auth-header"

interface CourseData {
  subject: string
  outline: string[]
}

export default function CourseOverviewPage() {
  const [courseData, setCourseData] = useState<CourseData | null>(null)
  const router = useRouter()
  const { language } = useLanguage()
  const t = translations[language]

  useEffect(() => {
    const data = sessionStorage.getItem("courseData")

    if (!data) {
      toast.error(t.errorTitle, {
        description: t.noResults,
      })
      router.push("/start")
      return
    }

    setCourseData(JSON.parse(data))
  }, [router, toast, t])

  const handleModeSelection = (mode: "flashcards" | "mcq") => {
    router.push(`/${mode}`)
  }

  if (!courseData) {
    return (
      <div className="flex min-h-screen flex-col">
        <AuthHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <p>{t.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          <h1 className="text-3xl font-bold text-center">{t.resultsTitle}</h1>

          <Card>
            <CardHeader>
              <CardTitle>{t.subjectTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{courseData.subject}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.outlineTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2">
                {courseData.outline.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.studyModeTitle}</CardTitle>
              <CardDescription>{t.studyModeDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => handleModeSelection("flashcards")}>
                  <CardHeader>
                    <CardTitle className="text-lg">{t.flashcardsMode}</CardTitle>
                    <CardDescription>{t.flashcardsModeDesc}</CardDescription>
                  </CardHeader>
                </Card>
                
                <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => handleModeSelection("mcq")}>
                  <CardHeader>
                    <CardTitle className="text-lg">{t.mcqMode}</CardTitle>
                    <CardDescription>{t.mcqModeDesc}</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push("/start")}>
            <CardHeader className="text-center">
              <CardTitle className="text-lg">{t.chooseAnotherTranscript}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}
