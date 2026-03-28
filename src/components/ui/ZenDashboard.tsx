"use client";

import { motion } from "framer-motion";
import { MOODS } from "@/lib/data/tasks";

type Props = {
  moodLevel: 1 | 2;
  streak: number;
  onOverride: () => void;
};

const ZEN_MESSAGES: Record<1 | 2, { title: string; body: string }> = {
  1: {
    title: "Journée off. C'est OK.",
    body: "Forcer avec l'ADHD = contre-productif. Reviens demain. Ta progression t'attend.",
  },
  2: {
    title: "Mode passif activé.",
    body: "Pas la peine d'insister. Regarde une vidéo courte sans prendre de notes, ou repose-toi.",
  },
};

export default function ZenDashboard({ moodLevel, streak, onOverride }: Props) {
  const msg = ZEN_MESSAGES[moodLevel];
  const mood = MOODS.find((m) => m.level === moodLevel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-md space-y-6 pt-8"
    >
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <span className="text-4xl">{mood?.emoji}</span>
        <h2 className="mt-3 text-lg font-bold text-white">{msg.title}</h2>
        <p className="mt-2 text-sm text-muted">{msg.body}</p>
      </div>

      {streak > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-sm text-muted">
            Ta streak est a{" "}
            <span className="font-mono font-bold text-coral">
              {streak} jour{streak !== 1 ? "s" : ""}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted italic">
            1 mini tache suffit pour la garder.
          </p>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={onOverride}
          className="text-sm text-muted underline transition-colors hover:text-white"
        >
          Voir tout le dashboard
        </button>
      </div>
    </motion.div>
  );
}
