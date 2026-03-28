"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type HistoryResponse = {
  messages: ChatMessage[];
  hasMore: boolean;
};

export function useChat() {
  const { data, mutate, isLoading } = useSWR<HistoryResponse>(
    "/api/chat/history",
    fetcher,
    { revalidateOnFocus: false }
  );

  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const messages = data?.messages ?? [];
  const hasMore = data?.hasMore ?? false;

  const sendMessage = useCallback(
    async (content: string) => {
      // Optimistic update — add user message
      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      mutate(
        (prev) => ({
          messages: [...(prev?.messages ?? []), tempUserMsg],
          hasMore: prev?.hasMore ?? false,
        }),
        false
      );

      setStreaming(true);
      setStreamingContent("");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Plain text stream — just accumulate directly
          accumulated += chunk;
          setStreamingContent(accumulated);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Chat stream error:", e);
        }
      } finally {
        setStreaming(false);
        setStreamingContent("");
        abortRef.current = null;
        mutate(); // Revalidate to get persisted messages
      }
    },
    [mutate]
  );

  const loadMore = useCallback(async () => {
    if (!messages.length || !hasMore) return;
    const oldest = messages[0];
    const res = await fetch(
      `/api/chat/history?before=${oldest.createdAt}&limit=50`
    );
    const older: HistoryResponse = await res.json();
    mutate(
      (prev) => ({
        messages: [...older.messages, ...(prev?.messages ?? [])],
        hasMore: older.hasMore,
      }),
      false
    );
  }, [messages, hasMore, mutate]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    messages,
    streaming,
    streamingContent,
    hasMore,
    isLoading,
    sendMessage,
    loadMore,
  };
}
