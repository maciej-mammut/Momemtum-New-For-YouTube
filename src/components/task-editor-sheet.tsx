"use client"

import { ChangeEvent } from "react"

import { DatePickerField } from "@/components/date-picker-field"
import { DurationInput } from "@/components/duration-input"
import { PrioritySelect } from "@/components/priority-select"
import { StatusToggleGroup } from "@/components/status-toggle-group"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Priority, Status, Task } from "@/types/momentum"

interface TaskEditorSheetProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (patch: Partial<Task>) => void
}

export function TaskEditorSheet({ task, open, onOpenChange, onUpdate }: TaskEditorSheetProps) {
  const handleStringChange = (key: keyof Task) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onUpdate({ [key]: event.target.value } as Partial<Task>)
  }

  const handlePriorityChange = (priority: Priority) => {
    onUpdate({ priority })
  }

  const handleStatusChange = (status: Status) => {
    onUpdate({ status })
  }

  const handleDurationChange = (duration: number | null) => {
    onUpdate({ durationMinutes: duration ?? 0 } as Partial<Task>)
  }

  const handlePlannedDateChange = (value: string | null) => {
    onUpdate({ plannedDate: value } as Partial<Task>)
  }

  const handleDueDateChange = (value: string | null) => {
    onUpdate({ dueDate: value } as Partial<Task>)
  }

  const handlePinnedChange = (checked: boolean) => {
    onUpdate({ manualPinned: checked })
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
                <PrioritySelect
                  id="task-priority"
                  value={task.priority}
                  onValueChange={handlePriorityChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-status">Status</Label>
                <StatusToggleGroup
                  id="task-status"
                  value={task.status}
                  onValueChange={handleStatusChange}
                  aria-label="Task status"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DatePickerField
                id="task-planned"
                label="Planned date"
                value={task.plannedDate ?? null}
                onChange={handlePlannedDateChange}
              />
              <DatePickerField
                id="task-due"
                label="Deadline"
                value={task.dueDate ?? null}
                onChange={handleDueDateChange}
                placeholder="No deadline"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-duration">Duration (minutes)</Label>
                <DurationInput
                  id="task-duration"
                  value={task.durationMinutes ?? null}
                  onValueChange={handleDurationChange}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-dashed border-border/60 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Manually pin to day
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Override the planner and keep this task anchored to its chosen date.
                  </p>
                </div>
                <Switch
                  id="task-pinned"
                  checked={Boolean(task.manualPinned)}
                  onCheckedChange={handlePinnedChange}
                  aria-label="Toggle manual pin"
                />
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

