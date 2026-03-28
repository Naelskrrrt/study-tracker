"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Deadline = {
  id: string;
  name: string;
  targetDate: string | null;
  isFixed: boolean;
};

export function useDeadlines() {
  const { data, mutate, isLoading } = useSWR<Deadline[]>(
    "/api/deadlines",
    fetcher,
    { revalidateOnFocus: false }
  );

  const deadlines: Deadline[] = Array.isArray(data) ? data : [];

  const addDeadline = async (
    name: string,
    targetDate: string | null,
    isFixed: boolean
  ) => {
    const optimistic: Deadline = {
      id: "temp-" + Date.now(),
      name,
      targetDate,
      isFixed,
    };
    mutate([...deadlines, optimistic], false);

    try {
      await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, targetDate, isFixed }),
      });
      mutate();
    } catch {
      mutate();
    }
  };

  const removeDeadline = async (id: string) => {
    mutate(
      deadlines.filter((d) => d.id !== id),
      false
    );

    try {
      await fetch("/api/deadlines", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      mutate();
    } catch {
      mutate();
    }
  };

  return {
    deadlines,
    addDeadline,
    removeDeadline,
    isLoading,
  };
}
