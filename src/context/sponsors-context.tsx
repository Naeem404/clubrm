import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { logError } from "@/lib/logger"

// Using relative path to bypass the IDE mapping error
import { type Sponsor, type SponsorContact, type Interaction, SEED_SPONSORS } from "../components/external/types"

import { supabase } from "../lib/supabase"
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
  addSponsor: (sponsor: Sponsor) => Promise<void>
  updateSponsor: (sponsor: Sponsor) => Promise<void>
  deleteSponsor: (id: string) => Promise<void>
  addContact: (sponsorId: string, contact: SponsorContact) => Promise<void>
  updateContact: (sponsorId: string, contact: SponsorContact) => Promise<void>
  addInteraction: (sponsorId: string, interaction: Interaction) => Promise<void>
}

const SponsorsContext = createContext<SponsorsContextType | undefined>(undefined)

export function SponsorsProvider({ children }: { children: React.ReactNode }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const { user } = useAuth()
  const orgId = user?.id

  useEffect(() => {
    async function load() {
      const query = supabase.from("sponsors").select("*").order("created_at", { ascending: true })
      if (orgId) {
        query.eq("organization_id", orgId)
      }
      const { data, error } = await query
      
      if (error) {
        logError("Failed to load sponsors", 'SponsorsContext', error)
        setSponsors(SEED_SPONSORS)
        return
      }

      if (data && data.length > 0) {
        setSponsors(data.map((row: any) => toSponsor(row)))
      } else {
        const rows = SEED_SPONSORS.map(s => ({ ...toRow(s), organization_id: orgId }))
        const { data: seeded, error: seedErr } = await supabase.from("sponsors").insert(rows).select()
        
        if (seedErr) {
          logError("Failed to seed sponsors", 'SponsorsContext', seedErr)
          setSponsors(SEED_SPONSORS)
        } else if (seeded) {
          setSponsors(seeded.map((row: any) => toSponsor(row)))
        }
      }
    }
    load()
  }, [orgId])

  const addSponsor = useCallback(async (sponsor: Omit<Sponsor, "id"> & { id?: string }) => {
    const row = { ...toRow(sponsor as Sponsor), organization_id: orgId }
    const payload = sponsor.id ? { id: sponsor.id, ...row } : row
    const { data, error } = await supabase.from("sponsors").insert(payload).select().single()
    if (error) throw error
    if (data) setSponsors((prev) => [...prev, toSponsor(data)])
  }, [orgId])

  const updateSponsor = useCallback(async (sponsor: Sponsor) => {
    const row = { ...toRow(sponsor), organization_id: orgId }
    const { error } = await supabase.from("sponsors").update(row).eq("id", sponsor.id)
    if (error) throw error
    setSponsors((prev) => prev.map((s) => (s.id === sponsor.id ? sponsor : s)))
  }, [orgId])

  const deleteSponsor = useCallback(async (id: string) => {
    const query = supabase.from("sponsors").delete().eq("id", id)
    if (orgId) {
      query.eq("organization_id", orgId)
    }
    const { error } = await query
    if (error) throw error
    setSponsors((prev) => prev.filter((s) => s.id !== id))
  }, [orgId])

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