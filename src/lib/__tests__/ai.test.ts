import { describe, it, expect, vi } from "vitest";

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn((config) => {
    const modelFn = (modelId: string) => ({ modelId, ...config });
    return modelFn;
  }),
}));

describe("ai client", () => {
  it("exports deepseek model targeting OpenRouter", async () => {
    const { deepseek } = await import("@/lib/ai");
    expect(deepseek).toBeDefined();
    expect((deepseek as any).modelId).toBe("deepseek/deepseek-chat-v3-0324");
  });

  it("exports geminiFlash model targeting OpenRouter", async () => {
    const { geminiFlash } = await import("@/lib/ai");
    expect(geminiFlash).toBeDefined();
    expect((geminiFlash as any).modelId).toBe("google/gemini-2.5-flash-preview");
  });
});
