"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type CoinBalance = {
  balance: number;
  earned: number;
  spent: number;
  breakdown: {
    sessions: number;
    subtasks: number;
    tasks: number;
    moods: number;
  };
};

type HistoryItem = {
  type: string;
  coins: number;
  label: string;
  date: string | null;
};

export function useCoins() {
  const {
    data: balanceData,
    mutate: mutateBalance,
    isLoading,
  } = useSWR<CoinBalance>("/api/coins/balance", fetcher, {
    revalidateOnFocus: false,
  });

  const { data: history, mutate: mutateHistory } = useSWR<HistoryItem[]>(
    "/api/coins/history",
    fetcher,
    { revalidateOnFocus: false }
  );

  const refresh = () => {
    mutateBalance();
    mutateHistory();
  };

  return {
    balance: balanceData?.balance ?? 0,
    earned: balanceData?.earned ?? 0,
    spent: balanceData?.spent ?? 0,
    breakdown: balanceData?.breakdown ?? { sessions: 0, subtasks: 0, tasks: 0, moods: 0 },
    history: history ?? [],
    isLoading,
    refresh,
  };
}
