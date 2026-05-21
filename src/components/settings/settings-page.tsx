import { logError } from "@/lib/logger"
import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import type { Json } from "@/lib/database.types"
import { useTheme, type AccentColor } from "@/context/theme-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Settings,
  Building2,
  Users,
  Shield,
  Bell,
  Palette,
  Globe,
  Save,
  Key,
  Clock,
  Mail,
  CheckCircle,
} from "lucide-react"

interface OrgSettings {
  name: string
  slug: string
  description: string
  email: string
  website: string
  university: string
  term: string
  timezone: string
}

interface NotificationPrefs {
  emailDigest: boolean
  taskAssigned: boolean
  eventReminder: boolean
  financeAlerts: boolean
  memberJoined: boolean
}

const ROLES_CONFIG = [
  { role: "President", permissions: ["all"], color: "text-amber-400", description: "Full access to all modules and settings" },
  { role: "VP Internal", permissions: ["tasks.all", "members.read", "events.read", "reports.read"], color: "text-blue-400", description: "Task management and internal operations" },
  { role: "VP Finance", permissions: ["finance.all", "reports.read", "members.read"], color: "text-emerald-400", description: "Budget, expenses, and financial reporting" },
  { role: "VP Events", permissions: ["events.all", "tasks.read", "members.read"], color: "text-pink-400", description: "Event planning and volunteer coordination" },
  { role: "VP External", permissions: ["external.all", "finance.read", "reports.read"], color: "text-violet-400", description: "Sponsorships and external partnerships" },
  { role: "Marketing", permissions: ["marketing.all", "events.read", "members.read"], color: "text-orange-400", description: "Campaigns, social media, and branding" },
  { role: "Executive", permissions: ["tasks.own", "events.read", "members.read"], color: "text-slate-400", description: "Personal tasks and event participation" },
  { role: "Administrator", permissions: ["all", "settings.all"], color: "text-red-400", description: "System configuration and role management" },
]

const ACCENT_COLORS: { name: AccentColor; class: string; label: string }[] = [
  { name: "green",  class: "bg-emerald-500", label: "Green"  },
  { name: "blue",   class: "bg-blue-500",    label: "Blue"   },
  { name: "purple", class: "bg-violet-500",  label: "Purple" },
  { name: "pink",   class: "bg-pink-500",    label: "Pink"   },
  { name: "orange", class: "bg-orange-500",  label: "Orange" },
  { name: "red",    class: "bg-red-500",     label: "Red"    },
]

