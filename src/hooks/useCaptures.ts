"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type QuickCapture = {
  id: string;
  content: string;
  createdAt: string;
  archived: boolean;
};

export function useCaptures() {
  const { data, mutate, isLoading } = useSWR<QuickCapture[]>(
    "/api/captures",
    fetcher,
    { revalidateOnFocus: false }
  );

  const captures: QuickCapture[] = data ?? [];

  const addCapture = async (content: string) => {
    const optimistic: QuickCapture = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      archived: false,
    };

    mutate([optimistic, ...captures], false);

    try {
      await fetch("/api/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      mutate();
    } catch {
      mutate();
    }
  };

  const archiveCapture = async (id: string) => {
    const optimistic = captures.filter((c) => c.id !== id);

    mutate(optimistic, false);

    try {
      await fetch(`/api/captures/${id}`, { method: "PATCH" });
      mutate();
    } catch {
      mutate();
    }
  };

  const deleteCapture = async (id: string) => {
    const optimistic = captures.filter((c) => c.id !== id);

    mutate(optimistic, false);

    try {
      await fetch(`/api/captures/${id}`, { method: "DELETE" });
      mutate();
    } catch {
      mutate();
    }
  };

  return {
    captures,
    isLoading,
    addCapture,
    archiveCapture,
    deleteCapture,
  };
}
