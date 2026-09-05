import * as React from "react";
import { cn, formatPrice, calcDiscount } from "@/lib/utils";
import { Badge } from "./badge";

export interface PriceTagProps {
  price: number;
  mrp?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PriceTag({ price, mrp, size = "md", className }: PriceTagProps) {
  const discount = mrp && mrp > price ? calcDiscount(mrp, price) : 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span
        className={cn("font-heading font-bold text-text", {
          "text-lg": size === "sm",
          "text-2xl": size === "md",
          "text-3xl": size === "lg",
        })}
      >
        {formatPrice(price)}
      </span>
      {mrp && mrp > price && (
        <>
          <span className="text-sm text-text-light line-through">
            {formatPrice(mrp)}
          </span>
          {discount > 0 && <Badge variant="deal">Save {discount}%</Badge>}
        </>
      )}
    </div>
  );
}
