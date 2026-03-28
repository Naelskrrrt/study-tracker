"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  active: boolean;
  count?: number;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  duration: number;
};

const COLORS = ["#76b900", "#a8e063", "#ffd60a", "#6c63ff", "#ff6b6b", "#00b4d8", "#f472b6"];

export default function Confetti({ active, count = 20 }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) return;
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: -10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.8,
      duration: 1.5 + Math.random(),
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 2000);
    return () => clearTimeout(timer);
  }, [active, count]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              left: `${p.x}%`,
              top: "-5%",
              rotate: 0,
              opacity: 1,
              scale: p.scale,
            }}
            animate={{
              top: "110%",
              rotate: p.rotation + 720,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: p.duration, ease: "easeIn" }}
            className="absolute h-3 w-3 rounded-sm"
            style={{ backgroundColor: p.color }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
