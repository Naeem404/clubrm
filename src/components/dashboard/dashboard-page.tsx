import { useState, useCallback, useRef, useEffect } from "react"
import { logError } from "@/lib/logger"
import { useRole } from "@/context/role-context"
import { useAuth } from "@/context/auth-context"
import { Sparkles, Loader2, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"

// Dashboard Variants
import { PresidentDashboard } from "./variants/president-dashboard"
import { AdminDashboard } from "./variants/admin-dashboard"
import { MarketingDashboard } from "./variants/marketing-dashboard"
import { ExecutiveDashboard } from "./variants/executive-dashboard"
import { VPEventsDashboard } from "./variants/vp-events-dashboard"
import { VPExternalDashboard } from "./variants/vp-external-dashboard"
import { VPFinanceDashboard } from "./variants/vp-finance-dashboard"
import { VPInternalDashboard } from "./variants/vp-internal-dashboard"

const BRIEF_PROMPT_TEXT = "Click the refresh icon to generate your executive brief."

type BriefState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; summary: string }
  | { status: "error"; message: string }

/** Response contract of POST /api/brief (see api/brief.ts). */
interface BriefResponse {
  summary: string
  role: string
  generatedAt: string
}

function briefErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "AI brief unavailable — please sign in again."
    case 429:
      return "AI brief unavailable — rate limit reached, try again in a minute."
    default:
      return "AI brief unavailable right now."
  }
}

export function DashboardPage() {
  const { role } = useRole()
  const { session } = useAuth()
  const accessToken = session?.access_token ?? null

  const [brief, setBrief] = useState<BriefState>({ status: "idle" })
  const inFlight = useRef<AbortController | null>(null)

  useEffect(() => () => inFlight.current?.abort(), [])

  const generateStrategicBrief = useCallback(async () => {
    if (inFlight.current) return
    if (!accessToken) {
      setBrief({ status: "error", message: "AI brief unavailable — please sign in." })
      return
    }

    const controller = new AbortController()
    inFlight.current = controller
    setBrief({ status: "loading" })

    try {
      // The server builds the prompt from the caller's own tasks/events;
      // only the currently viewed dashboard role is sent as a hint.
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleHint: role }),
        signal: controller.signal,
      })
      if (!res.ok) {
        setBrief({ status: "error", message: briefErrorMessage(res.status) })
        return
      }
      const data = (await res.json()) as Partial<BriefResponse>
      if (typeof data.summary !== "string" || !data.summary.trim()) {
        setBrief({ status: "error", message: briefErrorMessage(502) })
        return
      }
      setBrief({ status: "ready", summary: data.summary })
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      logError("AI brief request failed", "DashboardPage", error)
      setBrief({ status: "error", message: briefErrorMessage(0) })
    } finally {
      if (inFlight.current === controller) inFlight.current = null
    }
  }, [accessToken, role])

  const isGenerating = brief.status === "loading"
  const briefText =
    brief.status === "ready"
      ? brief.summary
      : brief.status === "error"
        ? brief.message
        : brief.status === "loading"
          ? "Generating your brief…"
          : BRIEF_PROMPT_TEXT

  const renderDashboard = () => {
    switch (role) {
      case "Administrator": return <AdminDashboard />
      case "President": return <PresidentDashboard />
      case "VP Internal": return <VPInternalDashboard />
      case "VP Finance": return <VPFinanceDashboard />
      case "VP Events": return <VPEventsDashboard />
      case "VP External": return <VPExternalDashboard />
      case "Marketing": return <MarketingDashboard />
      default: return <ExecutiveDashboard />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-muted-foreground italic">
            Viewing the <span className="text-primary font-medium">{role}</span> workstation.
          </p>
        </div>
      </div>

      {/* STRATEGIC AI BANNER */}
      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl relative overflow-hidden">
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {isGenerating ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70 mb-1">
                Strategic Brief
              </h3>
              <p
                className={`text-sm leading-relaxed max-w-4xl ${brief.status === "error" ? "text-zinc-500 italic" : "text-zinc-300"}`}
                aria-live="polite"
              >
                {briefText}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateStrategicBrief}
            disabled={isGenerating}
            aria-label="Generate strategic brief"
            className="h-8 w-8 p-0 hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <RotateCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {renderDashboard()}
      </div>
    </div>
  )
}
