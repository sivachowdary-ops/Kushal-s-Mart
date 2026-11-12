"use client";

import { CalendarDays } from "lucide-react";
import { DATE_PRESET_LABELS, describeDateRange, resolveDateRange, toDateKey, type DateFilter, type DatePreset } from "@/lib/date-range";

/** Quick date buttons plus a From/To calendar for any range. */
export function DateRangeFilter({
  value,
  onChange,
  presets,
}: {
  value: DateFilter;
  onChange: (next: DateFilter) => void;
  presets: DatePreset[];
}) {
  const today = toDateKey(new Date());
  const range = resolveDateRange(value);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
        {presets.map((preset) => {
          const active = value.preset === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() =>
                // Custom starts on today so the calendar opens somewhere sensible
                onChange(preset === "custom" ? { preset, from: value.from || today, to: value.to || today } : { ...value, preset })
              }
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {preset === "custom" && <CalendarDays className="h-4 w-4" />}
              {DATE_PRESET_LABELS[preset]}
            </button>
          );
        })}
      </div>

      {value.preset === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-slate-600">
            From
            <input
              type="date"
              value={value.from}
              max={today}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            To
            <input
              type="date"
              value={value.to}
              max={today}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <p className="pb-2 text-sm font-semibold text-slate-700">{describeDateRange(range)}</p>
        </div>
      )}
    </div>
  );
}
