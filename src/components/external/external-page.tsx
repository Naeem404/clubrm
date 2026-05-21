import React, { useState, useMemo, useCallback, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useSponsors } from "@/context/sponsors-context"
import {
  type Sponsor,
  type SponsorTier,
  type SponsorStatus,
  TIER_CONFIG,
  STATUS_CONFIG,
  INDUSTRIES,
  formatCurrency,
} from "./types"
import { cn, getInitials, getEntityColor } from "@/lib/utils"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Plus,
  DollarSign,
  TrendingUp,
  Users,
  Mail,
  Phone,
  Calendar,
  FileText,
  Crown,
  MessageSquare,
  Activity,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
} from "lucide-react"

// --- Helper Functions ---
const INTERACTION_ICON_MAP: Record<string, React.ReactNode> = {
  email:    <Mail className="h-3.5 w-3.5" />,
  call:     <Phone className="h-3.5 w-3.5" />,
  meeting:  <Users className="h-3.5 w-3.5" />,
  event:    <Calendar className="h-3.5 w-3.5" />,
  proposal: <FileText className="h-3.5 w-3.5" />,
}

export function ExternalPage() {
  const { sponsors, addSponsor, updateSponsor, deleteSponsor } = useSponsors()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get("search") || ""
  const [tierFilter, setTierFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("pipeline")

  const [addOpen, setAddOpen] = useState(false)
  const [detailSponsor, setDetailSponsor] = useState<Sponsor | null>(null)
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null)

  // Form State
  const [formCompany, setFormCompany] = useState("")
  const [formTier, setFormTier] = useState<SponsorTier>("prospect")
  const [formAmount, setFormAmount] = useState("")
  const [formIndustry, setFormIndustry] = useState<string>(INDUSTRIES[0])
  const [formContactName, setFormContactName] = useState("")
  const [formContactEmail, setFormContactEmail] = useState("")
  const [formContactTitle, setFormContactTitle] = useState("")
  const [formNotes, setFormNotes] = useState("")

  // Filter logic
  const filtered = useMemo(() => {
    return sponsors.filter((s) => {
      const matchesSearch =
        !search ||
        s.company.toLowerCase().includes(search.toLowerCase()) ||
        s.industry.toLowerCase().includes(search.toLowerCase())
      const matchesTier = tierFilter === "all" || s.tier === tierFilter
      return matchesSearch && matchesTier
    })
  }, [sponsors, search, tierFilter])

  // Stats
  const stats = useMemo(() => ({
    totalRevenue:      sponsors.filter((s) => s.status === "active").reduce((sum, s) => sum + s.amount, 0),
    activeCount:       sponsors.filter((s) => s.status === "active").length,
    prospectCount:     sponsors.filter((s) => s.status === "prospect").length,
    pipelineValue:     sponsors.filter((s) => s.status === "prospect" || s.status === "pending").reduce((sum, s) => sum + s.amount, 0),
    topTier:           sponsors.filter((s) => s.tier === "platinum" || s.tier === "gold").length,
    totalInteractions: sponsors.reduce((sum, s) => sum + s.interactions.length, 0),
  }), [sponsors])

  const pipeline: { status: SponsorStatus; sponsors: Sponsor[] }[] = [
    { status: "prospect", sponsors: filtered.filter((s) => s.status === "prospect") },
    { status: "pending",  sponsors: filtered.filter((s) => s.status === "pending")  },
    { status: "active",   sponsors: filtered.filter((s) => s.status === "active")   },
    { status: "churned",  sponsors: filtered.filter((s) => s.status === "churned")  },
  ]

  function resetForm() {
    setFormCompany(""); setFormTier("prospect"); setFormAmount(""); setFormIndustry(INDUSTRIES[0])
    setFormContactName(""); setFormContactEmail(""); setFormContactTitle(""); setFormNotes("")
    setEditingSponsorId(null)
  }

  const handleSave = useCallback(async () => {
    if (!formCompany.trim()) return
    const now = new Date().toISOString()

    if (editingSponsorId) {
      const existing = sponsors.find((s) => s.id === editingSponsorId)
      if (existing) {
        let updatedContacts = existing.contacts
        if (formContactName.trim()) {
          const newContact = {
            id: existing.contacts[0]?.id || `c${Date.now()}`,
            name: formContactName.trim(),
            title: formContactTitle.trim(),
            email: formContactEmail.trim(),
            phone: existing.contacts[0]?.phone || "",
            organization: formCompany.trim(),
            tags: existing.contacts[0]?.tags || [],
            createdAt: existing.contacts[0]?.createdAt || now,
          }
          updatedContacts = existing.contacts.length > 0
            ? [newContact, ...existing.contacts.slice(1)]
            : [newContact]
        }
        await updateSponsor({
          ...existing,
          company: formCompany.trim(),
          tier: formTier,
          amount: Number(formAmount) || 0,
          industry: formIndustry,
          notes: formNotes.trim() || undefined,
          contacts: updatedContacts,
          status: existing.status === formTier ? existing.status : (formTier === "prospect" ? "prospect" : existing.status),
        })
      }
    } else {
      await addSponsor({
        id: `s${Date.now()}`,
        company: formCompany.trim(),
        tier: formTier,
        status: formTier === "prospect" ? "prospect" : "pending",
        amount: Number(formAmount) || 0,
        startDate: now.split("T")[0],
        industry: formIndustry,
        notes: formNotes.trim() || undefined,
        contacts: formContactName.trim() ? [{
          id: `c${Date.now()}`,
          name: formContactName.trim(),
          title: formContactTitle.trim(),
          email: formContactEmail.trim(),
          phone: "",
          organization: formCompany.trim(),
          tags: [],
          createdAt: now,
        }] : [],
        interactions: [],
      })
    }
    resetForm()
    setAddOpen(false)
  }, [formCompany, formTier, formAmount, formIndustry, formNotes, formContactName, formContactTitle, formContactEmail, editingSponsorId, sponsors, updateSponsor, addSponsor])

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_right,rgba(34,197,94,0.18),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_55%)]" />
        <div className="relative flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Sponsor Pipeline
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Sponsorships</h1>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                Manage partner relationships and pipeline
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-stretch">
            <div className="flex min-w-[168px] flex-col justify-between rounded-2xl border border-border/60 bg-background/70 p-3 backdrop-blur">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Active Revenue
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {stats.activeCount} active sponsor{stats.activeCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
            </div>

            <Button
              onClick={() => { resetForm(); setAddOpen(true) }}
              className="h-auto min-h-[96px] min-w-[184px] self-stretch gap-2 rounded-2xl px-5 text-sm font-semibold shadow-lg shadow-primary/15 sm:min-h-0"
            >
              <Plus className="h-4 w-4" />
              Add Sponsor
            </Button>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <section className="rounded-2xl border border-border/50 bg-card/80 p-3.5 shadow-sm backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-background/70 p-1 rounded-xl border border-border/60 self-start">
            {[
              { id: "pipeline",     label: "Pipeline",  icon: <TrendingUp className="h-4 w-4" /> },
              { id: "directory",    label: "Directory", icon: <Users className="h-4 w-4" />     },
              { id: "interactions", label: "Activity",  icon: <Activity className="h-4 w-4" />  },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
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

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sponsors..."
                value={search}
                onChange={(e) =>
                  setSearchParams(
                    (prev) => {
                      if (e.target.value) prev.set("search", e.target.value)
                      else prev.delete("search")
                      return prev
                    },
                    { replace: true },
                  )
                }
                className="pl-9 w-[180px] md:w-[220px] h-10 rounded-xl border-border/60 bg-background/70"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[130px] h-10 rounded-xl border-border/60 bg-background/70">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard title="Active Revenue"  value={formatCurrency(stats.totalRevenue)}  sub={`${stats.activeCount} active`}       icon={<DollarSign />}    color="text-emerald-400" border="border-emerald-500/20" shadow="shadow-emerald-500/5" />
        <StatCard title="Pipeline"        value={formatCurrency(stats.pipelineValue)} sub={`${stats.prospectCount} prospects`} icon={<TrendingUp />}    color="text-blue-400"    border="border-blue-500/20"    shadow="shadow-blue-500/5"    />
        <StatCard title="Top Tier"        value={stats.topTier}                       sub="Platinum & Gold"                    icon={<Crown />}         color="text-amber-400"   border="border-amber-500/20"   shadow="shadow-amber-500/5"   />
        <StatCard title="Interactions"    value={stats.totalInteractions}             sub="Total logged"                       icon={<MessageSquare />} color="text-pink-400"    border="border-pink-500/20"    shadow="shadow-pink-500/5"    />
      </div>

      {/* Content */}
      <div>
        {activeTab === "pipeline" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pipeline.map(({ status, sponsors: groupSponsors }) => (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_CONFIG[status].color.split(" ")[0])} />
                    {STATUS_CONFIG[status].label}
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 rounded">
                    {groupSponsors.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {groupSponsors.map((sponsor) => (
                    <SponsorCard key={sponsor.id} sponsor={sponsor} onClick={() => setDetailSponsor(sponsor)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "directory" && (
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20">
                  <TableHead>Company</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sponsor) => (
                  <TableRow key={sponsor.id} className="cursor-pointer group" onClick={() => setDetailSponsor(sponsor)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold", getEntityColor(sponsor.company))}>
                          {getInitials(sponsor.company)}
                        </div>
                        <span className="font-medium text-sm">{sponsor.company}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold border", TIER_CONFIG[sponsor.tier].bg)}>
                        {TIER_CONFIG[sponsor.tier].label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", STATUS_CONFIG[sponsor.status].color)}>
                        {STATUS_CONFIG[sponsor.status].label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(sponsor.amount)}</TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === "interactions" && (
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
            <div className="space-y-4">
              {sponsors
                .flatMap((s) => s.interactions.map((i) => ({ ...i, company: s.company, sponsorId: s.id })))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 15)
                .map((item) => (
                  <div key={item.id} className="flex items-start gap-4 pb-4 border-b border-border/30 last:border-0 last:pb-0">
                    <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      {INTERACTION_ICON_MAP[item.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{item.company}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-bold tracking-tighter">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.summary}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">{item.date}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Sponsor Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSponsorId ? "Edit Sponsor" : "Add Sponsor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input value={formCompany} onChange={(e) => setFormCompany(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={formTier} onValueChange={(v) => setFormTier(v as SponsorTier)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (CAD)</Label>
                <Input value={formAmount} onChange={(e) => setFormAmount(e.target.value)} type="number" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={formIndustry} onValueChange={setFormIndustry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t border-border/30 pt-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Primary Contact (optional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input value={formContactName}  onChange={(e) => setFormContactName(e.target.value)}  placeholder="Contact name" />
                <Input value={formContactTitle} onChange={(e) => setFormContactTitle(e.target.value)} placeholder="Title" />
              </div>
              <Input value={formContactEmail} onChange={(e) => setFormContactEmail(e.target.value)} placeholder="Email" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Any additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Sponsor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Internal Components ---

function StatCard({ title, value, sub, icon, color, border, shadow }: {
  title: string
  value: string | number
  sub: string
  icon: React.ReactElement
  color: string
  border: string
  shadow: string
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-sm", border, shadow)}>
      <div className={cn("flex items-center gap-2", color)}>
        {React.cloneElement(icon, { className: "h-4 w-4" })}
        <span className="text-xs font-medium uppercase tracking-wider">{title}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function SponsorCard({ sponsor, onClick }: { sponsor: Sponsor; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0", getEntityColor(sponsor.company))}>
          {getInitials(sponsor.company)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{sponsor.company}</h4>
          <p className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">{sponsor.industry}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold border", TIER_CONFIG[sponsor.tier].bg)}>
          {TIER_CONFIG[sponsor.tier].label}
        </span>
        <span className="text-xs font-bold text-emerald-400 font-mono">{formatCurrency(sponsor.amount)}</span>
      </div>
    </div>
  )
}