"use client"

/* eslint-disable react-hooks/refs */

import { ReactNode, RefObject, useCallback, useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { Status, Task } from "@/types/momentum"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core"

import { TaskCard } from "./task-card"

type DateColumnId = `date:${string}`

type ColumnId = "backlog" | "done" | DateColumnId

interface ColumnDefinition {
  id: ColumnId
  title: string
  description?: string
  dateIso?: string
}

const addDays = (date: Date, offset: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + offset)
  return result
}

const toStartOfDayISO = (date: Date): string => {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next.toISOString()
}

const toStartOfDayISOFromValue = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value)
  return toStartOfDayISO(date)
}

const createDateColumnId = (iso: string): DateColumnId => `date:${iso}`

const isDateColumnId = (columnId: ColumnId): columnId is DateColumnId =>
  columnId.startsWith("date:")

const getIsoFromColumnId = (columnId: DateColumnId): string => columnId.slice(5)

interface TaskBoardProps {
  tasks: Task[]
  onOpenTask: (taskId: string) => void
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void
  weekSpan: number
}

interface BoardColumnProps {
  column: ColumnDefinition
  tasks: Task[]
  TaskCardComponent: ({ task }: { task: Task }) => ReactNode
}

const BoardColumn = ({ column, tasks, TaskCardComponent }: BoardColumnProps) => {
  const droppable = useDroppable({ id: column.id })

  return (
    <div className="flex flex-shrink-0 basis-[calc((100vw-6rem)/4.5)] min-w-[clamp(320px,calc((100vw-6rem)/4.5),26rem)] flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
        {column.description ? (
          <p className="text-xs text-muted-foreground">{column.description}</p>
        ) : null}
      </div>
      <div
        ref={droppable.nodeRef as unknown as RefObject<HTMLDivElement>}
        {...droppable.listeners}
        className={cn(
          "flex min-h-[12rem] flex-1 flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-3 transition",
          droppable.isOver && "border-primary/50 bg-primary/5",
        )}
      >
        {tasks.length ? (
          tasks.map((task) => <TaskCardComponent key={task.id} task={task} />)
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
            Drag tasks here
          </div>
        )}
      </div>
    </div>
  )
}

const getColumnIdForTask = (task: Task): ColumnId => {
  if (task.status === Status.DONE || task.status === Status.ARCHIVED) return "done"

  if (!task.plannedDate || task.status === Status.BACKLOG) {
    return "backlog"
  }

  const iso = toStartOfDayISOFromValue(task.plannedDate)
  return createDateColumnId(iso)
}

