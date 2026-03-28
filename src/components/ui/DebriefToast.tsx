"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  debrief: string | null;
  visible: boolean;
  onDismiss: () => void;
};

export default function DebriefToast({ debrief, visible, onDismiss }: Props) {
  const [showModal, setShowModal] = useState(false);

  // Auto-dismiss after 30s
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 30000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-nvidia/30 bg-surface px-5 py-3 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-nvidia">
                Debrief de ta session pret
              </p>
              <button
                onClick={() => {
                  setShowModal(true);
                  onDismiss();
                }}
                className="rounded-lg bg-nvidia px-3 py-1 text-xs font-bold text-bg"
              >
                Voir
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showModal && debrief && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 max-w-sm rounded-2xl border border-nvidia/30 bg-surface p-6 shadow-2xl"
            >
              <h2 className="text-lg font-bold text-nvidia">Debrief</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/80 whitespace-pre-line">
                {debrief}
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="mt-5 w-full rounded-xl bg-nvidia py-2 text-sm font-bold text-bg transition-transform hover:scale-105"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
