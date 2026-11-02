import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { logError } from "@/lib/logger"
import type { Session, User } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

export type UserProfile = Database["public"]["Tables"]["profiles"]["Row"]
type ProfileUpdateRow = Database["public"]["Tables"]["profiles"]["Update"]

/** Columns a user may never change on their own profile from the client. */
const PROTECTED_PROFILE_KEYS = ["role", "id", "email", "created_at", "updated_at"] as const

/** Fields a user is allowed to update on their own profile. */
export type SafeProfileUpdate = Omit<ProfileUpdateRow, (typeof PROTECTED_PROFILE_KEYS)[number]>

/** Fields accepted when finishing onboarding (onboarding_completed is set automatically). */
export type OnboardingUpdate = Omit<SafeProfileUpdate, "onboarding_completed">

/** Warn when the session expires within this many seconds. */
const SESSION_WARNING_SECONDS = 15 * 60
const SESSION_CHECK_INTERVAL_MS = 60 * 1000

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  /** Raw profiles.role value. Use useRole() for the normalized, typed role. */
  role: string | null
  loading: boolean
  profileLoading: boolean
  sessionExpiringSoon: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: SafeProfileUpdate) => Promise<void>
  completeOnboarding: (updates: OnboardingUpdate) => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}

function sanitizeProfileUpdate(updates: Record<string, unknown>): SafeProfileUpdate {
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(updates)) {
    if ((PROTECTED_PROFILE_KEYS as readonly string[]).includes(key)) continue
    if (value === undefined) continue
    clean[key] = value
  }
  return clean as SafeProfileUpdate
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [sessionExpiringSoon, setSessionExpiringSoon] = useState(false)

  const mountedRef = useRef(true)
  const currentUserIdRef = useRef<string | null>(null)
  const profileRequestRef = useRef(0)

  const loadProfile = useCallback(async (userId: string) => {
    const requestId = ++profileRequestRef.current
    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()
      // Ignore stale responses (user switched / signed out meanwhile)
      if (!mountedRef.current || requestId !== profileRequestRef.current) return
      if (error) {
        logError("profile fetch failed", "AuthContext", error)
        setProfile(null)
      } else {
        setProfile(data ?? null)
      }
    } catch (err) {
      if (mountedRef.current && requestId === profileRequestRef.current) {
        logError("profile fetch error", "AuthContext", err)
        setProfile(null)
      }
    } finally {
      if (mountedRef.current && requestId === profileRequestRef.current) {
        setProfileLoading(false)
      }
    }
  }, [])

  const applySession = useCallback((next: Session | null, forceProfileReload = false) => {
    setSession(next)
    setUser(next?.user ?? null)

    const nextUserId = next?.user?.id ?? null
    const userChanged = nextUserId !== currentUserIdRef.current
    currentUserIdRef.current = nextUserId

    if (!nextUserId) {
      profileRequestRef.current++ // invalidate in-flight fetches
      setProfile(null)
      setProfileLoading(false)
      setSessionExpiringSoon(false)
      return
    }

    if (userChanged) setProfile(null)
    if (userChanged || forceProfileReload) {
      void loadProfile(nextUserId)
    }
  }, [loadProfile])

  useEffect(() => {
    mountedRef.current = true

    async function init() {
      try {
        const { data: { session: initial }, error } = await supabase.auth.getSession()
        if (!mountedRef.current) return
        if (error) {
          logError("getSession failed", "AuthContext", error)
          return
        }
        applySession(initial)
      } catch (err) {
        logError("auth initialization error", "AuthContext", err)
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mountedRef.current) return
      // Defer Supabase calls out of the auth callback to avoid client deadlocks.
      setTimeout(() => {
        if (!mountedRef.current) return
        applySession(next, event === "USER_UPDATED")
      }, 0)
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [applySession])

  // Session-expiry watcher: always uses the latest session from state.
  useEffect(() => {
    const expiresAt = session?.expires_at
    if (!expiresAt) {
      setSessionExpiringSoon(false)
      return
    }
    const check = () => {
      const remaining = expiresAt - Date.now() / 1000
      setSessionExpiringSoon(remaining > 0 && remaining < SESSION_WARNING_SECONDS)
    }
    check()
    const interval = setInterval(check, SESSION_CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [session?.expires_at])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    // The profile row is created server-side by the `handle_new_user` trigger
    // (with the least-privileged default role). Never insert it from the client.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, name },
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      logError("sign out failed", "AuthContext", error)
      throw error
    }
  }, [])

  const writeProfile = useCallback(async (updates: SafeProfileUpdate) => {
    if (!user) throw new Error("No user logged in")
    const clean = sanitizeProfileUpdate(updates as Record<string, unknown>)
    if (Object.keys(clean).length === 0) return
    const { data, error } = await supabase
      .from("profiles")
      .update(clean)
      .eq("id", user.id)
      .select()
      .single()
    if (error) {
      logError("profile update failed", "AuthContext", error)
      throw error
    }
    if (data && mountedRef.current) setProfile(data)
  }, [user])

  const updateProfile = useCallback(async (updates: SafeProfileUpdate) => {
    await writeProfile(updates)
  }, [writeProfile])

  const completeOnboarding = useCallback(async (updates: OnboardingUpdate) => {
    await writeProfile({ ...updates, onboarding_completed: true })
  }, [writeProfile])

  const refreshSession = useCallback(async () => {
    const { data: { session: refreshed }, error } = await supabase.auth.refreshSession()
    if (error) {
      logError("session refresh failed", "AuthContext", error)
      throw error
    }
    if (refreshed) applySession(refreshed)
  }, [applySession])

  const value: AuthContextType = {
    user,
    session,
    profile,
    role: profile?.role ?? null,
    loading,
    profileLoading,
    sessionExpiringSoon,
    signIn,
    signUp,
    signOut,
    updateProfile,
    completeOnboarding,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
