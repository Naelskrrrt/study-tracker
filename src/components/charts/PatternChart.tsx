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

type DayPattern = {
  day: string;
  avgXP: number;
};

type Props = {
  days: DayPattern[];
  insight: string;
};

export default function PatternChart({ days, insight }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-1 text-sm font-bold text-white">
        Patterns par jour
      </h3>
      <p className="mb-3 text-xs text-muted italic">{insight}</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={days}>
          <CartesianGrid stroke="#2a2a4a" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
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
            formatter={(value: unknown) => [`${Number(value)} XP`, "XP moyen"]}
          />
          <Bar dataKey="avgXP" fill="#f472b6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
