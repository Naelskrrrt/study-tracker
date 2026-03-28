"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PHASES } from "@/lib/data/tasks";

const COLORS_MAP = {
  green: "#76b900",
  purple: "#6c63ff",
  amber: "#ffd60a",
};

type Props = {
  completedIds: Set<string>;
};

export default function PhasesDonut({ completedIds }: Props) {
  const data = PHASES.map((p) => ({
    name: p.name,
    done: p.tasks.filter((t) => completedIds.has(t.id)).length,
    total: p.tasks.length,
    color: COLORS_MAP[p.color],
  }));

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-bold text-white">Phases</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="done"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#13132a",
              border: "1px solid #2a2a4a",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, _name, props) =>
              [`${value}/${(props as { payload: { total: number } }).payload.total}`, "Terminé"]
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-[10px] text-muted">
              {d.done}/{d.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
