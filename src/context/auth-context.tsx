import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

export type UserProfile = Database["public"]["Tables"]["profiles"]["Row"]

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  profileLoading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  completeOnboarding: (payload: { fullName: string; role: string }) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  const fetchProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle()

    if (error) {
      console.error("[ClubRM] profile fetch failed:", error)
      setProfile(null)
      setProfileLoading(false)
      return
    }

    setProfile(data ?? null)
    setProfileLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      void fetchProfile(session?.user ?? null)
    }).catch((err) => {
      console.error('[ClubRM] getSession failed:', err)
      setLoading(false)
      setProfileLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      void fetchProfile(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    await fetchProfile(user)
  }, [fetchProfile, user])

  const completeOnboarding = useCallback(async ({ fullName, role }: { fullName: string; role: string }) => {
    if (!user?.email) {
      return { error: "No authenticated user found." }
    }

    const cleanName = fullName.trim()
    const cleanRole = role.trim()

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email,
          full_name: cleanName,
          role: cleanRole,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: cleanName,
        role: cleanRole,
      },
    })

    if (authError) {
      console.error("[ClubRM] auth metadata update failed:", authError)
    }

    setProfile(data)
    return { error: null }
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileLoading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
