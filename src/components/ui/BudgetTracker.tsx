"use client";

import { BUDGET_ITEMS } from "@/lib/data/tasks";
import { motion } from "framer-motion";

type BudgetItemData = {
  itemKey: string;
  paid: boolean;
};

type Props = {
  items: BudgetItemData[];
  onToggle: (itemKey: string, paid: boolean) => void;
};

export default function BudgetTracker({ items, onToggle }: Props) {
  const paidSet = new Set(items.filter((i) => i.paid).map((i) => i.itemKey));
  const totalBudget = BUDGET_ITEMS.reduce((s, i) => s + i.price, 0);
  const spent = BUDGET_ITEMS.filter((i) => paidSet.has(i.key)).reduce(
    (s, i) => s + i.price,
    0
  );
  const pct = Math.round((spent / totalBudget) * 100);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Dépensé</span>
          <span className="font-mono font-bold text-white">
            {spent}$ / {totalBudget}$
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface2">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple to-pink"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </div>

      {BUDGET_ITEMS.map((item) => {
        const paid = paidSet.has(item.key);
        return (
          <div
            key={item.key}
            className={`flex items-center justify-between rounded-xl border p-3 ${
              "certif" in item && item.certif
                ? "border-amber/30 bg-amber/5"
                : "border-border bg-surface"
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => onToggle(item.key, !paid)}
                className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                  paid
                    ? "border-nvidia bg-nvidia text-bg"
                    : "border-muted"
                }`}
              >
                {paid && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div>
                <p className={`text-sm font-semibold ${paid ? "text-muted line-through" : "text-white"}`}>
                  {item.name}
                </p>
              </div>
            </div>
            <span className="font-mono text-sm text-muted">{item.price}$</span>
          </div>
        );
      })}
    </div>
  );
}
