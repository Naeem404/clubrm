"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  subLabel?: string;
  className?: string;
  color?: "default" | "pink" | "emerald" | "amber" | "destructive";
}

export function ProgressBar({
  value,
  max = 100,
  label,
  subLabel,
  className,
  color = "default",
}: ProgressBarProps) {
  // Calculate percentage safely
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  // Animated width state
  const [animatedWidth, setAnimatedWidth] = useState(0);

  // Animate when component loads
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedWidth(percentage);
    }, 150);

    return () => clearTimeout(timer);
  }, [percentage]);

  const colorMap = {
    default: "bg-primary",
    pink: "bg-primary",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    destructive: "bg-destructive",
  };

 return (
    <div className={cn("space-y-2", className)}>
      {/* Label Row */}
      <div className="flex justify-between items-end">
        {label && <span className="text-sm font-medium">{label}</span>}
        {subLabel && (
          <span className="text-xs text-muted-foreground">{subLabel}</span>
        )}
      </div>

      {/* Background bar */}
      <div className="h-3 w-full bg-muted rounded-full overflow-hidden shadow-inner flex">
        {/* Animated bar */}
        <div
          className={cn(
            "h-full transition-all duration-1000 ease-out rounded-full",
            colorMap[color as keyof typeof colorMap]
          )}
          style={{ width: `${animatedWidth}%` }}
        />
      </div>
    </div>
  );
}
