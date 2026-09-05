import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "line" | "circle" | "card" | "product-card";
}

export function Skeleton({ className, variant = "line", ...props }: SkeletonProps) {
  if (variant === "product-card") {
    return (
      <div className={cn("flex flex-col gap-3 rounded-xl border border-border bg-white p-4", className)} {...props}>
        <div className="h-48 w-full animate-shimmer rounded-lg bg-surface-alt" />
        <div className="h-5 w-2/3 animate-shimmer rounded bg-surface-alt" />
        <div className="h-4 w-1/3 animate-shimmer rounded bg-surface-alt" />
        <div className="mt-2 h-8 w-full animate-shimmer rounded-lg bg-surface-alt" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "animate-shimmer bg-surface-alt",
        {
          "h-4 w-full rounded": variant === "line",
          "h-12 w-12 rounded-full": variant === "circle",
          "h-32 w-full rounded-xl": variant === "card",
        },
        className
      )}
      {...props}
    />
  );
}
