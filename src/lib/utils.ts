import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function getEntityColor(name: string): string {
  const colors = [
    "bg-rose-500/20 text-rose-400",
    "bg-orange-500/20 text-orange-400",
    "bg-amber-500/20 text-amber-400",
    "bg-emerald-500/20 text-emerald-400",
    "bg-cyan-500/20 text-cyan-400",
    "bg-blue-500/20 text-blue-400",
    "bg-violet-500/20 text-violet-400",
    "bg-pink-500/20 text-pink-400",
  ]
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return colors[idx % colors.length]
}
