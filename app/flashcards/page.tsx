"use client"

import { useEffect, useState, useCallback } from "react"
import { useProgress } from "@/contexts/progress-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { generateFlashcards } from "@/lib/ai"
import { useLanguage } from "@/hooks/use-language"
import { translations } from "@/lib/translations"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthHeader } from "@/components/auth-header"
import { DifficultySelector } from "@/components/difficulty-selector"

interface Flashcard {
  question: string
  answer: string
  id: string
}

export default function FlashcardsPage() {
  console.log("--- Rendering FlashcardsPage ---"); // Added Log
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [batchStartIndex, setBatchStartIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // Use the progress context instead of local state
  const { chunkProgress, updateChunkProgress, resetProgress } = useProgress()
  const router = useRouter()
  const { language } = useLanguage()
  const t = translations[language]
  const [contentLanguage, setContentLanguage] = useState<"en" | "fr">("en")
  const [isInitialized, setIsInitialized] = useState(false)
  const [showDifficultySelector, setShowDifficultySelector] = useState(true)
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(0)
  
  // Handle difficulty selection
  const handleDifficultySelected = (difficulty: number) => {
    setSelectedDifficulty(difficulty)
    setShowDifficultySelector(false)
    // Store the selected difficulty in session storage
    sessionStorage.setItem("selectedDifficulty", difficulty.toString())
    // Trigger flashcard generation
    generateMoreFlashcards(difficulty)
  }

  // Memoize the generateMoreFlashcards function to prevent recreation on each render
  const generateMoreFlashcards = useCallback(async (difficulty?: number) => {
    setIsLoading(true)
    console.log(`generateMoreFlashcards: Starting generation with difficulty ${difficulty || selectedDifficulty}...`);

    try {
      const courseData = JSON.parse(sessionStorage.getItem("courseData") || "{}")
      const transcript = sessionStorage.getItem("transcript") || ""
      const batchSize = 10 // Number of flashcards to generate at once
      const difficultyToUse = difficulty !== undefined ? difficulty : selectedDifficulty || 3

      // Use the content language for generating flashcards
      let newFlashcards;
      try {
        console.log("generateMoreFlashcards: Calling generateFlashcards API..."); // Added Log
        
        // Reset progress when starting
        resetProgress();
        
        // Make API call with progress callback
        newFlashcards = await generateFlashcards(
          courseData, 
          transcript, 
          batchSize, 
          contentLanguage, 
          flashcards, 
          difficultyToUse,
          // Pass progress callback
          updateChunkProgress
        );
        console.log("generateMoreFlashcards: API call successful."); // Added Log
      } catch (apiError) {
        console.error("generateMoreFlashcards: generateFlashcards API call failed:", apiError); // Enhanced Error Logging
        toast.error(t.errorTitle, {
          description: `${t.flashcardError}: ${apiError instanceof Error ? apiError.message : 'Unknown API error'}`,
        });
        return false; // Indicate failure
      }

      // Use functional updates to ensure we're working with the latest state
      setFlashcards(prev => [...prev, ...newFlashcards]);
      console.log("generateMoreFlashcards: State updated with new flashcards."); // Added Log
      return true;
    } finally {
      setIsLoading(false);
      console.log("generateMoreFlashcards: Finished generation attempt."); // Added Log
    }
  }, [contentLanguage, t, toast, selectedDifficulty])

  // Function to move to the next flashcard
  const goToNextFlashcard = useCallback(async () => {
    setShowAnswer(false);

    // Check if the *current* card is the 10th one (index 9 relative to batch start)
    if (currentIndex === batchStartIndex + 9) {
      console.log("goToNextFlashcard: Reached 10th card, navigating to summary."); // Added Log
      sessionStorage.setItem("flashcards", JSON.stringify(flashcards));
      // Store the index *after* the 10th card (e.g., 10, 20) as the completed count
      sessionStorage.setItem("lastCompletedIndex", (currentIndex + 1).toString()); 
      router.push("/summary");
    } 
    // Otherwise, if it's not the last card and we have more cards loaded, advance the index
    else if (currentIndex < flashcards.length - 1) { 
      console.log(`goToNextFlashcard: Advancing from index ${currentIndex} to ${currentIndex + 1}.`); // Added Log
      setCurrentIndex(prev => prev + 1);
    } else {
        // This case might occur if trying to advance past the last loaded card before summary transition
        console.log("goToNextFlashcard: Attempted to advance past the last available card."); // Added Log
    }
  }, [currentIndex, flashcards, batchStartIndex, router]); // Removed unused dependencies

  // Check for course data and set content language - only once on mount
  useEffect(() => {
    let mounted = true;

    const initializeFlashcards = async () => {
      console.log("FlashcardsPage useEffect[mount]: Running initialization checks."); // Added Log
      const courseData = sessionStorage.getItem("courseData");
      const storedContentLanguage = sessionStorage.getItem("contentLanguage") as "en" | "fr";

      if (!courseData) {
        console.log("FlashcardsPage useEffect[mount]: No courseData found in sessionStorage. Redirecting."); // Added Log
        toast.error(t.errorTitle, {
          description: t.noResults,
        })
        router.push("/")
        return
      }
      console.log("FlashcardsPage useEffect[mount]: courseData found."); // Added Log

      // Set the content language (the language used for generating content)
      if (storedContentLanguage && mounted) {
        console.log(`FlashcardsPage useEffect[mount]: Setting content language from storage: ${storedContentLanguage}`); // Added Log
        setContentLanguage(storedContentLanguage);
      } else if (mounted) {
        console.log(`FlashcardsPage useEffect[mount]: Setting content language from UI language: ${language}`); // Added Log
        // If no stored content language, use the current UI language
        setContentLanguage(language);
        sessionStorage.setItem("contentLanguage", language);
      }

      if (mounted) {
        console.log("FlashcardsPage useEffect[mount]: Setting isInitialized to true."); // Added Log
        setIsInitialized(true);
      }
    };
    
    initializeFlashcards();
    
    return () => {
      mounted = false;
    };
  }, []) // Empty dependency array - only run on mount

  // Generate/Load flashcards when initialized
  useEffect(() => {
    const generateOrLoadFlashcards = async () => {
      // Only run if initialized and not already loading
      if (!isInitialized || isLoading) {
        console.log(`FlashcardsPage useEffect[generate/load]: Skipping (isInitialized: ${isInitialized}, isLoading: ${isLoading})`); // Added Log
        return;
      }

      console.log("FlashcardsPage useEffect[generate/load]: Proceeding to generate or load."); // Added Log
      const isContinuingSession = sessionStorage.getItem('startNextFlashcardBatch');

      if (isContinuingSession) {
        console.log("FlashcardsPage useEffect[generate/load]: Continuing session detected."); // Added Log
        sessionStorage.removeItem('startNextFlashcardBatch'); // Consume the flag
        const storedFlashcards = sessionStorage.getItem("flashcards");

        if (storedFlashcards) {
          try {
            const loadedCards = JSON.parse(storedFlashcards);
            console.log(`FlashcardsPage useEffect[generate/load]: Loaded ${loadedCards.length} existing cards.`); // Added Log

            // Set states synchronously before generating more
            setFlashcards(loadedCards);
            const newBatchStart = Math.floor(loadedCards.length / 10) * 10;
            setBatchStartIndex(newBatchStart);
            setCurrentIndex(newBatchStart); // Set index to the start of the new batch
            console.log(`FlashcardsPage useEffect[generate/load]: Set batchStart=${newBatchStart}, currentIndex=${newBatchStart}`); // Added Log
            setIsLoading(true); // Set loading to true *before* generating

            // Generate next batch using loaded cards directly
            const courseData = JSON.parse(sessionStorage.getItem("courseData") || "{}");
            const transcript = sessionStorage.getItem("transcript") || "";
            const batchSize = 10;

            console.log("FlashcardsPage useEffect[generate/load]: Calling generateFlashcards API for next batch..."); // Added Log
            const newFlashcards = await generateFlashcards(
              courseData,
              transcript,
              batchSize,
              contentLanguage,
              loadedCards // Pass loaded cards directly
            );
            console.log(`FlashcardsPage useEffect[generate/load]: API returned ${newFlashcards.length} new cards.`); // Added Log

            // Update state with combined cards
            setFlashcards(prev => [...prev, ...newFlashcards]);
          } catch (error) {
            console.error("FlashcardsPage useEffect[generate/load]: Error during continuing session generation:", error); // Enhanced Error Logging
            toast.error(t.errorTitle, {
              description: `${t.flashcardError}: ${error instanceof Error ? error.message : 'Unknown generation error'}`,
            });
            // Consider redirecting or showing a persistent error state here
          } finally {
            setIsLoading(false); // Ensure loading is set to false even on error
          }
        } else {
            console.log("FlashcardsPage useEffect[generate/load]: No stored flashcards found for continuing session."); // Added Log
        }
      } else if (flashcards.length === 0 && !showDifficultySelector) {
        // New session - generate first batch (only if difficulty has been selected)
        console.log("FlashcardsPage useEffect[generate/load]: Starting new session, generating first batch..."); // Added Log
        try {
            const success = await generateMoreFlashcards(); // generateMoreFlashcards now handles its own loading state and errors
            if (success) {
                setCurrentIndex(0); // Start at index 0 for the first card
                setBatchStartIndex(0);
                console.log("FlashcardsPage useEffect[generate/load]: First batch generated successfully."); // Added Log
            } else {
                console.log("FlashcardsPage useEffect[generate/load]: First batch generation failed."); // Added Log
                // Handle generation failure (e.g., show error message, redirect)
            }
        } catch (error) {
             console.error("FlashcardsPage useEffect[generate/load]: Unexpected error calling generateMoreFlashcards:", error); // Added Log for safety
             toast.error(t.errorTitle, { description: t.flashcardError });
        }
      } else {
         console.log(`FlashcardsPage useEffect[generate/load]: Already have ${flashcards.length} cards, no action needed.`); // Added Log
      }
    };

    generateOrLoadFlashcards();
  // Rerun when isInitialized changes, or when contentLanguage changes (to potentially regenerate if needed)
  }, [isInitialized, contentLanguage, t, toast, flashcards.length, showDifficultySelector]); // Added dependencies

  const handleStop = () => {
    console.log(`handleStop: Stopping at index ${currentIndex}. Storing ${flashcards.length} cards.`); // Added Log
    // Store the flashcards for the summary
    sessionStorage.setItem("flashcards", JSON.stringify(flashcards));
    // Store the *next* card's index if stopped mid-batch, or the total count if finished batch
    const lastIndex = currentIndex === batchStartIndex + 10 ? currentIndex : currentIndex + 1;
    sessionStorage.setItem("lastCompletedIndex", lastIndex.toString());
    router.push("/summary");
  };

  // Current index is 0-based, but we display 1-based count
  const currentCardIndexInBatch = currentIndex - batchStartIndex;
  const currentFlashcard = currentIndex >= 0 && currentIndex < flashcards.length
    ? flashcards[currentIndex]
    : null;

  console.log(`Rendering card: overallIndex=${currentIndex}, batchStartIndex=${batchStartIndex}, cardsLoaded=${flashcards.length}, isLoading=${isLoading}`); // Added Log

  return (
    <div className="flex min-h-screen flex-col">
      <AuthHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <h1 className="text-3xl font-bold text-center">{t.flashcardsTitle}</h1>

          {showDifficultySelector ? (
            <Card className="w-full">
              <CardContent className="pt-6">
                <DifficultySelector onDifficultySelected={handleDifficultySelected} />
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card className="w-full min-h-[16rem]">
              <CardHeader>
                <Skeleton className="h-8 w-2/3 mx-auto" />
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center min-h-[8rem] px-6 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <p className="text-sm text-muted-foreground mt-4">
                  {chunkProgress.total > 1 
                    ? `${t.generating} (${chunkProgress.current}/${chunkProgress.total})` 
                    : t.generating}
                </p>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Skeleton className="h-10 w-24" />
              </CardFooter>
            </Card>
          ) : currentFlashcard ? (
            <Card className="w-full min-h-[16rem]">
              <CardHeader>
                <CardTitle className="text-center">{showAnswer ? t.answerLabel : t.questionLabel}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center min-h-[8rem] px-6">
                <p className="text-lg text-center">{showAnswer ? currentFlashcard.answer : currentFlashcard.question}</p>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button onClick={() => setShowAnswer(!showAnswer)}>{showAnswer ? t.showQuestion : t.showAnswer}</Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="w-full min-h-[16rem] flex flex-col items-center justify-center text-center p-4">
                {isInitialized ? (
                    <p>{t.flashcardError}</p> // Replaced non-existent key with existing error key
                ) : (
                    <p>{t.loading}</p> // Initial loading before initialization check
                )}
            </Card>
          )}

          {/* Buttons */}
          <div className="flex justify-between">
             {/* Show only Finish button on the 10th card */}
             {(currentCardIndexInBatch === 10 && currentFlashcard) || (flashcards.length > 0 && !currentFlashcard && !isLoading) ? (
               <div className="w-full flex justify-center">
                 <Button onClick={handleStop}>
                   {t.finishButton}
                 </Button>
               </div>
             ) : flashcards.length > 0 || isLoading ? ( // Show Stop/Next only if cards exist or loading
               <>
                 <Button variant="outline" onClick={handleStop} disabled={isLoading && flashcards.length === 0}>
                   {t.stopButton}
                 </Button>
                 <Button onClick={goToNextFlashcard} disabled={isLoading || !currentFlashcard}>
                   {isLoading ? t.generating : t.nextButton}
                 </Button>
               </>
             ) : null /* Show nothing if initialized but no cards generated yet */ }
           </div>


          {/* Card Counter */}
          {flashcards.length > 0 && currentFlashcard && ( // Only show counter if a card is actually displayed
             <p className="text-center text-sm text-muted-foreground">
               {/* Display 1-based index relative to the batch */}
               Card {currentCardIndexInBatch + 1}/10 
             </p>
          )}
        </div>
      </div>
    </div>
  )
}