export function TaskBoard({ tasks, onOpenTask, onUpdateTask, weekSpan }: TaskBoardProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const referenceDate = useMemo(() => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    return base
  }, [])

  const taskMap = useMemo(() => {
    const map = new Map<string, Task>()
    tasks.forEach((task) => {
      map.set(task.id, task)
    })
    return map
  }, [tasks])

  const columnDefinitions = useMemo<ColumnDefinition[]>(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })

    const dayColumns = new Map<string, ColumnDefinition>()

    const ensureDayColumn = (date: Date, overrideTitle?: string) => {
      const iso = toStartOfDayISO(date)
      if (dayColumns.has(iso)) {
        const existing = dayColumns.get(iso)
        if (existing && overrideTitle) {
          dayColumns.set(iso, { ...existing, title: overrideTitle })
        }
        return
      }

      dayColumns.set(iso, {
        id: createDateColumnId(iso),
        title: overrideTitle ?? formatter.format(new Date(iso)),
        dateIso: iso,
      })
    }

    ensureDayColumn(referenceDate, "Today")
    ensureDayColumn(addDays(referenceDate, 1), "Tomorrow")

    for (let offset = 2; offset < weekSpan; offset += 1) {
      ensureDayColumn(addDays(referenceDate, offset))
    }

    tasks.forEach((task) => {
      if (!task.plannedDate) return
      ensureDayColumn(new Date(task.plannedDate))
    })

    const orderedDayColumns = Array.from(dayColumns.values()).sort((a, b) => {
      const aTime = a.dateIso ? new Date(a.dateIso).getTime() : 0
      const bTime = b.dateIso ? new Date(b.dateIso).getTime() : 0
      return aTime - bTime
    })

    return [
      {
        id: "backlog",
        title: "Backlog",
        description: "Ideas waiting to be scheduled",
      },
      ...orderedDayColumns,
      { id: "done", title: "Done" },
    ]
  }, [referenceDate, tasks, weekSpan])

  const normalizedColumns = useMemo(() => {
    const groups = new Map<ColumnId, Task[]>(
      columnDefinitions.map((column) => [column.id, []]),
    )

    tasks.forEach((task) => {
      if (task.status === Status.ARCHIVED) {
        return
      }

      const columnId = getColumnIdForTask(task)
      if (!groups.has(columnId)) {
        groups.set(columnId, [])
      }
      groups.get(columnId)?.push(task)
    })

    const sortTasks = (a: Task, b: Task) => {
      const pinWeight = Number(Boolean(b.manualPinned)) - Number(Boolean(a.manualPinned))
      if (pinWeight !== 0) return pinWeight

      const plannedA = a.plannedDate ? new Date(a.plannedDate).getTime() : 0
      const plannedB = b.plannedDate ? new Date(b.plannedDate).getTime() : 0
      if (plannedA !== plannedB) return plannedA - plannedB

      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return createdA - createdB
    }

    return columnDefinitions.map((column) => ({
      column,
      tasks: (groups.get(column.id) ?? []).slice().sort(sortTasks),
    }))
  }, [columnDefinitions, tasks])

  const handleStatusChange = useCallback(
    (taskId: string, status: Status) => {
      const patch: Partial<Task> = { status }
      if (status === Status.DONE) {
        patch.completedAt = new Date().toISOString()
        patch.manualPinned = false
      } else {
        patch.completedAt = null
      }
      onUpdateTask(taskId, patch)
    },
    [onUpdateTask],
  )

  const handleTogglePinned = useCallback(
    (taskId: string, pinned: boolean) => {
      onUpdateTask(taskId, { manualPinned: pinned })
    },
    [onUpdateTask],
  )

  const resolveColumnPatch = useCallback(
    (task: Task, columnId: ColumnId): Partial<Task> | null => {
      if (columnId === "backlog") {
        return {
          status: Status.BACKLOG,
          plannedDate: null,
          manualPinned: false,
          completedAt: null,
        }
      }

      if (columnId === "done") {
        return {
          status: Status.DONE,
          completedAt: new Date().toISOString(),
          manualPinned: false,
        }
      }

      if (isDateColumnId(columnId)) {
        const plannedDate = getIsoFromColumnId(columnId)

        const nextStatus = task.status === Status.BLOCKED ? Status.BLOCKED : Status.ACTIVE

        return {
          status: nextStatus,
          plannedDate,
          manualPinned: true,
          completedAt: null,
        }
      }

      return null
    },
    [],
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTaskId(null)
      const { active, over } = event
      if (!over) return

      const taskId = String(active.id)
      const targetColumn = over.id as ColumnId
      const task = taskMap.get(taskId)
      if (!task) return

      const patch = resolveColumnPatch(task, targetColumn)
      if (patch) {
        onUpdateTask(taskId, patch)
      }
    },
    [onUpdateTask, resolveColumnPatch, taskMap],
  )

  const DraggableTaskCard = ({ task }: { task: Task }) => {
    const draggable = useDraggable({ id: task.id })

    return (
      <TaskCard
        key={task.id}
        task={task}
        onOpenDetails={onOpenTask}
        onStatusChange={handleStatusChange}
        onTogglePinned={handleTogglePinned}
        draggable={{
          attributes: draggable.attributes,
          listeners: draggable.listeners,
          nodeRef: draggable.nodeRef,
          isDragging: draggable.isDragging || activeTaskId === task.id,
        }}
      />
    )
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="w-full overflow-x-auto pb-4">
        <div className="flex gap-4">
          {normalizedColumns.map(({ column, tasks: columnTasks }) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={columnTasks}
              TaskCardComponent={DraggableTaskCard}
            />
          ))}
        </div>
      </div>
    </DndContext>
  )
}

