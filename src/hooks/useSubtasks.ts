"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SubTask = {
  id: string;
  taskId: string;
  name: string;
  sortOrder: number;
  completed: boolean;
  completedAt: string | null;
};

export function useSubtasks(taskId: string) {
  const { data, mutate, isLoading } = useSWR<SubTask[]>(
    `/api/subtasks?taskId=${taskId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const subtasks: SubTask[] = data ?? [];
  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;

  const toggleSubtask = async (id: string, completed: boolean) => {
    // Optimistic update
    mutate(
      subtasks.map((s) =>
        s.id === id
          ? { ...s, completed, completedAt: completed ? new Date().toISOString() : null }
          : s
      ),
      false
    );

    try {
      await fetch(`/api/subtasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      mutate();
    } catch {
      mutate();
    }
  };

  const addSubtask = async (name: string) => {
    // Optimistic update with a temporary id
    const tempId = `temp-${Date.now()}`;
    const optimistic: SubTask = {
      id: tempId,
      taskId,
      name,
      sortOrder: totalCount,
      completed: false,
      completedAt: null,
    };
    mutate([...subtasks, optimistic], false);

    try {
      await fetch("/api/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, name }),
      });
      mutate();
    } catch {
      mutate();
    }
  };

  const deleteSubtask = async (id: string) => {
    // Optimistic update
    mutate(
      subtasks.filter((s) => s.id !== id),
      false
    );

    try {
      await fetch(`/api/subtasks/${id}`, { method: "DELETE" });
      mutate();
    } catch {
      mutate();
    }
  };

  return {
    subtasks,
    completedCount,
    totalCount,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    isLoading,
    mutate,
  };
}
