import { useState, useEffect, useMemo, useCallback } from "react"
import { logError } from "@/lib/logger"
import type { Database } from "@/lib/database.types"
import { 
  type Campaign, 
  type CampaignStatus,
  type PostPlatform,
  CAMPAIGN_STATUS_CONFIG, 
  PLATFORM_CONFIG, 
  formatNumber 
} from "./types"
import { supabase } from "@/lib/supabase"
import { useRole } from "@/context/role-context"
import { hasPermission } from "@/lib/permissions"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
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
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts"
import { 
  Search, Plus, Megaphone, BarChart3, ChevronRight, 
  Calendar, DollarSign, Activity, Target, ArrowUpRight,
  Clock, CheckCircle2
} from "lucide-react"
import { CHART_COLORS } from "./marketing-constants"
import { CustomTooltip } from "./marketing-tooltip"
import { AddCampaignDialog } from "./add-campaign-dialog"
import { CampaignDetailDialog } from "./campaign-detail-dialog"

type CampaignTab = "campaigns" | "analytics" | "calendar" | "live-feed"

const MARKETING_TABS: { id: CampaignTab; label: string; icon: JSX.Element }[] = [
  { id: "campaigns", label: "Campaigns", icon: <Megaphone className="h-4 w-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "calendar", label: "Calendar", icon: <Calendar className="h-4 w-4" /> },
  { id: "live-feed", label: "Activity", icon: <Activity className="h-4 w-4" /> },
]

const MARKETING_PLATFORMS: PostPlatform[] = ["instagram", "twitter", "linkedin", "tiktok"]

function toCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    status: row.status as Campaign["status"],
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    posts: (row.posts as Campaign["posts"]) || [],
    budget: Number(row.budget),
    spent: Number(row.spent),
    reach: Number(row.reach),
    engagement: Number(row.engagement),
    tags: (row.tags as string[]) || [],
    createdAt: (row.created_at as string) || undefined,
    updatedAt: (row.updated_at as string) || undefined,
  }
}

type FeedEntry = { id: string; campaign: Campaign; kind: "created" | "updated"; at: Date }

/** Activity feed derived from real campaign timestamps (no fabricated entries). */
function buildFeed(campaigns: Campaign[]): FeedEntry[] {
  const entries: FeedEntry[] = []
  for (const c of campaigns) {
    const created = c.createdAt ? new Date(c.createdAt) : null
    const updated = c.updatedAt ? new Date(c.updatedAt) : null
    if (created && !Number.isNaN(created.getTime())) {
      entries.push({ id: `${c.id}-created`, campaign: c, kind: "created", at: created })
    }
    // Only count as an edit if updated_at is meaningfully later than created_at
    if (updated && !Number.isNaN(updated.getTime()) && (!created || updated.getTime() - created.getTime() > 1000)) {
      entries.push({ id: `${c.id}-updated`, campaign: c, kind: "updated", at: updated })
    }
  }
  return entries.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 25)
}

function toRow(c: Campaign): Database['public']['Tables']['campaigns']['Insert'] {
  return {
    name: c.name,
    description: c.description,
    status: c.status,
    start_date: c.startDate,
    end_date: c.endDate,
    posts: JSON.parse(JSON.stringify(c.posts)) as Database['public']['Tables']['campaigns']['Row']['posts'],
    budget: c.budget,
    spent: c.spent,
    reach: c.reach,
    engagement: c.engagement,
    tags: c.tags,
  }
}

