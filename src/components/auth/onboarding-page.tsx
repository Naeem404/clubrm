import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/auth-context"
import type { Role } from "@/context/role-context"
import { ArrowRight, BadgeCheck, Loader2, Lock, ShieldCheck, Sparkles, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  RESERVED_ONBOARDING_ROLES,
  SELF_SELECTABLE_ONBOARDING_ROLES,
  validateOnboardingSubmission,
} from "@/lib/onboarding-logic"

const ROLE_OPTIONS = [
  { value: "VP Internal", description: "Operations, admin flow, and internal coordination." },
  { value: "VP Finance", description: "Budgets, approvals, and expense tracking." },
  { value: "VP Events", description: "Event planning, scheduling, and delivery." },
  { value: "VP External", description: "Partnerships, outreach, and external relations." },
  { value: "Marketing", description: "Campaigns, promotion, and brand communication." },
  { value: "Executive", description: "General team execution across the club." },
] satisfies { value: Role; description: string }[]

export function OnboardingPage() {
  const { user, profile, completeOnboarding } = useAuth()
  const [step, setStep] = useState<"welcome" | "details">("welcome")
  const [fullName, setFullName] = useState(
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || ""
  )
  const [selectedRole, setSelectedRole] = useState<Role | null>((profile?.role as Role | undefined) ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedRoleMeta = useMemo(
    () => ROLE_OPTIONS.find((option) => option.value === selectedRole) ?? null,
    [selectedRole]
  )

  async function handleContinue() {
    const validationError = validateOnboardingSubmission({
      fullName,
      role: selectedRole,
    })

    if (validationError) {
      setError(validationError)
      return
    }

    const role = selectedRole as Role

    setError(null)
    setSaving(true)
    const result = await completeOnboarding({
      fullName: fullName.trim(),
      role,
    })
    setSaving(false)

    if (result.error) {
      setError(result.error)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_25%),linear-gradient(160deg,rgba(255,255,255,0.02),transparent_55%)]" />
      <div className="relative flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-border/60 bg-card/90 shadow-2xl shadow-black/25 backdrop-blur xl:grid-cols-[1.05fr_0.95fr]">
          <section className="relative flex min-h-[320px] flex-col justify-between overflow-hidden border-b border-border/50 p-8 md:p-10 xl:min-h-[720px] xl:border-b-0 xl:border-r">
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.04),transparent_48%),radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_28%)]" />
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Welcome to ClubRM
              </div>
              <div className="space-y-4">
                <h1 className="max-w-lg text-4xl font-bold tracking-tight md:text-5xl">
                  Set up your space before you enter the workspace.
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground">
                  We just need a couple of details so the dashboard, permissions, and navigation feel tailored from the start.
                </p>
              </div>
            </div>

            <div className="relative grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                <Users className="h-5 w-5 text-primary" />
                <p className="mt-4 text-sm font-semibold">Identity</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Put a real name on the account so the workspace feels human.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="mt-4 text-sm font-semibold">Role-aware navigation</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Use your role to shape what the app emphasizes first.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                <BadgeCheck className="h-5 w-5 text-primary" />
                <p className="mt-4 text-sm font-semibold">One-time setup</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Finish this once, then go straight into the project on future sign-ins.
                </p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-xl">
              <div className="mb-6 flex items-center gap-2">
                <div className={cn("h-2.5 flex-1 rounded-full transition-all", step === "welcome" ? "bg-primary" : "bg-primary/50")} />
                <div className={cn("h-2.5 flex-1 rounded-full transition-all", step === "details" ? "bg-primary" : "bg-border")} />
              </div>

              {step === "welcome" ? (
                <div className="animate-in fade-in slide-in-from-right-3 duration-300 space-y-6">
                  <div className="space-y-3">
                    <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">Step 1</p>
                    <h2 className="text-3xl font-bold tracking-tight">Welcome.</h2>
                    <p className="max-w-md text-sm leading-6 text-muted-foreground">
                      Before you jump into the project, tell us who you are and what role you play in the club.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/60 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Signed in as</p>
                    <p className="mt-2 text-lg font-semibold">{user?.email}</p>
                  </div>

                  <Button onClick={() => setStep("details")} className="h-11 gap-2 rounded-xl px-5">
                    Start setup
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-3 duration-300 space-y-6">
                  <div className="space-y-3">
                    <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">Step 2</p>
                    <h2 className="text-3xl font-bold tracking-tight">Tell us about you.</h2>
                    <p className="max-w-md text-sm leading-6 text-muted-foreground">
                      This helps ClubRM personalize your workspace and save your role for the next time you sign in.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="onboarding-name">Name</Label>
                    <Input
                      id="onboarding-name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Your full name"
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Role</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {ROLE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedRole(option.value)}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-all duration-200",
                            selectedRole === option.value
                              ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                              : "border-border/60 bg-background/55 hover:border-primary/40 hover:bg-background"
                          )}
                        >
                          <p className="text-sm font-semibold">{option.value}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                        </button>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                      <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
                        <Lock className="h-4 w-4" />
                        Reserved roles
                      </div>
                      <p className="mt-2 text-xs leading-5 text-amber-700/90 dark:text-amber-100/80">
                        {RESERVED_ONBOARDING_ROLES.join(" and ")} are assigned by the organization and cannot be self-selected during onboarding.
                      </p>
                    </div>
                  </div>

                  {selectedRoleMeta && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
                      <span className="font-semibold">{selectedRoleMeta.value}</span>
                      <span className="text-primary/80"> selected. {selectedRoleMeta.description}</span>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="button" variant="outline" onClick={() => setStep("welcome")} className="h-11 rounded-xl sm:flex-1">
                      Back
                    </Button>
                    <Button type="button" onClick={handleContinue} disabled={saving} className="h-11 gap-2 rounded-xl sm:flex-1">
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      Enter workspace
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
