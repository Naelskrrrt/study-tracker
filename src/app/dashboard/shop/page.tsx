"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCoins } from "@/hooks/useCoins";
import { useRewards } from "@/hooks/useRewards";
import Confetti from "@/components/ui/Confetti";
import Toast from "@/components/ui/Toast";

const REWARD_ICONS: Record<string, string> = {
  gift: "🎁",
  gamepad: "🎮",
  food: "🍕",
  movie: "🎬",
  music: "🎵",
  shopping: "🛍️",
  travel: "✈️",
  star: "⭐",
};

const ICON_LABELS: Record<string, string> = {
  gift: "Cadeau",
  gamepad: "Jeu vidéo",
  food: "Nourriture",
  movie: "Cinéma",
  music: "Musique",
  shopping: "Shopping",
  travel: "Voyage",
  star: "Étoile",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ShopPage() {
  const { balance, earned, spent, isLoading: coinsLoading, refresh: refreshCoins } = useCoins();
  const { available, redeemed, createReward, redeemReward, isLoading: rewardsLoading } = useRewards();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCost, setFormCost] = useState<number | "">("");
  const [formIcon, setFormIcon] = useState("gift");
  const [submitting, setSubmitting] = useState(false);

  const [confettiActive, setConfettiActive] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
  }, []);

  const closeToast = useCallback(() => {
    setToast((t) => ({ ...t, visible: false }));
  }, []);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCost || Number(formCost) < 1) return;

    setSubmitting(true);
    try {
      await createReward({
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        cost: Number(formCost),
        icon: formIcon,
      });
      setFormName("");
      setFormDesc("");
      setFormCost("");
      setFormIcon("gift");
      setShowForm(false);
      showToast("Récompense créée !");
    } catch {
      showToast("Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRedeem = async (id: string, name: string) => {
    try {
      await redeemReward(id);
      refreshCoins();
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 2100);
      showToast(`🎉 "${name}" débloquée !`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du déblocage.";
      showToast(message);
    }
  };

  const isLoading = coinsLoading || rewardsLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nvidia border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <Confetti active={confettiActive} count={40} />
      <Toast message={toast.message} visible={toast.visible} onClose={closeToast} />

      {/* Coin Balance Header */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div>
            <p className="text-4xl font-bold text-white">
              🪙 {balance}
            </p>
            <p className="mt-1 text-sm text-muted">Solde actuel</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-lg font-semibold text-nvidia">+{earned}</p>
              <p className="text-xs text-muted">Gagnés</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-red-400">−{spent}</p>
              <p className="text-xs text-muted">Dépensés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Reward Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">
            Récompenses
          </h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl border border-nvidia/30 bg-nvidia/10 px-4 py-2 text-sm font-semibold text-nvidia transition-colors hover:bg-nvidia/20"
          >
            {showForm ? "Annuler" : "+ Créer une récompense"}
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <form
                onSubmit={handleCreateReward}
                className="rounded-2xl border border-border bg-surface p-5 space-y-4"
              >
                <h3 className="text-base font-semibold text-white">Nouvelle récompense</h3>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">Nom *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Soirée cinéma"
                    className="w-full rounded-xl border border-border bg-black/20 px-3 py-2 text-sm text-white placeholder-muted focus:border-nvidia/50 focus:outline-none focus:ring-1 focus:ring-nvidia/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">Description (optionnel)</label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Détails de la récompense..."
                    rows={2}
                    className="w-full rounded-xl border border-border bg-black/20 px-3 py-2 text-sm text-white placeholder-muted focus:border-nvidia/50 focus:outline-none focus:ring-1 focus:ring-nvidia/30 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">Coût en pièces *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="50"
                    className="w-full rounded-xl border border-border bg-black/20 px-3 py-2 text-sm text-white placeholder-muted focus:border-nvidia/50 focus:outline-none focus:ring-1 focus:ring-nvidia/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted">Icône</label>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {Object.entries(REWARD_ICONS).map(([key, emoji]) => (
                      <button
                        key={key}
                        type="button"
                        title={ICON_LABELS[key]}
                        onClick={() => setFormIcon(key)}
                        className={`flex flex-col items-center gap-0.5 rounded-xl border p-2 text-xl transition-colors ${
                          formIcon === key
                            ? "border-nvidia bg-nvidia/20"
                            : "border-border bg-black/10 hover:border-nvidia/40"
                        }`}
                      >
                        {emoji}
                        <span className="text-[10px] text-muted leading-tight">{ICON_LABELS[key]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !formName.trim() || !formCost || Number(formCost) < 1}
                  className="w-full rounded-xl bg-nvidia py-2.5 text-sm font-bold text-black transition-opacity disabled:opacity-50"
                >
                  {submitting ? "Création..." : "Créer la récompense"}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Available Rewards Grid */}
      {available.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted text-sm">
          Aucune récompense disponible. Crée-en une !
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((reward) => {
            const canAfford = balance >= reward.cost;
            return (
              <motion.div
                key={reward.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{REWARD_ICONS[reward.icon] ?? "🎁"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{reward.name}</p>
                    {reward.description && (
                      <p className="mt-0.5 text-xs text-muted line-clamp-2">{reward.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-sm font-bold text-amber-400">🪙 {reward.cost}</span>
                  <button
                    onClick={() => handleRedeem(reward.id, reward.name)}
                    disabled={!canAfford}
                    title={!canAfford ? `Il vous manque ${reward.cost - balance} pièces` : "Débloquer cette récompense"}
                    className={`rounded-xl px-4 py-1.5 text-sm font-bold transition-all ${
                      canAfford
                        ? "bg-nvidia/20 text-nvidia border border-nvidia/40 hover:bg-nvidia/30 cursor-pointer"
                        : "bg-white/5 text-muted border border-border cursor-not-allowed opacity-60"
                    }`}
                  >
                    {canAfford ? "Débloquer" : `🪙 ${reward.cost}`}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Redeemed Rewards Section */}
      {redeemed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">
            Débloquées
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {redeemed.map((reward) => (
              <div
                key={reward.id}
                className="rounded-2xl border border-border bg-surface/50 p-4 flex items-center gap-3 opacity-70"
              >
                <span className="text-2xl grayscale">{REWARD_ICONS[reward.icon] ?? "🎁"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{reward.name}</p>
                  <p className="text-xs text-muted">
                    Débloquée le{" "}
                    {reward.redeemedAt ? formatDate(reward.redeemedAt) : "—"}
                  </p>
                </div>
                <span className="text-xs text-muted font-medium">🪙 {reward.cost}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
