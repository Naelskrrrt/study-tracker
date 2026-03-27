"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCaptures } from "@/hooks/useCaptures";

export default function BrainDump() {
  const [open, setOpen] = useState(false);
  const { captures, archiveCapture, deleteCapture } = useCaptures();

  if (captures.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-surface overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/10 font-mono text-base">
            🧠
          </span>
          <div>
            <p className="text-sm font-bold text-white">Brain Dump</p>
            <p className="text-xs text-muted">Pensées capturées</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-nvidia/20 px-1.5 font-mono text-xs font-bold text-nvidia">
            {captures.length}
          </span>
          <span
            className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-2 space-y-2">
              {captures.map((capture) => (
                <motion.div
                  key={capture.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-start gap-2 rounded-lg border border-border bg-bg px-3 py-2"
                >
                  <p className="flex-1 text-sm text-white/90 whitespace-pre-wrap break-words">
                    {capture.content}
                  </p>
                  <div className="flex shrink-0 items-center gap-1 pt-0.5">
                    <button
                      onClick={() => archiveCapture(capture.id)}
                      title="Archiver"
                      className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-nvidia/20 hover:text-nvidia text-xs"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => deleteCapture(capture.id)}
                      title="Supprimer"
                      className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-red-500/20 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
