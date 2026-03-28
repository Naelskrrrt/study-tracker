"use client";

import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { MOODS } from "@/lib/data/tasks";

const EMOJI_MAP = Object.fromEntries(MOODS.map((m) => [m.level, m.emoji]));

type Props = {
  points: { mood: number; xp: number }[];
  insight: string;
};

export default function CorrelationChart({ points, insight }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-1 text-sm font-bold text-white">Corrélation mood / productivité</h3>
      <p className="mb-3 text-xs text-muted italic">{insight}</p>
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart>
          <CartesianGrid stroke="#2a2a4a" strokeDasharray="3 3" />
          <XAxis dataKey="mood" type="number" domain={[1, 5]} ticks={[1, 2, 3, 4, 5]}
            tickFormatter={(v: number) => EMOJI_MAP[v] ?? String(v)} tick={{ fontSize: 14 }} name="Mood" />
          <YAxis dataKey="xp" type="number" tick={{ fill: "#7070a0", fontSize: 10 }} name="XP" />
          <Tooltip contentStyle={{ background: "#13132a", border: "1px solid #2a2a4a", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name: string) => [
              name === "Mood" ? `${EMOJI_MAP[value] ?? value} (${value}/5)` : `${value} XP`, name,
            ]} />
          <Scatter data={points} fill="#76b900" fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
