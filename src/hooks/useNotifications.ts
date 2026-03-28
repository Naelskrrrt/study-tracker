"use client";

import { useMemo, useEffect, useState, useRef } from "react";
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
  todayMood?: number | null;
};

async function fetchNudge(
  trigger: string,
  context: Record<string, string>
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      trigger,
      context: JSON.stringify(context),
    });
    const res = await fetch(`/api/nudge?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.message ?? null;
  } catch {
    return null;
  }
}

export function useNotificationAlerts({
  streak,
  activeDates,
  deadlines,
  todayMood,
}: UseNotificationsInput): Alert[] {
  const [nudges, setNudges] = useState<Alert[]>([]);
  const nudgeFetchedRef = useRef(false);

  // Fetch login nudge once on mount
  useEffect(() => {
    if (nudgeFetchedRef.current) return;
    nudgeFetchedRef.current = true;

    const context: Record<string, string> = {
      streak: String(streak),
      mood: todayMood != null ? String(todayMood) : "non enregistree",
      lastSession: "recente",
    };

    fetchNudge("login", context).then((msg) => {
      if (msg) {
        setNudges((prev) => [
          ...prev,
          { id: "nudge-login", type: "info", message: msg, severity: "info" },
        ]);
      }
    });
  }, []); // Intentionally run once on mount

  const staticAlerts = useMemo(() => {
    const alerts: Alert[] = [];
    const today = todayString();
    const now = new Date();
    const hour = now.getHours();

    // Streak danger: no activity today and it's after 18:00
    if (streak > 0 && !activeDates.has(today) && hour >= 18) {
      alerts.push({
        id: "streak-danger",
        type: "streak",
        message: `Ta streak de ${streak}j va se perdre — fais 1 tache !`,
        severity: "critical",
      });
    }

    // Deadline warnings: < 7 days
    for (const dl of deadlines) {
      if (!dl.targetDate) continue;
      const days = daysUntil(dl.targetDate);
      if (days <= 0) continue;
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

  return [...staticAlerts, ...nudges];
}
