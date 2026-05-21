import { cn } from "@/lib/utils"

interface SocialBadgeProps {
  value: string | null
  icon: React.ReactNode
  color: string
}

export function SocialBadge({ value, icon, color }: SocialBadgeProps) {
  if (!value) return null
  return (
    <span className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50", color)}>
      {icon} {value}
    </span>
  )
}
