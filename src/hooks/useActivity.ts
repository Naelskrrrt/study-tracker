"use client";

import useSWR from "swr";
import { calculateStreak } from "@/lib/utils/streak";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type DailyActivity = {
  id: string;
  date: string;
  count: number;
  xpEarned: number;
  taskNames: string[];
};

export function useActivity() {
  const { data, isLoading } = useSWR<DailyActivity[]>(
    "/api/activity",
    fetcher,
    { revalidateOnFocus: false }
  );

  const activities: DailyActivity[] = Array.isArray(data) ? data : [];
  const activeDates = activities.map((a) => a.date);
  const streak = calculateStreak(activeDates);

  const activityMap = new Map(activities.map((a) => [a.date, a]));

  const totalDays = activities.length;
  const totalXP = activities.reduce((s, a) => s + a.xpEarned, 0);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStr = weekStart.toISOString().slice(0, 10);
  const thisWeekCount = activities.filter((a) => a.date >= weekStr).length;

  const bestDay = activities.reduce<DailyActivity | null>(
    (best, a) => (!best || a.xpEarned > best.xpEarned ? a : best),
    null
  );

  // Max streak calculation
  const sorted = [...activeDates].sort();
  let maxStreak = 0;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const curr = new Date(sorted[i] + "T00:00:00");
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
    } else {
      maxStreak = Math.max(maxStreak, current);
      current = 1;
    }
  }
  maxStreak = Math.max(maxStreak, current);

  return {
    activities,
    activityMap,
    streak,
    maxStreak,
    totalDays,
    totalXP,
    thisWeekCount,
    bestDay,
    isLoading,
  };
}
