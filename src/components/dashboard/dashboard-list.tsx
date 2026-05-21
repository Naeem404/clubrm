"use client";

import { cn } from "@/lib/utils";

interface ListItemProps {
  title: string;
  subtitle?: string;
  metadata?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DashboardListItem({
  title,
  subtitle,
  metadata,
  icon,
  action,
  onClick,
  className,
}: ListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {icon && (
        <div className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
      </div>
      {metadata && (
        <div className="text-xs font-mono text-muted-foreground whitespace-nowrap">
          {metadata}
        </div>
      )}
      {action && (
        <div className="ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  );
}

export function DashboardList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-1", className)}>{children}</div>;
}
