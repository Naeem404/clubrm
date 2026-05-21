import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Shield, Download } from "lucide-react"

interface ReportsHeaderProps {
  selectedDept: string
  onDeptChange: (value: string) => void
  period: string
  onPeriodChange: (value: string) => void
  departments: string[]
  onExport: (format: string) => void
}

export function ReportsHeader({
  selectedDept,
  onDeptChange,
  period,
  onPeriodChange,
  departments,
  onExport,
}: ReportsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Cross-module intelligence across members, operations, finance, and events</p>
      </div>
      <div className="flex items-center gap-2">
        <Select value={selectedDept} onValueChange={onDeptChange}>
          <SelectTrigger className="w-[150px] h-9 text-xs">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Department" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Period" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this-term">This Term</SelectItem>
            <SelectItem value="last-term">Last Term</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={() => onExport("csv")}><Download className="h-3.5 w-3.5" /> CSV</Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={() => onExport("pdf")}><Download className="h-3.5 w-3.5" /> PDF</Button>
      </div>
    </div>
  )
}
