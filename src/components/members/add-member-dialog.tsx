import { logError } from "@/lib/logger"
import { useState, useCallback, useRef, useEffect } from "react"
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
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { type Member } from "./types"
import { type Role } from "@/context/role-context"
import { DEPARTMENTS, YEARS } from "./types"
import { SocialBadge } from "./social-badge"
import { Instagram, Facebook, Linkedin, Twitter } from "lucide-react"

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

function stripToUsername(raw: string): string {
  return raw
    .replace(/https?:\/\/(www\.)?(instagram\.com|facebook\.com|linkedin\.com\/in|twitter\.com|x\.com|tiktok\.com\/@?)\/+/i, "")
    .replace(/\/$/, "")
    .replace(/^@/, "")
    .trim()
}

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (member: Member) => void
}

export function AddMemberDialog({ open, onOpenChange, onAdd }: AddMemberDialogProps) {
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formRole, setFormRole] = useState<Role>("Executive")
  const [formDept, setFormDept] = useState<string>(DEPARTMENTS[0])
  const [formYear, setFormYear] = useState<string>(YEARS[0])

  const [userSearch, setUserSearch] = useState("")
  const [userSearchResults, setUserSearchResults] = useState<SocialProfile[]>([])
  const [userSearchStatus, setUserSearchStatus] = useState<"idle" | "loading" | "done">("idle")
  const [selectedProfile, setSelectedProfile] = useState<SocialProfile | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      setUserSearchResults([])
      setUserSearchStatus("idle")
      return
    }

    setUserSearchStatus("loading")

    const raw = value.trim()
    const stripped = stripToUsername(raw)

    const { data, error } = await supabase
      .from("socials")
      .select("*")
      .or(
        `full_name.ilike.%${raw}%,phone.ilike.%${raw}%,instagram.ilike.%${stripped}%,facebook.ilike.%${stripped}%,linkedin.ilike.%${stripped}%,twitter.ilike.%${stripped}%,tiktok.ilike.%${stripped}%`
      )
      .limit(5)

    if (error) {
      logError("User search failed", 'AddMemberDialog', error)
      setUserSearchStatus("done")
      return
    }

    setUserSearchResults((data as SocialProfile[]) ?? [])
    setUserSearchStatus("done")
  }, [])

  const handleUserSearchInput = useCallback((value: string) => {
    setUserSearch(value)
    setSelectedProfile(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(value), 300)
  }, [runSearch])

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
    onAdd({
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
    onOpenChange(false)
  }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Search for existing user</Label>
            <Input
              placeholder="Search by name, phone, or social handle..."
              value={userSearch}
              onChange={(e) => handleUserSearchInput(e.target.value)}
            />
            {userSearchStatus === "loading" && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching...
              </div>
            )}
            {userSearchResults.length > 0 && (
              <div className="space-y-2 mt-2">
                {userSearchResults.map((profile) => (
                  <div
                    key={profile.id}
                    className="p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleSelectProfile(profile)}
                  >
                    <p className="font-medium text-sm">{profile.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <SocialBadge value={profile.instagram} icon={<Instagram className="h-3 w-3" />} color="text-pink-500" />
                      <SocialBadge value={profile.facebook} icon={<Facebook className="h-3 w-3" />} color="text-blue-500" />
                      <SocialBadge value={profile.linkedin} icon={<Linkedin className="h-3 w-3" />} color="text-sky-500" />
                      <SocialBadge value={profile.twitter} icon={<Twitter className="h-3 w-3" />} color="text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as Role)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="President">President</SelectItem>
                  <SelectItem value="VP Internal">VP Internal</SelectItem>
                  <SelectItem value="VP Finance">VP Finance</SelectItem>
                  <SelectItem value="VP Events">VP Events</SelectItem>
                  <SelectItem value="VP External">VP External</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Executive">Executive</SelectItem>
                  <SelectItem value="Administrator">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select defaultValue="active">
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="alumni">Alumni</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dept">Department</Label>
              <Select value={formDept} onValueChange={setFormDept}>
                <SelectTrigger id="dept">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={formYear} onValueChange={setFormYear}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }}>Cancel</Button>
          <Button onClick={handleAdd}>Add Member</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
