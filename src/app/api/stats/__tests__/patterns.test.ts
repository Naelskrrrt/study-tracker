import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dailyActivity: { findMany: vi.fn() },
  },
}));

import { GET } from "../patterns/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/stats/patterns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns XP aggregated by day of week", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1" },
    } as any);

    vi.mocked(prisma.dailyActivity.findMany).mockResolvedValue([
      { date: "2026-03-23", xpEarned: 100 }, // Monday
      { date: "2026-03-24", xpEarned: 50 },  // Tuesday
      { date: "2026-03-25", xpEarned: 80 },  // Wednesday
    ] as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.days).toHaveLength(7);
    // Monday should have 100 XP
    expect(body.days.find((d: any) => d.day === "Lun").avgXP).toBe(100);
    expect(body.bestDay).toBeDefined();
  });
});
