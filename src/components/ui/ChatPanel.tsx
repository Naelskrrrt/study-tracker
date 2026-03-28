"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/hooks/useChat";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ChatPanel({ open, onClose }: Props) {
  const {
    messages,
    streaming,
    streamingContent,
    hasMore,
    isLoading,
    sendMessage,
    loadMore,
  } = useChat();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || streaming) return;
    setInput("");
    setSending(true);
    await sendMessage(text);
    setSending(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-40 flex h-[60vh] flex-col rounded-t-2xl border-t border-nvidia/30 bg-bg shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold text-nvidia">Coach IA</h2>
            <button
              onClick={onClose}
              className="text-muted transition-colors hover:text-white"
              aria-label="Fermer"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {hasMore && (
              <button
                onClick={loadMore}
                className="mx-auto block text-xs text-muted hover:text-nvidia transition-colors"
              >
                Charger plus
              </button>
            )}

            {isLoading && messages.length === 0 && (
              <p className="text-center text-xs text-muted/60 italic">
                Chargement...
              </p>
            )}

            {!isLoading && messages.length === 0 && !streaming && (
              <p className="text-center text-xs text-muted/60 italic mt-8">
                Salut ! Pose-moi une question sur tes études.
              </p>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "ml-auto bg-nvidia/20 text-white"
                    : "mr-auto bg-surface text-white/80"
                }`}
              >
                {msg.content}
              </div>
            ))}

            {streaming && streamingContent && (
              <div className="mr-auto max-w-[80%] rounded-xl bg-surface px-3 py-2 text-sm text-white/80">
                {streamingContent}
              </div>
            )}

            {streaming && !streamingContent && (
              <div className="mr-auto flex gap-1 rounded-xl bg-surface px-3 py-2">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-nvidia/60 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-nvidia/60 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-nvidia/60 [animation-delay:300ms]" />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border px-4 py-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écris ton message..."
                disabled={sending || streaming}
                className="flex-1 rounded-xl bg-surface px-3 py-2 text-sm text-white placeholder:text-muted/40 focus:outline-none focus:ring-1 focus:ring-nvidia/50 disabled:opacity-40"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending || streaming}
                className="rounded-xl bg-nvidia px-4 py-2 text-sm font-bold text-bg transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              >
                Envoyer
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
