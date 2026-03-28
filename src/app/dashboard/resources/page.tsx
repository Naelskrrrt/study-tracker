"use client";

import { useState, useMemo } from "react";
import { PHASES, Resource } from "@/lib/data/tasks";

type ResourceEntry = Resource & {
  taskName: string;
  phaseId: string;
  phaseNum: string;
  phaseName: string;
  phaseColor: "green" | "purple" | "amber";
};

const TYPE_ICONS: Record<Resource["type"], string> = {
  video: "▶️",
  doc: "📖",
  article: "📄",
  exam: "🎓",
  tool: "🛠️",
  course: "🎓",
};

const PHASE_COLOR_CLASSES: Record<"green" | "purple" | "amber", string> = {
  green: "bg-green-900/40 text-green-400 border border-green-700/50",
  purple: "bg-purple-900/40 text-purple-400 border border-purple-700/50",
  amber: "bg-amber-900/40 text-amber-400 border border-amber-700/50",
};

const ALL_TYPES: Resource["type"][] = ["video", "doc", "article", "exam", "tool", "course"];

function collectResources(): ResourceEntry[] {
  const entries: ResourceEntry[] = [];
  for (const phase of PHASES) {
    for (const task of phase.tasks) {
      if (!task.resources) continue;
      for (const resource of task.resources) {
        entries.push({
          ...resource,
          taskName: task.name,
          phaseId: phase.id,
          phaseNum: phase.num,
          phaseName: phase.name,
          phaseColor: phase.color,
        });
      }
    }
  }
  return entries;
}

export default function ResourcesPage() {
  const allResources = useMemo(() => collectResources(), []);

  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<Resource["type"]>>(new Set());
  const [search, setSearch] = useState("");

  const toggleType = (type: Resource["type"]) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allResources.filter((r) => {
      if (selectedPhase && r.phaseId !== selectedPhase) return false;
      if (selectedTypes.size > 0 && !selectedTypes.has(r.type)) return false;
      if (q) {
        const matchName = r.name.toLowerCase().includes(q);
        const matchTask = r.taskName.toLowerCase().includes(q);
        if (!matchName && !matchTask) return false;
      }
      return true;
    });
  }, [allResources, selectedPhase, selectedTypes, search]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Ressources</h1>

      {/* Filters */}
      <div className="space-y-3">
        {/* Phase filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedPhase(null)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedPhase === null
                ? "bg-nvidia text-black"
                : "bg-surface border border-border text-gray-400 hover:text-white"
            }`}
          >
            Toutes les phases
          </button>
          {PHASES.map((phase) => (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(selectedPhase === phase.id ? null : phase.id)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedPhase === phase.id
                  ? "bg-nvidia text-black"
                  : "bg-surface border border-border text-gray-400 hover:text-white"
              }`}
            >
              Phase {phase.num}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors capitalize ${
                selectedTypes.has(type)
                  ? "bg-nvidia text-black"
                  : "bg-surface border border-border text-gray-400 hover:text-white"
              }`}
            >
              {TYPE_ICONS[type]} {type}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une ressource ou une tâche..."
          className="w-full rounded-xl bg-surface border border-border px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-nvidia transition-colors"
        />
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500">
        {filtered.length} ressource{filtered.length !== 1 ? "s" : ""}
        {allResources.length !== filtered.length ? ` sur ${allResources.length}` : ""}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-2xl bg-surface border border-border">
          <p className="text-gray-500 text-sm">Aucune ressource ne correspond aux filtres.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource, i) => (
            <a
              key={i}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2 rounded-2xl bg-surface border border-border p-4 transition-all hover:border-nvidia/60 hover:bg-white/5"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5" aria-hidden>
                  {TYPE_ICONS[resource.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white group-hover:text-nvidia transition-colors line-clamp-2">
                    {resource.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 line-clamp-1">{resource.taskName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-lg px-2 py-0.5 text-xs font-medium ${PHASE_COLOR_CLASSES[resource.phaseColor]}`}
                >
                  Phase {resource.phaseNum}
                </span>
                <span className="rounded-lg bg-white/5 border border-border px-2 py-0.5 text-xs text-gray-400 capitalize">
                  {resource.type}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
