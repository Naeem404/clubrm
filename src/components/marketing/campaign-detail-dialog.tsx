import { formatNumber } from "./types"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CampaignDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign: {
    name?: string
    description?: string
    reach?: number
    engagement?: number
  } | null
  /** Omit to hide (e.g. user lacks marketing.write). */
  onEdit?: () => void
  onDelete?: () => void
}

export function CampaignDetailDialog({ open, onOpenChange, campaign, onEdit, onDelete }: CampaignDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{campaign?.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{campaign?.description}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-2xl border border-border/40">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Total Reach</p>
              <p className="text-2xl font-black mt-1 text-primary">{formatNumber(campaign?.reach || 0)}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-2xl border border-border/40">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Engagement</p>
              <p className="text-2xl font-black mt-1 text-primary">{formatNumber(campaign?.engagement || 0)}</p>
            </div>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex justify-end gap-2 pt-2">
              {onEdit && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
              {onDelete && (
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
