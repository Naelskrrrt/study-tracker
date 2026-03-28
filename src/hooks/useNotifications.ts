"use client";

import { useMemo } from "react";
import { todayString, daysUntil } from "@/lib/utils/dates";

type Alert = {
  id: string;
  type: "streak" | "deadline" | "info";
  message: string;
  severity: "critical" | "warning" | "info";
};

type UseNotificationsInput = {
  streak: number;
  activeDates: Set<string>;
  deadlines: { name: string; targetDate: string | null }[];
};

export function useNotificationAlerts({
  streak,
  activeDates,
  deadlines,
}: UseNotificationsInput): Alert[] {
  return useMemo(() => {
    const alerts: Alert[] = [];
    const today = todayString();
    const now = new Date();
    const hour = now.getHours();

    // Streak danger: no activity today and it's after 18:00
    if (streak > 0 && !activeDates.has(today) && hour >= 18) {
      alerts.push({
        id: "streak-danger",
        type: "streak",
        message: `Ta streak de ${streak}j va se perdre — fais 1 tâche !`,
        severity: "critical",
      });
    }

    // Deadline warnings: < 7 days
    for (const dl of deadlines) {
      if (!dl.targetDate) continue;
      const days = daysUntil(dl.targetDate);
      if (days <= 0) continue; // Past deadline, ignore
      if (days <= 3) {
        alerts.push({
          id: `deadline-${dl.name}`,
          type: "deadline",
          message: `${dl.name} dans ${days} jour${days !== 1 ? "s" : ""} !`,
          severity: "critical",
        });
      } else if (days <= 7) {
        alerts.push({
          id: `deadline-${dl.name}`,
          type: "deadline",
          message: `${dl.name} dans ${days} jours`,
          severity: "warning",
        });
      }
    }

    return alerts;
  }, [streak, activeDates, deadlines]);
}
