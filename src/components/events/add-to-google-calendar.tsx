import { useGoogleCalendar } from "@/hooks/use-google-calendar"
import { type CalendarEvent } from "@/components/events/types"

// Inline Google Icon
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

interface AddToGoogleCalendarProps {
  event: CalendarEvent
  
  className?: string
}

export function AddToGoogleCalendar({ event, className = "" }: AddToGoogleCalendarProps) {
  const { syncToGoogle, status, error, gcalLink, reset } = useGoogleCalendar()

  if (status === "success" && gcalLink) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Added to Google Calendar
        </span>
        <a
          href={gcalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline"
        >
          View →
        </a>
        <button
          onClick={reset}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Add again
        </button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <button
        onClick={() => syncToGoogle(event)}
        disabled={status === "loading"}
        className="
          inline-flex items-center gap-2.5 px-4 py-2 rounded-lg border
          border-zinc-200 dark:border-zinc-700
          bg-white dark:bg-zinc-900
          hover:bg-zinc-50 dark:hover:bg-zinc-800
          text-sm font-medium text-zinc-700 dark:text-zinc-200
          shadow-sm transition-all duration-150
          disabled:opacity-60 disabled:cursor-not-allowed
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        "
      >
        {status === "loading" ? (
          <>
            <svg
              className="w-4 h-4 animate-spin text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Connecting…
          </>
        ) : (
          <>
            <GoogleIcon className="w-4 h-4 flex-shrink-0" />
            Add to Google Calendar
          </>
        )}
      </button>

      {status === "error" && error && (
        <p className="text-xs text-red-500 dark:text-red-400 pl-1">{error}</p>
      )}
    </div>
  )
}