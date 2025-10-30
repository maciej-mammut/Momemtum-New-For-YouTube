import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { Providers } from "@/components/providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Momentum for YouTube",
    template: "%s | Momentum",
  },
  description:
    "A focus-first workspace inspired by Momentum to plan, publish, and track your YouTube channel.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>
          <div className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/60 text-base leading-relaxed text-foreground">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.24),_transparent_65%)]"
            />
            <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+2rem))] pt-[max(2.5rem,calc(env(safe-area-inset-top)+2rem))] sm:px-10 lg:px-16">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
