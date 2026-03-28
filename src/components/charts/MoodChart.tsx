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
import { MOODS } from "@/lib/data/tasks";

type MoodEntry = {
  date: string;
  moodLevel: number;
};

type Props = {
  entries: MoodEntry[];
};

const EMOJI_MAP = Object.fromEntries(MOODS.map((m) => [m.level, m.emoji]));

export default function MoodChart({ entries }: Props) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const data = sorted.map((e) => ({
    date: new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    }),
    mood: e.moodLevel,
  }));

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-bold text-white">Humeur (30j)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid stroke="#2a2a4a" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#7070a0", fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tickFormatter={(v: number) => EMOJI_MAP[v] ?? String(v)}
            tick={{ fontSize: 14 }}
          />
          <Tooltip
            contentStyle={{
              background: "#13132a",
              border: "1px solid #2a2a4a",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [
              `${EMOJI_MAP[value as number] ?? value} (${value}/5)`,
              "Humeur",
            ]}
          />
          <Line
            type="monotone"
            dataKey="mood"
            stroke="#f472b6"
            strokeWidth={2}
            dot={{ fill: "#f472b6", r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
