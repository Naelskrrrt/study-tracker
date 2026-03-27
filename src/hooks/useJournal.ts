"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type AutoData = {
  tasksCompleted: string[];
  subtasksCompleted: number;
  xpEarned: number;
  studyTimeMin: number;
  sessionsCount: number;
  moodLevel: number | null;
  coinsEarned: number;
  streak: number;
};

export type JournalEntry = {
  id: string;
  date: string;
  autoData: AutoData;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useJournal(limit = 14) {
  const { data, mutate, isLoading } = useSWR<JournalEntry[]>(
    `/api/journal?limit=${limit}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const entries = data ?? [];

  const updateNotes = async (date: string, notes: string) => {
    mutate(
      entries.map((e) => (e.date === date ? { ...e, notes } : e)),
      false
    );
    await fetch(`/api/journal/${date}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    mutate();
  };

  const getEntry = async (date: string): Promise<JournalEntry | null> => {
    try {
      const res = await fetch(`/api/journal/${date}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  return { entries, updateNotes, getEntry, isLoading, refresh: mutate };
}