export function SettingsPage() {
  const { accentColor, setAccentColor } = useTheme()

  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [org, setOrg] = useState<OrgSettings>({
    name: "ClubRM",
    slug: "clubrm",
    description: "A student club relationship management platform at York University.",
    email: "clubrm@yorku.ca",
    website: "https://clubrm.yorku.ca",
    university: "York University",
    term: "Fall 2026",
    timezone: "America/Toronto",
  })

  const [notifications, setNotifications] = useState<NotificationPrefs>({
    emailDigest: true,
    taskAssigned: true,
    eventReminder: true,
    financeAlerts: true,
    memberJoined: false,
  })

  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark")
  const [saved, setSaved] = useState(false)

  // Load settings from Supabase
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from("org_settings").select("*").limit(1).single()

      if (error) {
        // If the table is empty (PGRST116), we just stop here and use the defaults
        if (error.code !== "PGRST116") {
          logError("Failed to load settings", 'SettingsPage', error)
        }
        return
      }

      if (data) {
        setSettingsId(data.id)
        setOrg({
          name: data.name || "ClubRM",
          slug: data.slug || "clubrm",
          description: data.description || "",
          email: data.email || "",
          website: data.website || "",
          university: data.university || "York University",
          term: data.term || "Fall 2026",
          timezone: data.timezone || "America/Toronto",
        })
        if (data.notification_prefs && typeof data.notification_prefs === "object") {
          setNotifications((prev) => ({ ...prev, ...(data.notification_prefs as Record<string, unknown>) }))
        }
        if (data.theme) setTheme(data.theme as "dark" | "light" | "system")
      }
    }
    load()
  }, [])

  const handleSave = useCallback(async () => {
    const payload = {
      name: org.name,
      slug: org.slug,
      description: org.description,
      email: org.email,
      website: org.website,
      university: org.university,
      term: org.term,
      timezone: org.timezone,
      notification_prefs: notifications as unknown as Json,
      theme,
    }

    if (settingsId) {
      const { error } = await supabase.from("org_settings").update(payload).eq("id", settingsId)
      if (error) logError("Failed to save settings", 'SettingsPage', error)
    } else {
      const { data, error } = await supabase.from("org_settings").insert(payload).select().single()
      if (error) logError("Failed to create settings", 'SettingsPage', error)
      if (data) setSettingsId(data.id)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [org, notifications, theme, settingsId])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your organization, roles, and application preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> General</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Roles</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5"><Palette className="h-3.5 w-3.5" /> Appearance</TabsTrigger>
        </TabsList>

        {/* ── General Settings ── */}
        <TabsContent value="general">
          <div className="bg-card border border-border/50 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Organization Details</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Basic information about your club</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <Input value={org.slug} onChange={(e) => setOrg({ ...org, slug: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Input value={org.description} onChange={(e) => setOrg({ ...org, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input value={org.email} onChange={(e) => setOrg({ ...org, email: e.target.value })} type="email" />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={org.website} onChange={(e) => setOrg({ ...org, website: e.target.value })} />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Academic Context</h3>
              <p className="text-xs text-muted-foreground mt-0.5">University and term settings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>University</Label>
                <Input value={org.university} onChange={(e) => setOrg({ ...org, university: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Current Term</Label>
                <Select value={org.term} onValueChange={(v) => setOrg({ ...org, term: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                    <SelectItem value="Winter 2026">Winter 2026</SelectItem>
                    <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                    <SelectItem value="Winter 2027">Winter 2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={org.timezone} onValueChange={(v) => setOrg({ ...org, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Toronto">Eastern (Toronto)</SelectItem>
                    <SelectItem value="America/Vancouver">Pacific (Vancouver)</SelectItem>
                    <SelectItem value="America/Edmonton">Mountain (Edmonton)</SelectItem>
                    <SelectItem value="America/Winnipeg">Central (Winnipeg)</SelectItem>
                    <SelectItem value="America/Halifax">Atlantic (Halifax)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} className="gap-2">
                {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? "Saved!" : "Save Changes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── Roles & Permissions ── */}
        <TabsContent value="roles">
          <div className="bg-card border border-border/50 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Roles & Permissions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">8 predefined roles with granular permission control</p>
            </div>

            <div className="space-y-3">
              {ROLES_CONFIG.map((roleConfig) => (
                <div key={roleConfig.role} className="bg-muted/20 border border-border/30 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center bg-muted/50", roleConfig.color)}>
                        <Key className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className={cn("font-semibold text-sm", roleConfig.color)}>{roleConfig.role}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{roleConfig.description}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs" disabled>
                      Edit Permissions
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {roleConfig.permissions.map((perm) => (
                      <span key={perm} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground font-mono">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs text-amber-400 font-medium">Custom role editing will be available once the backend is connected.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Roles are currently read-only. Permission changes require database integration.</p>
            </div>
          </div>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications">
          <div className="bg-card border border-border/50 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notification Preferences</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Choose what notifications you'd like to receive</p>
            </div>

            <div className="space-y-4">
              {[
                { key: "emailDigest"   as const, icon: <Mail className="h-4 w-4" />,        label: "Daily Email Digest",  description: "Receive a daily summary of club activity"          },
                { key: "taskAssigned"  as const, icon: <CheckCircle className="h-4 w-4" />, label: "Task Assignments",    description: "Get notified when a task is assigned to you"       },
                { key: "eventReminder" as const, icon: <Clock className="h-4 w-4" />,       label: "Event Reminders",     description: "Reminders 24h and 1h before events"                },
                { key: "financeAlerts" as const, icon: <Shield className="h-4 w-4" />,      label: "Finance Alerts",      description: "Alerts for budget thresholds and pending approvals" },
                { key: "memberJoined"  as const, icon: <Users className="h-4 w-4" />,       label: "New Member Joined",   description: "Notification when someone joins the club"           },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <button
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      notifications[item.key] ? "bg-primary" : "bg-muted"
                    )}
                    onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow-sm",
                        notifications[item.key] ? "translate-x-5.5" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} className="gap-2">
                {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? "Saved!" : "Save Preferences"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── Appearance ── */}
        <TabsContent value="appearance">
          <div className="bg-card border border-border/50 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Theme & Appearance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Customize how ClubRM looks for you</p>
            </div>

            {/* Theme selector */}
            <div className="grid grid-cols-3 gap-4">
              {(["dark", "light", "system"] as const).map((t) => (
                <button
                  key={t}
                  className={cn(
                    "border rounded-xl p-4 text-center transition-all",
                    theme === t
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border/50 hover:border-primary/30"
                  )}
                  onClick={() => setTheme(t)}
                >
                  <div className={cn(
                    "h-20 rounded-lg mb-3 flex items-center justify-center",
                    t === "dark"   ? "bg-zinc-900 border border-zinc-800" :
                    t === "light"  ? "bg-white border border-gray-200"    :
                                     "bg-gradient-to-r from-zinc-900 to-white border border-zinc-500"
                  )}>
                    <Settings className={cn("h-6 w-6", t === "light" ? "text-gray-600" : "text-gray-400")} />
                  </div>
                  <p className="text-sm font-medium capitalize">{t}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t === "dark" ? "Easy on the eyes" : t === "light" ? "Classic bright theme" : "Follows OS setting"}
                  </p>
                </button>
              ))}
            </div>

            <Separator />

            {/* Accent color picker — now fully wired to ThemeProvider */}
            <div>
              <h3 className="text-sm font-semibold mb-1">Accent Color</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Changes the primary color across the entire app — buttons, active tabs, and highlights.
              </p>
              <div className="flex items-center gap-3">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setAccentColor(color.name)}
                    title={color.label}
                    className={cn(
                      "h-8 w-8 rounded-full transition-all duration-150 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      color.class,
                      accentColor === color.name
                        ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110"
                        : "opacity-70 hover:opacity-100"
                    )}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                Currently active: <span className="capitalize font-medium text-foreground">{accentColor}</span>
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}