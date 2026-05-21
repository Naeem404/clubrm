"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";

interface ExpandableTileProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  insightPanel: React.ReactNode;
  className?: string;
}

export function ExpandableTile({
  children,
  title,
  subtitle,
  insightPanel,
  className,
}: ExpandableTileProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "relative group cursor-pointer",
          className
        )}
        onClick={() => setOpen(true)}
      >
        {children}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="p-1.5 rounded-md bg-muted/80 backdrop-blur-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
            <Maximize2 className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{title}</DialogTitle>
            {subtitle && (
              <DialogDescription>{subtitle}</DialogDescription>
            )}
          </DialogHeader>
          <div className="mt-2">{insightPanel}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
