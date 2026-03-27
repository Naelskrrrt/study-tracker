"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Task } from "@/lib/data/tasks";
import SubTaskList from "./SubTaskList";

type Props = {
  task: Task;
  done: boolean;
  note?: string;
  onToggle: () => void;
  onUpdateNote: (note: string) => void;
  onSubtaskComplete?: () => void;
};

export default function TaskItem({
  task,
  done,
  note,
  onToggle,
  onUpdateNote,
  onSubtaskComplete,
}: Props) {
  const xpPerSubtask = task.subtasks
    ? Math.round(task.xp / task.subtasks.length)
    : Math.round(task.xp / 3);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(note ?? "");

  return (
    <div
      className={`mt-2 rounded-xl border p-3 transition-colors ${
        task.certif
          ? "border-amber/40 bg-amber/5"
          : "border-border/50 bg-surface2/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 flex-shrink-0">
          <motion.div
            animate={done ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            transition={{ duration: 0.35 }}
            className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
              done
                ? "border-nvidia bg-nvidia text-bg"
                : "border-muted bg-transparent"
            }`}
          >
            {done && (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </motion.div>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`text-sm font-semibold ${
                done ? "text-muted line-through" : "text-white"
              }`}
            >
              {task.name}
            </p>
            {task.certif && (
              <span className="rounded border border-amber/50 bg-amber/10 px-1.5 py-0.5 text-[10px] font-bold text-amber">
                CERTIF
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">{task.detail}</p>

          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-xs text-nvidia">
              +{task.xp} XP
            </span>
            <button
              onClick={() => setShowNote(!showNote)}
              className="text-xs text-muted hover:text-white"
            >
              {showNote ? "Fermer" : "+ Note"}
            </button>
          </div>

          {showNote && (
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onBlur={() => onUpdateNote(noteText)}
              placeholder="Ajouter une note..."
              className="mt-2 w-full rounded-lg border border-border bg-bg p-2 text-xs text-white placeholder:text-muted focus:border-nvidia focus:outline-none resize-none"
              rows={2}
            />
          )}

          {!done && (
            <SubTaskList
              taskId={task.id}
              defaultSubtasks={task.subtasks}
              xpPerSubtask={xpPerSubtask}
              onSubtaskComplete={onSubtaskComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
