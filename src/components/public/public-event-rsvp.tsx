import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabaseUntyped as db } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Calendar,
  MapPin,
  Users,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react"

interface PublicEvent {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  location: string | null
  capacity: number | null
  registered: number | null
  is_public: boolean
  status: string
}

/**
 * PublicEventRSVPPage is mounted at `/rsvp/:eventId` and bypasses the auth
 * guard in App.tsx. Anyone with the link can view the event and submit an
 * RSVP. Submissions go to `event_rsvps` and (where possible) bump the
 * `events.registered` counter.
 *
 * This is the bridge between ClubRM and the public event-marketing flow
 * that competitors (Eventbrite, CampusGroups) consider table-stakes.
 */
export function PublicEventRSVPPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<PublicEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [guests, setGuests] = useState(0)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!eventId) {
      setError("Missing event link")
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      const { data, error } = await db
        .from("events")
        .select("id, title, description, start_date, end_date, location, capacity, registered, is_public, status")
        .eq("id", eventId)
        .maybeSingle()
      if (cancelled) return
      if (error || !data) {
        setError("This event link is invalid or no longer available.")
        setLoading(false)
        return
      }
      if (!data.is_public) {
        setError("This event is private and cannot be viewed without an invitation.")
        setLoading(false)
        return
      }
      setEvent(data as PublicEvent)
      setLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [eventId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!event || !name.trim() || !email.trim()) return
    setSubmitting(true)
    setError(null)

    const partySize = 1 + Math.max(0, Math.floor(Number(guests) || 0))
    const capacity = event.capacity ?? 0
    const currentRegistered = event.registered ?? 0
    if (capacity > 0 && currentRegistered + partySize > capacity) {
      setError("Sorry, this event is full. Try contacting the organisers directly.")
      setSubmitting(false)
      return
    }

    const { error: insertErr } = await db.from("event_rsvps").insert({
      event_id: event.id,
      attendee_name: name.trim(),
      attendee_email: email.trim().toLowerCase(),
      guests: partySize - 1,
      notes: notes.trim() || null,
      status: "confirmed",
    })

    if (insertErr) {
      console.error("[rsvp] insert failed:", insertErr)
      setError("Could not save your RSVP. Please try again in a moment.")
      setSubmitting(false)
      return
    }

    // Best-effort: bump the registered counter so capacity warnings stay accurate.
    await db
      .from("events")
      .update({ registered: currentRegistered + partySize })
      .eq("id", event.id)

    setSubmitted(true)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-6 shadow-lg text-center space-y-3">
          <div className="mx-auto rounded-full bg-destructive/10 p-3 w-fit text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Event not available</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!event) return null

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-3xl border border-primary/30 bg-card p-7 shadow-2xl text-center space-y-4">
          <div className="mx-auto rounded-full bg-primary/10 p-3 w-fit text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">You're in!</h1>
          <p className="text-sm text-muted-foreground">
            We've saved your RSVP for <strong>{event.title}</strong>. Keep an eye on{" "}
            <strong>{email}</strong> for confirmation and reminders.
          </p>
          <p className="text-xs text-muted-foreground">
            See you on {formatDate(event.start_date)}.
          </p>
        </div>
      </div>
    )
  }

  const remaining = event.capacity != null ? Math.max(0, event.capacity - (event.registered ?? 0)) : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_45%)]" />
          <div className="relative px-6 py-7 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Public RSVP
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
            {event.description && (
              <p className="text-sm leading-6 text-muted-foreground max-w-xl">{event.description}</p>
            )}
            <div className="grid gap-2 pt-2 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(event.start_date)}
              </div>
              {event.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </div>
              )}
              {event.capacity != null && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {remaining === 0 ? "Full" : `${remaining} spot${remaining === 1 ? "" : "s"} left`}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RSVP form */}
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Reserve your spot</h2>
            <p className="text-sm text-muted-foreground">
              Free to attend — just leave your name so we know to expect you.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Your full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Alex Chen" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="alex@yorku.ca" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="guests">Bringing guests?</Label>
                <Input id="guests" type="number" min="0" max="5" value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Note for the organisers <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dietary needs, questions…" />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <Button type="submit" className="w-full h-11 rounded-xl text-sm font-semibold" disabled={submitting || remaining === 0}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {remaining === 0 ? "Event full" : submitting ? "Saving…" : "Confirm RSVP"}
            </Button>
          </form>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Powered by ClubRM — built for student organisations.
        </p>
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}
