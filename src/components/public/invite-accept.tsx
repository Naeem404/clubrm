import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase, supabaseUntyped as db } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertTriangle, Users, Sparkles } from "lucide-react"

interface InviteRow {
  id: string
  organization_id: string | null
  organization_name: string | null
  role: string
  email: string | null
  expires_at: string | null
  used_at: string | null
}

/**
 * InviteAcceptPage is mounted at `/join/:inviteToken` and is the entry
 * point for member self-registration. Officers generate an invite link in
 * the Members module; the link carries an opaque token that maps to a
 * single-use row in `member_invites`. New users land here, sign up (or
 * sign in), and the invite is consumed by adding them to the org with
 * the role specified on the invite.
 */
export function InviteAcceptPage() {
  const { inviteToken } = useParams<{ inviteToken: string }>()
  const navigate = useNavigate()
  const { user, signUp, signIn } = useAuth()
  const [invite, setInvite] = useState<InviteRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [mode, setMode] = useState<"signup" | "signin">("signup")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  // Load the invite metadata.
  useEffect(() => {
    if (!inviteToken) {
      setError("Missing invite link")
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      const { data, error } = await db
        .from("member_invites")
        .select("id, organization_id, organization_name, role, email, expires_at, used_at")
        .eq("token", inviteToken)
        .maybeSingle()
      if (cancelled) return
      if (error || !data) {
        setError("This invite link is invalid.")
        setLoading(false)
        return
      }
      if (data.used_at) {
        setError("This invite has already been used.")
        setLoading(false)
        return
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError("This invite has expired. Ask the organiser for a new one.")
        setLoading(false)
        return
      }
      setInvite(data as InviteRow)
      if (data.email) setEmail(data.email as string)
      setLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [inviteToken])

  // Once a user is signed in AND the invite is loaded, finalise membership.
  useEffect(() => {
    if (!user || !invite || accepting || accepted) return
    let cancelled = false
    async function finalise() {
      setAccepting(true)
      // Mark the user as a member of the inviting org and set their role.
      const updates: Record<string, unknown> = {
        organization_id: invite!.organization_id,
        onboarding_completed: true,
      }
      if (invite!.role) updates.role = invite!.role

      // Upsert ensures a profile exists even for fresh sign-ups whose
      // profile row hasn't been auto-created yet.
      const { error: profileErr } = await db
        .from("profiles")
        .upsert(
          {
            id: user!.id,
            email: user!.email,
            full_name: fullName.trim() || (user!.user_metadata as { full_name?: string })?.full_name || "",
            ...updates,
          },
          { onConflict: "id" },
        )

      if (profileErr) {
        console.error("[invite] profile upsert failed:", profileErr)
        if (!cancelled) {
          setError("Could not link you to the organisation. Please contact the organiser.")
          setAccepting(false)
        }
        return
      }

      // Burn the invite (single-use).
      await db
        .from("member_invites")
        .update({ used_at: new Date().toISOString(), used_by: user!.id })
        .eq("id", invite!.id)

      if (!cancelled) {
        setAccepted(true)
        setAccepting(false)
        setTimeout(() => navigate("/", { replace: true }), 1200)
      }
    }
    void finalise()
    return () => { cancelled = true }
  }, [user, invite, accepting, accepted, fullName, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setSubmitting(true)
    setError(null)
    if (mode === "signup") {
      if (!fullName.trim()) {
        setError("Please enter your full name.")
        setSubmitting(false)
        return
      }
      const { error } = await signUp(email.trim(), password, fullName.trim())
      if (error) setError(error)
    } else {
      const { error } = await signIn(email.trim(), password)
      if (error) setError(error)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-6 shadow-lg text-center space-y-3">
          <div className="mx-auto rounded-full bg-destructive/10 p-3 w-fit text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Invite unavailable</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!invite) return null

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-3xl border border-primary/30 bg-card p-7 shadow-2xl text-center space-y-3">
          <div className="mx-auto rounded-full bg-primary/10 p-3 w-fit text-primary">
            <Users className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome aboard!</h1>
          <p className="text-sm text-muted-foreground">
            You're now a member of <strong>{invite.organization_name || "the organisation"}</strong>{" "}
            as <strong>{invite.role}</strong>. Taking you to your dashboard…
          </p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-3xl border border-border/60 bg-card p-6 shadow-lg text-center space-y-3">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Linking you to {invite.organization_name || "the organisation"}…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            You're invited
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Join {invite.organization_name || "this club"} on ClubRM
          </h1>
          <p className="text-sm text-muted-foreground">
            You'll join as <strong>{invite.role}</strong>. Create your account or sign in to accept.
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Alex Chen" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="alex@yorku.ca" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "signup" ? "Create account & join" : "Sign in & join"}
            </Button>
          </form>
          <Button variant="outline" className="w-full" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null) }}>
            {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          ClubRM never shares your email. Single-use invite link.
        </p>
      </div>
    </div>
  )
}

// Re-export to satisfy the unused import lint when supabase is referenced
// elsewhere in the bundle.
export const __invitePageReady = !!supabase
