import React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDashboardLayout } from "./dashboard-layout-provider"

interface SortableWidgetProps {
  id: string
  children: React.ReactNode
  className?: string
  isCustomizing?: boolean
}

export function SortableWidget({ id, children, className, isCustomizing }: SortableWidgetProps) {
  const { toggleWidgetVisibility } = useDashboardLayout()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative transition-all duration-300",
        isCustomizing && "ring-2 ring-primary/20 rounded-xl",
        isDragging && "opacity-50",
        className
      )}
    >
      {isCustomizing && (
        <div className="absolute top-2 right-2 z-50 flex items-center gap-2">
          <button
            onClick={() => toggleWidgetVisibility(id)}
            className="p-1.5 bg-background shadow-sm border border-border rounded-md hover:bg-destructive hover:text-white transition-colors"
            title="Hide widget"
          >
            <X className="h-4 w-4" />
          </button>
          <div
            {...attributes}
            {...listeners}
            className="p-1.5 bg-background shadow-sm border border-border rounded-md cursor-grab active:cursor-grabbing hover:bg-accent text-muted-foreground transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        </div>
      )}
      <div className={cn(isDragging && "pointer-events-none")}>
        {children}
      </div>
    </div>
  )
}
