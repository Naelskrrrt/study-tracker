"use client";

import useSWR from "swr";
import { todayString } from "@/lib/utils/dates";
import { MOODS } from "@/lib/data/tasks";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type MoodEntry = {
  id: string;
  date: string;
  moodLevel: number;
};

export function useMood() {
  const { data, mutate, isLoading } = useSWR<MoodEntry[]>(
    "/api/mood",
    fetcher,
    { revalidateOnFocus: false }
  );

  const entries: MoodEntry[] = Array.isArray(data) ? data : [];
  const today = todayString();
  const todayEntry = entries.find((e) => e.date === today);
  const todayMood = todayEntry
    ? MOODS.find((m) => m.level === todayEntry.moodLevel)
    : null;

  const setMood = async (moodLevel: number) => {
    const optimistic = todayEntry
      ? entries.map((e) => (e.date === today ? { ...e, moodLevel } : e))
      : [{ id: "temp", date: today, moodLevel }, ...entries];

    mutate(optimistic, false);

    try {
      await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moodLevel }),
      });
      mutate();
    } catch {
      mutate();
    }
  };

  return {
    entries,
    todayMood,
    todayLevel: todayEntry?.moodLevel ?? null,
    setMood,
    isLoading,
  };
}
