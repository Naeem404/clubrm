import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Plus, Settings2, RotateCcw, Save } from "lucide-react"
import { useDashboardLayout } from "./dashboard-layout-provider"

interface DashboardControlsProps {
  /** The full list of widget IDs this dashboard supports. */
  defaultWidgets: string[];
  /** Human-readable titles keyed by widget ID. */
  widgetTitles: Record<string, string>;
}

/**
 * Reusable toolbar for the "Customize Workspace" flow.
 *
 * Renders the Add-Widget dropdown, Reset Layout button, and the
 * Customize / Stop Customizing toggle.  Every dashboard variant
 * imports this component instead of duplicating ~40 lines of
 * identical markup.
 */
export function DashboardControls({ defaultWidgets, widgetTitles }: DashboardControlsProps) {
  const {
    isCustomizing,
    setIsCustomizing,
    visibleWidgets,
    resetLayout,
    toggleWidgetVisibility,
  } = useDashboardLayout()

  if (!isCustomizing) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsCustomizing(true)}
        className="gap-2 transition-all duration-300"
      >
        <Settings2 className="h-4 w-4" />
        Customize Workspace
      </Button>
    )
  }

  return (
    <>
      {Array.from(visibleWidgets).length < defaultWidgets.length && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 border-dashed text-primary hover:text-primary/80">
              <Plus className="h-4 w-4" />
              Add Widget
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Available Widgets</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {defaultWidgets.filter(id => !visibleWidgets.has(id)).map(id => (
              <DropdownMenuItem key={id} onClick={() => toggleWidgetVisibility(id)}>
                {widgetTitles[id] || id}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={resetLayout}
        className="gap-2 transition-all duration-300"
      >
        <RotateCcw className="h-4 w-4" />
        Reset Layout
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={() => setIsCustomizing(false)}
        className="gap-2 bg-primary text-black hover:bg-primary/90 transition-all duration-300"
      >
        <Save className="h-4 w-4" />
        Stop Customizing
      </Button>
    </>
  )
}
