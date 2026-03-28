import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    moodEntry: { findMany: vi.fn() },
    dailyActivity: { findMany: vi.fn() },
  },
}));

import { GET } from "../correlation/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/stats/correlation", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns correlation data joining mood and activity by date", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.moodEntry.findMany).mockResolvedValue([
      { date: "2026-03-01", moodLevel: 4 },
      { date: "2026-03-02", moodLevel: 2 },
      { date: "2026-03-03", moodLevel: 5 },
    ] as any);
    vi.mocked(prisma.dailyActivity.findMany).mockResolvedValue([
      { date: "2026-03-01", xpEarned: 120 },
      { date: "2026-03-02", xpEarned: 30 },
    ] as any);

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.points).toEqual([
      { mood: 4, xp: 120 },
      { mood: 2, xp: 30 },
      { mood: 5, xp: 0 },
    ]);
    expect(body.insight).toBeDefined();
  });
});
