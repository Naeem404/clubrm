import { useState, useCallback, useEffect } from "react"
import { supabaseUntyped as db } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { useOrg } from "@/context/org-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Copy, Check, Link2, Loader2 } from "lucide-react"

// Roles that can be assigned via an invite. President and Administrator are
// excluded — those should be promoted manually after onboarding.
const INVITE_ROLES = [
  "VP Internal",
  "VP Finance",
  "VP Events",
  "VP External",
  "Marketing",
  "Executive",
  "General Executive",
] as const

interface InviteLinkDialogProps {
  open: boolean
  onClose: () => void
}

/**
 * Officer-facing UI to generate a single-use invite link. The token is a
 * random 32-char string stored in `member_invites`. Anyone visiting
 * `/join/<token>` can sign up and is auto-attached to this org with the
 * chosen role.
 */
export function InviteLinkDialog({ open, onClose }: InviteLinkDialogProps) {
  const { user } = useAuth()
  const { orgId, orgName } = useOrg()

  const [role, setRole] = useState<string>("General Executive")
  const [email, setEmail] = useState("")
  const [generating, setGenerating] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      // Reset whenever the dialog closes so the next open starts clean.
      setRole("General Executive")
      setEmail("")
      setLink(null)
      setError(null)
      setCopied(false)
    }
  }, [open])

  const handleGenerate = useCallback(async () => {
    if (!user || !orgId) {
      setError("You must be signed in to an organisation to invite members.")
      return
    }
    setGenerating(true)
    setError(null)

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8)

    const { data, error: insertErr } = await db
      .from("member_invites")
      .insert({
        token,
        organization_id: orgId,
        organization_name: orgName || null,
        role,
        email: email.trim() || null,
        invited_by: user.id,
      })
      .select("token")
      .single()

    if (insertErr || !data) {
      console.error("[invite] generate failed:", insertErr)
      setError("Could not generate invite link. Please try again.")
      setGenerating(false)
      return
    }

    const url = `${window.location.origin}/join/${data.token}`
    setLink(url)
    setGenerating(false)
  }, [user, orgId, orgName, role, email])

  const handleCopy = useCallback(async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore — older browsers may block clipboard access.
    }
  }, [link])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Invite a member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Their role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVITE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              The new member will join with this role and can be promoted later.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Email <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              type="email"
              placeholder="alex@yorku.ca"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              If provided, the invite is pre-filled with this email at signup.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {link ? (
            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <Label className="text-[11px] uppercase tracking-wider text-primary">Share this link</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button onClick={handleCopy} variant="outline" size="sm" className="gap-1.5 shrink-0">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Single-use • expires in 14 days
              </p>
            </div>
          ) : (
            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
              {generating ? "Generating…" : "Generate invite link"}
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
