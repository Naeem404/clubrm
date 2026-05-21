import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logError } from "@/lib/logger"
import type { User } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type Role = string

interface AuthContextType {
  user: User | null
  profile: Profile | null
  role: Role | null
  loading: boolean
  sessionExpiringSoon: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateRole: (role: Role) => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpiringSoon, setSessionExpiringSoon] = useState(false)

  useEffect(() => {
    let mounted = true
    let sessionCheckInterval: NodeJS.Timeout | null = null

    async function load() {
      try {
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
        if (sessionErr) {
          logError('getSession failed', 'AuthContext', sessionErr)
          return
        }

        if (session?.user && mounted) {
          setUser(session.user)

          const { data: profileData, error: profileErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (profileErr) {
            logError("profile fetch failed", 'AuthContext', profileErr)
          } else if (profileData && mounted) {
            setProfile(profileData)
            setRole(profileData.role || null)
          }

          // Check session expiry every 5 minutes
          sessionCheckInterval = setInterval(() => {
            if (session.expires_at) {
              const now = Date.now() / 1000
              const timeUntilExpiry = session.expires_at - now
              // Warn if session expires in less than 15 minutes
              if (timeUntilExpiry < 900 && timeUntilExpiry > 0) {
                setSessionExpiringSoon(true)
              } else {
                setSessionExpiringSoon(false)
              }
            }
          }, 300000)
        }
      } catch (err) {
        logError("auth initialization error", 'AuthContext', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user || null)
      if (session?.user) {
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data, error }) => {
          if (!error && data && mounted) {
            setProfile(data)
            setRole(data.role || null)
          }
        })
      } else {
        setProfile(null)
        setRole(null)
        setSessionExpiringSoon(false)
      }
    })

    return () => {
      mounted = false
      if (sessionCheckInterval) clearInterval(sessionCheckInterval)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })
    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        email: email,
        full_name: name,
        role: "member"
      })
      if (profileError) throw profileError
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) throw new Error("No user logged in")
    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)
    if (error) throw error
    setProfile(prev => prev ? { ...prev, ...updates } : null)
  }, [user])

  const updateRole = useCallback(async (newRole: Role) => {
    if (!user) throw new Error("No user logged in")
    const { data, error } = await supabase.from("profiles").update({ role: newRole }).eq("id", user.id).select().single()
    if (error) {
      logError("role update failed", 'AuthContext', error)
      throw error
    }
    if (data) {
      setRole(data.role)
      setProfile(data)
    }
  }, [user])

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error) {
        logError("session refresh failed", 'AuthContext', error)
        throw error
      }
      if (session) {
        setSessionExpiringSoon(false)
      }
    } catch (err) {
      logError("session refresh error", 'AuthContext', err)
      throw err
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, sessionExpiringSoon, signIn, signUp, signOut, updateProfile, updateRole, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}
