import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    studySession: { findMany: vi.fn() },
  },
}));

import { GET } from "../study-time/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/stats/study-time", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns weekly study time with total hours", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1" },
    } as any);

    vi.mocked(prisma.studySession.findMany).mockResolvedValue([
      {
        taskId: "t1",
        durationMin: 60,
        startedAt: new Date("2026-03-23T10:00:00Z"),
      },
      {
        taskId: "t6",
        durationMin: 45,
        startedAt: new Date("2026-03-24T14:00:00Z"),
      },
    ] as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.totalHours).toBeDefined();
    expect(body.weeks).toBeDefined();
    expect(Array.isArray(body.weeks)).toBe(true);
  });
});
