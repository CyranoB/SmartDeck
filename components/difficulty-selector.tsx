"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/hooks/use-language"
import { translations } from "@/lib/translations"

interface DifficultySelectorProps {
  onDifficultySelected: (level: number) => void
  className?: string
}

export function DifficultySelector({ onDifficultySelected, className }: DifficultySelectorProps) {
  const [hoveredStar, setHoveredStar] = useState(0)
  const [selectedDifficulty, setSelectedDifficulty] = useState(0)
  const { language } = useLanguage()
  const t = translations[language]
  
  const handleStarClick = (level: number) => {
    setSelectedDifficulty(level)
    onDifficultySelected(level)
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-center">
        <h3 className="text-lg font-medium">{t.selectDifficulty}</h3>
        <p className="text-sm text-muted-foreground">
          {selectedDifficulty > 0 
            ? t[`difficultyDescription${selectedDifficulty}` as keyof typeof t] 
            : t.difficultyHint}
        </p>
      </div>
      
      <div className="flex justify-center space-x-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <Star
            key={level}
            className={cn(
              "w-8 h-8 cursor-pointer transition-all",
              (level <= hoveredStar || level <= selectedDifficulty)
                ? "fill-yellow-400 text-yellow-400" 
                : "text-muted-foreground"
            )}
            onMouseEnter={() => setHoveredStar(level)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => handleStarClick(level)}
          />
        ))}
      </div>
    </div>
  )
}
