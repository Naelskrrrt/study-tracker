"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useProgress } from "@/hooks/useProgress";
import { useActivity } from "@/hooks/useActivity";
import { useMood } from "@/hooks/useMood";
import XPBar from "@/components/ui/XPBar";
import StatCard from "@/components/ui/StatCard";
import StreakCard from "@/components/ui/StreakCard";
import FocusCard from "@/components/ui/FocusCard";
import MoodTracker from "@/components/ui/MoodTracker";
import Confetti from "@/components/ui/Confetti";
import Toast from "@/components/ui/Toast";
import AchievePopup from "@/components/ui/AchievePopup";
import TimerBar from "@/components/ui/TimerBar";
import BrainDump from "@/components/ui/BrainDump";
import { LEVELS } from "@/lib/data/tasks";

const ContribGraph = dynamic(() => import("@/components/ui/ContribGraph"), {
  ssr: false,
});

export default function DashboardPage() {
  const {
    completedIds,
    totalXP,
    currentLevel,
    doneCount,
    totalCount,
    pct,
    certifCount,
    toggleTask,
    isLoading,
  } = useProgress();

  const {
    streak,
    maxStreak,
    totalDays,
    thisWeekCount,
    bestDay,
    activities,
    activityMap,
  } = useActivity();
  const { todayLevel, entries: moodEntries, setMood } = useMood();

  const [confettiActive, setConfettiActive] = useState(false);
  const [confettiCount, setConfettiCount] = useState(20);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [achieve, setAchieve] = useState({
    visible: false,
    title: "",
    subtitle: "",
  });

  const handleComplete = useCallback(
    async (taskId: string, xp: number, name: string) => {
      const prevXP = totalXP;
      await toggleTask(taskId, xp, name);

      const isCertif = name.startsWith("✦");
      setConfettiCount(isCertif ? 80 : 20);
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 100);

      setToast({ visible: true, message: `+${xp} XP — ${name}` });

      const newXP = prevXP + xp;
      const prevLevel = LEVELS.reduce(
        (acc, lv) => (prevXP >= lv.min ? lv : acc),
        LEVELS[0]
      );
      const newLevel = LEVELS.reduce(
        (acc, lv) => (newXP >= lv.min ? lv : acc),
        LEVELS[0]
      );

      if (newLevel.id !== prevLevel.id) {
        setTimeout(() => {
          setAchieve({
            visible: true,
            title: `Niveau ${newLevel.label} !`,
            subtitle: `Tu as atteint ${newXP} XP`,
          });
        }, 500);
      }
    },
    [totalXP, toggleTask]
  );

  const activeDates = new Set(activities.map((a) => a.date));

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nvidia border-t-transparent" />
      </div>
    );
  }

  return (
    <>
    <TimerBar />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Bloc gauche — contenu principal */}
      <div className="space-y-4">
        <XPBar totalXP={totalXP} currentLevel={currentLevel} />

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Tâches" value={`${doneCount}/${totalCount}`} color="text-white" />
          <StatCard label="Progression" value={`${pct}%`} color="text-nvidia" />
          <StatCard label="Certifs" value={`${certifCount}/3`} color="text-amber" />
          <StatCard label="Jours actifs" value={activities.length} color="text-purple" />
        </div>

        <StreakCard streak={streak} activeDates={activeDates} />

        <MoodTracker
          todayLevel={todayLevel}
          entries={moodEntries.map((e) => ({
            date: e.date,
            moodLevel: e.moodLevel,
          }))}
          onSetMood={setMood}
        />

        <FocusCard completedIds={completedIds} onComplete={handleComplete} />

        <BrainDump />
      </div>

      {/* Bloc droite — activité */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <ContribGraph activityMap={activityMap} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Streak max" value={`${maxStreak}j`} color="text-coral" />
          <StatCard label="Total jours" value={totalDays} color="text-nvidia" />
          <StatCard label="Cette semaine" value={thisWeekCount} color="text-purple" />
          <StatCard
            label="Meilleur jour"
            value={bestDay ? `${bestDay.xpEarned} XP` : "—"}
            color="text-amber"
          />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-1 text-xs font-semibold text-muted">
            🔥 Streak actuelle
          </p>
          <p className="font-mono text-2xl font-bold text-coral">
            {streak} jour{streak !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Overlays */}
      <Confetti active={confettiActive} count={confettiCount} />
      <Toast
        message={toast.message}
        visible={toast.visible}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
      <AchievePopup
        visible={achieve.visible}
        title={achieve.title}
        subtitle={achieve.subtitle}
        onClose={() => setAchieve((a) => ({ ...a, visible: false }))}
      />
    </div>
    </>
  );
}
