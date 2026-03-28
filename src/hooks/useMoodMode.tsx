"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";

export type MoodMode = "zen" | "standard" | "full";

type MoodModeContextValue = {
  mode: MoodMode;
  isOverridden: boolean;
  override: () => void;
  resetOverride: () => void;
};

const MoodModeContext = createContext<MoodModeContextValue>({
  mode: "standard",
  isOverridden: false,
  override: () => {},
  resetOverride: () => {},
});

function deriveModeFromMood(mood: number | null): MoodMode {
  if (mood === null || mood === undefined) return "standard";
  if (mood <= 2) return "zen";
  if (mood >= 4) return "full";
  return "standard";
}

export function MoodModeProvider({
  todayMood,
  children,
}: {
  todayMood: number | null;
  children: ReactNode;
}) {
  const [isOverridden, setIsOverridden] = useState(false);

  const derivedMode = deriveModeFromMood(todayMood);

  // Reset override when mood changes
  useEffect(() => {
    setIsOverridden(false);
  }, [todayMood]);

  const mode = isOverridden ? "full" : derivedMode;

  const override = useCallback(() => setIsOverridden(true), []);
  const resetOverride = useCallback(() => setIsOverridden(false), []);

  return (
    <MoodModeContext value={{ mode, isOverridden, override, resetOverride }}>
      {children}
    </MoodModeContext>
  );
}

export function useMoodMode() {
  return useContext(MoodModeContext);
}
