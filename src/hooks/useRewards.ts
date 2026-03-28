"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Reward = {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  icon: string;
  redeemed: boolean;
  redeemedAt: string | null;
  createdAt: string;
};

export function useRewards() {
  const { data, mutate, isLoading } = useSWR<Reward[]>(
    "/api/rewards",
    fetcher,
    { revalidateOnFocus: false }
  );

  const rewards = Array.isArray(data) ? data : [];
  const available = rewards.filter((r) => !r.redeemed);
  const redeemed = rewards.filter((r) => r.redeemed);

  const createReward = async (reward: {
    name: string;
    description?: string;
    cost: number;
    icon?: string;
  }) => {
    const res = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reward),
    });
    const created = await res.json();
    mutate([...rewards, created], false);
    return created;
  };

  const redeemReward = async (id: string) => {
    const res = await fetch(`/api/rewards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redeem: true }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    mutate();
    return res.json();
  };

  const deleteReward = async (id: string) => {
    mutate(
      rewards.filter((r) => r.id !== id),
      false
    );
    await fetch(`/api/rewards/${id}`, { method: "DELETE" });
    mutate();
  };

  return {
    rewards,
    available,
    redeemed,
    createReward,
    redeemReward,
    deleteReward,
    isLoading,
  };
}
