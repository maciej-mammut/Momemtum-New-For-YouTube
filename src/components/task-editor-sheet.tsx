"use client"

import { ChangeEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Priority, Status, Task } from "@/types/momentum"

interface TaskEditorSheetProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (patch: Partial<Task>) => void
}

const priorityOptions = Object.values(Priority)
const statusOptions = Object.values(Status).filter((status) => status !== Status.ARCHIVED)

const toDateInputValue = (value?: string | null) => (value ? value.slice(0, 10) : "")

const toISODate = (value: string) =>
  value ? new Date(`${value}T00:00:00`).toISOString() : null

export function TaskEditorSheet({ task, open, onOpenChange, onUpdate }: TaskEditorSheetProps) {
  const handleStringChange = (key: keyof Task) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onUpdate({ [key]: event.target.value } as Partial<Task>)
  }

  const handleNumberChange = (key: keyof Task) => (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value
    const parsed = Number(nextValue)
    onUpdate({ [key]: Number.isFinite(parsed) ? parsed : 0 } as Partial<Task>)
  }

  const handleDateChange = (key: "plannedDate" | "dueDate") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      onUpdate({ [key]: value ? toISODate(value) : null } as Partial<Task>)
    }

  const handleSelectChange = (key: "priority" | "status") =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      onUpdate({ [key]: event.target.value } as Partial<Task>)
    }

  const handlePinnedChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdate({ manualPinned: event.target.checked })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0">
        <SheetHeader>
          <SheetTitle>Edit task</SheetTitle>
          <SheetDescription>Adjust details, scheduling, and metadata.</SheetDescription>
        </SheetHeader>
        {task ? (
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={task.title}
                onChange={handleStringChange("title")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-notes">Notes</Label>
              <Textarea
                id="task-notes"
                value={task.notes ?? ""}
                onChange={handleStringChange("notes")}
                rows={5}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <select
                  id="task-priority"
                  value={task.priority}
                  onChange={handleSelectChange("priority")}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-status">Status</Label>
                <select
                  id="task-status"
                  value={task.status}
                  onChange={handleSelectChange("status")}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-planned">Planned date</Label>
                <Input
                  id="task-planned"
                  type="date"
                  value={toDateInputValue(task.plannedDate)}
                  onChange={handleDateChange("plannedDate")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Deadline</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={toDateInputValue(task.dueDate)}
                  onChange={handleDateChange("dueDate")}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-duration">Duration (minutes)</Label>
                <Input
                  id="task-duration"
                  type="number"
                  min={0}
                  step={15}
                  value={task.durationMinutes ?? 0}
                  onChange={handleNumberChange("durationMinutes")}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="task-pinned"
                  type="checkbox"
                  checked={Boolean(task.manualPinned)}
                  onChange={handlePinnedChange}
                  className="h-4 w-4 rounded border border-border"
                />
                <Label htmlFor="task-pinned" className="text-sm">
                  Manually pinned to selected day
                </Label>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
            Select a task to edit its details.
          </div>
        )}
        <SheetFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

