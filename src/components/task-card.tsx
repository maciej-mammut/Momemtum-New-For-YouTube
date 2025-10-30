"use client"

/* eslint-disable react-hooks/refs */

import { MouseEvent, MutableRefObject, RefObject } from "react"
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  GripVertical,
  MoreHorizontal,
  Pin,
  PinOff,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { PRIORITY_LABELS, Priority, Status, Task, formatPlannedDate } from "@/types/momentum"
import { DraggableAttributes, DraggableListeners } from "@dnd-kit/core"

const priorityStyles: Record<Priority, string> = {
  [Priority.NONE]: "bg-muted text-muted-foreground",
  [Priority.LOW]: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  [Priority.MEDIUM]: "bg-blue-500/10 text-blue-700 dark:text-blue-200",
  [Priority.HIGH]: "bg-rose-500/10 text-rose-700 dark:text-rose-200",
}

const statusLabels: Record<Status, string> = {
  [Status.BACKLOG]: "Backlog",
  [Status.ACTIVE]: "Active",
  [Status.BLOCKED]: "Blocked",
  [Status.DONE]: "Done",
  [Status.ARCHIVED]: "Archived",
}

export interface TaskCardProps {
  task: Task
  onOpenDetails: (taskId: string) => void
  onStatusChange: (taskId: string, status: Status) => void
  onTogglePinned: (taskId: string, pinned: boolean) => void
  draggable: {
    attributes: DraggableAttributes
    listeners: DraggableListeners
    nodeRef: MutableRefObject<HTMLElement | null>
    isDragging: boolean
  }
}

export function TaskCard({ task, onOpenDetails, onStatusChange, onTogglePinned, draggable }: TaskCardProps) {
  const handleOpen = () => {
    onOpenDetails(task.id)
  }

  const handleTogglePinned = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()
    onTogglePinned(task.id, !(task.manualPinned ?? false))
  }

  const handleMarkDone = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()
    onStatusChange(task.id, Status.DONE)
  }

  const handleStatusChange = (status: Status) => {
    onStatusChange(task.id, status)
  }

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement)?.closest("[data-quick-action]") || draggable.isDragging) {
      return
    }
    handleOpen()
  }

  const duration = task.durationMinutes ?? 0
  const deadline = formatPlannedDate(task.dueDate)

  return (
    <div
      ref={draggable.nodeRef as unknown as RefObject<HTMLDivElement>}
      {...draggable.attributes}
      {...draggable.listeners}
      onClick={handleCardClick}
      className={cn(
        "group flex cursor-grab flex-col gap-3 rounded-lg border border-border/60 bg-background/70 p-4 text-left shadow-sm transition hover:border-border hover:shadow-md",
        draggable.isDragging && "cursor-grabbing opacity-80 ring-2 ring-primary",
        task.status === Status.DONE &&
          "border-emerald-500/50 bg-emerald-500/10 text-emerald-900 shadow-none dark:text-emerald-100",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GripVertical className="h-4 w-4 opacity-60" aria-hidden />
          <Badge className={cn("text-xs font-medium", priorityStyles[task.priority])}>
            {PRIORITY_LABELS[task.priority]}
          </Badge>
          {task.manualPinned ? (
            <Badge variant="secondary" className="text-xs font-medium">
              Pinned
            </Badge>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              data-quick-action
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Change status</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {(Object.values(Status) as Status[])
              .filter((value) => value !== Status.ARCHIVED)
              .map((status) => (
                <DropdownMenuItem
                  key={status}
                  className="justify-between"
                  onClick={() => handleStatusChange(status)}
                >
                  {statusLabels[status]}
                  {task.status === status ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : null}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2">
        <p className="text-base font-medium text-foreground">{task.title}</p>
        {deadline ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            <span>Due {deadline}</span>
          </div>
        ) : null}
        {duration > 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <span>{duration} min</span>
          </div>
        ) : null}
      </div>

      <div className="mt-1 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground",
            task.manualPinned && "text-primary hover:text-primary",
          )}
          onClick={handleTogglePinned}
          data-quick-action
        >
          {task.manualPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
          <span className="sr-only">Toggle pin</span>
        </Button>
        <Button
          variant={task.status === Status.DONE ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={handleMarkDone}
          data-quick-action
        >
          <CheckCircle2 className="h-4 w-4" />
          <span className="sr-only">Mark done</span>
        </Button>
      </div>
    </div>
  )
}

