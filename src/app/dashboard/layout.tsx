"use client";

import BottomNav from "@/components/ui/BottomNav";
import QuickCaptureModal from "@/components/ui/QuickCaptureModal";
import { TimerProvider } from "@/hooks/useTimer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TimerProvider>
      <div className="min-h-screen bg-bg">
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</div>
        <BottomNav />
        <QuickCaptureModal />
      </div>
    </TimerProvider>
  );
}
