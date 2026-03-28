"use client";

import { useCallback, useEffect } from "react";
import useSWR from "swr";
import { useDeadlines } from "@/hooks/useDeadlines";
import { DEFAULT_DEADLINES } from "@/lib/data/tasks";
import { daysUntil } from "@/lib/utils/dates";
import BudgetTracker from "@/components/ui/BudgetTracker";
import DeadlineList from "@/components/ui/DeadlineList";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type BudgetItemData = {
  itemKey: string;
  paid: boolean;
};

export default function BudgetPage() {
  const {
    data: budgetItems,
    mutate: mutateBudget,
    isLoading: budgetLoading,
  } = useSWR<BudgetItemData[]>("/api/budget", fetcher, {
    revalidateOnFocus: false,
  });

  const {
    deadlines,
    addDeadline,
    removeDeadline,
    isLoading: deadlinesLoading,
  } = useDeadlines();

  // Seed default deadlines on first load
  useEffect(() => {
    if (!deadlinesLoading && deadlines.length === 0) {
      DEFAULT_DEADLINES.forEach((d) => {
        addDeadline(d.name, d.targetDate, d.isFixed);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlinesLoading]);

  const handleBudgetToggle = useCallback(
    async (itemKey: string, paid: boolean) => {
      const current = budgetItems ?? [];
      const optimistic = current.some((i) => i.itemKey === itemKey)
        ? current.map((i) => (i.itemKey === itemKey ? { ...i, paid } : i))
        : [...current, { itemKey, paid }];

      mutateBudget(optimistic, false);

      try {
        await fetch("/api/budget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemKey, paid }),
        });
        mutateBudget();
      } catch {
        mutateBudget();
      }
    },
    [budgetItems, mutateBudget]
  );

  const isLoading = budgetLoading || deadlinesLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nvidia border-t-transparent" />
      </div>
    );
  }

  const webinarDays = daysUntil("2026-04-30");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Budget & Deadlines</h1>

      {webinarDays > 0 && (
        <div className="rounded-xl border border-amber/30 bg-amber/5 p-4">
          <p className="text-sm font-bold text-amber">
            ⚡ Webinaire NVIDIA (-50% examens)
          </p>
          <p className="mt-1 text-xs text-muted">
            Dans {webinarDays} jours — 30 avril 2026
          </p>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-bold text-muted uppercase tracking-wider">
          Budget
        </h2>
        <BudgetTracker
          items={budgetItems ?? []}
          onToggle={handleBudgetToggle}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-muted uppercase tracking-wider">
          Deadlines
        </h2>
        <DeadlineList
          deadlines={deadlines}
          onAdd={addDeadline}
          onRemove={removeDeadline}
        />
      </div>
    </div>
  );
}
