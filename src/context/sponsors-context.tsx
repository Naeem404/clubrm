import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react"
import { logError } from "@/lib/logger"

// Using relative path to bypass the IDE mapping error
import { type Sponsor, type SponsorContact, type Interaction } from "../components/external/types"

import { supabase } from "../lib/supabase"
import { useAuth } from "./auth-context"
import { useToast } from "./toast-context"

/*
 * Single-club data layer: every authenticated user reads the shared club rows;
 * access is enforced by RLS (see supabase/migration-security-hardening.sql).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message
  }
  return typeof err === "string" ? err : "Unknown error"
}

/** Toast helper that degrades to a no-op when no ToastProvider is mounted. */
function useErrorToast() {
  let showToast: ReturnType<typeof useToast>["showToast"] | null = null
  try {
    showToast = useToast().showToast
  } catch {
    showToast = null
  }
  return useCallback(
    (title: string, message?: string) => showToast?.({ type: "error", title, message }),
    [showToast]
  )
}

// 1. Updated Helper Interface to include the new mandatory fields
interface RawContact {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
  organization?: string;
  tags?: string[];
  createdAt?: string;
  linkedIn?: string;
}

/**
 * Converts a database row into a typed Sponsor object
 */
function toSponsor(row: any): Sponsor {
  return {
    id: String(row.id),
    company: String(row.company),
    logo: (row.logo as string) || undefined,
    tier: row.tier as Sponsor["tier"],
    status: row.status as Sponsor["status"],
    amount: Number(row.amount),
    startDate: String(row.start_date),
    endDate: (row.end_date as string) || undefined,
    contacts: (() => {
      const rawData = typeof row.contacts === "string" ? JSON.parse(row.contacts) : row.contacts
      const parsed = (rawData || []) as RawContact[]
      
      return parsed.map((c: RawContact): SponsorContact => ({
        id: c.id || crypto.randomUUID(),
        name: c.name || "Unknown",
        email: c.email || "",
        phone: c.phone || "",
        title: c.title || "Contact",
        // 2. Map the new mandatory fields with safe fallbacks
        organization: c.organization || String(row.company),
        tags: c.tags || [],
        createdAt: c.createdAt || new Date().toISOString(),
        linkedIn: c.linkedIn // Optional in types.ts so no fallback needed
      }))
    })(),
    interactions: (() => {
      const rawInt = typeof row.interactions === "string" ? JSON.parse(row.interactions) : row.interactions
      return (rawInt || []) as Interaction[]
    })(),
    notes: (row.notes as string) || undefined,
    industry: String(row.industry),
  }
}

/**
 * Converts a Sponsor object into a database-friendly row
 */
function toRow(s: Sponsor) {
  return {
    company: s.company,
    logo: s.logo || null,
    tier: s.tier,
    status: s.status,
    amount: s.amount,
    start_date: s.startDate,
    end_date: s.endDate || null,
    contacts: JSON.stringify(s.contacts || []),
    interactions: JSON.stringify(s.interactions || []),
    notes: s.notes || null,
    industry: s.industry,
  }
}

interface SponsorsContextType {
  sponsors: Sponsor[]
  loading: boolean
  /** Message of the last failed load, or null. */
  error: string | null
  refresh: () => Promise<void>
  /** All mutations update optimistically, roll back + toast on failure, then rethrow. */
  addSponsor: (sponsor: Omit<Sponsor, "id"> & { id?: string }) => Promise<void>
  updateSponsor: (sponsor: Sponsor) => Promise<void>
  deleteSponsor: (id: string) => Promise<void>
  addContact: (sponsorId: string, contact: SponsorContact) => Promise<void>
  updateContact: (sponsorId: string, contact: SponsorContact) => Promise<void>
  addInteraction: (sponsorId: string, interaction: Interaction) => Promise<void>
}

const SponsorsContext = createContext<SponsorsContextType | undefined>(undefined)

