"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useProgress } from "@/hooks/useProgress";
import { PHASES } from "@/lib/data/tasks";
import TaskPhase from "@/components/ui/TaskPhase";
import Confetti from "@/components/ui/Confetti";
import Toast from "@/components/ui/Toast";

export default function TasksPage() {
  const {
    completedIds,
    completions,
    toggleTask,
    updateNote,
    isLoading,
  } = useProgress();

  const [confettiActive, setConfettiActive] = useState(false);
  const [confettiCount, setConfettiCount] = useState(20);
  const [toast, setToast] = useState({ visible: false, message: "" });

  const handleToggle = useCallback(
    async (taskId: string, xp: number, name: string) => {
      const wasDone = completedIds.has(taskId);
      await toggleTask(taskId, xp, name);

      if (!wasDone) {
        const isCertif = name.startsWith("✦");
        setConfettiCount(isCertif ? 80 : 20);
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 100);
        setToast({ visible: true, message: `+${xp} XP — ${name}` });
      }
    },
    [completedIds, toggleTask]
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nvidia border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Tâches</h1>
        <Link
          href="/dashboard/resources"
          className="text-xs text-muted hover:text-white transition-colors"
        >
          📖 Toutes les ressources →
        </Link>
      </div>

      {PHASES.map((phase) => (
        <TaskPhase
          key={phase.id}
          phase={phase}
          completedIds={completedIds}
          completions={completions}
          onToggle={handleToggle}
          onUpdateNote={updateNote}
        />
      ))}

      <Confetti active={confettiActive} count={confettiCount} />
      <Toast
        message={toast.message}
        visible={toast.visible}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  );
}
