"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
};

export default function AchievePopup({
  visible,
  title,
  subtitle,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            onClick={(e) => e.stopPropagation()}
            className="mx-4 max-w-sm rounded-2xl border border-amber/30 bg-surface p-8 text-center shadow-2xl"
          >
            <span className="text-5xl">🏆</span>
            <h2 className="mt-4 text-xl font-bold text-amber">{title}</h2>
            {subtitle && (
              <p className="mt-2 text-sm text-muted">{subtitle}</p>
            )}
            <button
              onClick={onClose}
              className="mt-6 rounded-xl bg-nvidia px-6 py-2 text-sm font-bold text-bg transition-transform hover:scale-105"
            >
              Continuer
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
