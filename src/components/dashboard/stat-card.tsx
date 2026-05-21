"use client";

import { cn } from "@/lib/utils";
import { Widget } from "./widget";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label: string;
    inverse?: boolean; // if true, higher is worse (e.g. expenses)
  };
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  className,
}: StatCardProps) {
  const isPositive = trend && trend.value > 0;
  const isNegative = trend && trend.value < 0;
  const isNeutral = !trend || trend.value === 0;

  const trendColor = trend?.inverse
    ? (isPositive ? "text-destructive" : isNegative ? "text-emerald-500" : "text-muted-foreground")
    : (isPositive ? "text-emerald-500" : isNegative ? "text-destructive" : "text-muted-foreground");

  return (
    <Widget title={title} className={cn("hover:border-primary/50 transition-colors", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          {trend && (
            <div className={cn("flex items-center text-sm font-medium", trendColor)}>
              {isPositive && <ArrowUpRight className="mr-1 h-4 w-4" />}
              {isNegative && <ArrowDownRight className="mr-1 h-4 w-4" />}
              {isNeutral && <Minus className="mr-1 h-4 w-4" />}
              <span>{Math.abs(trend.value)}%</span>
              <span className="ml-1 text-muted-foreground font-normal">{trend.label}</span>
            </div>
          )}
          {description && !trend && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
        )}
      </div>
    </Widget>
  );
}
