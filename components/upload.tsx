"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { UploadIcon, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"; 
import { translations } from "@/lib/translations"
import { useLanguage } from "@/hooks/use-language"
import { convertDocumentToText } from "@/lib/document-converter"
import { ErrorDialog } from "@/components/error-dialog"
import { config } from "@/lib/config"

export function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [validatedText, setValidatedText] = useState<string | null>(null) // State for validated non-PDF text
  const [errorDialog, setErrorDialog] = useState({
    isOpen: false,
    title: "",
    message: ""
  })
  const router = useRouter()
  const { toast } = useToast()
  const { language } = useLanguage()
  const t = translations[language]
  const [jobId, setJobId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const showError = (title: string, message: string) => {
    console.log('🚨 Showing error dialog:', title, message);
    setErrorDialog({
      isOpen: true,
      title,
      message
    })
  }

  // Effect to poll job status
  useEffect(() => {
    if (!jobId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/pdf-extract/status/${jobId}`)
        const data = await response.json()
        
        if (data.status === 'completed') {
          clearInterval(pollInterval)
          setIsProcessing(false)
          setExtractionProgress(100)
          toast({
            title: t.processingComplete,
            description: t.processingCompleteDesc,
          })
        } else if (data.status === 'failed') {
          clearInterval(pollInterval)
          setIsProcessing(false)
          // Reset file state if PDF processing fails
          setFile(null); 
          setJobId(null);
          setExtractionProgress(0);
          showError(t.errorTitle, data.error || t.errorPdfProcessing)
        } else if (data.progress) {
          setExtractionProgress(data.progress)
        }
      } catch (error) {
        clearInterval(pollInterval)
        setIsProcessing(false)
        // Reset file state on fetch error
        setFile(null);
        setJobId(null);
        setExtractionProgress(0);
        showError(t.errorTitle, t.errorPdfProcessing)
      }
    }, 1000)

    return () => clearInterval(pollInterval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, t]) // Removed showError from dependency array as it's stable due to definition location

  useEffect(() => {
    console.log('🔄 [UPLOAD] Component mounted');
    setMounted(true)
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
    console.log('📥 File dropped');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      console.log('📄 Dropped file:', droppedFile.name, 'Type:', droppedFile.type);
      validateAndSetFile(droppedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      console.log('📄 Selected file:', selectedFile.name, 'Type:', selectedFile.type);
      validateAndSetFile(selectedFile)
    }
  }

  // showError is defined above useEffect now

  const closeErrorDialog = () => {
    console.log('🔄 Closing error dialog');
    setErrorDialog(prev => ({ ...prev, isOpen: false }))
  }

  // Combined file validation and processing initiation logic
  const validateAndSetFile = async (selectedFile: File) => {
    // Reset states for new file validation
    setFile(null);
    setValidatedText(null);
    setJobId(null);
    setExtractionProgress(0);
    setIsProcessing(false);
    setIsUploading(false);

    console.log('🔍 [UPLOAD] Validating file:', selectedFile.name, 'Size:', (selectedFile.size / 1024 / 1024).toFixed(2), 'MB');

    // Check if file type is supported
    const isTextFile = selectedFile.type === "text/plain";
    const isDocxFile = selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isPdfFile = selectedFile.type === "application/pdf";

    console.log('📋 [UPLOAD] File type checks:', { isTextFile, isDocxFile, isPdfFile, actualType: selectedFile.type });

    if (!isTextFile && !isDocxFile && !isPdfFile) {
      console.warn('⚠️ [UPLOAD] Unsupported file type:', selectedFile.type);
      showError(t.errorTitle, t.errorFileType);
      return;
    }
    
    // Check file size using configurable limit
    const maxFileSize = config.maxFileSizeBytes;
    if (selectedFile.size > maxFileSize) {
      console.warn('⚠️ [UPLOAD] File too large:', (selectedFile.size / 1024 / 1024).toFixed(2), 'MB (limit:', config.maxFileSizeMB, 'MB)');
      const errorMessage = t.errorFileSize.replace('{limit}', config.maxFileSizeMB.toString());
      showError(t.errorTitle, errorMessage);
      return;
    }

    setFile(selectedFile); // Set file state immediately for UI feedback

    try {
      if (isPdfFile) {
        // --- Start PDF Async Processing ---
        console.log('📑 [UPLOAD] Starting PDF text extraction process...');
        setIsProcessing(true);
        
        const formData = new FormData();
        formData.append('file', selectedFile);
          
        const response = await fetch('/api/pdf-extract', { 
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to start PDF processing: ${response.statusText}`);
        }

        const { jobId: receivedJobId } = await response.json();
        setJobId(receivedJobId);
          
        toast({
          title: t.processingPdf,
          description: t.processingPdfDesc,
        });
      } else {
        // --- Process Non-PDF Immediately ---
        console.log('📄 [UPLOAD] Processing non-PDF file...');
        const text = await convertDocumentToText(selectedFile);
        console.log('✅ [UPLOAD] Document text extracted, length:', text.length);

        const wordCount = text.trim().split(/\s+/).length;
        console.log('📝 [UPLOAD] Word count:', wordCount);

        if (wordCount < config.minWordCount) {
          console.warn('⚠️ [UPLOAD] File below minimum word count:', wordCount);
          const errorMessage = t.errorWordCountMin.replace('{count}', wordCount.toLocaleString());
          showError(t.errorTitle, errorMessage);
          setFile(null); // Reset file if validation fails
          return;
        }

        if (wordCount > config.maxWordCount) {
          console.warn('⚠️ [UPLOAD] File exceeds word limit:', wordCount);
          const errorMessage = t.errorWordCount.replace('{count}', wordCount.toLocaleString());
          showError(t.errorTitle, errorMessage);
          setFile(null); // Reset file if validation fails
          return;
        }
        
        setValidatedText(text); // Store validated text
        console.log('✅ [UPLOAD] Non-PDF file validated and text stored');
        toast({
          title: t.fileReadyTitle,
          description: t.fileReadyDesc,
        });
      }
    } catch (error) {
      console.error('❌ [UPLOAD] Error processing file:', error);
      setFile(null); // Reset file state on error
      setIsProcessing(false); // Ensure processing indicator stops
      showError(t.errorTitle, error instanceof Error ? error.message : t.errorProcessing);
    }
  }


  // Handle the final step of proceeding to the processing page
  const handleUpload = async () => {
    if (!file) {
      console.warn('⚠️ [UPLOAD] Attempted upload without file');
      return;
    }
    
    // Prevent proceeding if PDF is still processing
    if (isProcessing) {
       console.warn('⚠️ [UPLOAD] Attempted upload while PDF still processing');
       return; 
    }

    console.log('📤 [UPLOAD] Starting final processing step for:', file.name);
    setIsUploading(true);
    
    try {
      let text: string;
      const isPdfFile = file.type === "application/pdf";
      
      if (isPdfFile) {
        // PDF processing should be complete if !isProcessing and file is set
        // Fetch the final status one last time to get the text result
        if (!jobId) {
            throw new Error("Missing Job ID for completed PDF processing.");
        }
        const response = await fetch(`/api/pdf-extract/status/${jobId}`);
        const data = await response.json();
        
        if (data.status !== 'completed' || !data.result) {
          console.error("❌ [UPLOAD] PDF processing not completed or result missing:", data);
          throw new Error('PDF processing not completed or result missing.');
        }
        text = data.result;
        
        // Re-validate PDF word count *after* extraction just before proceeding
        const wordCount = text.trim().split(/\s+/).length;
        console.log('📝 [UPLOAD] PDF Word count check before proceeding:', wordCount);
        if (wordCount < config.minWordCount) {
          const errorMessage = t.errorWordCountMin.replace('{count}', wordCount.toLocaleString());
          showError(t.errorTitle, errorMessage);
          setIsUploading(false); // Ensure button is re-enabled
          return; 
        }
        if (wordCount > config.maxWordCount) {
          const errorMessage = t.errorWordCount.replace('{count}', wordCount.toLocaleString());
          showError(t.errorTitle, errorMessage);
          setIsUploading(false); // Ensure button is re-enabled
          return;
        }
        
      } else {
        // Use the validated text stored in state for non-PDFs
        if (!validatedText) {
           console.error('❌ [UPLOAD] Validated text not found for non-PDF file.');
           throw new Error('Validated text missing for non-PDF file.'); 
        }
        text = validatedText;
        console.log('📄 [UPLOAD] Using stored validated text for non-PDF upload.');
      }

      console.log('💾 [UPLOAD] Storing transcript in session storage, length:', text.length);
      sessionStorage.setItem("transcript", text);
      router.push("/processing");
    } catch (error) {
      console.error('❌ [UPLOAD] Proceeding error:', error);
      showError(t.errorTitle, error instanceof Error ? error.message : t.errorProcessing);
      setIsUploading(false);
    } finally {
      // Keep setIsUploading(false) here if needed, but navigation usually makes it irrelevant
      // setIsUploading(false); 
      console.log('🏁 [UPLOAD] Final processing step completed');
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

  // Determine if the proceed button should be enabled
  // Enabled if:
  // - A file is selected
  // - It's NOT a PDF currently being processed (isProcessing is false)
  // - EITHER it's a non-PDF with validated text OR it's a PDF with a completed job (jobId exists and not processing)
  const canProceed = file && !isProcessing && (validatedText !== null || (file.type === 'application/pdf' && jobId !== null));

  return (
    <>
      <div className="w-full max-w-md mx-auto">
        <Card className="border-2 border-dashed">
          <CardContent className="p-6">
            <div
              className={`flex flex-col items-center justify-center p-4 md:p-6 rounded-lg transition-colors w-auto max-w-full mx-auto ${
                isDragging ? "bg-primary/10" : "bg-background"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex flex-col items-center space-y-4 w-full">
                  <FileText className="h-10 w-10 text-primary" />
                  <p className="text-sm font-medium">{file.name}</p>
                  {isProcessing ? ( // Show progress only when PDF is actively processing
                    <div className="w-full space-y-4">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p className="text-sm text-muted-foreground">{t.extractingPdf}</p>
                      </div>
                      <Progress value={extractionProgress} className="w-full" />
                      <p className="text-xs text-center text-muted-foreground">{t.extractingPdfWait}</p>
                    </div>
                  ) : ( // Show buttons when not processing PDF
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => {
                        console.log('🔄 [UPLOAD] File change requested, resetting state');
                        // Reset state directly instead of calling validateAndSetFile(null)
                        setFile(null);
                        setJobId(null);
                        setValidatedText(null); 
                        setExtractionProgress(0); 
                        setIsProcessing(false); 
                        setIsUploading(false);
                      }}>
                        {t.change}
                      </Button>
                      <Button 
                        onClick={handleUpload} 
                        disabled={!canProceed || isUploading} // Use canProceed state
                        className={(!canProceed || isUploading) ? "opacity-50 cursor-not-allowed" : ""}
                      >
                        {isUploading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>{t.uploading}</span> 
                          </div>
                        ) : t.upload} 
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <UploadIcon className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t.uploadTitle}</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">{t.uploadDesc}</p>
                  <input 
                    type="file" 
                    id="file-upload" 
                    accept=".txt,.docx,.pdf" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" className="cursor-pointer" asChild>
                      <span>{t.browseFiles}</span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-2">Supported formats: .txt, .docx, .pdf</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <ErrorDialog
        isOpen={errorDialog.isOpen}
        onClose={closeErrorDialog}
        title={errorDialog.title}
        message={errorDialog.message}
      />
    </>
  )
}
