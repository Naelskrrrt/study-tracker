"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOODS } from "@/lib/data/tasks";
import { getLast7Days } from "@/lib/utils/streak";

type MoodEntry = {
  date: string;
  moodLevel: number;
};

type Props = {
  todayLevel: number | null;
  entries: MoodEntry[];
  onSetMood: (level: number) => void;
};

export default function MoodTracker({
  todayLevel,
  entries,
  onSetMood,
}: Props) {
  const [open, setOpen] = useState(false);
  const todayMood = todayLevel
    ? MOODS.find((m) => m.level === todayLevel)
    : null;

  const last7 = getLast7Days();
  const entryMap = new Map(entries.map((e) => [e.date, e.moodLevel]));

  return (
    <div className="rounded-2xl border border-border bg-surface">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{todayMood?.emoji ?? "❓"}</span>
          <span className="text-sm font-semibold text-white">
            {todayMood ? todayMood.label : "Comment tu te sens ?"}
          </span>
        </div>
        <span
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-3">
              <div className="flex justify-between">
                {MOODS.map((mood) => (
                  <button
                    key={mood.level}
                    onClick={() => onSetMood(mood.level)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition-all ${
                      todayLevel === mood.level
                        ? "bg-surface2 ring-2 ring-nvidia scale-110"
                        : "hover:bg-surface2"
                    }`}
                  >
                    {mood.emoji}
                  </button>
                ))}
              </div>

              {todayMood && (
                <p className="mt-3 text-xs text-muted italic">
                  💡 {todayMood.advice}
                </p>
              )}

              <div className="mt-3 flex justify-between">
                {last7.map((date) => {
                  const level = entryMap.get(date);
                  const mood = level
                    ? MOODS.find((m) => m.level === level)
                    : null;
                  return (
                    <div
                      key={date}
                      className="flex flex-col items-center gap-1"
                    >
                      <span className="text-sm">{mood?.emoji ?? "·"}</span>
                      <span className="text-[9px] text-muted">
                        {new Date(date + "T00:00:00").toLocaleDateString(
                          "fr-FR",
                          { weekday: "narrow" }
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
