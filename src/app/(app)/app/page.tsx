"use client"

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { FocusModePanel } from "@/components/focus-mode-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TaskBoard } from "@/components/task-board"
import { TaskEditorSheet } from "@/components/task-editor-sheet"
import {
  addQuickTask,
  clearSession,
  runAutoPlan,
  toggleFocusMode,
  updateTask,
  useMomentumSelectors,
} from "@/lib/momentum-store"
import { cn } from "@/lib/utils"
import { useHasHydrated } from "@/lib/use-has-hydrated"
import { Task } from "@/types/momentum"

export default function AppPage() {
  const router = useRouter()
  const hasHydrated = useHasHydrated()
  const [quickTitle, setQuickTitle] = useState("")
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const signOutRedirectRef = useRef(false)

  const [tasks, focusMode, session, settings] = useMomentumSelectors([
    (state) => state.tasks,
    (state) => state.focusMode,
    (state) => state.session,
    (state) => state.settings,
  ])

  useEffect(() => {
    if (!session.isAuthenticated && !signOutRedirectRef.current) {
      router.replace("/auth")
    }
  }, [router, session.isAuthenticated])

  const selectedTask: Task | null = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  )

  const handleQuickAdd = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const title = quickTitle.trim()
      if (!title) return

      const task = addQuickTask(title)
      setQuickTitle("")
      setSelectedTaskId(task.id)
    },
    [quickTitle],
  )

  const handleTaskUpdate = useCallback((taskId: string, patch: Partial<Task>) => {
    updateTask(taskId, patch)
  }, [])

  const handleSheetUpdate = useCallback(
    (patch: Partial<Task>) => {
      if (!selectedTaskId) return
      updateTask(selectedTaskId, patch)
    },
    [selectedTaskId],
  )

  const handleSignOut = useCallback(() => {
    signOutRedirectRef.current = true
    clearSession()
    router.replace("/")
  }, [router])

  if (!hasHydrated) {
    return <div className="flex flex-1 flex-col gap-6" aria-hidden />
  }

  if (!session.isAuthenticated) {
    return null
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-background/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Momentum Planner</h1>
            <p className="text-sm text-muted-foreground">
              Drag tasks across your schedule, quickly add new work, and mark progress in real-time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-sm sm:flex">
              <span className="font-medium text-foreground">
                {session.displayName || session.userId || "Momentum Explorer"}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => runAutoPlan()}
              className="gap-2"
            >
              Auto-plan
            </Button>
            <Button
              type="button"
              variant={focusMode.enabled ? "default" : "outline"}
              onClick={() => toggleFocusMode()}
              className="gap-2"
            >
              {focusMode.enabled ? "Focus mode on" : "Enable focus mode"}
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/app/settings" className="gap-2">
                Settings
              </Link>
            </Button>
            <Button type="button" variant="ghost" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
        <form
          onSubmit={handleQuickAdd}
          className="flex flex-col gap-3 rounded-xl border border-dashed border-border/70 bg-background/60 p-4 sm:flex-row"
        >
          <Input
            placeholder='Quick add a task—e.g. "Edit next video script"'
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
            className="flex-1"
          />
          <Button type="submit" className="sm:w-fit">
            Add task
          </Button>
        </form>
      </header>

      <div
        className={cn(
          "transition-opacity duration-200",
          focusMode.enabled && "pointer-events-none opacity-40",
        )}
      >
        <TaskBoard
          tasks={tasks}
          weekSpan={settings.weekSpan}
          onOpenTask={(taskId) => setSelectedTaskId(taskId)}
          onUpdateTask={handleTaskUpdate}
        />
      </div>

      <TaskEditorSheet
        task={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null)
          }
        }}
        onUpdate={handleSheetUpdate}
      />

      <FocusModePanel />
    </div>
  )
}

