import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { GET, PATCH } from "../preferences/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("Notification Preferences API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET auto-creates defaults when none exist", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);

    const defaults = {
      id: "np1",
      userId: "u1",
      emailDigest: true,
      emailAlerts: true,
      digestTime: "20:00",
      pushEnabled: false,
      pushSubscription: null,
    };

    vi.mocked(prisma.notificationPreference.upsert).mockResolvedValue(
      defaults as any
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.emailDigest).toBe(true);
    expect(body.digestTime).toBe("20:00");
  });

  it("PATCH updates preferences", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);

    vi.mocked(prisma.notificationPreference.upsert).mockResolvedValue({
      id: "np1",
      userId: "u1",
      emailDigest: false,
      emailAlerts: true,
      digestTime: "08:00",
      pushEnabled: false,
      pushSubscription: null,
    } as any);

    const req = new Request("http://localhost/api/notifications/preferences", {
      method: "PATCH",
      body: JSON.stringify({ emailDigest: false, digestTime: "08:00" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.emailDigest).toBe(false);
    expect(body.digestTime).toBe("08:00");
  });
});
