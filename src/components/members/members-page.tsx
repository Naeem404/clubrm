import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useMembers } from "@/context/members-context"
import { type Member, MEMBER_STATUSES, DEPARTMENTS, YEARS } from "./types"
import type { Role } from "@/context/role-context"
import { cn, getEntityColor, getInitials } from "@/lib/utils"
import { supabaseUntyped as db } from "@/lib/supabase"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  GraduationCap,
  CheckSquare,
  Calendar,
  Eye,
  LayoutGrid,
  List,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Loader2,
  UserCheck2,
  Link2,
} from "lucide-react"
import { InviteLinkDialog } from "./invite-link-dialog"

const ALL_ROLES: Role[] = [
  "President",
  "VP Internal",
  "VP Finance",
  "VP Events",
  "VP External",
  "Marketing",
  "Executive",
  "Administrator",
]

const ROLE_COLORS: Record<string, string> = {
  President: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "VP Internal": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "VP Finance": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "VP Events": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "VP External": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  Marketing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Executive: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  Administrator: "bg-red-500/20 text-red-400 border-red-500/30",
}

interface SocialProfile {
  id: string
  user_id: string
  full_name: string | null
  phone: string | null
  bio: string | null
  instagram: string | null
  facebook: string | null
  linkedin: string | null
  twitter: string | null
  tiktok: string | null
}

function SocialBadge({ value, icon, color }: { value: string | null; icon: React.ReactNode; color: string }) {
  if (!value) return null
  return (
    <span className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50", color)}>
      {icon} {value}
    </span>
  )
}

// Strip a full social URL down to just the username for matching
function stripToUsername(raw: string): string {
  return raw
    .replace(/https?:\/\/(www\.)?(instagram\.com|facebook\.com|linkedin\.com\/in|twitter\.com|x\.com|tiktok\.com\/@?)\/+/i, "")
    .replace(/\/$/, "")
    .replace(/^@/, "")
    .trim()
}

