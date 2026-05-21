import { useState, useCallback } from "react"
import {
  signInWithGoogle,
  addEventToGoogleCalendar,
  getStoredToken,
  clearToken,
  type GCalEvent,
} from "@/lib/google-calendar"
import { type CalendarEvent } from "@/components/events/types"

type SyncStatus = "idle" | "loading" | "success" | "error"

function toGCalEvent(event: CalendarEvent): GCalEvent {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  if (event.allDay) {
    const toDateStr = (d: Date) =>
      new Date(d).toISOString().split("T")[0]
    return {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { date: toDateStr(event.startDate) },
      end: { date: toDateStr(event.endDate) },
    }
  }

  return {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: { dateTime: new Date(event.startDate).toISOString(), timeZone },
    end: { dateTime: new Date(event.endDate).toISOString(), timeZone },
  }
}

export function useGoogleCalendar() {
  const [status, setStatus] = useState<SyncStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [gcalLink, setGcalLink] = useState<string | null>(null)

  const syncToGoogle = useCallback(async (event: CalendarEvent) => {
    setStatus("loading")
    setError(null)
    setGcalLink(null)

    try {
      // Use stored token or trigger sign-in
      let token = getStoredToken()
      if (!token) {
        token = await signInWithGoogle()
      }

      const gEvent = toGCalEvent(event)
      let result: { id: string; htmlLink: string }

      try {
        result = await addEventToGoogleCalendar(gEvent, token)
      } catch (err) {
        // Token expired re-authenticate once
        if (err instanceof Error && err.message === "UNAUTHENTICATED") {
          token = await signInWithGoogle()
          result = await addEventToGoogleCalendar(gEvent, token)
        } else {
          throw err
        }
      }

      setGcalLink(result.htmlLink)
      setStatus("success")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg)
      setStatus("error")
    }
  }, [])

  const reset = useCallback(() => {
    setStatus("idle")
    setError(null)
    setGcalLink(null)
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    reset()
  }, [reset])

  return { syncToGoogle, status, error, gcalLink, reset, signOut }
}