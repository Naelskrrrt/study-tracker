import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const deepseek = openrouter("deepseek/deepseek-chat-v3-0324");
export const geminiFlash = openrouter("google/gemini-2.5-flash-preview");
