import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    taskCompletion: { findMany: vi.fn() },
    dailyActivity: { findMany: vi.fn() },
  },
}));

import { GET } from "../predictions/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/stats/predictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns phase predictions with estimated dates", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1" },
    } as any);

    // User completed t1, t2 (phase 1 tasks)
    vi.mocked(prisma.taskCompletion.findMany).mockResolvedValue([
      { taskId: "t1", completedAt: new Date("2026-03-15") },
      { taskId: "t2", completedAt: new Date("2026-03-20") },
    ] as any);

    // 10 active days in last 14 days
    vi.mocked(prisma.dailyActivity.findMany).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        date: `2026-03-${String(15 + i).padStart(2, "0")}`,
        count: 1,
      })) as any
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.phases).toHaveLength(3);
    expect(body.phases[0].done).toBe(2);
    expect(body.phases[0].total).toBe(5);
    expect(body.phases[0].estimatedDate).toBeDefined();
  });
});
