import React from "react"
import { AlertTriangle, RefreshCcw } from "lucide-react"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Optional override for the fallback UI */
  fallback?: (error: Error, reset: () => void) => React.ReactNode
  /** Optional label to differentiate boundaries (e.g. "Members", "Events") */
  scope?: string
}

/**
 * ErrorBoundary catches uncaught render/runtime errors in a subtree so the
 * whole app doesn't blank out when a single page or context provider throws.
 *
 * Place at the root of the tree (in main.tsx) and around any high-risk
 * subtrees (lazy-loaded route segments, dashboard widgets).
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface to the console; in production, swap for a real telemetry sink.
    const scope = this.props.scope ? `[${this.props.scope}] ` : ""
    console.error(`${scope}ErrorBoundary caught:`, error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-destructive/10 p-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-2">
                <h2 className="font-semibold text-foreground">Something went wrong</h2>
                <p className="text-sm text-muted-foreground">
                  {this.props.scope
                    ? `The ${this.props.scope} section ran into a problem.`
                    : "ClubRM hit an unexpected error and stopped rendering this view."}
                </p>
                <pre className="max-h-32 overflow-auto rounded-lg bg-muted p-2 text-[11px] text-muted-foreground">
                  {this.state.error.message}
                </pre>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={this.reset}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Try again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Reload page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
