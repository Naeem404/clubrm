import { cn } from "@/lib/utils"
import { Award, Star } from "lucide-react"

interface EngagementScore {
  id: string
  name: string
  role: string
  department: string
  score: number
}

interface EngagementLeaderboardProps {
  engagementScores: EngagementScore[]
}

export function EngagementLeaderboard({ engagementScores }: EngagementLeaderboardProps) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm lg:col-span-2">
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-tight"><Award className="h-4 w-4 text-primary" /> Engagement Leaderboard</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {engagementScores.slice(0, 9).map((m, idx) => (
          <div key={m.id} className={cn("flex items-center gap-3 rounded-xl p-3 border transition-colors", idx < 3 ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border/30")}>
            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", idx === 0 ? "bg-amber-500/20 text-amber-400" : idx === 1 ? "bg-slate-300/20 text-slate-300" : idx === 2 ? "bg-orange-700/20 text-orange-400" : "bg-muted/50 text-muted-foreground")}>
              {idx < 3 ? <Star className="h-4 w-4" /> : `#${idx + 1}`}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{m.name}</p>
              <p className="text-[10px] text-muted-foreground">{m.role} · {m.department}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={cn("text-sm font-bold", m.score >= 70 ? "text-emerald-400" : m.score >= 40 ? "text-amber-400" : "text-red-400")}>{m.score}</p>
              <p className="text-[9px] text-muted-foreground">score</p>
            </div>
            <div className="w-12 h-2 bg-muted/50 rounded-full overflow-hidden shrink-0">
              <div className="h-full rounded-full" style={{ width: `${m.score}%`, backgroundColor: m.score >= 70 ? "#10b981" : m.score >= 40 ? "#f59e0b" : "#ef4444" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
