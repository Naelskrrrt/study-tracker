"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Alert = {
  id: string;
  type: "streak" | "deadline" | "info";
  message: string;
  severity: "critical" | "warning" | "info";
};

type Props = {
  alerts: Alert[];
};

const SEVERITY_STYLES = {
  critical: "border-coral bg-coral/10 text-coral",
  warning: "border-amber bg-amber/10 text-amber",
  info: "border-nvidia bg-nvidia/10 text-nvidia",
};

const ICONS = {
  streak: "\u{1F525}",
  deadline: "\u{23F0}",
  info: "\u{1F4AC}",
};

export default function NotificationBanner({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      <AnimatePresence>
        {visible.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${SEVERITY_STYLES[alert.severity]}`}
          >
            <div className="flex items-center gap-2">
              <span>{ICONS[alert.type]}</span>
              <span className="text-sm font-semibold">{alert.message}</span>
            </div>
            <button
              onClick={() =>
                setDismissed((prev) => new Set([...prev, alert.id]))
              }
              className="ml-2 text-xs opacity-60 transition-opacity hover:opacity-100"
            >
              x
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
