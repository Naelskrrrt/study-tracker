"use client";

import useSWR from "swr";
import { PHASES, LEVELS } from "@/lib/data/tasks";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Completion = {
  taskId: string;
  xpEarned: number;
  note?: string;
  completedAt?: string;
};

export function useProgress() {
  const { data, mutate, isLoading } = useSWR<Completion[]>(
    "/api/progress",
    fetcher,
    { revalidateOnFocus: false }
  );

  const completions: Completion[] = Array.isArray(data) ? data : [];
  const completedIds = new Set(completions.map((c) => c.taskId));

  const allTasks = PHASES.flatMap((p) => p.tasks);

  const totalXP = allTasks
    .filter((t) => completedIds.has(t.id))
    .reduce((sum, t) => sum + t.xp, 0);

  const currentLevel = LEVELS.reduce(
    (acc, lv) => (totalXP >= lv.min ? lv : acc),
    LEVELS[0]
  );

  const toggleTask = async (
    taskId: string,
    xpEarned: number,
    taskName: string
  ) => {
    const isDone = completedIds.has(taskId);

    mutate(
      isDone
        ? completions.filter((c) => c.taskId !== taskId)
        : [...completions, { taskId, xpEarned }],
      false
    );

    try {
      if (isDone) {
        await fetch("/api/progress", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
      } else {
        await Promise.all([
          fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId, xpEarned }),
          }),
          fetch("/api/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ xpEarned, taskName }),
          }),
        ]);
      }
    } catch {
      mutate();
    }
  };

  const updateNote = async (taskId: string, note: string) => {
    await fetch(`/api/progress/${taskId}/note`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    mutate();
  };

  const doneCount = completedIds.size;
  const totalCount = allTasks.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const certifCount = allTasks.filter(
    (t) => t.certif && completedIds.has(t.id)
  ).length;

  return {
    completedIds,
    completions,
    totalXP,
    currentLevel,
    doneCount,
    totalCount,
    pct,
    certifCount,
    toggleTask,
    updateNote,
    isLoading,
  };
}
