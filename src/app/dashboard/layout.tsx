"use client";

import { useState } from "react";
import BottomNav from "@/components/ui/BottomNav";
import QuickCaptureModal from "@/components/ui/QuickCaptureModal";
import ChatButton from "@/components/ui/ChatButton";
import ChatPanel from "@/components/ui/ChatPanel";
import { TimerProvider } from "@/hooks/useTimer";
import { MoodModeProvider } from "@/hooks/useMoodMode";
import { useMood } from "@/hooks/useMood";

function MoodModeWrapper({ children }: { children: React.ReactNode }) {
  const { todayLevel } = useMood();
  return <MoodModeProvider todayMood={todayLevel}>{children}</MoodModeProvider>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <TimerProvider>
      <MoodModeWrapper>
        <div className="min-h-screen bg-bg">
          <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</div>
          <BottomNav />
          <QuickCaptureModal />
          {!chatOpen && <ChatButton onClick={() => setChatOpen(true)} />}
          <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      </MoodModeWrapper>
    </TimerProvider>
  );
}
