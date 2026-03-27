"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubtasks } from "@/hooks/useSubtasks";

type Props = {
  taskId: string;
  defaultSubtasks?: string[];
  xpPerSubtask: number;
  onSubtaskComplete?: () => void;
};

export default function SubTaskList({
  taskId,
  defaultSubtasks,
  xpPerSubtask,
  onSubtaskComplete,
}: Props) {
  const { subtasks, completedCount, totalCount, toggleSubtask, addSubtask, deleteSubtask, isLoading } =
    useSubtasks(taskId);

  const seededRef = useRef(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // Seed default subtasks on first load if none exist
  useEffect(() => {
    if (
      seededRef.current ||
      isLoading ||
      !defaultSubtasks ||
      defaultSubtasks.length === 0 ||
      subtasks.length > 0
    ) {
      return;
    }
    seededRef.current = true;

    const seedAll = async () => {
      for (const name of defaultSubtasks) {
        await fetch("/api/subtasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, name }),
        });
      }
      // Trigger revalidation after all seeds
      // The hook's mutate will be called automatically via SWR revalidation
    };
    seedAll();
  }, [isLoading, subtasks.length, defaultSubtasks, taskId]);

  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = async (id: string, completed: boolean) => {
    await toggleSubtask(id, !completed);
    if (!completed && onSubtaskComplete) {
      onSubtaskComplete();
    }
  };

  const handleAddKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newName.trim()) {
      setAdding(true);
      await addSubtask(newName.trim());
      setNewName("");
      setAdding(false);
    }
  };

  if (isLoading && subtasks.length === 0) {
    return (
      <div className="mt-3 text-xs text-muted/60 italic">
        Chargement des sous-tâches...
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {/* Mini progress bar */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-surface2 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-nvidia"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted shrink-0">
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Subtask list */}
      <AnimatePresence initial={false}>
        {subtasks.map((st) => (
          <motion.div
            key={st.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 group"
          >
            <button
              onClick={() => handleToggle(st.id, st.completed)}
              className="shrink-0"
              aria-label={st.completed ? "Marquer incomplet" : "Marquer complet"}
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                  st.completed
                    ? "border-nvidia bg-nvidia text-bg"
                    : "border-muted/60 bg-transparent hover:border-nvidia"
                }`}
              >
                {st.completed && (
                  <svg
                    className="h-2.5 w-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </button>

            <span
              className={`flex-1 text-xs transition-colors ${
                st.completed ? "text-muted line-through" : "text-white/80"
              }`}
            >
              {st.name}
            </span>

            <span className="text-[10px] font-mono text-nvidia/60 shrink-0">
              +{xpPerSubtask} XP
            </span>

            <button
              onClick={() => deleteSubtask(st.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-400 text-xs leading-none"
              aria-label="Supprimer"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add subtask input */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-muted/50 text-xs shrink-0">+</span>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleAddKeyDown}
          placeholder="Ajouter une sous-tâche..."
          disabled={adding}
          className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-muted/40 border-b border-transparent focus:border-muted/40 focus:outline-none transition-colors py-0.5 disabled:opacity-40"
        />
      </div>
    </div>
  );
}
