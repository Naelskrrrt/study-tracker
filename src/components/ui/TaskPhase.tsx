"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Phase } from "@/lib/data/tasks";
import TaskItem from "./TaskItem";

const PHASE_COLORS = {
  green: { border: "border-nvidia", bg: "bg-nvidia", text: "text-nvidia" },
  purple: { border: "border-purple", bg: "bg-purple", text: "text-purple" },
  amber: { border: "border-amber", bg: "bg-amber", text: "text-amber" },
} as const;

type Props = {
  phase: Phase;
  completedIds: Set<string>;
  completions: Array<{ taskId: string; note?: string }>;
  onToggle: (taskId: string, xp: number, name: string) => void;
  onUpdateNote: (taskId: string, note: string) => void;
};

export default function TaskPhase({
  phase,
  completedIds,
  completions,
  onToggle,
  onUpdateNote,
}: Props) {
  const [open, setOpen] = useState(false);
  const colors = PHASE_COLORS[phase.color];
  const done = phase.tasks.filter((t) => completedIds.has(t.id)).length;
  const total = phase.tasks.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className={`rounded-2xl border ${colors.border}/30 bg-surface overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors.bg}/20 font-mono text-xs font-bold ${colors.text}`}
          >
            {phase.num}
          </span>
          <div>
            <p className="text-sm font-bold text-white">{phase.name}</p>
            <p className="text-xs text-muted">{phase.duration}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted">
            {done}/{total}
          </span>
          <span
            className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </div>
      </button>

      <div className="mx-4 mb-2 h-1.5 overflow-hidden rounded-full bg-surface2">
        <motion.div
          className={`h-full rounded-full ${colors.bg}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-2">
              {phase.tasks.map((task) => {
                const completion = completions.find(
                  (c) => c.taskId === task.id
                );
                return (
                  <TaskItem
                    key={task.id}
                    task={task}
                    done={completedIds.has(task.id)}
                    note={completion?.note}
                    onToggle={() => onToggle(task.id, task.xp, task.name)}
                    onUpdateNote={(note) => onUpdateNote(task.id, note)}
                    onSubtaskComplete={() => {}}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
