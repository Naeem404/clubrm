const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const SCOPES = "https://www.googleapis.com/auth/calendar.events"

export interface GCalEvent {
  summary: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
}

// Token storage 

export function getStoredToken(): string | null {
  return sessionStorage.getItem("gcal_access_token")
}

function storeToken(token: string) {
  sessionStorage.setItem("gcal_access_token", token)
}

export function clearToken() {
  sessionStorage.removeItem("gcal_access_token")
}

// OAuth 

export function signInWithGoogle(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(new Error("VITE_GOOGLE_CLIENT_ID is not set in your .env file"))
      return
    }

    const redirectUri = window.location.origin
    const state = crypto.randomUUID()
    sessionStorage.setItem("gcal_oauth_state", state)

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: SCOPES,
      state,
      prompt: "consent",
    })

    const popupWidth = 500
    const popupHeight = 600
    const left = window.screenX + (window.outerWidth - popupWidth) / 2
    const top = window.screenY + (window.outerHeight - popupHeight) / 2

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "google-oauth",
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`
    )

    if (!popup) {
      reject(new Error("Popup was blocked. Please allow popups for this site."))
      return
    }

    const interval = setInterval(() => {
      try {
        const popupUrl = popup.location.href
        if (popupUrl.startsWith(redirectUri) && popupUrl.includes("access_token")) {
          clearInterval(interval)
          popup.close()

          
          const hash = new URLSearchParams(popup.location.hash.replace("#", "?"))
          const accessToken = hash.get("access_token")
          const returnedState = hash.get("state")

          if (returnedState !== sessionStorage.getItem("gcal_oauth_state")) {
            reject(new Error("OAuth state mismatch — possible CSRF"))
            return
          }

          if (!accessToken) {
            reject(new Error("No access token returned"))
            return
          }

          storeToken(accessToken)
          resolve(accessToken)
        }
      } catch {
        // Cross-origin: popup is still on Google's domain — keep waiting
      }

      if (popup.closed) {
        clearInterval(interval)
        reject(new Error("Sign-in was cancelled"))
      }
    }, 300)
  })
}

// Google Calendar API call 

export async function addEventToGoogleCalendar(
  event: GCalEvent,
  accessToken: string
): Promise<{ id: string; htmlLink: string }> {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  )

  if (res.status === 401) {
    clearToken()
    throw new Error("UNAUTHENTICATED")
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? "Failed to create Google Calendar event")
  }

  return res.json()
}