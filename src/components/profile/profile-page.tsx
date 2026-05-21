import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/auth-context"
import { supabaseUntyped as db } from "@/lib/supabase"
import { cn, getInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Save,
  CheckCircle,
  User,
  Mail,
  Phone,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  ExternalLink,
} from "lucide-react"

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
    </svg>
  )
}

interface SocialLinks {
  instagram: string
  facebook: string
  linkedin: string
  twitter: string
  tiktok: string
}

interface ProfileData {
  fullName: string
  bio: string
  phone: string
  socials: SocialLinks
}

function getAvatarColor(name: string) {
  const colors = [
    "from-rose-500 to-pink-600",
    "from-orange-500 to-amber-600",
    "from-emerald-500 to-teal-600",
    "from-cyan-500 to-blue-600",
    "from-blue-500 to-violet-600",
    "from-violet-500 to-purple-600",
  ]
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return colors[idx % colors.length]
}

const SOCIAL_FIELDS: {
  key: keyof SocialLinks
  label: string
  placeholder: string
  icon: React.ReactNode
  color: string
  prefix: string
}[] = [
  { key: "instagram", label: "Instagram", placeholder: "username", icon: <Instagram className="h-4 w-4" />, color: "text-pink-500", prefix: "instagram.com/" },
  { key: "facebook", label: "Facebook", placeholder: "username or profile URL", icon: <Facebook className="h-4 w-4" />, color: "text-blue-500", prefix: "facebook.com/" },
  { key: "linkedin", label: "LinkedIn", placeholder: "username", icon: <Linkedin className="h-4 w-4" />, color: "text-[#0A66C2]", prefix: "linkedin.com/in/" },
  { key: "twitter", label: "X / Twitter", placeholder: "username", icon: <Twitter className="h-4 w-4" />, color: "text-sky-400", prefix: "x.com/" },
  { key: "tiktok", label: "TikTok", placeholder: "username", icon: <TikTokIcon className="h-4 w-4" />, color: "text-foreground", prefix: "tiktok.com/@" },
]

function buildSocialUrl(key: keyof SocialLinks, value: string): string {
  if (!value) return ""
  if (value.startsWith("http")) return value
  const bases: Record<keyof SocialLinks, string> = {
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    linkedin: "https://linkedin.com/in/",
    twitter: "https://x.com/",
    tiktok: "https://tiktok.com/@",
  }
  return bases[key] + value.replace(/^@/, "")
}

export function ProfilePage() {
  const { user } = useAuth()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const [profile, setProfile] = useState<ProfileData>({
    fullName: user?.user_metadata?.full_name ?? "",
    bio: "",
    phone: "",
    socials: { instagram: "", facebook: "", linkedin: "", twitter: "", tiktok: "" },
  })

  useEffect(() => {
    if (!user) return
    async function load() {
      setLoading(true)
      const { data, error } = await db
        .from("socials")
        .select("*")
        .eq("user_id", user!.id)
        .single()

      if (!error && data) {
        setProfileId(data.id)
        setProfile({
          fullName: data.full_name ?? user!.user_metadata?.full_name ?? "",
          bio: data.bio ?? "",
          phone: data.phone ?? "",
          socials: {
            instagram: data.instagram ?? "",
            facebook: data.facebook ?? "",
            linkedin: data.linkedin ?? "",
            twitter: data.twitter ?? "",
            tiktok: data.tiktok ?? "",
          },
        })
      } else {
        setProfile((prev) => ({
          ...prev,
          fullName: user!.user_metadata?.full_name ?? "",
        }))
      }
      setLoading(false)
    }
    load()
  }, [user])

  const handleSave = useCallback(async () => {
    if (!user) return
    const payload = {
      user_id: user.id,
      full_name: profile.fullName,
      bio: profile.bio,
      phone: profile.phone,
      instagram: profile.socials.instagram,
      facebook: profile.socials.facebook,
      linkedin: profile.socials.linkedin,
      twitter: profile.socials.twitter,
      tiktok: profile.socials.tiktok,
      updated_at: new Date().toISOString(),
    }

    if (profileId) {
      await db.from("socials").update(payload).eq("id", profileId)
    } else {
      const { data } = await db.from("socials").insert(payload).select().single()
      if (data) setProfileId(data.id)
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [user, profile, profileId])

  const displayName = profile.fullName || user?.email || "User"
  const email = user?.email ?? ""

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal info and linked social accounts
        </p>
      </div>

      {/* Avatar + name card */}
      <div className="bg-card border border-border/50 rounded-xl p-6 flex items-center gap-6">
        <div className={cn("h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0 bg-gradient-to-br", getAvatarColor(displayName))}>
          {getInitials(displayName)}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold truncate">{displayName}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {Object.entries(profile.socials).map(([key, value]) => {
              if (!value) return null
              const field = SOCIAL_FIELDS.find((f) => f.key === key)
              if (!field) return null
              return (
                <a key={key} href={buildSocialUrl(key as keyof SocialLinks, value)} target="_blank" rel="noopener noreferrer" className={cn("hover:opacity-70 transition-opacity", field.color)} title={field.label}>
                  {field.icon}
                </a>
              )
            })}
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-card border border-border/50 rounded-xl p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Personal Information
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Your basic profile details</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name
            </Label>
            <Input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} placeholder="Your full name" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
            </Label>
            <Input value={email} disabled className="opacity-60 cursor-not-allowed" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone
            </Label>
            <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="(416) 555-0000" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Bio</Label>
          <Input value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell a little about yourself..." />
        </div>
      </div>

      {/* Social Media */}
      <div className="bg-card border border-border/50 rounded-xl p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" /> Social Media
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Link your social accounts — just enter your username
          </p>
        </div>

        <div className="space-y-4">
          {SOCIAL_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className={cn("flex items-center gap-2", field.color)}>
                {field.icon}
                {field.label}
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none">
                    {field.prefix}
                  </span>
                  <Input
                    value={profile.socials[field.key]}
                    onChange={(e) => setProfile({ ...profile, socials: { ...profile.socials, [field.key]: e.target.value } })}
                    placeholder={field.placeholder}
                    style={{ paddingLeft: `calc(0.75rem + ${field.prefix.length * 7}px)` }}
                  />
                </div>
                {profile.socials[field.key] && (
                  <a
                    href={buildSocialUrl(field.key, profile.socials[field.key])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-border/50 hover:bg-muted/50 transition-colors", field.color)}
                    title={`Open ${field.label}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} className="gap-2 min-w-[140px]">
          {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save Profile"}
        </Button>
      </div>
    </div>
  )
}