export function SponsorsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const notifyError = useErrorToast()

  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sponsorsRef = useRef<Sponsor[]>(sponsors)
  sponsorsRef.current = sponsors
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    if (!userId) return
    const requestId = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const { data, error: loadErr } = await supabase.from("sponsors").select("*").order("created_at", { ascending: true })
      if (requestId !== requestRef.current) return
      if (loadErr) throw loadErr
      setSponsors(((data ?? []) as Record<string, unknown>[]).map((row) => toSponsor(row)))
    } catch (err) {
      if (requestId !== requestRef.current) return
      const msg = errorMessage(err)
      logError("Failed to load sponsors", "SponsorsContext", err)
      setError(msg)
      notifyError("Couldn't load sponsors", msg)
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [userId, notifyError])

  useEffect(() => {
    // Clear on sign-out / user switch; never query while signed out.
    setSponsors([])
    setError(null)
    if (!userId) {
      requestRef.current++
      setLoading(false)
      return
    }
    void load()
    return () => {
      requestRef.current++
    }
  }, [userId, load])

  const fail = useCallback((action: string, err: unknown): never => {
    logError(`Failed to ${action}`, "SponsorsContext", err)
    notifyError(`Couldn't ${action}`, errorMessage(err))
    throw err
  }, [notifyError])

  const addSponsor = useCallback(async (sponsor: Omit<Sponsor, "id"> & { id?: string }) => {
    const row = toRow(sponsor as Sponsor)
    // Only forward client ids the uuid primary key can accept; otherwise let the DB generate one.
    const payload = sponsor.id && UUID_RE.test(sponsor.id) ? { id: sponsor.id, ...row } : row
    const tempId = `temp-${crypto.randomUUID()}`
    setSponsors((prev) => [...prev, { ...(sponsor as Sponsor), id: tempId }])
    try {
      const { data, error: err } = await supabase.from("sponsors").insert(payload).select().single()
      if (err) throw err
      if (!data) throw new Error("Sponsor was not created")
      const created = toSponsor(data)
      setSponsors((prev) => prev.map((s) => (s.id === tempId ? created : s)))
    } catch (err) {
      setSponsors((prev) => prev.filter((s) => s.id !== tempId))
      fail("add sponsor", err)
    }
  }, [fail])

  const updateSponsor = useCallback(async (sponsor: Sponsor) => {
    const previous = sponsorsRef.current.find((s) => s.id === sponsor.id)
    const next = sponsorsRef.current.map((s) => (s.id === sponsor.id ? sponsor : s))
    sponsorsRef.current = next // so chained contact/interaction edits see the latest value
    setSponsors((prev) => prev.map((s) => (s.id === sponsor.id ? sponsor : s)))
    try {
      const { error: err } = await supabase.from("sponsors").update(toRow(sponsor)).eq("id", sponsor.id)
      if (err) throw err
    } catch (err) {
      if (previous) {
        sponsorsRef.current = sponsorsRef.current.map((s) => (s.id === previous.id ? previous : s))
        setSponsors((prev) => prev.map((s) => (s.id === previous.id ? previous : s)))
      }
      fail("update sponsor", err)
    }
  }, [fail])

  const deleteSponsor = useCallback(async (id: string) => {
    const index = sponsorsRef.current.findIndex((s) => s.id === id)
    const previous = index >= 0 ? sponsorsRef.current[index] : undefined
    setSponsors((prev) => prev.filter((s) => s.id !== id))
    try {
      const { error: err } = await supabase.from("sponsors").delete().eq("id", id)
      if (err) throw err
    } catch (err) {
      if (previous) {
        setSponsors((prev) => {
          if (prev.some((s) => s.id === id)) return prev
          const next = [...prev]
          next.splice(Math.min(index, next.length), 0, previous)
          return next
        })
      }
      fail("delete sponsor", err)
    }
  }, [fail])

  const findSponsor = useCallback((sponsorId: string): Sponsor => {
    const sponsor = sponsorsRef.current.find((s) => s.id === sponsorId)
    if (!sponsor) fail("update sponsor", new Error(`Sponsor ${sponsorId} not found`))
    return sponsor as Sponsor
  }, [fail])

  const addContact = useCallback(async (sponsorId: string, contact: SponsorContact) => {
    const sponsor = findSponsor(sponsorId)
    await updateSponsor({ ...sponsor, contacts: [...sponsor.contacts, contact] })
  }, [findSponsor, updateSponsor])

  const updateContact = useCallback(async (sponsorId: string, contact: SponsorContact) => {
    const sponsor = findSponsor(sponsorId)
    await updateSponsor({
      ...sponsor,
      contacts: sponsor.contacts.map((c: SponsorContact) => (c.id === contact.id ? contact : c)),
    })
  }, [findSponsor, updateSponsor])

  const addInteraction = useCallback(async (sponsorId: string, interaction: Interaction) => {
    const sponsor = findSponsor(sponsorId)
    await updateSponsor({ ...sponsor, interactions: [interaction, ...sponsor.interactions] })
  }, [findSponsor, updateSponsor])

  const value = useMemo(
    () => ({
      sponsors,
      loadin
