"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type TimerState = {
  isRunning: boolean;
  isPaused: boolean;
  elapsedSec: number;
  pauseElapsedSec: number;
  pauseCount: number;
  sessionId: string | null;
  taskId: string | null;
  taskName: string | null;
  nudgeIntervalMin: number;
  showNudge: boolean;
  debriefLoading: boolean;
  debriefReady: boolean;
  debriefText: string | null;
};

type TimerActions = {
  start: (taskId?: string, taskName?: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<{ durationMin: number; pauseCount: number; coinsEarned: number } | null>;
  dismissNudge: () => void;
  setNudgeInterval: (min: number) => void;
  linkTask: (taskId: string, taskName: string) => void;
  dismissDebrief: () => void;
};

type TimerContextValue = TimerState & TimerActions;

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    elapsedSec: 0,
    pauseElapsedSec: 0,
    pauseCount: 0,
    sessionId: null,
    taskId: null,
    taskName: null,
    nudgeIntervalMin: 30,
    showNudge: false,
    debriefLoading: false,
    debriefReady: false,
    debriefText: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const totalPauseRef = useRef<number>(0);

  // Main timer tick
  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor(
          (now - startTimeRef.current - totalPauseRef.current) / 1000
        );
        setState((s) => ({ ...s, elapsedSec: elapsed }));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.isPaused]);

  // Pause timer tick
  useEffect(() => {
    if (state.isPaused) {
      pauseIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const pauseElapsed = Math.floor((now - pauseStartRef.current) / 1000);
        setState((s) => ({ ...s, pauseElapsedSec: pauseElapsed }));
      }, 1000);
    }
    return () => {
      if (pauseIntervalRef.current) clearInterval(pauseIntervalRef.current);
    };
  }, [state.isPaused]);

  // Nudge check
  useEffect(() => {
    if (!state.isRunning || state.isPaused || state.nudgeIntervalMin <= 0)
      return;
    const nudgeSec = state.nudgeIntervalMin * 60;
    if (
      state.elapsedSec > 0 &&
      state.elapsedSec % nudgeSec === 0 &&
      !state.showNudge
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((s) => ({ ...s, showNudge: true }));
    }
  }, [
    state.elapsedSec,
    state.isRunning,
    state.isPaused,
    state.nudgeIntervalMin,
    state.showNudge,
  ]);

  const start = useCallback(
    async (taskId?: string, taskName?: string) => {
      if (state.isRunning) return;

      // Start timer immediately (offline-first)
      startTimeRef.current = Date.now();
      totalPauseRef.current = 0;
      setState((s) => ({
        ...s,
        isRunning: true,
        isPaused: false,
        elapsedSec: 0,
        pauseElapsedSec: 0,
        pauseCount: 0,
        sessionId: null,
        taskId: taskId ?? null,
        taskName: taskName ?? null,
        showNudge: false,
      }));

      // Persist to DB in background
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: taskId ?? null }),
        });
        if (res.ok) {
          const session = await res.json();
          setState((s) => ({ ...s, sessionId: session.id }));
        }
      } catch {
        // Timer runs locally even if API fails
      }
    },
    [state.isRunning]
  );

  const pause = useCallback(() => {
    if (!state.isRunning || state.isPaused) return;
    pauseStartRef.current = Date.now();
    setState((s) => ({
      ...s,
      isPaused: true,
      pauseCount: s.pauseCount + 1,
      pauseElapsedSec: 0,
      showNudge: false,
    }));
  }, [state.isRunning, state.isPaused]);

  const resume = useCallback(() => {
    if (!state.isPaused) return;
    totalPauseRef.current += Date.now() - pauseStartRef.current;
    setState((s) => ({ ...s, isPaused: false, pauseElapsedSec: 0 }));
  }, [state.isPaused]);

  const stop = useCallback(async () => {
    if (!state.isRunning) return null;
    const durationMin = Math.round(state.elapsedSec / 60);
    const totalPauseMin = Math.round(
      (totalPauseRef.current + (state.isPaused ? Date.now() - pauseStartRef.current : 0)) / 60000
    );
    const coinsEarned = Math.floor(durationMin / 15);

    if (state.sessionId) {
      try {
        await fetch(`/api/sessions/${state.sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endedAt: new Date().toISOString(),
            durationMin,
            pauseCount: state.pauseCount,
            totalPauseMin,
            coinsEarned,
          }),
        });
      } catch {
        // Timer data lost if API fails
      }
    }

    // Fire debrief in background
    const sessionIdForDebrief = state.sessionId;
    if (sessionIdForDebrief) {
      setState((s) => ({ ...s, debriefLoading: true }));
      fetch(`/api/sessions/${sessionIdForDebrief}/debrief`, {
        method: "POST",
      })
        .then((r) => r.json())
        .then((data) => {
          setState((s) => ({
            ...s,
            debriefLoading: false,
            debriefReady: true,
            debriefText: data.debrief ?? null,
          }));
        })
        .catch(() => {
          setState((s) => ({ ...s, debriefLoading: false }));
        });
    }

    const result = { durationMin, pauseCount: state.pauseCount, coinsEarned };
    setState((s) => ({
      ...s,
      isRunning: false,
      isPaused: false,
      elapsedSec: 0,
      pauseElapsedSec: 0,
      pauseCount: 0,
      sessionId: null,
      taskId: null,
      taskName: null,
      showNudge: false,
      // Keep debrief state
    }));

    return result;
  }, [state.isRunning, state.sessionId, state.elapsedSec, state.isPaused, state.pauseCount]);

  const dismissNudge = useCallback(() => {
    setState((s) => ({ ...s, showNudge: false }));
  }, []);

  const dismissDebrief = useCallback(() => {
    setState((s) => ({
      ...s,
      debriefReady: false,
      debriefText: null,
    }));
  }, []);

  const setNudgeInterval = useCallback((min: number) => {
    setState((s) => ({ ...s, nudgeIntervalMin: min }));
  }, []);

  const linkTask = useCallback(
    (taskId: string, taskName: string) => {
      setState((s) => ({ ...s, taskId, taskName }));
      if (state.sessionId) {
        fetch(`/api/sessions/${state.sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        }).catch(() => {});
      }
    },
    [state.sessionId]
  );

  return (
    <TimerContext.Provider
      value={{ ...state, start, pause, resume, stop, dismissNudge, setNudgeInterval, linkTask, dismissDebrief }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}
