"use client";

import { PHASES } from "@/lib/data/tasks";
import { motion } from "framer-motion";
import { useTimer } from "@/hooks/useTimer";

type Props = {
  completedIds: Set<string>;
  onComplete: (taskId: string, xp: number, name: string) => void;
};

export default function FocusCard({ completedIds, onComplete }: Props) {
  const timer = useTimer();
  const allTasks = PHASES.flatMap((p) => p.tasks);
  const nextTask = allTasks.find((t) => !completedIds.has(t.id));

  if (!nextTask) {
    return (
      <div className="rounded-2xl border border-nvidia bg-surface p-5 text-center">
        <p className="text-lg font-bold text-nvidia">
          Toutes les tâches sont terminées ! 🎉
        </p>
      </div>
    );
  }

  const nextAfter = allTasks.find(
    (t) => !completedIds.has(t.id) && t.id !== nextTask.id
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
        Focus du moment
      </p>
      <p className="text-base font-bold text-white">{nextTask.name}</p>
      <p className="mt-1 text-xs text-muted">{nextTask.detail}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onComplete(nextTask.id, nextTask.xp, nextTask.name)}
          className="rounded-lg bg-nvidia px-4 py-2 text-sm font-bold text-bg transition-transform hover:scale-105 active:scale-95"
        >
          C&apos;est fait ! +{nextTask.xp} XP
        </button>
        {!timer.isRunning && (
          <button
            onClick={() => timer.start(nextTask.id, nextTask.name)}
            className="rounded-lg border border-nvidia/50 bg-surface2 px-4 py-2 text-sm font-semibold text-nvidia transition-colors hover:bg-nvidia/10"
          >
            ▶ Flow
          </button>
        )}
        {nextAfter && (
          <button
            onClick={() =>
              onComplete(nextAfter.id, nextAfter.xp, nextAfter.name)
            }
            className="rounded-lg border border-border bg-surface2 px-4 py-2 text-sm text-muted transition-colors hover:text-white"
          >
            Suivante →
          </button>
        )}
      </div>
    </motion.div>
  );
}
