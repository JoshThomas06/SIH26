import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-card px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
