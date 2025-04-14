"use client"

import { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { ProgressProvider } from "@/contexts/progress-context"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ProgressProvider>
        {children}
      </ProgressProvider>
    </ThemeProvider>
  )
}
