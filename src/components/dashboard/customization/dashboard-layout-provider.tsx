import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable"

interface DashboardLayoutContextType {
  isCustomizing: boolean
  setIsCustomizing: (value: boolean) => void
  layout: string[]
  setLayout: (layout: string[]) => void
  visibleWidgets: Set<string>
  toggleWidgetVisibility: (id: string) => void
  resetLayout: () => void
}

const DashboardLayoutContext = createContext<DashboardLayoutContextType | null>(null)

export const useDashboardLayout = () => {
  const context = useContext(DashboardLayoutContext)
  if (!context) throw new Error("useDashboardLayout must be used within a DashboardLayoutProvider")
  return context
}

interface DashboardLayoutProviderProps {
  children: React.ReactNode
  role: string
  defaultWidgets: string[]
}

export function DashboardLayoutProvider({ children, role, defaultWidgets }: DashboardLayoutProviderProps) {
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [layout, setLayout] = useState<string[]>([])
  const [visibleWidgets, setVisibleWidgets] = useState<Set<string>>(new Set(defaultWidgets))

  const storageKey = `dashboard_layout_${role}`
  const visibilityKey = `dashboard_visibility_${role}`

  // Load from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem(storageKey)
    const savedVisibility = localStorage.getItem(visibilityKey)

    if (savedLayout) {
      setLayout(JSON.parse(savedLayout))
    } else {
      setLayout(defaultWidgets)
    }

    if (savedVisibility) {
      setVisibleWidgets(new Set(JSON.parse(savedVisibility)))
    } else {
      setVisibleWidgets(new Set(defaultWidgets))
    }
  }, [role, defaultWidgets])

  // Save to localStorage
  useEffect(() => {
    if (layout.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(layout))
    }
  }, [layout, storageKey])

  useEffect(() => {
    localStorage.setItem(visibilityKey, JSON.stringify(Array.from(visibleWidgets)))
  }, [visibleWidgets, visibilityKey])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setLayout((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over?.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const toggleWidgetVisibility = useCallback((id: string) => {
    setVisibleWidgets((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const resetLayout = useCallback(() => {
    setLayout(defaultWidgets)
    setVisibleWidgets(new Set(defaultWidgets))
    localStorage.removeItem(storageKey)
    localStorage.removeItem(visibilityKey)
  }, [defaultWidgets, storageKey, visibilityKey])

  return (
    <DashboardLayoutContext.Provider
      value={{
        isCustomizing,
        setIsCustomizing,
        layout,
        setLayout,
        visibleWidgets,
        toggleWidgetVisibility,
        resetLayout,
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={layout} strategy={rectSortingStrategy}>
          {children}
        </SortableContext>
      </DndContext>
    </DashboardLayoutContext.Provider>
  )
}
