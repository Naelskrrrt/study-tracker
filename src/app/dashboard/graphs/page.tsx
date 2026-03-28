"use client";

import dynamic from "next/dynamic";
import { useProgress } from "@/hooks/useProgress";
import { useActivity } from "@/hooks/useActivity";
import { useMood } from "@/hooks/useMood";
import { useStats } from "@/hooks/useStats";

const XPChart = dynamic(() => import("@/components/charts/XPChart"), {
  ssr: false,
});
const PhasesDonut = dynamic(() => import("@/components/charts/PhasesDonut"), {
  ssr: false,
});
const WeeklyBar = dynamic(() => import("@/components/charts/WeeklyBar"), {
  ssr: false,
});
const MoodChart = dynamic(() => import("@/components/charts/MoodChart"), {
  ssr: false,
});
const CorrelationChart = dynamic(
  () => import("@/components/charts/CorrelationChart"),
  { ssr: false }
);
const PredictionBars = dynamic(
  () => import("@/components/charts/PredictionBars"),
  { ssr: false }
);
const PatternChart = dynamic(
  () => import("@/components/charts/PatternChart"),
  { ssr: false }
);
const StudyTimeChart = dynamic(
  () => import("@/components/charts/StudyTimeChart"),
  { ssr: false }
);

export default function GraphsPage() {
  const { completedIds, isLoading: progressLoading } = useProgress();
  const { activities, isLoading: activityLoading } = useActivity();
  const { entries: moodEntries, isLoading: moodLoading } = useMood();
  const {
    correlation,
    predictions,
    patterns,
    studyTime,
    isLoading: statsLoading,
  } = useStats();

  const isLoading = progressLoading || activityLoading || moodLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nvidia border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Graphiques</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <XPChart
          activities={activities.map((a) => ({
            date: a.date,
            xpEarned: a.xpEarned,
          }))}
        />
        <PhasesDonut completedIds={completedIds} />
        <WeeklyBar
          activities={activities.map((a) => ({
            date: a.date,
            count: a.count,
          }))}
        />
        <MoodChart
          entries={moodEntries.map((e) => ({
            date: e.date,
            moodLevel: e.moodLevel,
          }))}
        />
      </div>

      {/* Advanced stats section */}
      <h2 className="text-lg font-bold text-white">Stats avancées</h2>

      {statsLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-nvidia border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {correlation && (
            <CorrelationChart
              points={correlation.points}
              insight={correlation.insight}
            />
          )}
          {predictions && (
            <PredictionBars phases={predictions.phases} />
          )}
          {patterns && (
            <PatternChart days={patterns.days} insight={patterns.insight} />
          )}
          {studyTime && (
            <StudyTimeChart
              weeks={studyTime.weeks}
              totalHours={studyTime.totalHours}
            />
          )}
        </div>
      )}
    </div>
  );
}
