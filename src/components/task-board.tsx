"use client"

import { FormEvent, ReactNode, useCallback, useMemo, useState } from "react"

import { DatePickerField } from "@/components/date-picker-field"
import { DurationInput } from "@/components/duration-input"
import { PrioritySelect } from "@/components/priority-select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addQuickTask, updateTask as updateTaskInStore } from "@/lib/momentum-store"
import { cn } from "@/lib/utils"
import { Priority, Status, Task } from "@/types/momentum"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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
  TaskCardComponent: ({ task, columnId }: { task: Task; columnId: ColumnId }) => ReactNode
  onAddTask: (column: ColumnDefinition) => void
}

type SortableTaskData = {
  type: "task"
  columnId: ColumnId
  task: Task
  sortable?: { index: number }
}

type SortableColumnData = {
  type: "column"
  columnId: ColumnId
}

const BoardColumn = ({ column, tasks, TaskCardComponent, onAddTask }: BoardColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  })

  return (
    <div className="flex flex-shrink-0 basis-[calc((100vw-6rem)/4.5)] min-w-[clamp(320px,calc((100vw-6rem)/4.5),26rem)] flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
        {column.description ? (
          <p className="text-xs text-muted-foreground">{column.description}</p>
        ) : null}
      </div>
      <SortableContext id={column.id} items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-[12rem] flex-1 flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-3 transition",
            isOver && "border-primary/50 bg-primary/5",
          )}
        >
          <div className="flex flex-1 flex-col gap-3">
            {tasks.length ? (
              tasks.map((task) => <TaskCardComponent key={task.id} task={task} columnId={column.id} />)
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                Drag tasks here
              </div>
            )}
          </div>
          <Button type="button" variant="outline" onClick={() => onAddTask(column)}>
            Add task
          </Button>
        </div>
      </SortableContext>
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
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createColumn, setCreateColumn] = useState<ColumnDefinition | null>(null)
  const [createTitle, setCreateTitle] = useState("")
  const [createDuration, setCreateDuration] = useState<number | null>(60)
  const [createPriority, setCreatePriority] = useState<Priority>(Priority.MEDIUM)
  const referenceDate = useMemo(() => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    return base
  }, [])
  const defaultDueDate = useMemo(
    () => toStartOfDayISO(addDays(referenceDate, 7)),
    [referenceDate],
  )
  const [createDueDate, setCreateDueDate] = useState<string | null>(defaultDueDate)

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
      const orderA = typeof a.orderIndex === "number" ? a.orderIndex : Number.POSITIVE_INFINITY
      const orderB = typeof b.orderIndex === "number" ? b.orderIndex : Number.POSITIVE_INFINITY
      if (orderA !== orderB) return orderA - orderB

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
          plannedDate: null,
          completedAt: new Date().toISOString(),
          manualPinned: false,
        }
      }

      if (isDateColumnId(columnId)) {
        const plannedDate = getIsoFromColumnId(columnId)

        return {
          status: Status.BACKLOG,
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

      const activeId = String(active.id)
      const activeTask = taskMap.get(activeId)
      if (!activeTask) return

      const activeData = active.data.current as SortableTaskData | undefined
      const overData = over.data.current as (SortableTaskData | SortableColumnData | undefined)

      const sourceColumnId: ColumnId =
        (activeData && activeData.type === "task" && activeData.columnId) ?? getColumnIdForTask(activeTask)

      const targetColumnId =
        (overData && overData.columnId) || (typeof over.id === "string" ? (over.id as ColumnId) : null)

      if (!targetColumnId) return

      const sourceColumn = normalizedColumns.find((entry) => entry.column.id === sourceColumnId)
      const targetColumn = normalizedColumns.find((entry) => entry.column.id === targetColumnId)
      if (!sourceColumn || !targetColumn) return

      const updates: { id: string; patch: Partial<Task> }[] = []

      const appendOrderUpdates = (columnId: ColumnId, orderedTasks: Task[]) => {
        orderedTasks.forEach((task, index) => {
          const nextOrderIndex = index
          const currentOrderIndex = typeof task.orderIndex === "number" ? task.orderIndex : null
          if (currentOrderIndex !== nextOrderIndex) {
            const existing = updates.find((update) => update.id === task.id)
            if (existing) {
              existing.patch.orderIndex = nextOrderIndex
            } else {
              updates.push({ id: task.id, patch: { orderIndex: nextOrderIndex } })
            }
          }
        })
      }

      if (sourceColumnId === targetColumnId) {
        const columnTasks = sourceColumn.tasks.slice()
        const activeIndex =
          activeData && typeof activeData.sortable?.index === "number"
            ? activeData.sortable.index
            : columnTasks.findIndex((task) => task.id === activeId)
        if (activeIndex === -1) return

        const targetIndex =
          overData && overData.type === "task" && typeof overData.sortable?.index === "number"
            ? overData.sortable.index
            : columnTasks.length - 1

        const reordered = arrayMove(columnTasks, activeIndex, targetIndex)
        appendOrderUpdates(sourceColumnId, reordered)
      } else {
        const sourceTasks = sourceColumn.tasks.filter((task) => task.id !== activeId)
        const targetTasks = targetColumn.tasks.filter((task) => task.id !== activeId)

        let insertionIndex =
          overData && overData.type === "task" && typeof overData.sortable?.index === "number"
            ? overData.sortable.index
            : targetTasks.length

        if (insertionIndex < 0) insertionIndex = 0
        if (insertionIndex > targetTasks.length) insertionIndex = targetTasks.length

        const nextTargetTasks = targetTasks.slice()
        nextTargetTasks.splice(insertionIndex, 0, activeTask)

        appendOrderUpdates(sourceColumnId, sourceTasks)
        appendOrderUpdates(targetColumnId, nextTargetTasks)

        const columnPatch = resolveColumnPatch(activeTask, targetColumnId)
        if (columnPatch) {
          const existing = updates.find((update) => update.id === activeId)
          if (existing) {
            existing.patch = { ...existing.patch, ...columnPatch }
          } else {
            updates.push({ id: activeId, patch: columnPatch })
          }
        }
      }

      updates.forEach(({ id, patch }) => {
        if (Object.keys(patch).length > 0) {
          onUpdateTask(id, patch)
        }
      })
    },
    [normalizedColumns, onUpdateTask, resolveColumnPatch, taskMap],
  )

  const DraggableTaskCard = ({ task, columnId }: { task: Task; columnId: ColumnId }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: task.id,
      data: {
        type: "task",
        columnId,
        task,
      },
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    }

    return (
      <TaskCard
        key={task.id}
        task={task}
        onOpenDetails={onOpenTask}
        onStatusChange={handleStatusChange}
        onTogglePinned={handleTogglePinned}
        draggable={{
          attributes,
          listeners: listeners ?? undefined,
          setNodeRef,
          isDragging: isDragging || activeTaskId === task.id,
          style,
        }}
      />
    )
  }

  const resetCreateForm = useCallback(() => {
    setCreateTitle("")
    setCreateDuration(60)
    setCreatePriority(Priority.MEDIUM)
    setCreateDueDate(defaultDueDate)
    setCreateColumn(null)
  }, [defaultDueDate])

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      setIsCreateOpen(open)
      if (!open) {
        resetCreateForm()
      }
    },
    [resetCreateForm],
  )

  const handleAddTaskClick = useCallback(
    (column: ColumnDefinition) => {
      setCreateColumn(column)
      setCreateTitle("")
      setCreateDuration(60)
      setCreatePriority(Priority.MEDIUM)
      setCreateDueDate(defaultDueDate)
      setIsCreateOpen(true)
    },
    [defaultDueDate],
  )

  const handleCreateSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!createColumn) return

      const trimmedTitle = createTitle.trim()
      if (!trimmedTitle) return

      const task = addQuickTask(trimmedTitle)
      const nowIso = new Date().toISOString()

      let status = Status.BACKLOG
      let plannedDate: string | null = null
      let manualPinned = false
      let completedAt: string | null = null

      if (createColumn.id === "done") {
        status = Status.DONE
        completedAt = nowIso
      } else if (createColumn.id === "backlog") {
        status = Status.BACKLOG
      } else if (isDateColumnId(createColumn.id)) {
        status = Status.BACKLOG
        plannedDate = createColumn.dateIso ?? null
        manualPinned = true
      }

      updateTaskInStore(
        task.id,
        {
          priority: createPriority,
          status,
          plannedDate,
          manualPinned,
          completedAt,
          dueDate: createDueDate,
          durationMinutes: createDuration ?? 0,
        } as Partial<Task>,
      )

      handleCreateOpenChange(false)
    },
    [
      createColumn,
      createDuration,
      createDueDate,
      createPriority,
      createTitle,
      handleCreateOpenChange,
    ],
  )

  const createDialogTitle = createColumn ? `Add task to ${createColumn.title}` : "Add task"

  const isCreateDisabled = !createTitle.trim()

  return (
    <>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="w-full overflow-x-auto pb-4">
          <div className="flex gap-4">
            {normalizedColumns.map(({ column, tasks: columnTasks }) => (
              <BoardColumn
                key={column.id}
                column={column}
                tasks={columnTasks}
                TaskCardComponent={DraggableTaskCard}
                onAddTask={handleAddTaskClick}
              />
            ))}
          </div>
        </div>
      </DndContext>

      <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createDialogTitle}</DialogTitle>
            <DialogDescription>
              Capture the essentials to plan your next focus session.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-task-title">Title</Label>
              <Input
                id="new-task-title"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                placeholder="What are you working on?"
                autoFocus
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-task-priority">Priority</Label>
                <PrioritySelect
                  id="new-task-priority"
                  value={createPriority}
                  onValueChange={setCreatePriority}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-task-duration">Duration (minutes)</Label>
                <DurationInput
                  id="new-task-duration"
                  value={createDuration}
                  onValueChange={setCreateDuration}
                  min={0}
                />
              </div>
            </div>
            <DatePickerField
              id="new-task-deadline"
              label="Deadline"
              value={createDueDate}
              onChange={setCreateDueDate}
              description="When would you like this completed?"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleCreateOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreateDisabled}>
                Create task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

