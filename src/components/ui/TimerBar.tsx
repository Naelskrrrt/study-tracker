"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTimer } from "@/hooks/useTimer";

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export default function TimerBar() {
  const timer = useTimer();

  const isHyperfocus = timer.isRunning && timer.elapsedSec >= 7200;
  const nudgeMin = Math.floor(timer.elapsedSec / 60);

  return (
    <>
      {/* Nudge modal overlay */}
      <AnimatePresence>
        {timer.showNudge && (
          <motion.div
            key="nudge-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            >
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
                Check-in
              </p>
              <p className="mb-5 text-base font-bold text-white">
                Tu tournes depuis {nudgeMin}min — pause ?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={timer.pause}
                  className="flex-1 rounded-lg bg-coral px-4 py-2 text-sm font-bold text-bg transition-transform hover:scale-105 active:scale-95"
                >
                  Pause
                </button>
                <button
                  onClick={timer.dismissNudge}
                  className="flex-1 rounded-lg border border-border bg-surface2 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-border"
                >
                  Continuer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer bar */}
      <AnimatePresence mode="wait">
        {!timer.isRunning ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mb-5 flex items-center justify-between rounded-2xl border border-border bg-surface px-5 py-3"
          >
            <p className="text-sm text-muted">Aucune session en cours</p>
            <button
              onClick={() => timer.start()}
              className="rounded-lg bg-nvidia px-4 py-2 text-sm font-bold text-bg transition-transform hover:scale-105 active:scale-95"
            >
              ▶ Start Flow
            </button>
          </motion.div>
        ) : timer.isPaused ? (
          <motion.div
            key="paused"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mb-5 flex items-center justify-between rounded-2xl border border-amber bg-surface px-5 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-amber">En pause</span>
              <span className="font-mono text-xs text-muted">
                {formatTime(timer.pauseElapsedSec)}
              </span>
            </div>
            <button
              onClick={timer.resume}
              className="rounded-lg bg-amber px-4 py-2 text-sm font-bold text-bg transition-transform hover:scale-105 active:scale-95"
            >
              Reprendre
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="running"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`mb-5 flex items-center justify-between rounded-2xl border bg-surface px-5 py-3 transition-colors ${
              isHyperfocus ? "border-coral" : "border-nvidia"
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Pulsing dot */}
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    isHyperfocus ? "bg-coral" : "bg-nvidia"
                  }`}
                />
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    isHyperfocus ? "bg-coral" : "bg-nvidia"
                  }`}
                />
              </span>

              {/* Elapsed time */}
              <span
                className={`font-mono text-sm font-bold ${
                  isHyperfocus ? "text-coral" : "text-nvidia"
                }`}
              >
                {formatTime(timer.elapsedSec)}
              </span>

              {/* Task name */}
              {timer.taskName && (
                <span className="hidden max-w-xs truncate text-sm text-white sm:block">
                  {timer.taskName}
                </span>
              )}

              {/* Hyperfocus warning */}
              {isHyperfocus && (
                <span className="hidden text-xs font-semibold text-coral sm:block">
                  ⚠ Hyperfocus — pense à faire une pause !
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={timer.pause}
                className="rounded-lg border border-border bg-surface2 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-border"
              >
                ⏸ Pause
              </button>
              <button
                onClick={timer.stop}
                className="rounded-lg border border-coral/40 bg-surface2 px-3 py-1.5 text-xs font-semibold text-coral transition-colors hover:bg-coral/10"
              >
                ■ Stop
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
