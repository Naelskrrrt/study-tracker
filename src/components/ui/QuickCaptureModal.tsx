"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCaptures } from "@/hooks/useCaptures";

export default function QuickCaptureModal() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addCapture } = useCaptures();

  const close = useCallback(() => {
    setOpen(false);
    setValue("");
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    await addCapture(trimmed);
    setSaved(true);
    setValue("");

    setTimeout(() => {
      close();
    }, 700);
  }, [value, addCapture, close]);

  // Cmd+K / Ctrl+K to open, Escape to close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setSaved(false);
        setValue("");
      }
      if (e.key === "Escape" && open) {
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      close();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: -24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-20 z-50 w-full max-w-lg -translate-x-1/2 px-4"
          >
            <div className="rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold text-white">
                  Quick Capture
                </span>
                <kbd className="rounded-md border border-border bg-surface2 px-1.5 py-0.5 font-mono text-xs text-muted">
                  ⌘K
                </kbd>
              </div>

              {/* Body */}
              <div className="p-4">
                <AnimatePresence mode="wait">
                  {saved ? (
                    <motion.div
                      key="saved"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center py-6 text-nvidia"
                    >
                      <span className="text-2xl font-bold">Capturé !</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleTextareaKeyDown}
                        placeholder="Qu'est-ce qui te passe par la tête ?"
                        rows={3}
                        className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-white placeholder-muted outline-none focus:border-nvidia/60 focus:ring-1 focus:ring-nvidia/30 transition-colors"
                      />
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-muted">
                          Entrée pour sauvegarder · Shift+Entrée pour sauter une ligne
                        </p>
                        <button
                          onClick={handleSave}
                          disabled={!value.trim()}
                          className="rounded-lg bg-nvidia px-4 py-1.5 text-sm font-bold text-bg transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Capturer
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
