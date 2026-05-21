import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabaseUntyped as db } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"

/**
 * OrgContext encapsulates the current organization the signed-in user is
 * acting on behalf of. Every feature provider (Members, Events, Tasks,
 * Finance, Sponsors, Marketing, Documents) is expected to scope its queries
 * by `orgId` so two clubs sharing the same Supabase instance never see
 * each other's data.
 *
 * Resolution strategy (first match wins):
 *   1. profile.organization_id (set during onboarding / settings)
 *   2. profile.id              (single-user / self-managed fallback)
 *   3. null                    (not yet ready)
 *
 * The single-user fallback ensures the app keeps working today before the
 * `organizations` table migration is applied — but every query is still
 * scoped to a stable id so users never bleed data across each other.
 */
interface OrgContextType {
  orgId: string | null
  orgName: string
  loading: boolean
  refresh: () => Promise<void>
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string>("")
  const [loading, setLoading] = useState(true)

  const resolve = useCallback(async () => {
    if (!user) {
      setOrgId(null)
      setOrgName("")
      setLoading(false)
      return
    }

    setLoading(true)

    // 1. Try the new organization_id column on the profile.
    const profileOrgId =
      (profile as unknown as { organization_id?: string | null })?.organization_id ?? null

    if (profileOrgId) {
      setOrgId(profileOrgId)
    } else {
      // 2. Fallback: every user gets their own private workspace keyed by
      //    their auth uid. This is safe because every query also filters on
      //    org_id, so users see only their own data until they explicitly
      //    join a multi-user org.
      setOrgId(user.id)
    }

    // Pull org display name (best-effort, falls back to a friendly default).
    try {
      const { data, error } = await db
        .from("org_settings")
        .select("name")
        .limit(1)
        .maybeSingle()
      if (!error && data?.name) {
        setOrgName(data.name as string)
      } else {
        setOrgName("My Club")
      }
    } catch {
      setOrgName("My Club")
    }

    setLoading(false)
  }, [user, profile])

  useEffect(() => {
    void resolve()
  }, [resolve])

  return (
    <OrgContext.Provider value={{ orgId, orgName, loading, refresh: resolve }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error("useOrg must be used within an OrgProvider")
  return ctx
}
