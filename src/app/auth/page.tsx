"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setSession, useSession } from "@/lib/momentum-store"

export default function AuthPage() {
  const router = useRouter()
  const session = useSession()
  const [email, setEmail] = useState(session.userId ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (session.isAuthenticated) {
      router.replace("/app")
    }
  }, [router, session.isAuthenticated])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    const normalizedEmail = email.trim().toLowerCase()
    const username = normalizedEmail.split("@")[0] ?? "creator"
    const displayName = username
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "Momentum Creator"

    setSession({
      userId: normalizedEmail || "demo-user",
      displayName: normalizedEmail ? displayName : "Momentum Explorer",
      isAuthenticated: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    })

    router.push("/app")
  }

  if (session.isAuthenticated) {
    return null
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md border-border/70 bg-background/80 p-2 shadow-xl shadow-primary/10 backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <Badge className="mx-auto w-fit" variant="secondary">
            Early access preview
          </Badge>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-semibold">Sign in to Momentum</CardTitle>
            <CardDescription>
              Enter your email to spin up a mock session and explore the workspace.
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <CardContent className="space-y-4">
            <div className="text-left space-y-2">
              <Label className="text-sm font-medium" htmlFor="email">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@channel.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3">
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Opening Momentum…" : "Continue"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              No real auth just yet—we will remember your mock session for this browser.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
