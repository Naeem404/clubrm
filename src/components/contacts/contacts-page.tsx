import { useState, useMemo, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { useSponsors } from "@/context/sponsors-context"
import { type InteractionType, TIER_CONFIG, INTERACTION_ICONS, type SponsorTier } from "@/components/external/types"
import { cn } from "@/lib/utils"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
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
  Mail,
  Phone,
  MessageSquarePlus,
  Building2,
  Calendar,
  Users,
  FileText,
  Plus,
  Linkedin,
  Tag,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

const ICON_MAP: Record<string, React.ElementType> = {
  Mail,
  Phone,
  Users,
  Calendar,
  FileText,
}

function getInitials(name: string) {
  if (!name) return "C"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return "C"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1][0] || "")).toUpperCase()
}

function getColorBlock(name: string) {
  const colors = [
    "bg-rose-500/20 text-rose-400",
    "bg-orange-500/20 text-orange-400",
    "bg-emerald-500/20 text-emerald-400",
    "bg-cyan-500/20 text-cyan-400",
    "bg-blue-500/20 text-blue-400",
    "bg-violet-500/20 text-violet-400",
    "bg-pink-500/20 text-pink-400",
  ]
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return colors[idx % colors.length]
}

export function ContactsPage() {
  const { sponsors, addInteraction, addSponsor, addContact, updateContact } = useSponsors()

  // ── Global search: reads/writes ?search= in the URL, same as MembersPage ──
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get("search") || ""

  const handleSearchChange = (val: string) => {
    setSearchParams(
      (prev) => {
        if (val) prev.set("search", val)
        else prev.delete("search")
        return prev
      },
      { replace: true },
    )
  }

  const [companyFilter, setCompanyFilter] = useState("all")

  // Dialog state for logging interactions
  const [logOpen, setLogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<{id: string; name: string; sponsorId: string; company: string} | null>(null)
  const [formType, setFormType] = useState<InteractionType>("email")
  const [formSummary, setFormSummary] = useState("")

  // New Contact Dialog State
  const [addOpen, setAddOpen] = useState(false)
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    organization: "",
    title: "",
    linkedIn: "",
    tags: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // View Profile Sheet State
  const [viewOpen, setViewOpen] = useState(false)
  const [viewContact, setViewContact] = useState<any>(null)

  // Edit Contact State
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [editSuccess, setEditSuccess] = useState(false)

  const allContacts = useMemo(() => {
    return sponsors.flatMap(s =>
      s.contacts.map(c => ({
        ...c,
        sponsorId: s.id,
        company: s.company,
        tier: s.tier,
      }))
    ).sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime() || 0
      const dateB = new Date(b.createdAt || 0).getTime() || 0
      return dateB - dateA
    })
  }, [sponsors])

  // ── Filtering: search now comes from URL param, matching MembersPage ──
  const filtered = useMemo(() => {
    return allContacts.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.company.toLowerCase().includes(search.toLowerCase())
      const matchesCompany = companyFilter === "all" || c.sponsorId === companyFilter
      return matchesSearch && matchesCompany
    })
  }, [allContacts, search, companyFilter])

  const companiesWithContacts = useMemo(() => {
    const map = new Map<string, string>()
    allContacts.forEach(c => map.set(c.sponsorId, c.company))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [allContacts])

  const handleSaveLog = async () => {
    if (!selectedContact || !formSummary.trim()) return
    await addInteraction(selectedContact.sponsorId, {
      id: crypto.randomUUID(),
      type: formType,
      date: new Date().toISOString().split("T")[0],
      summary: formSummary.trim(),
      contactId: selectedContact.id
    })
    setLogOpen(false)
  }

  const handleAddContact = async () => {
    setError(null)

    if (!newContact.name || !newContact.email || !newContact.organization) {
      setError("Please fill in Name, Email, and Organization.")
      return
    }

    if (!newContact.email.includes("@")) {
      setError("Please enter a valid email address.")
      return
    }

    const contactPayload = {
      id: crypto.randomUUID(),
      name: newContact.name,
      title: newContact.title,
      email: newContact.email,
      phone: "",
      organization: newContact.organization,
      linkedIn: newContact.linkedIn,
      tags: newContact.tags.split(",").map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString().split("T")[0]
    }

    try {
      const existingSponsor = sponsors.find(s => s.company.toLowerCase() === newContact.organization.toLowerCase())

      if (existingSponsor) {
        await addContact(existingSponsor.id, contactPayload)
      } else {
        const sId = crypto.randomUUID()
        const newSponsor = {
          id: sId,
          company: newContact.organization,
          tier: "prospect" as const,
          status: "prospect" as const,
          amount: 0,
          startDate: new Date().toISOString().split("T")[0],
          industry: "Other" as const,
          contacts: [contactPayload],
          interactions: [],
          notes: "Automatically created from new professional contact entry."
        }
        await addSponsor(newSponsor)
      }

      setSuccess(true)
      setTimeout(() => {
        setAddOpen(false)
        setTimeout(() => {
          setSuccess(false)
          setNewContact({ name: "", email: "", organization: "", title: "", linkedIn: "", tags: "" })
        }, 400)
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to save contact to database. Check permissions or network.")
    }
  }

  const handleViewProfile = (contact: any) => {
    setViewContact(contact)
    setViewOpen(true)
  }

  const handleOpenLog = (e: React.MouseEvent, contact: any) => {
    e.stopPropagation()
    setSelectedContact(contact)
    setFormType("email")
    setFormSummary("")
    setLogOpen(true)
  }

  const handleEditOpen = (contact: any) => {
    setEditData({
      ...contact,
      tags: contact.tags.join(", ")
    })
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    setError(null)
    if (!editData.name || !editData.email || !editData.organization) {
      setError("Please fill in Name, Email, and Organization.")
      return
    }

    if (!editData.email.includes("@")) {
      setError("Please enter a valid email address.")
      return
    }

    const updatedContact = {
      ...editData,
      tags: editData.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
    }

    try {
      await updateContact(editData.sponsorId, updatedContact)

      setEditSuccess(true)
      setTimeout(() => {
        setEditOpen(false)
        setTimeout(() => {
          setEditSuccess(false)
          if (viewContact?.id === updatedContact.id) {
            setViewContact(updatedContact)
          }
        }, 400)
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to update contact. Check permissions or network.")
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Professional Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">Directory of all external contacts and sponsors</p>
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add Contact
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Local search bar — stays in sync with the URL param so global search works too */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 w-[250px]"
            />
          </div>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companiesWithContacts.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground font-medium bg-muted/50 px-3 py-1.5 rounded-md">
          {filtered.length} Contacts
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Contact Name</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((contact) => (
              <TableRow
                key={contact.id}
                className="group transition-colors hover:bg-muted/30 cursor-pointer"
                onClick={() => handleViewProfile(contact)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0", getColorBlock(contact.name))}>
                      {getInitials(contact.name)}
                    </div>
                    <div>
                      <span className="font-medium text-sm block">{contact.name}</span>
                      <span className="text-xs text-muted-foreground">{contact.title || "No Title"}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{contact.organization || contact.company}</span>
                    <span className={cn("ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium border", TIER_CONFIG[contact.tier].bg)}>
                      {TIER_CONFIG[contact.tier].label}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors">{contact.email}</a>
                      </div>
                    )}
                    {contact.linkedIn && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Linkedin className="h-3.5 w-3.5" />
                        <a href={contact.linkedIn} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Profile</a>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((t, i) => (
                      <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md text-muted-foreground flex items-center gap-1">
                        <Tag className="h-2.5 w-2.5" /> {t}
                      </span>
                    ))}
                    {contact.tags.length === 0 && <span className="text-[10px] text-muted-foreground italic">None</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 hover:bg-primary/20 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleOpenLog(e, contact)}
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    Log Activity
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {search
                    ? `No contacts matching "${search}"`
                    : "No contacts found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Log Interaction Dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Interaction with {selectedContact?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Interaction Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as InteractionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes / Summary</Label>
              <Input
                placeholder="Brief summary of what was discussed..."
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLog} disabled={!formSummary.trim()}>Save Interaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Profile Side Panel */}
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent className="sm:max-w-md border-l border-border/50">
          <SheetHeader className="pb-6 border-b border-border/30">
            <div className="flex items-center gap-4">
              <div className={cn("h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold border-2", viewContact ? getColorBlock(viewContact.name) : "bg-muted")}>
                {viewContact ? getInitials(viewContact.name) : ""}
              </div>
              {viewContact && (
                <div>
                  <SheetTitle className="text-xl font-bold">{viewContact.name}</SheetTitle>
                  <SheetDescription className="text-sm font-medium text-primary/80">
                    {viewContact.title || "No Job Title"}
                  </SheetDescription>
                </div>
              )}
            </div>
            {viewContact && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary transition-all"
                onClick={() => handleEditOpen(viewContact)}
              >
                Edit Contact Details
              </Button>
            )}
          </SheetHeader>

          <div className="py-6 space-y-8 h-full overflow-y-auto pr-2">
            {viewContact ? (
              <>
                {/* Organization Info */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-3 w-3" /> Organization Detail
                  </h4>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Company</span>
                      <span className="text-sm font-semibold">{viewContact.organization || viewContact.company}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Sponsorship Tier</span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold border", TIER_CONFIG[viewContact.tier as SponsorTier].bg)}>
                        {TIER_CONFIG[viewContact.tier as SponsorTier].label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Mail className="h-3 w-3" /> Digital Identity
                  </h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4 group">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 transition-colors group-hover:bg-primary/20">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">Email Address</p>
                        <a href={`mailto:${viewContact.email}`} className="text-sm font-medium hover:text-primary transition-colors underline-offset-4 hover:underline">
                          {viewContact.email || "Not provided"}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 group">
                      <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 transition-colors group-hover:bg-blue-500/20">
                        <Linkedin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">LinkedIn Profile</p>
                        {viewContact.linkedIn ? (
                          <a
                            href={viewContact.linkedIn}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:text-primary transition-colors underline-offset-4 hover:underline break-all"
                          >
                            {viewContact.linkedIn.replace("https://", "")}
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground italic">No LinkedIn URL</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags & Classification */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Tag className="h-3 w-3" /> Tags & Classification
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {viewContact.tags?.map((t: string, i: number) => (
                      <span key={i} className="text-xs bg-muted px-2.5 py-1 rounded-lg text-muted-foreground font-medium flex items-center gap-1.5 border border-border/50">
                        <CheckCircle2 className="h-3 w-3 text-primary" /> {t}
                      </span>
                    ))}
                    {(!viewContact.tags || viewContact.tags.length === 0) && (
                      <span className="text-xs text-muted-foreground italic">No tags assigned</span>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="pt-8 mt-auto border-t border-border/30">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Added on {viewContact.createdAt}
                    </div>
                    <div className="flex items-center gap-1">
                      ID: {viewContact.id}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground italic">
                No contact selected
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Contact Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Professional Contact
            </DialogTitle>
          </DialogHeader>

          {editSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <CheckCircle2 className="h-16 w-16 text-emerald-400" />
              <p className="text-xl font-bold">Changes Saved!</p>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={editData?.name || ""}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={editData?.email || ""}
                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization (readonly)</Label>
                  <Input value={editData?.organization || ""} disabled className="opacity-70" />
                </div>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input
                    value={editData?.title || ""}
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>LinkedIn URL</Label>
                <Input
                  value={editData?.linkedIn || ""}
                  onChange={(e) => setEditData({...editData, linkedIn: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={editData?.tags || ""}
                  onChange={(e) => setEditData({...editData, tags: e.target.value})}
                />
              </div>
              {error && (
                <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">
                  {error}
                </div>
              )}
            </div>
          )}

          {!editSuccess && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Add New Professional Contact
            </DialogTitle>
          </DialogHeader>

          {success ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="h-16 w-16 text-emerald-400" />
              <div className="text-center">
                <p className="text-xl font-bold">Success!</p>
                <p className="text-sm text-muted-foreground">New contact has been added to the directory.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-red-400 font-bold">*</span></Label>
                  <Input
                    id="name"
                    placeholder="e.g. Jane Doe"
                    value={newContact.name}
                    onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-red-400 font-bold">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@company.com"
                    value={newContact.email}
                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="org">Organization <span className="text-red-400 font-bold">*</span></Label>
                  <Input
                    id="org"
                    placeholder="e.g. Google"
                    value={newContact.organization}
                    onChange={(e) => setNewContact({...newContact, organization: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Software Engineer"
                    value={newContact.title}
                    onChange={(e) => setNewContact({...newContact, title: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="linkedin"
                    className="pl-9"
                    placeholder="https://linkedin.com/in/username"
                    value={newContact.linkedIn}
                    onChange={(e) => setNewContact({...newContact, linkedIn: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="tags"
                    className="pl-9"
                    placeholder="Potential Speaker, Tech, HR"
                    value={newContact.tags}
                    onChange={(e) => setNewContact({...newContact, tags: e.target.value})}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs font-medium text-red-400 bg-red-400/10 p-2.5 rounded-lg border border-red-400/20 animate-in shake duration-300">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          {!success && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddContact}>Save Contact</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}