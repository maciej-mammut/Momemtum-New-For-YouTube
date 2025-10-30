"use client"

import { useEffect, useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  completeFocusTask,
  exitFocusMode,
  focusNextTask,
  skipFocusTask,
  startFocusTask,
  useMomentumSelectors,
} from "@/lib/momentum-store"
import { cn } from "@/lib/utils"
import { Status, Task } from "@/types/momentum"

export function FocusModePanel() {
  const [focusMode, tasks] = useMomentumSelectors([
    (state) => state.focusMode,
    (state) => state.tasks,
  ])

  useEffect(() => {
    if (!focusMode.enabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        exitFocusMode()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [focusMode.enabled])

  const taskMap = useMemo(() => {
    const map = new Map<string, Task>()
    tasks.forEach((task) => map.set(task.id, task))
    return map
  }, [tasks])

  const activeTask =
    (focusMode.activeTaskId ? taskMap.get(focusMode.activeTaskId) : null) ?? null

  const orderedTasks = useMemo(() => {
    return focusMode.queue
      .map((id) => taskMap.get(id))
      .filter((task): task is Task => Boolean(task))
  }, [focusMode.queue, taskMap])

  const upcomingTasks = orderedTasks.filter(
    (task) => task.id !== (activeTask ? activeTask.id : null),
  )

  if (!focusMode.enabled) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 sm:px-6">
      <Card className="pointer-events-auto w-full max-w-3xl border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardHeader className="gap-3 border-b border-border/70 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Focus mode</CardTitle>
              <CardDescription>
                {activeTask
                  ? "Stay present with the task in front of you."
                  : "No more tasks left in today’s queue."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="uppercase">
                Today: {orderedTasks.length}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => exitFocusMode()}>
                Exit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-6 pt-4">
          {activeTask ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Active task
                </p>
                <p className="text-xl font-semibold leading-tight text-foreground">
                  {activeTask.title}
                </p>
                {activeTask.notes ? (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {activeTask.notes}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => startFocusTask()}
                  disabled={activeTask.status === Status.ACTIVE}
                >
                  {activeTask.status === Status.ACTIVE ? "In progress" : "Start"}
                </Button>
                <Button onClick={() => completeFocusTask()}>Complete</Button>
                <Button
                  variant="outline"
                  onClick={() => skipFocusTask()}
                  disabled={focusMode.queue.length <= 1}
                >
                  Skip
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => focusNextTask()}
                  disabled={focusMode.queue.length <= 1}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You’re all caught up for today. Add more tasks to keep the momentum going.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Up next
            </p>
            {upcomingTasks.length ? (
              <div className="flex flex-wrap gap-2">
                {upcomingTasks.map((task) => (
                  <Badge
                    key={task.id}
                    variant="outline"
                    className={cn("max-w-[14rem] truncate", {
                      "bg-primary/10 text-primary": task.status === Status.ACTIVE,
                    })}
                  >
                    {task.title}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nothing else queued after this.
              </p>
            )}
          </div>

          <p className="text-[10px] font-medium uppercase text-muted-foreground">
            Press Esc to exit focus mode.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