export function MembersPage() {
  const { members, addMember, updateMember, deleteMember, stats } = useMembers()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [view, setView] = useState<"grid" | "table">("grid")
  const [addOpen, setAddOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [detailMember, setDetailMember] = useState<Member | null>(null)
  const [editMember, setEditMember] = useState<Member | null>(null)

  // User search state
  const [userSearch, setUserSearch] = useState("")
  const [userSearchResults, setUserSearchResults] = useState<SocialProfile[]>([])
  const [userSearchStatus, setUserSearchStatus] = useState<"idle" | "loading" | "done">("idle")
  const [selectedProfile, setSelectedProfile] = useState<SocialProfile | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Add form state
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formRole, setFormRole] = useState<Role>("Executive")
  const [formDept, setFormDept] = useState<string>(DEPARTMENTS[0])
  const [formYear, setFormYear] = useState<string>(YEARS[0])

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        m.department.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "all" || m.status === statusFilter
      const matchesRole = roleFilter === "all" || m.role === roleFilter
      return matchesSearch && matchesStatus && matchesRole
    })
  }, [members, search, statusFilter, roleFilter])

  function resetForm() {
    setFormName("")
    setFormEmail("")
    setFormPhone("")
    setFormRole("Executive")
    setFormDept(DEPARTMENTS[0])
    setFormYear(YEARS[0])
    setUserSearch("")
    setUserSearchResults([])
    setUserSearchStatus("idle")
    setSelectedProfile(null)
  }

  // Live search with debounce — fires 300ms after user stops typing
  const runSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      setUserSearchResults([])
      setUserSearchStatus("idle")
      return
    }

    setUserSearchStatus("loading")

    const raw = value.trim()
    const stripped = stripToUsername(raw)

    // Search both the raw input (for names/phone) and stripped username (for social handles)
    const { data, error } = await db
      .from("socials")
      .select("*")
      .or(
        `full_name.ilike.%${raw}%,phone.ilike.%${raw}%,instagram.ilike.%${stripped}%,facebook.ilike.%${stripped}%,linkedin.ilike.%${stripped}%,twitter.ilike.%${stripped}%,tiktok.ilike.%${stripped}%`
      )
      .limit(5)

    if (error) {
      console.error("User search failed:", error)
      setUserSearchStatus("done")
      return
    }

    setUserSearchResults((data as SocialProfile[]) ?? [])
    setUserSearchStatus("done")
  }, [])

  // Debounce the search so it doesn't fire on every keystroke
  const handleUserSearchInput = useCallback((value: string) => {
    setUserSearch(value)
    setSelectedProfile(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value), 300)
  }, [runSearch])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function handleSelectProfile(profile: SocialProfile) {
    setSelectedProfile(profile)
    setFormName(profile.full_name ?? "")
    setFormPhone(profile.phone ?? "")
  }

  function handleAdd() {
    if (!formName.trim() || !formEmail.trim()) return
    addMember({
      id: `m${Date.now()}`,
      name: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      role: formRole,
      status: "active",
      joinDate: new Date().toISOString().split("T")[0],
      department: formDept,
      year: formYear,
      tasksCompleted: 0,
      eventsAttended: 0,
    })
    resetForm()
    setAddOpen(false)
  }

  function handleEdit() {
    if (!editMember) return
    updateMember(editMember)
    setEditMember(null)
  }

  const statusMeta = (status: string) => MEMBER_STATUSES.find((s) => s.value === status)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your club's roster, roles, and member information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setInviteOpen(true)} className="gap-2">
            <Link2 className="h-4 w-4" />
            Invite link
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      <InviteLinkDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-emerald-400">
            <UserCheck className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Active</span>
          </div>
          <p className="text-2xl font-bold">{stats.active}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-slate-400">
            <UserX className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Inactive</span>
          </div>
          <p className="text-2xl font-bold">{stats.inactive}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2 text-violet-400">
            <GraduationCap className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Alumni</span>
          </div>
          <p className="text-2xl font-bold">{stats.alumni}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {MEMBER_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ALL_ROLES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          <Button variant={view === "grid" ? "default" : "ghost"} size="sm" onClick={() => setView("grid")} className="h-8 w-8 p-0">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === "table" ? "default" : "ghost"} size="sm" onClick={() => setView("table")} className="h-8 w-8 p-0">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {members.length} members
      </p>

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((member) => (
            <div
              key={member.id}
              className="group bg-card border border-border/50 rounded-xl p-5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
              onClick={() => setDetailMember(member)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold", getEntityColor(member.name))}>
                  {getInitials(member.name)}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDetailMember(member) }}>
                      <Eye className="h-4 w-4 mr-2" /> View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditMember(member) }}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteMember(member.id) }}>
                      <Trash2 className="h-4 w-4 mr-2" /> Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="font-semibold text-sm">{member.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", ROLE_COLORS[member.role])}>
                  {member.role}
                </span>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusMeta(member.status)?.color)}>
                  {statusMeta(member.status)?.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> {member.tasksCompleted} tasks</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {member.eventsAttended} events</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Tasks</TableHead>
                <TableHead className="text-right">Events</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => (
                <TableRow key={member.id} className="cursor-pointer" onClick={() => setDetailMember(member)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0", getEntityColor(member.name))}>
                        {getInitials(member.name)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", ROLE_COLORS[member.role])}>
                      {member.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusMeta(member.status)?.color)}>
                      {statusMeta(member.status)?.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{member.department}</TableCell>
                  <TableCell className="text-sm">{member.year}</TableCell>
                  <TableCell className="text-right text-sm">{member.tasksCompleted}</TableCell>
                  <TableCell className="text-right text-sm">{member.eventsAttended}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditMember(member) }}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteMember(member.id) }}>
                          <Trash2 className="h-4 w-4 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) resetForm(); setAddOpen(o) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Existing user search */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                Find Existing User
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                {userSearchStatus === "loading" && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Input
                  value={userSearch}
                  onChange={(e) => handleUserSearchInput(e.target.value)}
                  placeholder="Search by name, @username, or paste a profile URL..."
                  className="pl-9 pr-9"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Search by name, @username, or paste a full profile URL from any platform
              </p>

              {/* No results */}
              {userSearchStatus === "done" && userSearchResults.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No matching accounts found.</p>
              )}

              {/* Results */}
              {userSearchResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userSearchResults.map((profile) => (
                    <div
                      key={profile.id}
                      onClick={() => handleSelectProfile(profile)}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
                        selectedProfile?.id === profile.id
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                      )}
                    >
                      <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0", getEntityColor(profile.full_name ?? "?"))}>
                        {getInitials(profile.full_name ?? "?")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{profile.full_name ?? "Unknown"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <SocialBadge value={profile.instagram} icon={<Instagram className="h-2.5 w-2.5" />} color="text-pink-500" />
                          <SocialBadge value={profile.linkedin} icon={<Linkedin className="h-2.5 w-2.5" />} color="text-[#0A66C2]" />
                          <SocialBadge value={profile.twitter} icon={<Twitter className="h-2.5 w-2.5" />} color="text-sky-400" />
                          <SocialBadge value={profile.facebook} icon={<Facebook className="h-2.5 w-2.5" />} color="text-blue-500" />
                        </div>
                      </div>
                      {selectedProfile?.id === profile.id && (
                        <UserCheck2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedProfile && (
                <p className="text-xs text-emerald-500 flex items-center gap-1">
                  <UserCheck2 className="h-3 w-3" />
                  Profile selected — name and phone pre-filled below
                </p>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">member details</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="john.doe@yorku.ca" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="(416) 555-0000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formRole} onValueChange={(v) => setFormRole(v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={formYear} onValueChange={setFormYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={formDept} onValueChange={setFormDept}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setAddOpen(false) }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!formName.trim() || !formEmail.trim()}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Detail Panel */}
      <Dialog open={!!detailMember} onOpenChange={() => setDetailMember(null)}>
        <DialogContent className="sm:max-w-lg">
          {detailMember && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold", getEntityColor(detailMember.name))}>
                    {getInitials(detailMember.name)}
                  </div>
                  {detailMember.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium border", ROLE_COLORS[detailMember.role])}>
                    {detailMember.role}
                  </span>
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", statusMeta(detailMember.status)?.color)}>
                    {statusMeta(detailMember.status)?.label}
                  </span>
                </div>
                {detailMember.bio && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{detailMember.bio}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email</p>
                    <p className="text-sm font-medium">{detailMember.email}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" /> Phone</p>
                    <p className="text-sm font-medium">{detailMember.phone || "—"}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm font-medium">{detailMember.department}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Year</p>
                    <p className="text-sm font-medium">{detailMember.year}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold">{detailMember.tasksCompleted}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasks Done</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold">{detailMember.eventsAttended}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Events</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold">{detailMember.joinDate.slice(0, 7)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Joined</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                {/* FIX: Capture detailMember into a local variable before clearing state,
                    to avoid a race condition where setDetailMember(null) could null out
                    the reference before setEditMember receives it. */}
                <Button variant="outline" onClick={() => {
                  const member = detailMember
                  setDetailMember(null)
                  setEditMember(member)
                }}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="destructive" onClick={() => { deleteMember(detailMember.id); setDetailMember(null) }}>
                  <Trash2 className="h-4 w-4 mr-2" /> Remove
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="sm:max-w-md">
          {editMember && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={editMember.name} onChange={(e) => setEditMember({ ...editMember, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={editMember.email} onChange={(e) => setEditMember({ ...editMember, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={editMember.phone} onChange={(e) => setEditMember({ ...editMember, phone: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={editMember.role} onValueChange={(v) => setEditMember({ ...editMember, role: v as Role })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editMember.status} onValueChange={(v) => setEditMember({ ...editMember, status: v as Member["status"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MEMBER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={editMember.department} onValueChange={(v) => setEditMember({ ...editMember, department: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select value={editMember.year} onValueChange={(v) => setEditMember({ ...editMember, year: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
                <Button onClick={handleEdit}>Save Changes</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}