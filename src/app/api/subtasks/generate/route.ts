import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiFlash } from "@/lib/ai";
import { generateObject } from "ai";
import { z } from "zod";
import { PHASES } from "@/lib/data/tasks";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = (await req.json()) as { taskId: string };

  // Find task in static data
  const task = PHASES.flatMap((p) => p.tasks).find((t) => t.id === taskId);
  if (!task)
    return Response.json({ error: "Task not found" }, { status: 404 });

  // Get user's completed tasks for context
  const completions = await prisma.taskCompletion.findMany({
    where: { userId: session.user.id },
    select: { taskId: true },
  });
  const completedIds = new Set(completions.map((c) => c.taskId));
  const completedNames = PHASES.flatMap((p) => p.tasks)
    .filter((t) => completedIds.has(t.id))
    .map((t) => t.name);

  const prompt = `Tu es un coach TDAH. Décompose cette tâche d'étude en 4-6 micro-sous-tâches de 10-15 minutes chacune.

Tâche : "${task.name}"
Détails : "${task.detail}"
XP : ${task.xp}

Tâches déjà complétées par l'étudiant : ${completedNames.join(", ") || "aucune"}

Règles :
- Chaque sous-tâche doit être faisable en 10-15 minutes
- Utilise des verbes d'action concrets (Regarder, Coder, Lire, Résumer...)
- Adapte au contexte NVIDIA/Deep Learning
- Sois spécifique (pas de "réviser le cours" mais "Résumer les 3 types de couches CNN")
- Génère exactement un tableau JSON de strings`;

  const { object } = await generateObject({
    model: geminiFlash,
    prompt,
    schema: z.object({
      subtasks: z
        .array(z.string())
        .min(4)
        .max(6)
        .describe("List of micro-subtask names"),
    }),
  });

  return Response.json({ subtasks: object.subtasks });
}
