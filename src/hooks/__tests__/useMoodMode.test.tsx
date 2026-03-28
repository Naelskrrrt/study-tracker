import { renderHook, act } from "@testing-library/react";
import { MoodModeProvider, useMoodMode } from "../useMoodMode";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <MoodModeProvider todayMood={null}>{children}</MoodModeProvider>
);

describe("useMoodMode", () => {
  it("defaults to standard when no mood is set", () => {
    const { result } = renderHook(() => useMoodMode(), { wrapper });
    expect(result.current.mode).toBe("standard");
  });

  it("returns zen mode for mood 1", () => {
    const zenWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={1}>{children}</MoodModeProvider>
    );
    const { result } = renderHook(() => useMoodMode(), { wrapper: zenWrapper });
    expect(result.current.mode).toBe("zen");
  });

  it("returns zen mode for mood 2", () => {
    const zenWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={2}>{children}</MoodModeProvider>
    );
    const { result } = renderHook(() => useMoodMode(), { wrapper: zenWrapper });
    expect(result.current.mode).toBe("zen");
  });

  it("returns standard mode for mood 3", () => {
    const stdWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={3}>{children}</MoodModeProvider>
    );
    const { result } = renderHook(() => useMoodMode(), { wrapper: stdWrapper });
    expect(result.current.mode).toBe("standard");
  });

  it("returns full mode for mood 4", () => {
    const fullWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={4}>{children}</MoodModeProvider>
    );
    const { result } = renderHook(() => useMoodMode(), { wrapper: fullWrapper });
    expect(result.current.mode).toBe("full");
  });

  it("returns full mode for mood 5", () => {
    const fullWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={5}>{children}</MoodModeProvider>
    );
    const { result } = renderHook(() => useMoodMode(), { wrapper: fullWrapper });
    expect(result.current.mode).toBe("full");
  });

  it("allows override to show full dashboard", () => {
    const zenWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={1}>{children}</MoodModeProvider>
    );
    const { result } = renderHook(() => useMoodMode(), { wrapper: zenWrapper });
    expect(result.current.mode).toBe("zen");
    expect(result.current.isOverridden).toBe(false);

    act(() => {
      result.current.override();
    });

    expect(result.current.mode).toBe("full");
    expect(result.current.isOverridden).toBe(true);
  });
});
