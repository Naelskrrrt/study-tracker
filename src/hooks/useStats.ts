"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type CorrelationData = {
  points: { mood: number; xp: number }[];
  avgs: { mood: number; avgXP: number }[];
  insight: string;
};

type PredictionData = {
  phases: {
    id: string;
    name: string;
    color: string;
    done: number;
    total: number;
    pct: number;
    estimatedDate: string | null;
    isComplete: boolean;
  }[];
  tasksPerDay: number;
};

type PatternData = {
  days: { day: string; avgXP: number }[];
  bestDay: string;
  insight: string;
};

type StudyTimeData = {
  weeks: {
    week: string;
    green: number;
    purple: number;
    amber: number;
    other: number;
  }[];
  totalHours: number;
};

export function useStats() {
  const { data: correlation, isLoading: corrLoading } =
    useSWR<CorrelationData>("/api/stats/correlation", fetcher, {
      revalidateOnFocus: false,
    });

  const { data: predictions, isLoading: predLoading } =
    useSWR<PredictionData>("/api/stats/predictions", fetcher, {
      revalidateOnFocus: false,
    });

  const { data: patterns, isLoading: patLoading } =
    useSWR<PatternData>("/api/stats/patterns", fetcher, {
      revalidateOnFocus: false,
    });

  const { data: studyTime, isLoading: stLoading } =
    useSWR<StudyTimeData>("/api/stats/study-time", fetcher, {
      revalidateOnFocus: false,
    });

  return {
    correlation: correlation ?? null,
    predictions: predictions ?? null,
    patterns: patterns ?? null,
    studyTime: studyTime ?? null,
    isLoading: corrLoading || predLoading || patLoading || stLoading,
  };
}
