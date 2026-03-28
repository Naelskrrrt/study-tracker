"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: "🏠" },
  { href: "/dashboard/tasks", label: "Tâches", icon: "📋" },
  { href: "/dashboard/journal", label: "Journal", icon: "📓" },
  { href: "/dashboard/graphs", label: "Graphes", icon: "📊" },
  { href: "/dashboard/shop", label: "Shop", icon: "🪙" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1"
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-2 h-0.5 w-8 rounded-full bg-nvidia"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`text-lg ${active ? "" : "opacity-50"}`}>
                {item.icon}
              </span>
              <span
                className={`text-[10px] font-semibold ${
                  active ? "text-nvidia" : "text-muted"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
