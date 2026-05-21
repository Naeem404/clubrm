import { useState } from "react"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Loader2, Eye, EyeOff } from "lucide-react"

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === "login") {
      const { error } = await signIn(email, password)
      if (error) setError(error)
    } else {
      if (!fullName.trim()) {
        setError("Please enter your full name")
        setLoading(false)
        return
      }
      const { error } = await signUp(email, password, fullName.trim())
      if (error) {
        setError(error)
      } else {
        setSignupSuccess(true)
      }
    }
    setLoading(false)
  }

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login")
    setError(null)
    setSignupSuccess(false)
  }

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We've sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account, then come back and sign in.
            </p>
            <p className="text-xs text-muted-foreground">
              After sign-in, we'll walk you through a short welcome setup for your name and role.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => { setSignupSuccess(false); setMode("login") }}>
            Back to Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo / Brand */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">ClubRM</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Sign in to manage your club" : "Create your account and finish setup in one welcome flow"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card text-card-foreground border border-border/50 rounded-xl p-6 space-y-6 shadow-lg shadow-black/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="bg-background/80"
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yorku.ca"
                className="bg-background/80"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="bg-background/80 pr-11"
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {mode === "login" ? "New to ClubRM?" : "Already have an account?"}
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={switchMode}>
            {mode === "login" ? "Create an Account" : "Sign In Instead"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Club Resource Manager &mdash; Built for student organizations
        </p>
      </div>
    </div>
  )
}
