import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CAMPAIGN_STATUS_CONFIG, type CampaignStatus } from "./types"

interface AddCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formName: string
  onFormNameChange: (value: string) => void
  formDesc: string
  onFormDescChange: (value: string) => void
  formStart: string
  onFormStartChange: (value: string) => void
  formEnd: string
  onFormEndChange: (value: string) => void
  formBudget: string
  onFormBudgetChange: (value: string) => void
  onAdd: () => void
  onReset: () => void
  /** "edit" changes the title / submit label. Defaults to "create". */
  mode?: "create" | "edit"
  /** When provided, a status selector is shown (used when editing). */
  formStatus?: CampaignStatus
  onFormStatusChange?: (value: CampaignStatus) => void
  saving?: boolean
  error?: string | null
}

export function AddCampaignDialog({
  open,
  onOpenChange,
  formName,
  onFormNameChange,
  formDesc,
  onFormDescChange,
  formStart,
  onFormStartChange,
  formEnd,
  onFormEndChange,
  formBudget,
  onFormBudgetChange,
  onAdd,
  onReset,
  mode = "create",
  formStatus,
  onFormStatusChange,
  saving = false,
  error,
}: AddCampaignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onReset(); onOpenChange(false) } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{mode === "edit" ? "Edit Campaign" : "New Campaign"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Campaign Name *</Label>
            <Input value={formName} onChange={(e) => onFormNameChange(e.target.value)} placeholder="Spring Recruitment" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={formDesc} onChange={(e) => onFormDescChange(e.target.value)} placeholder="Brief description of the campaign..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={formStart} onChange={(e) => onFormStartChange(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={formEnd} onChange={(e) => onFormEndChange(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Budget ($)</Label>
            <Input type="number" min="0" value={formBudget} onChange={(e) => onFormBudgetChange(e.target.value)} placeholder="0" />
          </div>
          {formStatus && onFormStatusChange && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={(v) => onFormStatusChange(v as CampaignStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CAMPAIGN_STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {error && (
            <p role="alert" className="text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onReset(); onOpenChange(false) }}>Cancel</Button>
          <Button onClick={onAdd} disabled={!formName.trim() || saving}>
            {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
