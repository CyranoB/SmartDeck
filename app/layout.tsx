import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { frFR } from "@clerk/localizations"
import { Providers } from "./providers"
import { LanguageProvider } from "@/hooks/use-language"
import { Toaster } from "@/components/ui/toaster"
import ServerConfigCheck from "@/components/server-config-check"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AI Flashcard Generator",
  description: "Generate flashcards from your course transcripts using AI"
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Check if Clerk environment variables are available
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkEnabled = !!clerkPublishableKey;

  // Wrap content with ClerkProvider only if Clerk is enabled
  const content = (
    <ServerConfigCheck>
      <Providers>
        <LanguageProvider>
          {children}
          <Toaster />
        </LanguageProvider>
      </Providers>
    </ServerConfigCheck>
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {clerkEnabled ? (
          <ClerkProvider localization={frFR}
            appearance={{
              elements: {
                formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
                footerActionLink: 'text-primary hover:text-primary/90',
                card: 'bg-background border border-border shadow-sm'
              }
            }}
          >
            {content}
          </ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  )
}
