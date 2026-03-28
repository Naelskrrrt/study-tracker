import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "NVIDIA Tracker <onboarding@resend.dev>";

export type DigestData = {
  userName: string;
  tasksCompleted: string[];
  xpEarned: number;
  studyTimeMin: number;
  streak: number;
  moodAvg: number | null;
  deadlines: { name: string; daysLeft: number }[];
};

export async function sendDigestEmail(
  to: string,
  data: DigestData,
  aiIntro?: string | null
) {
  const moodEmoji =
    data.moodAvg !== null
      ? data.moodAvg >= 4
        ? "\u{1F4AA}"
        : data.moodAvg >= 3
          ? "\u{1F610}"
          : "\u{1F634}"
      : "";

  const deadlineSection =
    data.deadlines.length > 0
      ? data.deadlines
          .map((d) => `- ${d.name}: ${d.daysLeft} jour${d.daysLeft !== 1 ? "s" : ""}`)
          .join("\n")
      : "Aucune deadline proche.";

  const hours = Math.round((data.studyTimeMin / 60) * 10) / 10;

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; color: #ededed; padding: 24px; border-radius: 12px;">
      <h2 style="color: #76b900; margin-top: 0;">Récap du jour</h2>
      <p>Salut ${data.userName} !</p>
      ${aiIntro ? `<p style="color: #a0d060; font-style: italic; margin: 12px 0;">${aiIntro}</p>` : ""}
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a;">Tâches</td>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a; text-align: right; font-weight: bold;">${data.tasksCompleted.length}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a;">XP gagné</td>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a; text-align: right; font-weight: bold; color: #76b900;">+${data.xpEarned} XP</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a;">Temps d'étude</td>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a; text-align: right; font-weight: bold;">${hours}h</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a;">Streak</td>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a; text-align: right; font-weight: bold; color: #ff6b6b;">${data.streak} jour${data.streak !== 1 ? "s" : ""} \u{1F525}</td>
        </tr>
        ${data.moodAvg !== null ? `<tr>
          <td style="padding: 8px;">Humeur moyenne</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">${data.moodAvg.toFixed(1)}/5 ${moodEmoji}</td>
        </tr>` : ""}
      </table>
      ${data.deadlines.length > 0 ? `<h3 style="color: #ffd60a;">Prochaines deadlines</h3><pre style="color: #a0a0c0; font-size: 13px;">${deadlineSection}</pre>` : ""}
      <p style="color: #7070a0; font-size: 12px; margin-top: 24px;">Continue comme ça. À demain !</p>
    </div>
  `;

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Récap: ${data.tasksCompleted.length} tâche${data.tasksCompleted.length !== 1 ? "s" : ""} | +${data.xpEarned} XP | Streak ${data.streak}j`,
    html,
  });
}

export async function generateDigestContent(
  data: DigestData
): Promise<string | null> {
  try {
    // Dynamic import to avoid loading AI SDK at module level for non-AI email paths
    const { generateText } = await import("ai");
    const { geminiFlash } = await import("@/lib/ai");

    const hours = Math.round((data.studyTimeMin / 60) * 10) / 10;
    const deadlineInfo =
      data.deadlines.length > 0
        ? data.deadlines
            .map((d) => `${d.name} dans ${d.daysLeft} jours`)
            .join(", ")
        : "aucune deadline proche";

    const prompt = `Tu es un coach TDAH. Ecris un paragraphe personnalise de 2-3 phrases pour l'email recap quotidien d'un etudiant.

Donnees du jour :
- Prenom : ${data.userName}
- Taches completees : ${data.tasksCompleted.length} (${data.tasksCompleted.join(", ") || "aucune"})
- XP gagnes : ${data.xpEarned}
- Temps d'etude : ${hours}h
- Streak : ${data.streak} jours
- Humeur moyenne : ${data.moodAvg !== null ? `${data.moodAvg.toFixed(1)}/5` : "non enregistree"}
- Deadlines : ${deadlineInfo}

Sois motivant, specifique et concis. Ecris en francais.`;

    const { text } = await generateText({
      model: geminiFlash,
      prompt,
    });

    return text;
  } catch {
    return null;
  }
}

type AlertData = {
  userName: string;
  alerts: { type: string; message: string }[];
};

export async function sendAlertEmail(to: string, data: AlertData) {
  const alertsHtml = data.alerts
    .map(
      (a) =>
        `<div style="padding: 12px; background: #1a1a2e; border-left: 3px solid #ff6b6b; margin-bottom: 8px; border-radius: 4px;">
          <strong style="color: #ff6b6b;">${a.type === "streak" ? "\u{1F525} Streak" : "\u{23F0} Deadline"}</strong>
          <p style="margin: 4px 0 0; color: #ededed;">${a.message}</p>
        </div>`
    )
    .join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; color: #ededed; padding: 24px; border-radius: 12px;">
      <h2 style="color: #ff6b6b; margin-top: 0;">Alerte</h2>
      <p>Salut ${data.userName},</p>
      ${alertsHtml}
      <p style="color: #7070a0; font-size: 12px; margin-top: 24px;">
        <a href="${process.env.NEXTAUTH_URL ?? "https://nvidia-tracker.vercel.app"}/dashboard" style="color: #76b900;">Ouvrir le dashboard</a>
      </p>
    </div>
  `;

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Alerte: ${data.alerts.map((a) => a.message).join(" | ")}`,
    html,
  });
}
