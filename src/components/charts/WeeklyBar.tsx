"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type ActivityDay = {
  date: string;
  count: number;
};

type Props = {
  activities: ActivityDay[];
};

export default function WeeklyBar({ activities }: Props) {
  // Group by week for last 8 weeks
  const now = new Date();
  const weeks: { week: string; count: number }[] = [];

  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startStr = weekStart.toISOString().slice(0, 10);
    const endStr = weekEnd.toISOString().slice(0, 10);

    const count = activities
      .filter((a) => a.date >= startStr && a.date <= endStr)
      .reduce((s, a) => s + a.count, 0);

    weeks.push({
      week: weekStart.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      count,
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-bold text-white">
        Activités (8 semaines)
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={weeks}>
          <CartesianGrid stroke="#2a2a4a" strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            tick={{ fill: "#7070a0", fontSize: 10 }}
          />
          <YAxis tick={{ fill: "#7070a0", fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: "#13132a",
              border: "1px solid #2a2a4a",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" fill="#6c63ff" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
