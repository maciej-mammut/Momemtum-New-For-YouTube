"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

export type UniqueIdentifier = string | number

export interface Active {
  id: UniqueIdentifier
  data: { current: unknown }
}

export interface Over {
  id: UniqueIdentifier
}

export interface DragStartEvent {
  active: Active
}

export interface DragEndEvent {
  active: Active
  over: Over | null
}

export interface DndContextProps {
  children: React.ReactNode
  onDragStart?: (event: DragStartEvent) => void
  onDragEnd?: (event: DragEndEvent) => void
}

interface DndContextValue {
  active: Active | null
  overId: UniqueIdentifier | null
  setActive: React.Dispatch<React.SetStateAction<Active | null>>
  setOverId: React.Dispatch<React.SetStateAction<UniqueIdentifier | null>>
  handleDrop: (overId: UniqueIdentifier | null) => void
  onDragStart?: (event: DragStartEvent) => void
}

const Context = createContext<DndContextValue | null>(null)

export function DndContext({ children, onDragStart, onDragEnd }: DndContextProps) {
  const [active, setActive] = useState<Active | null>(null)
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null)
  const latestDragEnd = useRef(onDragEnd)

  useEffect(() => {
    latestDragEnd.current = onDragEnd
  }, [onDragEnd])

  const handleDrop = useCallback(
    (targetId: UniqueIdentifier | null) => {
      if (!active) {
        setOverId(null)
        return
      }

      const handler = latestDragEnd.current
      if (handler) {
        handler({ active, over: targetId != null ? { id: targetId } : null })
      }

      setActive(null)
      setOverId(null)
    },
    [active],
  )

  const value = useMemo<DndContextValue>(
    () => ({
      active,
      overId,
      setActive,
      setOverId,
      handleDrop,
      onDragStart,
    }),
    [active, handleDrop, onDragStart, overId],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export interface DraggableArguments {
  id: UniqueIdentifier
  data?: { current: unknown } | unknown
}

export interface DraggableAttributes {
  draggable: boolean
}

export interface DraggableListeners {
  onDragStart: (event: React.DragEvent<HTMLElement>) => void
  onDragEnd: (event: React.DragEvent<HTMLElement>) => void
}

export interface UseDraggableReturn {
  attributes: DraggableAttributes
  isDragging: boolean
  listeners: DraggableListeners
  setNodeRef: (node: HTMLElement | null) => void
  nodeRef: React.MutableRefObject<HTMLElement | null>
  transform: null
}

export function useDraggable({ id, data }: DraggableArguments): UseDraggableReturn {
  const context = useRequiredContext("useDraggable")
  const dataRef = useRef<{ current: unknown }>({ current: undefined })
  const nodeRef = useRef<HTMLElement | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (data && typeof data === "object" && "current" in data) {
      dataRef.current = data as { current: unknown }
    } else {
      dataRef.current = { current: data }
    }
  }, [data])

  const setNodeRef = useCallback((node: HTMLElement | null) => {
    if (nodeRef.current === node) return

    if (nodeRef.current) {
      nodeRef.current.removeAttribute("draggable")
    }

    nodeRef.current = node

    if (nodeRef.current) {
      nodeRef.current.setAttribute("draggable", "true")
    }
  }, [])

  useEffect(() => {
    return () => {
      if (nodeRef.current) {
        nodeRef.current.removeAttribute("draggable")
      }
    }
  }, [])

  useEffect(() => {
    setNodeRef(elementRef.current)
    return () => setNodeRef(null)
  }, [setNodeRef])

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.stopPropagation()
      const active: Active = { id, data: { current: dataRef.current.current } }
      context.setActive(active)
      context.onDragStart?.({ active })
      event.dataTransfer?.setData("application/x-dnd", String(id))
    },
    [context, id],
  )

  const handleDragEnd = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      context.handleDrop(context.overId)
    },
    [context],
  )

  return {
    attributes: { draggable: true },
    isDragging: context.active?.id === id,
    listeners: {
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
    setNodeRef,
    nodeRef: elementRef,
    transform: null,
  }
}

export interface UseDroppableArguments {
  id: UniqueIdentifier
}

export interface UseDroppableReturn {
  isOver: boolean
  setNodeRef: (node: HTMLElement | null) => void
  listeners: {
    onDragOver: (event: React.DragEvent<HTMLElement>) => void
    onDragEnter: (event: React.DragEvent<HTMLElement>) => void
    onDragLeave: (event: React.DragEvent<HTMLElement>) => void
    onDrop: (event: React.DragEvent<HTMLElement>) => void
  }
  nodeRef: React.MutableRefObject<HTMLElement | null>
}

export function useDroppable({ id }: UseDroppableArguments): UseDroppableReturn {
  const context = useRequiredContext("useDroppable")
  const nodeRef = useRef<HTMLElement | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)

  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }

      nodeRef.current = node

      if (nodeRef.current) {
        const handleDragLeave = (event: DragEvent) => {
          if (!event.currentTarget) return
          const related = event.relatedTarget as Node | null
          if (related && nodeRef.current?.contains(related)) {
            return
          }
          context.setOverId((current) => (current === id ? null : current))
        }

        nodeRef.current.addEventListener("dragleave", handleDragLeave)
        cleanupRef.current = () => {
          nodeRef.current?.removeEventListener("dragleave", handleDragLeave)
        }
      }
    },
    [context, id],
  )

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    setNodeRef(elementRef.current)
    return () => setNodeRef(null)
  }, [setNodeRef])

  const updateOver = useCallback(() => {
    context.setOverId(id)
  }, [context, id])

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      context.handleDrop(id)
    },
    [context, id],
  )

  const listeners = useMemo(
    () => ({
      onDragOver: (event: React.DragEvent<HTMLElement>) => {
        event.preventDefault()
        updateOver()
      },
      onDragEnter: (event: React.DragEvent<HTMLElement>) => {
        event.preventDefault()
        updateOver()
      },
      onDragLeave: () => {
        context.setOverId((current) => (current === id ? null : current))
      },
      onDrop: handleDrop,
    }),
    [context, handleDrop, id, updateOver],
  )

  return {
    isOver: context.overId === id,
    setNodeRef,
    listeners,
    nodeRef: elementRef,
  }
}

function useRequiredContext(hookName: string): DndContextValue & {
  setOverId: (value: React.SetStateAction<UniqueIdentifier | null>) => void
} {
  const context = useContext(Context as React.Context<DndContextValue & {
    setOverId: (value: React.SetStateAction<UniqueIdentifier | null>) => void
  }>)

  if (!context) {
    throw new Error(`${hookName} must be used within a DndContext`)
  }

  return context
}

export const DragOverlay: React.FC<{ children?: React.ReactNode }> = () => null

