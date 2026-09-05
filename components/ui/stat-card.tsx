import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-muted">{label}</p>
          <h3 className="mt-2 text-3xl font-heading font-bold text-text">{value}</h3>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1 text-sm">
          {trend.isPositive ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-danger" />
          )}
          <span className={trend.isPositive ? "text-success" : "text-danger"}>
            {trend.value}%
          </span>
          <span className="text-text-muted">vs last month</span>
        </div>
      )}
    </div>
  );
}
