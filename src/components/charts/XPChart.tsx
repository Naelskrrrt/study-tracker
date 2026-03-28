"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type ActivityDay = {
  date: string;
  xpEarned: number;
};

type Props = {
  activities: ActivityDay[];
};

export default function XPChart({ activities }: Props) {
  // Build cumulative XP over last 30 days
  const now = new Date();
  const days: { date: string; xp: number }[] = [];
  const actMap = new Map(activities.map((a) => [a.date, a.xpEarned]));

  let cumulative = 0;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    cumulative += actMap.get(dateStr) ?? 0;
    days.push({
      date: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      xp: cumulative,
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-bold text-white">XP cumulé (30j)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={days}>
          <CartesianGrid stroke="#2a2a4a" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#7070a0", fontSize: 10 }}
            interval="preserveStartEnd"
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
          <Line
            type="monotone"
            dataKey="xp"
            stroke="#76b900"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
