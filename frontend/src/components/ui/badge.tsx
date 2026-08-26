import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[2px] border border-[#262626] bg-[#121212] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa]",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
