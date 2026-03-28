"use client";

import { getLast7Days } from "@/lib/utils/streak";

type Props = {
  streak: number;
  activeDates: Set<string>;
};

export default function StreakCard({ streak, activeDates }: Props) {
  const last7 = getLast7Days();

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flame-pulse text-3xl">🔥</span>
        <div>
          <p className="font-mono text-xl font-bold text-coral">
            {streak} jour{streak !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted">Streak actuelle</p>
        </div>
      </div>

      <div className="mt-3 flex justify-between">
        {last7.map((date) => {
          const active = activeDates.has(date);
          const dayLabel = new Date(date + "T00:00:00").toLocaleDateString(
            "fr-FR",
            { weekday: "narrow" }
          );
          return (
            <div key={date} className="flex flex-col items-center gap-1">
              <div
                className={`h-4 w-4 rounded-full ${
                  active ? "bg-coral" : "bg-surface2"
                }`}
              />
              <span className="text-[9px] text-muted">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
