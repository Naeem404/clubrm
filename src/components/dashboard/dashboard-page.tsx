import { useState, useCallback } from "react"
import { useRole } from "@/context/role-context"
import { useAuth } from "@/context/auth-context" 
import { useTasks } from "@/context/tasks-context"
import { useEvents } from "@/context/events-context"
import { Sparkles, Loader2, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AI_FALLBACK_BRIEFS, AI_FALLBACK_DELAY_MS } from "./fallbacks"

// Dashboard Variants
import { PresidentDashboard } from "./variants/president-dashboard"
import { AdminDashboard } from "./variants/admin-dashboard"
import { MarketingDashboard } from "./variants/marketing-dashboard"
import { ExecutiveDashboard } from "./variants/executive-dashboard"
import { VPEventsDashboard } from "./variants/vp-events-dashboard"
import { VPExternalDashboard } from "./variants/vp-external-dashboard"
import { VPFinanceDashboard } from "./variants/vp-finance-dashboard"
import { VPInternalDashboard } from "./variants/vp-internal-dashboard"

export function DashboardPage() {
  const { role } = useRole()
  const { user, session } = useAuth()
  const { tasks } = useTasks()
  const { events } = useEvents()
  
  const [aiSummary, setAiSummary] = useState("Click the refresh icon to generate your executive brief.")
  const [isGenerating, setIsGenerating] = useState(false)

  // The Gemini API key used to be exposed in the browser bundle. The
  // generation now goes through the `/api/ai/brief` Vite middleware /
  // serverless function, which keeps the key on the server.
  const generateStrategicBrief = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true)
    setAiSummary("Consulting the Chief of Staff...")

    try {
      const activeUserId = user?.id || "m1";
      const pendingTasks = tasks
        .filter(t => t.assignees.includes(activeUserId) && t.status !== 'done')
        .slice(0, 5)
        .map(t => `- ${t.title}`)

      const upcomingEvents = events
        .filter(e => new Date(e.startDate) > new Date())
        .slice(0, 3)
        .map(e => `- ${e.title}`)

      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers,
        body: JSON.stringify({ role, pendingTasks, upcomingEvents }),
      })

      if (!res.ok) throw new Error(`AI proxy returned ${res.status}`)
      const data = await res.json()
      if (typeof data?.summary === "string" && data.summary.trim()) {
        setAiSummary(data.summary.trim())
      } else {
        throw new Error("AI proxy returned no summary")
      }
    } catch (error: unknown) {
      console.warn("Gemini proxy unavailable — using fallback brief for role:", role, error);
      setTimeout(() => {
        setAiSummary(AI_FALLBACK_BRIEFS[role as string] || AI_FALLBACK_BRIEFS["default"]);
      }, AI_FALLBACK_DELAY_MS);
    } finally {
      setIsGenerating(false)
    }
  }, [tasks, events, user, session, role, isGenerating]);

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
              <p className="text-sm text-zinc-300 leading-relaxed max-w-4xl">
                {aiSummary}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateStrategicBrief}
            disabled={isGenerating}
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