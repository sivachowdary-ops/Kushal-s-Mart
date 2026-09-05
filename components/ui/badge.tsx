import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "deal" | "new" | "low-stock" | "out-of-stock" | "success" | "info";
}

export function Badge({ className, variant = "info", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        {
          "bg-primary text-white": variant === "deal" || variant === "new",
          "bg-warning/10 text-warning border border-warning/20": variant === "low-stock",
          "bg-danger/10 text-danger border border-danger/20": variant === "out-of-stock",
          "bg-success/10 text-success": variant === "success",
          "bg-surface text-text-muted": variant === "info",
        },
        className
      )}
      {...props}
    />
  );
}
