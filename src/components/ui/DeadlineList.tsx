"use client";

import { useState } from "react";
import { daysUntil, formatDateFR } from "@/lib/utils/dates";

type Deadline = {
  id: string;
  name: string;
  targetDate: string | null;
  isFixed: boolean;
};

type Props = {
  deadlines: Deadline[];
  onAdd: (name: string, targetDate: string | null, isFixed: boolean) => void;
  onRemove: (id: string) => void;
};

export default function DeadlineList({ deadlines, onAdd, onRemove }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  function handleAdd() {
    if (!name.trim()) return;
    onAdd(name.trim(), date || null, false);
    setName("");
    setDate("");
    setShowForm(false);
  }

  return (
    <div className="space-y-3">
      {deadlines.map((dl) => {
        const days = dl.targetDate ? daysUntil(dl.targetDate) : null;
        const urgent = days !== null && days <= 14;
        const past = days !== null && days < 0;

        return (
          <div
            key={dl.id}
            className={`flex items-center justify-between rounded-xl border p-3 ${
              dl.isFixed
                ? "border-amber/30 bg-amber/5"
                : "border-border bg-surface"
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-white">{dl.name}</p>
              {dl.targetDate && (
                <p className="text-xs text-muted">
                  {formatDateFR(dl.targetDate)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {days !== null && (
                <span
                  className={`font-mono text-sm font-bold ${
                    past
                      ? "text-coral"
                      : urgent
                        ? "text-amber"
                        : "text-nvidia"
                  }`}
                >
                  {past ? `${Math.abs(days)}j passé` : `${days}j`}
                </span>
              )}
              {!dl.isFixed && (
                <button
                  onClick={() => onRemove(dl.id)}
                  className="text-xs text-muted hover:text-coral"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}

      {showForm ? (
        <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de l'objectif"
            className="w-full rounded-lg border border-border bg-bg p-2 text-sm text-white placeholder:text-muted focus:border-nvidia focus:outline-none"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg p-2 text-sm text-white focus:border-nvidia focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="rounded-lg bg-nvidia px-3 py-1.5 text-sm font-bold text-bg"
            >
              Ajouter
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm text-muted hover:text-white"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-border py-3 text-sm text-muted hover:border-nvidia hover:text-nvidia transition-colors"
        >
          + Ajouter un objectif
        </button>
      )}
    </div>
  );
}
