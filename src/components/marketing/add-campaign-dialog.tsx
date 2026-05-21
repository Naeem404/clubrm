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
}: AddCampaignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onReset(); onOpenChange(false) } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
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
            <Input type="number" value={formBudget} onChange={(e) => onFormBudgetChange(e.target.value)} placeholder="0" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onReset(); onOpenChange(false) }}>Cancel</Button>
          <Button onClick={onAdd} disabled={!formName.trim()}>Create Campaign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
