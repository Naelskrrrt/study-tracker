"use client";

import { motion } from "framer-motion";

type Props = {
  label: string;
  value: string | number;
  color?: string;
};

export default function StatCard({ label, value, color = "text-white" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-border bg-surface p-4 text-center"
    >
      <p className={`font-mono text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </motion.div>
  );
}
