"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useJournal, type JournalEntry } from "@/hooks/useJournal";

// ── helpers ──────────────────────────────────────────────────────────────────

const MOOD_EMOJI: Record<number, string> = {
  1: "😫",
  2: "😔",
  3: "😐",
  4: "💪",
  5: "🔥",
};

function formatMinutes(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateFR(dateStr: string): string {
  // dateStr is "YYYY-MM-DD"
  const [y, mo, d] = dateStr.split("-").map(Number);
  // Use UTC noon to avoid timezone shift
  const date = new Date(Date.UTC(y, mo - 1, d, 12));
  return date
    .toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ── entry card ────────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onSave,
}: {
  entry: JournalEntry;
  onSave: (date: string, notes: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(entry.notes ?? "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(entry.notes ?? "");

  // Sync if the entry's notes change externally (e.g. after SWR revalidation)
  useEffect(() => {
    if (!dirty) {
      setDraft(entry.notes ?? "");
      savedRef.current = entry.notes ?? "";
    }
  }, [entry.notes, dirty]);

  const handleChange = (v: string) => {
    setDraft(v);
    setDirty(v !== savedRef.current);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(entry.date, draft);
    savedRef.current = draft;
    setDirty(false);
    setSaving(false);
  };

  const handleBlur = async () => {
    if (dirty) {
      await handleSave();
    }
  };

  const { autoData } = entry;
  const moodEmoji = autoData.moodLevel ? (MOOD_EMOJI[autoData.moodLevel] ?? "—") : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-surface p-5 space-y-4"
    >
      {/* Date header */}
      <h2 className="text-base font-bold text-white tracking-wide">
        {formatDateFR(entry.date)}
      </h2>

      {/* Auto-summary row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span>📋 {autoData.tasksCompleted.length} tâche{autoData.tasksCompleted.length !== 1 ? "s" : ""}</span>
        <span>⚡ {autoData.xpEarned} XP</span>
        <span>⏱ {formatMinutes(autoData.studyTimeMin)}</span>
        <span>🪙 {autoData.coinsEarned}</span>
        <span>{moodEmoji}</span>
      </div>

      {/* Completed task names (subtle) */}
      {autoData.tasksCompleted.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {autoData.tasksCompleted.map((t) => (
            <li
              key={t}
              className="rounded-md bg-surface2 px-2 py-0.5 text-xs text-muted border border-border"
            >
              {t}
            </li>
          ))}
        </ul>
      )}

      {/* Notes textarea */}
      <div className="space-y-2">
        <textarea
          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-white placeholder-muted resize-none focus:outline-none focus:border-purple transition-colors min-h-[80px]"
          placeholder="Ajoute tes réflexions..."
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          rows={3}
        />

        {/* Prompt hints */}
        <p className="text-xs text-muted/70 italic">
          Qu&apos;est-ce qui a été difficile ? · Prochaine étape ?
        </p>

        {/* Save button — visible when dirty */}
        <AnimatePresence>
          {dirty && (
            <motion.button
              key="save-btn"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-purple px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple/80 disabled:opacity-60 transition-colors"
            >
              {saving ? "Sauvegarde…" : "Sauvegarder"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 space-y-3 animate-pulse">
      <div className="h-4 w-48 rounded bg-border" />
      <div className="h-3 w-64 rounded bg-border" />
      <div className="h-20 rounded-xl bg-border" />
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 14;

export default function JournalPage() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { entries, updateNotes, getEntry, isLoading, refresh } = useJournal(limit);

  // Auto-generate today's entry on first visit
  useEffect(() => {
    const today = todayISO();
    getEntry(today).then(() => refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = () => {
    setLimit((l) => l + PAGE_SIZE);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Journal</h1>
        <span className="text-xs text-muted">{entries.length} entrée{entries.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading && entries.length === 0 ? (
        <div className="space-y-4">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-muted">
          <p className="text-4xl mb-3">📓</p>
          <p className="font-semibold">Aucune entrée pour l&apos;instant</p>
          <p className="text-sm mt-1">Commence à étudier pour générer ta première entrée !</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <EntryCard
                key={entry.date}
                entry={entry}
                onSave={updateNotes}
              />
            ))}
          </AnimatePresence>

          {/* Load more */}
          {entries.length >= limit && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                className="rounded-xl border border-border bg-surface px-6 py-2 text-sm font-medium text-muted hover:text-white hover:border-purple transition-colors"
              >
                Charger plus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
