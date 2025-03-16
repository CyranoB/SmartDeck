"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { UploadIcon, FileText, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { translations } from "@/lib/translations"
import { useLanguage } from "@/hooks/use-language"
import Link from "next/link"

export function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { language } = useLanguage()
  const t = translations[language]

  useEffect(() => {
    setMounted(true)
    // Check if API key is configured
    const apiKey = localStorage.getItem("openai_api_key")
    setHasApiKey(!!apiKey)
  }, [])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      validateAndSetFile(droppedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = async (file: File) => {
    // Check if file is a text file
    if (file.type !== "text/plain") {
      toast({
        title: t.errorTitle,
        description: t.errorFileType,
        variant: "destructive",
      })
      return
    }

    // Check file content length
    const text = await file.text()
    const wordCount = text.trim().split(/\s+/).length

    if (wordCount > 50000) {
      toast({
        title: t.errorTitle,
        description: t.errorWordCount,
        variant: "destructive",
      })
      return
    }

    setFile(file)
    toast({
      title: t.fileReadyTitle,
      description: t.fileReadyDesc,
    })
  }

  const handleUpload = async () => {
    if (!file || !mounted) return

    // Check if API key is configured
    if (!hasApiKey) {
      toast({
        title: t.errorTitle,
        description: t.noApiKey,
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const text = await file.text()

      // Store the transcript in session storage for processing
      sessionStorage.setItem("transcript", text)

      // Navigate to processing page
      router.push("/processing")
    } catch (error) {
      toast({
        title: t.errorTitle,
        description: t.errorProcessing,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // During SSR, render a minimal loading state
  if (!mounted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-10 w-10 mb-4" />
              <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mb-2" />
              <div className="h-4 w-48 bg-gray-200 animate-pulse rounded mb-4" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasApiKey) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Settings className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t.apiKeyMissing}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t.apiKeyMissingDesc}</p>
              <Link href="/config" passHref>
                <Button>{t.configureApiKey}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="border-2 border-dashed">
        <CardContent className="p-6">
          <div
            className={`flex flex-col items-center justify-center p-6 rounded-lg transition-colors ${
              isDragging ? "bg-primary/10" : "bg-background"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex flex-col items-center space-y-4">
                <FileText className="h-10 w-10 text-primary" />
                <p className="text-sm font-medium">{file.name}</p>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setFile(null)}>
                    {t.change}
                  </Button>
                  <Button onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? t.uploading : t.upload}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <UploadIcon className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t.uploadTitle}</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">{t.uploadDesc}</p>
                <input type="file" id="file-upload" accept=".txt" className="hidden" onChange={handleFileChange} />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>{t.browseFiles}</span>
                  </Button>
                </label>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

