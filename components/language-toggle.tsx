"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useLanguage } from "@/hooks/use-language"
import { translations } from "@/lib/translations"

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()
  const router = useRouter()
  const t = translations[language]
  const [isProcessing, setIsProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if we're in the middle of processing
    const currentPath = window.location.pathname
    setIsProcessing(currentPath === "/processing")
  }, [])

  const toggleLanguage = () => {
    if (!mounted) return;
    
    const newLanguage = language === "en" ? "fr" : "en"

    // Update language in context and localStorage
    setLanguage(newLanguage)
    localStorage.setItem("language", newLanguage)

    // If we're on the home page or results page, we can safely change the language
    // For other pages, we might want to warn the user or handle differently
    const currentPath = window.location.pathname

    if (currentPath === "/processing") {
      // Don't allow language change during processing
      toast.warning(t.warningTitle, {
        description: t.noLanguageChangeProcessing,
        duration: 3000,
      })
      return
    }

    toast.success(newLanguage === "en" ? "Language Changed" : "Langue Changée", {
      description: newLanguage === "en" ? "Interface is now in English" : "L'interface est maintenant en français",
      duration: 2000,
    })

    // If we're in the middle of a session, warn the user that content language won't change
    if (currentPath !== "/" && currentPath !== "/config") {
      toast.info(t.noteTitle, {
        description: t.contentLanguageNote,
        duration: 4000,
      })
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={toggleLanguage} disabled={!mounted || isProcessing}>
      {language === "en" ? "Français" : "English"}
    </Button>
  )
}
