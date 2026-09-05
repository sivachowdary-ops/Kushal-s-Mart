"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export interface Column<T> {
  accessor: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({ data, columns, onRowClick, className, emptyMessage = "No data available." }: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = React.useState<{ key: keyof T | string; direction: "asc" | "desc" } | null>(null);

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    return [...data].sort((a: any, b: any) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (key: keyof T | string) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        return null;
      }
      return { key, direction: "asc" };
    });
  };

  return (
    <div className={cn("w-full overflow-x-auto rounded-xl border border-border bg-white", className)}>
      <table className="w-full text-left text-sm text-text">
        <thead className="bg-surface text-xs uppercase text-text-muted border-b border-border">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.accessor)}
                className={cn("px-4 py-3 font-medium", col.sortable && "cursor-pointer hover:bg-surface transition-colors")}
                onClick={() => col.sortable && handleSort(col.accessor)}
              >
                <div className="flex items-center gap-2">
                  {col.header}
                  {col.sortable && (
                    <span className="text-text-muted">
                      {sortConfig?.key === col.accessor ? (
                        sortConfig.direction === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border/50 transition-colors hover:bg-surface/50",
                  onRowClick && "cursor-pointer",
                  i % 2 === 0 ? "bg-white" : "bg-surface/50"
                )}
              >
                {columns.map((col, j) => (
                  <td key={j} className="px-4 py-3">
                    {col.render ? col.render(row) : String((row as any)[col.accessor] || "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
