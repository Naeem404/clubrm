import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

// Using relative path to bypass the IDE mapping error
import { type Sponsor, type SponsorContact, type Interaction } from "../components/external/types"

import { supabaseUntyped as supabase } from "../lib/supabase"
import { useAuth } from "./auth-context"

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
function toRow(s: Sponsor, orgId: string | null = null) {
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
    organization_id: orgId,
  }
}

interface SponsorsContextType {
  sponsors: Sponsor[]
  addSponsor: (sponsor: Sponsor) => Promise<void>
  updateSponsor: (sponsor: Sponsor) => Promise<void>
  deleteSponsor: (id: string) => Promise<void>
  addContact: (sponsorId: string, contact: SponsorContact) => Promise<void>
  updateContact: (sponsorId: string, contact: SponsorContact) => Promise<void>
  addInteraction: (sponsorId: string, interaction: Interaction) => Promise<void>
}

const SponsorsContext = createContext<SponsorsContextType | undefined>(undefined)

export function SponsorsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const orgId = user?.id ?? null

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .or(`organization_id.eq.${orgId},organization_id.is.null`)
        .order("created_at", { ascending: true })

      if (cancelled) return
      if (error) {
        console.error("[sponsors] load failed:", error)
        setSponsors([])
        return
      }
      // Production-empty start: no auto-seed.
      setSponsors((data ?? []).map((row: any) => toSponsor(row)))
    }
    void load()
    return () => { cancelled = true }
  }, [orgId])

  const addSponsor = useCallback(async (sponsor: Omit<Sponsor, "id"> & { id?: string }) => {
    const row = toRow(sponsor as Sponsor, orgId)
    const payload = sponsor.id ? { id: sponsor.id, ...row } : row
    const { data, error } = await supabase.from("sponsors").insert(payload).select().single()
    if (error) throw error
    if (data) setSponsors((prev) => [...prev, toSponsor(data)])
  }, [orgId])

  const updateSponsor = useCallback(async (sponsor: Sponsor) => {
    const row = toRow(sponsor, orgId)
    const { error } = await supabase.from("sponsors").update(row).eq("id", sponsor.id)
    if (error) throw error
    setSponsors((prev) => prev.map((s) => (s.id === sponsor.id ? sponsor : s)))
  }, [orgId])

  const deleteSponsor = useCallback(async (id: string) => {
    const { error } = await supabase.from("sponsors").delete().eq("id", id)
    if (error) return
    setSponsors((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const addContact = useCallback(async (sponsorId: string, contact: SponsorContact) => {
    const sponsor = sponsors.find(s => s.id === sponsorId)
    if (!sponsor) return
    const updatedSponsor = { ...sponsor, contacts: [...sponsor.contacts, contact] }
    await updateSponsor(updatedSponsor)
  }, [sponsors, updateSponsor])

  const updateContact = useCallback(async (sponsorId: string, contact: SponsorContact) => {
    const sponsor = sponsors.find(s => s.id === sponsorId)
    if (!sponsor) return
    const updatedSponsor = { 
      ...sponsor, 
      contacts: sponsor.contacts.map((c: SponsorContact) => c.id === contact.id ? contact : c) 
    }
    await updateSponsor(updatedSponsor)
  }, [sponsors, updateSponsor])

  const addInteraction = useCallback(async (sponsorId: string, interaction: Interaction) => {
    const sponsor = sponsors.find(s => s.id === sponsorId)
    if (!sponsor) return
    const updatedSponsor = { ...sponsor, interactions: [interaction, ...sponsor.interactions] }
    await updateSponsor(updatedSponsor)
  }, [sponsors, updateSponsor])

  return (
    <SponsorsContext.Provider
      value={{
        sponsors,
        addSponsor,
        updateSponsor,
        deleteSponsor,
        addContact,
        updateContact,
        addInteraction,
      }}
    >
      {children}
    </SponsorsContext.Provider>
  )
}

export function useSponsors() {
  const context = useContext(SponsorsContext)
  if (context === undefined) throw new Error("useSponsors must be used within a SponsorsProvider")
  return context
}