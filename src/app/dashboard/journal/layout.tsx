import type { Metadata } from "next";

export const metadata: Metadata = { title: "Journal — NVIDIA Tracker" };

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
