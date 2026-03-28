import { LEVELS, type Level } from "@/lib/data/tasks";

export function getCurrentLevel(totalXP: number): Level {
  return LEVELS.reduce<Level>(
    (acc, lv) => (totalXP >= lv.min ? lv : acc),
    LEVELS[0]
  );
}

export function getLevelProgress(totalXP: number): number {
  const current = getCurrentLevel(totalXP);
  const currentIdx = LEVELS.findIndex((l) => l.id === current.id);
  const next = LEVELS[currentIdx + 1];
  if (!next) return 100;
  const range = next.min - current.min;
  const progress = totalXP - current.min;
  return Math.round((progress / range) * 100);
}
