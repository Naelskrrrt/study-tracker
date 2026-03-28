"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type WeekData = {
  week: string;
  green: number;
  purple: number;
  amber: number;
  other: number;
};

type Props = {
  weeks: WeekData[];
  totalHours: number;
};

export default function StudyTimeChart({ weeks, totalHours }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Temps d'étude (8 sem.)</h3>
        <span className="font-mono text-sm font-bold text-nvidia">
          {totalHours}h total
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={weeks}>
          <CartesianGrid stroke="#2a2a4a" strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            tick={{ fill: "#7070a0", fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: "#7070a0", fontSize: 10 }}
            label={{
              value: "heures",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#7070a0", fontSize: 10 },
            }}
          />
          <Tooltip
            contentStyle={{
              background: "#13132a",
              border: "1px solid #2a2a4a",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                green: "Phase 1",
                purple: "Phase 2",
                amber: "Phase 3",
                other: "Autre",
              };
              return [`${value}h`, labels[name] ?? name];
            }}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                green: "P1",
                purple: "P2",
                amber: "P3",
                other: "Autre",
              };
              return labels[value] ?? value;
            }}
            wrapperStyle={{ fontSize: 10 }}
          />
          <Bar dataKey="green" stackId="a" fill="#76b900" />
          <Bar dataKey="purple" stackId="a" fill="#6c63ff" />
          <Bar dataKey="amber" stackId="a" fill="#ffd60a" />
          <Bar dataKey="other" stackId="a" fill="#555" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
