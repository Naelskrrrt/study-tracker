"use client";

import { motion } from "framer-motion";
import { LEVELS, TOTAL_XP } from "@/lib/data/tasks";

type Props = {
  totalXP: number;
  currentLevel: { id: string; label: string; min: number };
};

export default function XPBar({ totalXP, currentLevel }: Props) {
  const pct = Math.min((totalXP / TOTAL_XP) * 100, 100);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-sm text-nvidia">
          {totalXP} / {TOTAL_XP} XP
        </span>
        <span className="font-mono text-sm text-amber">
          {currentLevel.label}
        </span>
      </div>

      <div className="relative h-[13px] overflow-hidden rounded-full bg-surface2">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-nvidia3 via-nvidia to-nvidia2"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{
            duration: 1.2,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        />
        <div className="absolute inset-0 xp-bar-shine rounded-full" />
      </div>

      <div className="mt-3 flex justify-between">
        {LEVELS.map((lv) => {
          const earned = totalXP >= lv.min;
          const isCurrent = lv.id === currentLevel.id;
          return (
            <div key={lv.id} className="flex flex-col items-center gap-1">
              <div
                className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ${
                  earned
                    ? "border-nvidia bg-nvidia/20 text-nvidia"
                    : isCurrent
                      ? "border-amber bg-amber/20 text-amber animate-pulse"
                      : "border-border bg-surface2 text-muted"
                }`}
              >
                {LEVELS.indexOf(lv) + 1}
              </div>
              <span className="text-[9px] text-muted">{lv.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