export function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activeTab, setActiveTab] = useState<CampaignTab>("campaigns")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formStatus, setFormStatus] = useState<CampaignStatus>("draft")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { role } = useRole()
  // UI gating only — RLS on `campaigns` is the real enforcement.
  const canWrite = hasPermission(role, "marketing.write")

  // Add form state  ← new
  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formBudget, setFormBudget] = useState("")
  const [formStart, setFormStart] = useState("")
  const [formEnd, setFormEnd] = useState("")

  function resetForm() {
    setFormName("")
    setFormDesc("")
    setFormBudget("")
    setFormStart("")
    setFormEnd("")
    setFormStatus("draft")
    setEditingId(null)
    setFormError(null)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from("campaigns").select("*").order("created_at", { ascending: true })
      if (cancelled) return
      if (error) {
        logError("Failed to load campaigns", 'MarketingPage', error)
        setLoadError(error.message || "Failed to load campaigns.")
        setCampaigns([])
      } else {
        setLoadError(null)
        setCampaigns((data ?? []).map((r) => toCampaign(r as Record<string, unknown>)))
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  function openCreate() {
    resetForm()
    setAddOpen(true)
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id)
    setFormName(c.name)
    setFormDesc(c.description ?? "")
    setFormBudget(String(c.budget ?? ""))
    setFormStart(c.startDate ?? "")
    setFormEnd(c.endDate ?? "")
    setFormStatus(c.status)
    setFormError(null)
    setSelectedCampaign(null)
    setAddOpen(true)
  }

  const handleSave = useCallback(async () => {
    if (!canWrite || !formName.trim()) return
    const startDate = formStart || new Date().toISOString().split("T")[0]
    const endDate = formEnd || startDate
    if (endDate < startDate) {
      setFormError("End date must be on or after the start date.")
      return
    }
    const budget = Number(formBudget)
    if (formBudget && (!Number.isFinite(budget) || budget < 0)) {
      setFormError("Budget must be a positive number.")
      return
    }
    setFormError(null)
    setSaving(true)
    try {
      if (editingId) {
        const existing = campaigns.find((c) => c.id === editingId)
        if (!existing) throw new Error("Campaign no longer exists.")
        const updated: Campaign = {
          ...existing,
          name: formName.trim(),
          description: formDesc.trim(),
          status: formStatus,
          startDate,
          endDate,
          budget: budget || 0,
        }
        const { data, error } = await supabase
          .from("campaigns")
          .update({ ...toRow(updated), updated_at: new Date().toISOString() })
          .eq("id", editingId)
          .select()
          .single()
        if (error) throw error
        const next = data ? toCampaign(data as Record<string, unknown>) : updated
        setCampaigns((prev) => prev.map((c) => (c.id === editingId ? next : c)))
      } else {
        const newCampaign: Campaign = {
          id: "",
          name: formName.trim(),
          description: formDesc.trim(),
          status: "draft",
          startDate,
          endDate,
          budget: budget || 0,
          spent: 0,
          reach: 0,
          engagement: 0,
          tags: [],
          posts: [],
        }
        const { data, error } = await supabase.from("campaigns").insert(toRow(newCampaign)).select().single()
        if (error) throw error
        if (data) setCampaigns((prev) => [...prev, toCampaign(data as Record<string, unknown>)])
      }
      resetForm()
      setAddOpen(false)
    } catch (err: any) {
      logError(editingId ? "Failed to update campaign" : "Failed to add campaign", 'MarketingPage', err)
      setFormError(err?.message || "Could not save the campaign. Check your permissions and try again.")
    } finally {
      setSaving(false)
    }
  }, [canWrite, formName, formDesc, formStart, formEnd, formBudget, formStatus, editingId, campaigns])

  const handleDelete = useCallback(async (c: Campaign) => {
    if (!canWrite) return
    if (!window.confirm(`Delete campaign "${c.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from("campaigns").delete().eq("id", c.id)
    if (error) {
      logError("Failed to delete campaign", 'MarketingPage', error)
      window.alert(`Could not delete campaign: ${error.message}`)
      return
    }
    setCampaigns((prev) => prev.filter((x) => x.id !== c.id))
    setSelectedCampaign(null)
  }, [canWrite])

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "all" || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [campaigns, search, statusFilter])

  const feed = useMemo(() => buildFeed(campaigns), [campaigns])
  const activeCount = useMemo(() => campaigns.filter((c) => c.status === "active").length, [campaigns])

  const publishedPosts = useMemo(() => campaigns.flatMap((c) => c.posts).filter((p) => p.status === "published"), [campaigns])

  const chartData = useMemo(() => campaigns.map(c => ({
    name: c.name.length > 12 ? c.name.slice(0, 10) + '...' : c.name,
    Reach: c.reach,
    Engagement: c.engagement
  })), [campaigns])

  const platformData = useMemo(() => {
    return MARKETING_PLATFORMS.map(p => ({
      name: PLATFORM_CONFIG[p].label,
      value: publishedPosts.filter(post => post.platform === p).reduce((sum, post) => sum + post.impressions, 0)
    })).filter(d => d.value > 0)
  }, [publishedPosts])

  return (
    <div className="flex flex-col gap-6 p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Card */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card">
        <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at right, hsl(var(--primary)) 0%, transparent 40%)` }} />
        
        <div className="relative flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
            <p className="text-sm text-muted-foreground font-medium">Campaign performance and social reach</p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row">
            <div className="flex min-w-[160px] flex-col justify-between rounded-2xl border border-border/60 bg-background/50 p-3 backdrop-blur-sm">
               <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Campaigns</p>
               <div className="mt-1 flex items-end justify-between">
                 <p className="text-2xl font-bold">{activeCount}</p>
                 <ArrowUpRight className="h-4 w-4 text-primary" />
               </div>
            </div>

            {canWrite && (
              <Button
                onClick={openCreate}
                className="h-auto min-h-[80px] min-w-[180px] gap-2 rounded-2xl px-6 text-sm font-bold transition-all duration-300 bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/20"
              >
                <Plus className="h-5 w-5" />
                New Campaign
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex flex-col gap-4 p-2 border rounded-2xl bg-muted/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border/50">
            {MARKETING_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                  activeTab === tab.id 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                placeholder="Search campaigns..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-9 h-10 w-[220px] bg-background rounded-xl border border-input text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-background rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(CAMPAIGN_STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {loadError && (
          <div role="alert" className="mb-4 text-sm text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20">
            Could not load campaigns: {loadError}
          </div>
        )}
        {activeTab === "campaigns" && (
          <div className="grid gap-3 animate-in fade-in duration-300">
            {!loading && filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border rounded-2xl bg-card">
                <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">{campaigns.length === 0 ? "No campaigns yet." : "No campaigns match your filters."}</p>
              </div>
            )}
            {filtered.map((campaign) => (
              <div 
                key={campaign.id}
                onClick={() => setSelectedCampaign(campaign)}
                className="group p-5 border rounded-2xl bg-card transition-all cursor-pointer flex justify-between items-center hover:shadow-lg hover:border-primary/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg transition-colors group-hover:text-primary">{campaign.name}</h3>
                    <span className={cn("text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider", CAMPAIGN_STATUS_CONFIG[campaign.status].color)}>
                      {CAMPAIGN_STATUS_CONFIG[campaign.status].label}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1 font-semibold"><Calendar className="h-3 w-3" /> {campaign.startDate}</span>
                    <span className="flex items-center gap-1 font-semibold"><DollarSign className="h-3 w-3" /> ${campaign.spent} spent</span>
                  </div>
                </div>
                <div className="p-2 rounded-full bg-muted/50 transition-colors group-hover:text-primary">
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-tight">
                <BarChart3 className="h-4 w-4 text-primary" /> Reach vs Engagement
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value > 999 ? (value/1000).toFixed(1) + 'k' : value}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted))', opacity: 0.2}} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                  <Bar dataKey="Reach" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Engagement" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-tight">
                <Target className="h-4 w-4 text-primary" /> Platform Impressions
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={platformData} innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                    {platformData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm animate-in fade-in duration-300">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Upcoming Campaign Schedule
            </h3>
            <div className="space-y-4">
              {filtered.length > 0 ? (
                filtered.map((campaign) => (
                  <div key={campaign.id} className="group flex items-center gap-5 p-4 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/40 transition-all hover:border-primary/30">
                    <div className="flex flex-col items-center justify-center py-2 px-4 bg-background rounded-lg border shadow-sm min-w-[70px]">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {new Date(campaign.startDate).toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-xl font-black text-primary">{new Date(campaign.startDate).getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-md group-hover:text-primary transition-colors">{campaign.name}</h4>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase", CAMPAIGN_STATUS_CONFIG[campaign.status].color)}>
                          {CAMPAIGN_STATUS_CONFIG[campaign.status].label}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Ends {campaign.endDate}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full group-hover:bg-primary/10 group-hover:text-primary">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No campaigns found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "live-feed" && (
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm animate-in fade-in duration-300">
            <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Recent Activity
            </h3>
            {feed.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No campaign activity yet.</p>
                <p className="text-xs mt-1">Creating or editing a campaign will show up here.</p>
              </div>
            ) : (
              <div className="relative border-l border-border/60 ml-3 space-y-8 pb-4">
                {feed.map((entry) => (
                  <div key={entry.id} className="relative pl-8">
                    <span className="absolute -left-2 top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-background" />
                    </span>
                    <div className="bg-muted/20 border border-border/50 rounded-xl p-4 transition-colors hover:bg-muted/40">
                      <p className="text-sm font-bold text-foreground">
                        {entry.kind === "created" ? "Campaign Created" : "Campaign Updated"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        "<span className="font-semibold text-foreground">{entry.campaign.name}</span>" was {entry.kind === "created" ? "created" : "updated"}
                        {" "}· status {CAMPAIGN_STATUS_CONFIG[entry.campaign.status]?.label ?? entry.campaign.status}
                      </p>
                      <span className="text-[10px] font-medium text-muted-foreground mt-3 flex items-center gap-1" title={entry.at.toLocaleString()}>
                        <Clock className="h-3 w-3" /> {formatDistanceToNow(entry.at, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Campaign Detail Dialog */}
      <CampaignDetailDialog
        open={!!selectedCampaign}
        onOpenChange={() => setSelectedCampaign(null)}
        campaign={selectedCampaign}
        onEdit={canWrite && selectedCampaign ? () => openEdit(selectedCampaign) : undefined}
        onDelete={canWrite && selectedCampaign ? () => handleDelete(selectedCampaign) : undefined}
      />

      {/* Add Campaign Dialog */}
      <AddCampaignDialog
        open={addOpen && canWrite}
        onOpenChange={setAddOpen}
        formName={formName}
        onFormNameChange={setFormName}
        formDesc={formDesc}
        onFormDescChange={setFormDesc}
        formStart={formStart}
        onFormStartChange={setFormStart}
        formEnd={formEnd}
        onFormEndChange={setFormEnd}
        formBudget={formBudget}
        onFormBudgetChange={setFormBudget}
        onAdd={handleSave}
        onReset={resetForm}
        mode={editingId ? "edit" : "create"}
        formStatus={editingId ? formStatus : undefined}
        onFormStatusChange={editingId ? setFormStatus : undefined}
        saving={saving}
        error={formError}
      />
    </div>
  )
}