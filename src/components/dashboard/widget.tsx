import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WidgetProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  footer?: React.ReactNode;
}

export function Widget({
  title,
  children,
  className,
  fullWidth = false,
  footer,
}: WidgetProps) {
  return (
    <Card className={cn(
      "bg-card border-border overflow-hidden flex flex-col h-full",
      fullWidth ? "col-span-1 md:col-span-2" : "col-span-1",
      className
    )}>
      <CardHeader className="py-4 px-6 border-b border-border/50">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex-1">
        {children}
      </CardContent>
      {footer && (
        <div className="px-6 py-3 border-t border-border/50 bg-muted/30 text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </Card>
  );
}
