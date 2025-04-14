"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { analyzeTranscript } from "@/lib/ai"
import { useLanguage } from "@/hooks/use-language"
import { translations } from "@/lib/translations"
import { AuthHeader } from "@/components/auth-header"

export default function ProcessingPage() {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()
  const { language } = useLanguage()
  const t = translations[language]

  // Memoize the transcript processing function to prevent recreation on each render
  const processTranscript = useCallback(async () => {
    // Skip if already processing to avoid duplicate calls
    if (isProcessing) return
    
    // Get transcript from session storage
    const transcript = sessionStorage.getItem("transcript")
    if (!transcript) {
      toast.error(t.errorTitle, {
        description: t.noTranscript,
      })
      router.push("/")
      return
    }
    
    // Set processing flag to prevent duplicate calls
    setIsProcessing(true)
    
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

      setStatus(t.analyzing)
      console.log(`Processing transcript in ${language} (single call pattern)`)

      // Process the transcript with AI, passing the current language
      const result = await analyzeTranscript(transcript, language)

      // Store the results and the language used
      sessionStorage.setItem("courseData", JSON.stringify(result))
      sessionStorage.setItem("contentLanguage", language)

      // Complete the progress
      clearInterval(progressInterval)
      setProgress(100)
      setStatus(t.complete)

      // Navigate to course overview page
      setTimeout(() => {
        router.push("/course-overview")
      }, 1000)
    } catch (error) {
      console.error("Processing error:", error)
      toast.error(t.errorTitle, {
        description: error instanceof Error ? error.message : t.aiError,
      })
      router.push("/")
    } finally {
      // Clear the processing flag when done (or on error)
      setIsProcessing(false)
    }
  }, [language, router, t, toast])

  // Check for transcript data and initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true)
    }
  }, [])

  // Start processing only when initialized and not already processing
  useEffect(() => {
    if (isInitialized && !isProcessing) {
      processTranscript()
    }
  }, [isInitialized, processTranscript, isProcessing])

  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col items-center space-y-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h1 className="text-2xl font-bold text-center">{t.processingTitle}</h1>
          <Progress value={progress} className="w-full" />
          <p className="text-muted-foreground">{status}</p>
        </div>
      </div>
    </div>
  )
}
