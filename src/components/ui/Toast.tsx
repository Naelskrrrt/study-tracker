"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
};

export default function Toast({
  message,
  visible,
  onClose,
  duration = 3000,
}: Props) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [visible, onClose, duration]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-nvidia/30 bg-surface px-5 py-3 shadow-lg"
        >
          <p className="text-sm font-semibold text-nvidia">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
