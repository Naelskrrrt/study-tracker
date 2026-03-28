"use client";

import { useMemo } from "react";

type ActivityData = {
  date: string;
  count: number;
  xpEarned: number;
  taskNames: string[];
};

type Props = {
  activityMap: Map<string, ActivityData>;
};

const LEVEL_COLORS = [
  "bg-surface2",
  "bg-nvidia3/60",
  "bg-nvidia3",
  "bg-nvidia/70",
  "bg-nvidia",
  "bg-nvidia2",
];

const MONTHS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

export default function ContribGraph({ activityMap }: Props) {
  const { cells, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: string; count: number; xp: number; tasks: string[] }[] = [];

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const activity = activityMap.get(dateStr);
      days.push({
        date: dateStr,
        count: activity?.count ?? 0,
        xp: activity?.xpEarned ?? 0,
        tasks: activity?.taskNames ?? [],
      });
    }

    // Build week columns (7 rows)
    const weeks: typeof days[] = [];
    let weekIdx = 0;
    const firstDow = new Date(days[0].date + "T00:00:00").getDay();

    // Pad first week
    const firstWeek: typeof days = [];
    for (let i = 0; i < firstDow; i++) {
      firstWeek.push({ date: "", count: -1, xp: 0, tasks: [] });
    }
    for (let i = 0; i < 7 - firstDow && weekIdx < days.length; i++) {
      firstWeek.push(days[weekIdx++]);
    }
    weeks.push(firstWeek);

    while (weekIdx < days.length) {
      const week: typeof days = [];
      for (let i = 0; i < 7 && weekIdx < days.length; i++) {
        week.push(days[weekIdx++]);
      }
      weeks.push(week);
    }

    // Month labels
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, colIdx) => {
      for (const day of week) {
        if (day.date) {
          const month = new Date(day.date + "T00:00:00").getMonth();
          if (month !== lastMonth) {
            labels.push({ label: MONTHS[month], col: colIdx });
            lastMonth = month;
          }
          break;
        }
      }
    });

    return { cells: weeks, monthLabels: labels };
  }, [activityMap]);

  const maxCount = Math.max(
    1,
    ...Array.from(activityMap.values()).map((a) => a.count)
  );

  function getLevel(count: number): number {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    const ratio = count / maxCount;
    if (ratio < 0.25) return 2;
    if (ratio < 0.5) return 3;
    if (ratio < 0.75) return 4;
    return 5;
  }

  return (
    <div className="overflow-x-auto">
      <div className="relative min-w-[700px]">
        {/* Month labels */}
        <div className="flex pl-8 mb-1">
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="text-[10px] text-muted absolute"
              style={{ left: `${32 + m.col * 13}px` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex gap-0 mt-4">
          {/* Day labels */}
          <div className="flex flex-col gap-[2px] pr-1 pt-0">
            {["", "Lun", "", "Mer", "", "Ven", ""].map((d, i) => (
              <div
                key={i}
                className="h-[11px] text-[9px] leading-[11px] text-muted"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[2px]">
            {cells.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`h-[11px] w-[11px] rounded-[2px] ${
                      day.count === -1
                        ? "bg-transparent"
                        : LEVEL_COLORS[getLevel(day.count)]
                    }`}
                    title={
                      day.date
                        ? `${day.date} · ${day.count} activité(s) · ${day.xp} XP`
                        : ""
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
