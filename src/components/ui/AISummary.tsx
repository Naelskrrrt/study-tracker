"use client";

import { useState } from "react";

type Props = {
  date: string;
  initialSummary?: string | null;
};

export default function AISummary({ date, initialSummary }: Props) {
  const [summary, setSummary] = useState<string | null>(initialSummary ?? null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal/${date}/summary`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  if (!summary && !loading) {
    return (
      <button
        onClick={generate}
        className="flex items-center gap-1.5 text-xs text-nvidia/70 transition-colors hover:text-nvidia"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
          />
        </svg>
        Generer un resume IA
      </button>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border-l-4 border-nvidia bg-nvidia/5 p-4">
        <div className="flex items-center gap-2 text-xs text-muted/60 italic">
          <div className="h-3 w-3 animate-spin rounded-full border border-nvidia border-t-transparent" />
          Generation du resume...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-l-4 border-nvidia bg-nvidia/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-nvidia/80">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
            />
          </svg>
          Resume IA
        </div>
        <button
          onClick={generate}
          className="text-[10px] text-muted/50 hover:text-nvidia transition-colors"
        >
          Regenerer
        </button>
      </div>
      <p className="text-sm italic leading-relaxed text-white/70">{summary}</p>
    </div>
  );
}
