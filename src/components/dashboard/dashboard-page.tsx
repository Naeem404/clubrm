import { useState, useCallback, useMemo } from "react"
import { logError } from "@/lib/logger"
import { useRole } from "@/context/role-context"
import { useAuth } from "@/context/auth-context" 
import { useTasks } from "@/context/tasks-context"
import { useEvents } from "@/context/events-context"
import { GoogleGenerativeAI } from "@google/generative-ai"
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
  const { user } = useAuth()
  const { tasks } = useTasks()
  const { events } = useEvents()
  
  const [aiSummary, setAiSummary] = useState("Click the refresh icon to generate your executive brief.")
  const [isGenerating, setIsGenerating] = useState(false)

  const genAI = useMemo(() => {
    const key = import.meta.env.VITE_GEMINI_API_KEY || "";
    return new GoogleGenerativeAI(key);
  }, []);

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
        .join("\n");

      const upcomingEvents = events
        .filter(e => new Date(e.startDate) > new Date())
        .slice(0, 3)
        .map(e => `- ${e.title}`)
        .join("\n");

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });      
      const prompt = `Role: ${role}. Tasks: ${pendingTasks || "None"}. Events: ${upcomingEvents || "None"}. Provide a 2-sentence executive summary for the dashboard.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      setAiSummary(text);

    } catch (error: any) {
      logError("AI Error", 'DashboardPage', error);
      console.warn("Gemini API unavailable — using fallback brief for role:", role);
      
      setTimeout(() => {
        setAiSummary(AI_FALLBACK_BRIEFS[role as string] || AI_FALLBACK_BRIEFS["default"]);
      }, AI_FALLBACK_DELAY_MS);

    } finally {
      setIsGenerating(false)
    }
  }, [tasks, events, user, genAI, role, isGenerating]);

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