"use client";

import { formatDateFR } from "@/lib/utils/dates";

const COLORS_MAP: Record<string, string> = {
  green: "#76b900",
  purple: "#6c63ff",
  amber: "#ffd60a",
};

type PhasePrediction = {
  id: string;
  name: string;
  color: string;
  done: number;
  total: number;
  pct: number;
  estimatedDate: string | null;
  isComplete: boolean;
};

type Props = {
  phases: PhasePrediction[];
};

export default function PredictionBars({ phases }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-bold text-white">
        Prédiction de fin par phase
      </h3>
      <div className="space-y-4">
        {phases.map((phase) => (
          <div key={phase.id}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-white">
                {phase.name}
              </span>
              <span className="text-xs text-muted">
                {phase.isComplete
                  ? "Terminée"
                  : phase.estimatedDate
                    ? `~ ${formatDateFR(phase.estimatedDate)}`
                    : "Pas assez de données"}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${phase.pct}%`,
                  backgroundColor: COLORS_MAP[phase.color] ?? "#76b900",
                }}
              />
            </div>
            <p className="mt-0.5 text-[10px] text-muted">
              {phase.done}/{phase.total} tâches ({phase.pct}%)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
