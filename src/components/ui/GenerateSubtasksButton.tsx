"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  taskId: string;
  onConfirm: (subtasks: string[]) => Promise<void>;
};

export default function GenerateSubtasksButton({ taskId, onConfirm }: Props) {
  const [state, setState] = useState<
    "idle" | "loading" | "preview" | "confirming"
  >("idle");
  const [generated, setGenerated] = useState<string[]>([]);

  const handleGenerate = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/subtasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setGenerated(data.subtasks);
      setState("preview");
    } catch {
      setState("idle");
    }
  };

  const handleDelete = (index: number) => {
    setGenerated((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEdit = (index: number, value: string) => {
    setGenerated((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const handleConfirm = async () => {
    setState("confirming");
    await onConfirm(generated.filter((s) => s.trim()));
    setState("idle");
    setGenerated([]);
  };

  const handleCancel = () => {
    setState("idle");
    setGenerated([]);
  };

  if (state === "idle") {
    return (
      <button
        onClick={handleGenerate}
        className="mt-2 flex items-center gap-1.5 text-xs text-nvidia/70 transition-colors hover:text-nvidia"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
        Decomposer avec l'IA
      </button>
    );
  }

  if (state === "loading") {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted/60 italic">
        <div className="h-3 w-3 animate-spin rounded-full border border-nvidia border-t-transparent" />
        L'IA reflechit...
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 space-y-2 rounded-xl border border-nvidia/20 bg-nvidia/5 p-3"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-nvidia/60">
          Sous-taches suggerees
        </p>
        {generated.map((subtask, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={subtask}
              onChange={(e) => handleEdit(i, e.target.value)}
              className="flex-1 rounded bg-transparent text-xs text-white/80 border-b border-muted/20 focus:border-nvidia/40 focus:outline-none py-0.5"
            />
            <button
              onClick={() => handleDelete(i)}
              className="text-xs text-muted hover:text-red-400 transition-colors"
            >
              x
            </button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirm}
            disabled={state === "confirming" || generated.length === 0}
            className="rounded-lg bg-nvidia px-3 py-1 text-xs font-bold text-bg transition-transform hover:scale-105 disabled:opacity-40"
          >
            {state === "confirming" ? "..." : "Confirmer"}
          </button>
          <button
            onClick={handleCancel}
            disabled={state === "confirming"}
            className="rounded-lg border border-muted/30 px-3 py-1 text-xs text-muted hover:text-white transition-colors disabled:opacity-40"
          >
            Annuler
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
