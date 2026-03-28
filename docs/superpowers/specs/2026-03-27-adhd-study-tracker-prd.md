# PRD — NVIDIA Certification ADHD Study Tracker v2

**Date** : 2026-03-27
**Objectif** : Transformer le tracker existant en outil optimal pour un cerveau ADHD qui prépare les certifications NVIDIA (NCA-GENL, NCP-GENL, NCP-AAI).
**Approche** : Incrémentale en 3 vagues. Chaque feature est un module indépendant.
**Note** : Pas de flashcards/quiz — l'utilisateur utilise NotebookLM pour la révision.

---

## Vague 1 — Fondations (outils quotidiens)

### 1.1 Timer Flow

**Problème ADHD** : Time blindness + hyperfocus non-régulé = sessions sans fin ou incapacité à démarrer.

**Concept** : Timer continu (pas de Pomodoro rigide). L'utilisateur décide quand il pause, mais le système envoie des "nudges" à intervalle régulier pour vérifier.

**Modèle de données** :
```prisma
model StudySession {
  id             String   @id @default(cuid())
  userId         String
  taskId         String?
  startedAt      DateTime @default(now())
  endedAt        DateTime?
  durationMin    Int?
  pauseCount     Int      @default(0)
  totalPauseMin  Int      @default(0)
  coinsEarned    Int      @default(0)
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Comportement** :
- Bouton "Start Flow" dans le dashboard + dans chaque TaskItem
- Timer affiche le temps écoulé en continu
- Nudge configurable toutes les 15/30/45/60 min (défaut : 30 min) :
  - Notification douce : "Tu tournes depuis Xmin — pause ?"
  - 2 boutons : "Je continue" | "Pause"
- Pendant la pause : compteur de pause séparé
- Bouton "Stop" → fin de session → log en BDD
- Si lié à une tâche : le temps est attribué à cette tâche
- Protection hyperfocus : après 2h sans pause, nudge plus insistant (vibration visuelle, couleur orange → rouge)

**UI** :
- Barre fixe en haut du dashboard : `[temps écoulé] | [tâche en cours] | [Pause] [Stop]`
- Compacte (40px de hauteur), se collapse quand pas de session active
- State global via React Context (persiste entre les pages du dashboard)
- Le timer continue si on navigue entre pages

**API** :
- `POST /api/sessions` — démarrer une session
- `PATCH /api/sessions/[id]` — mettre à jour (pause, fin)
- `GET /api/sessions` — historique des sessions (filtrable par date/tâche)

**Coins** : 1 coin par tranche de 15 min d'étude (calculé à la fin de la session).

---

### 1.2 Micro-tâches (sous-étapes)

**Problème ADHD** : Paralysie face aux grosses tâches. "Comprendre backprop, gradients, loss functions" est trop vague et intimidant.

**Concept** : Chaque tâche se décompose en sous-étapes de 10-15 min. Sous-étapes pré-remplies pour les tâches techniques, champ libre pour les tâches certif/exam.

**Modèle de données** :
```prisma
model SubTask {
  id          String   @id @default(cuid())
  userId      String
  taskId      String
  name        String
  sortOrder   Int      @default(0)
  completed   Boolean  @default(false)
  completedAt DateTime?
  xpEarned    Int      @default(0)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, taskId, name])
}
```

**Données statiques** : Enrichir `src/lib/data/tasks.ts` avec un champ `subtasks?: string[]` pour les tâches techniques. Exemple :
```ts
{
  id: "1-1",
  name: "Neural networks & backprop",
  detail: "Comprendre backprop, gradients, loss functions",
  xp: 60,
  subtasks: [
    "Regarder vidéo 3Blue1Brown — Neural Networks (20 min)",
    "Lire article: What is backpropagation? (15 min)",
    "Coder un perceptron from scratch en Python (30 min)",
    "Exercice: calculer un gradient à la main (15 min)",
    "Quiz NotebookLM: backprop & gradients (15 min)"
  ]
}
```

**Comportement** :
- Pour les tâches avec `subtasks` pré-définis : affichage des checkboxes directement
- Pour les tâches certif (sans `subtasks`) : champ "Ajouter une sous-étape" libre
- L'utilisateur peut toujours ajouter/supprimer/réordonner ses propres sous-étapes
- Chaque sous-étape complétée donne du XP fractionné (XP total de la tâche / nombre de sous-étapes)
- Quand toutes les sous-étapes sont cochées → la tâche parent se complète automatiquement
- Micro-dopamine : animation + son subtil à chaque sous-étape cochée

**UI** :
- Sous le TaskItem, un accordion déplié par défaut pour la tâche en cours
- Checkboxes indentées sous la tâche parent
- Barre de progression mini par tâche (3/5 sous-étapes)
- Bouton "+" pour ajouter une sous-étape personnalisée
- Drag & drop pour réordonner (optionnel v2)

**API** :
- `GET /api/subtasks?taskId=X` — sous-étapes d'une tâche
- `POST /api/subtasks` — créer une sous-étape
- `PATCH /api/subtasks/[id]` — toggle completion
- `DELETE /api/subtasks/[id]` — supprimer

**Coins** : 1 coin par sous-étape complétée.

---

### 1.3 Quick Capture (Brain Dump)

**Problème ADHD** : Pensées parasites pendant l'étude. Si on ne les note pas, elles tournent en boucle. Si on quitte l'app pour les noter, on perd le focus.

**Concept** : Mini-modal déclenché par raccourci clavier. Capture rapide, disparaît immédiatement. Les captures s'accumulent et sont consultables plus tard.

**Modèle de données** :
```prisma
model QuickCapture {
  id        String   @id @default(cuid())
  userId    String
  content   String   @db.Text
  createdAt DateTime @default(now())
  archived  Boolean  @default(false)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Comportement** :
- Raccourci clavier : `Ctrl+K` (ou `Cmd+K` sur Mac) ouvre le modal
- Modal : champ texte auto-focus + bouton "Capturer" (ou Enter pour valider)
- Animation slide-down depuis le haut, disparaît après save
- Les captures sont listées dans une section "Brain Dump" accessible depuis le dashboard
- Possibilité d'archiver les captures traitées
- Le modal fonctionne depuis n'importe quelle page du dashboard

**UI** :
- Modal overlay centré en haut de l'écran (style command palette)
- Fond semi-transparent avec backdrop blur
- Champ texte avec placeholder "Qu'est-ce qui te passe par la tête ?"
- Pas de catégorisation — c'est volontairement simple et rapide
- Liste des captures : page dédiée ou section collapsible dans le dashboard

**API** :
- `POST /api/captures` — créer une capture
- `GET /api/captures` — lister (non-archivées par défaut)
- `PATCH /api/captures/[id]` — archiver

---

## Vague 2 — Motivation (boucle de récompense)

### 2.1 Système de Coins & Récompenses

**Problème ADHD** : Le XP et les niveaux sont abstraits. Le cerveau ADHD a besoin de récompenses tangibles et personnalisées pour maintenir la motivation.

**Concept** : Monnaie virtuelle ("coins") gagnée en parallèle du XP. L'utilisateur crée son propre catalogue de récompenses et les débloque avec ses coins.

**Modèle de données** :
```prisma
model Reward {
  id          String    @id @default(cuid())
  userId      String
  name        String
  description String?
  cost        Int
  icon        String    @default("gift")
  redeemed    Boolean   @default(false)
  redeemedAt  DateTime?
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Le solde de coins n'est pas stocké directement — il est calculé :
`coins gagnés (sessions + sous-étapes + streaks + mood logs) - coins dépensés (rewards redeemed)`

**Sources de coins** :
| Action | Coins |
|--------|-------|
| 15 min d'étude (session flow) | 1 |
| Sous-étape complétée | 1 |
| Tâche complétée | 3 |
| Certification passée | 25 |
| Streak 7 jours | 5 |
| Streak 30 jours | 20 |
| Log mood quotidien | 1 |
| Entrée journal | 1 |

**Comportement** :
- Solde de coins affiché dans le header du dashboard (à côté du XP)
- Page "Shop" dans le dashboard : catalogue de récompenses créées par l'utilisateur
- Bouton "Créer une récompense" : nom, description, coût en coins, icône
- Bouton "Débloquer" quand assez de coins (grisé sinon)
- Historique des récompenses débloquées
- Animation de célébration quand une récompense est débloquée

**Exemples de récompenses** :
- "Soirée jeu vidéo" — 10 coins
- "Resto japonais" — 30 coins
- "Nouveau gadget" — 100 coins

**API** :
- `GET /api/rewards` — liste des récompenses
- `POST /api/rewards` — créer une récompense
- `PATCH /api/rewards/[id]` — débloquer (redeem)
- `DELETE /api/rewards/[id]` — supprimer
- `GET /api/coins/balance` — solde calculé (somme des gains - somme des dépenses)
- `GET /api/coins/history` — historique détaillé des gains

**UI** :
- Header dashboard : `[XP: 450] [Coins: 23]`
- Page Shop : grille de cartes avec nom, coût, icône, bouton débloquer
- Section "Débloquées" en bas avec historique

---

### 2.2 Journal d'étude auto-généré

**Problème ADHD** : Impression de ne pas avancer. Difficulté à se souvenir de ce qu'on a fait. Le journal sert de preuve tangible de progression.

**Concept** : Entrée de journal pré-remplie automatiquement avec l'activité du jour (tâches, XP, temps, mood). L'utilisateur ajoute ses notes par-dessus.

**Modèle de données** :
```prisma
model JournalEntry {
  id        String   @id @default(cuid())
  userId    String
  date      String
  autoData  Json
  notes     String?  @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
}
```

Le champ `autoData` (JSON) contient :
```json
{
  "tasksCompleted": ["Neural networks & backprop", "PyTorch basics"],
  "subtasksCompleted": 5,
  "xpEarned": 120,
  "studyTimeMin": 85,
  "sessionsCount": 2,
  "moodLevel": 4,
  "coinsEarned": 8,
  "streak": 12
}
```

**Comportement** :
- Auto-généré à la fin de chaque journée (ou au premier accès du lendemain)
- L'utilisateur peut ajouter/éditer ses notes à tout moment
- Affichage chronologique inversé (plus récent en haut)
- Prompts optionnels pour guider les notes : "Qu'est-ce qui a été difficile ?", "Prochaine étape ?"
- Relecture des entrées passées pour le boost de motivation

**UI** :
- Page "Journal" dans le dashboard
- Chaque entrée : date + résumé auto (icônes + stats) + zone de notes éditable
- Résumé auto compact : `[3 tâches] [120 XP] [1h25 étude] [mood: 💪]`
- Champ notes avec placeholder "Ajoute tes réflexions..."
- Scroll infini ou pagination par semaine

**API** :
- `GET /api/journal` — liste des entrées (paginé)
- `GET /api/journal/[date]` — entrée d'un jour (auto-génère si absente)
- `PATCH /api/journal/[date]` — mettre à jour les notes

---

### 2.3 Ressources NVIDIA

**Problème** : Les tâches disent quoi apprendre mais pas où. L'utilisateur perd du temps à chercher les bonnes ressources.

**Concept** : Liens de ressources intégrés dans chaque tâche + page centralisée de toutes les ressources.

**Données statiques** : Enrichir `src/lib/data/tasks.ts` avec un champ `resources` :
```ts
{
  id: "1-1",
  name: "Neural networks & backprop",
  resources: [
    { type: "video", name: "3Blue1Brown — Neural Networks", url: "https://..." },
    { type: "doc", name: "NVIDIA DLI — Deep Learning Fundamentals", url: "https://..." },
    { type: "article", name: "Backpropagation Step by Step", url: "https://..." },
    { type: "exam", name: "NCA-GENL Blueprint", url: "https://..." }
  ]
}
```

**Types de ressources** : `video` | `doc` | `article` | `exam` | `tool` | `course`

**Comportement** :
- Dans chaque TaskItem : bouton "Ressources" qui déroule la liste de liens
- Icône par type (play pour vidéo, book pour doc, etc.)
- Les liens ouvrent dans un nouvel onglet
- Page `/dashboard/resources` : toutes les ressources groupées par phase, filtrables par type
- Barre de recherche dans la page ressources

**UI dans TaskItem** :
- Bouton discret sous le détail de la tâche : `[Ressources (3)]`
- Dropdown avec icônes + noms cliquables

**UI page dédiée** :
- Filtres par phase (1/2/3) et par type (vidéo/doc/article/exam)
- Grille de cartes avec icône type + nom + lien
- Barre de recherche en haut

**API** : Pas d'API — données statiques dans `tasks.ts`. La page ressources lit directement les données.

---

## Vague 3 — Intelligence (dashboard adaptatif)

### 3.1 Mode adaptatif Mood

**Problème ADHD** : Quand l'énergie est basse, un dashboard chargé de stats et d'options crée de l'anxiété. Quand l'énergie est haute, on veut tout voir.

**Concept** : Le dashboard s'adapte au mood enregistré. 3 modes qui changent le layout et le contenu visible.

**Modes** :

#### Mode "En feu" / "Motivé" (mood 4-5) — Dashboard complet
- Toutes les stats visibles
- XP bar, streak, contribution graph
- Toutes les phases de tâches dépliées
- Stats avancées accessibles
- Timer flow prominent
- Coins et shop visibles

#### Mode "Correct" (mood 3) — Dashboard standard
- Layout actuel (pas de changement)
- Focus Card en avant
- Stats principales uniquement

#### Mode "Fatigué" / "Pas là" (mood 1-2) — Dashboard zen
- Layout minimal : fond plus sombre, moins de contraste
- Seuls éléments visibles :
  - Message bienveillant adapté
  - Focus Card avec **une seule** suggestion passive (vidéo courte)
  - Streak (pour ne pas la perdre : "1 mini tâche suffit")
  - Bouton "Log mood" (pour les coins)
- Tout le reste masqué (pas supprimé, juste caché)
- Un lien "Voir tout le dashboard" pour override si besoin

**Implémentation** :
- React Context `MoodMode` qui wrap le dashboard layout
- Le mood du jour détermine le mode au chargement
- L'utilisateur peut changer de mood → le dashboard se réarrange en temps réel avec transition animée (framer-motion)
- Le changement de mode est une animation douce, pas un flash

**Pas de nouveau modèle Prisma** — utilise le MoodEntry existant.

---

### 3.2 Stats avancées

**Problème ADHD** : Besoin de feedback constant + patterns pour comprendre son propre fonctionnement.

**Nouveaux graphiques sur la page `/dashboard/graphs`** :

#### A. Corrélation mood/productivité
- Scatter plot : axe X = mood (1-5), axe Y = XP gagné ce jour-là
- Trendline pour voir la corrélation
- Insight textuel : "Tu es 2.5x plus productif quand tu es 'Motivé' vs 'Fatigué'"

#### B. Prédiction de date de fin
- Par phase : barre de progression + date estimée de fin basée sur le rythme moyen des 14 derniers jours
- Calcul : `jours restants = tâches restantes / (tâches complétées / jours actifs sur 14j)`
- Affichage : "Phase 2 — fin estimée : 15 avril 2026" avec un indicateur vert/orange/rouge selon si c'est avant/après la deadline

#### C. Patterns jour/heure
- Heatmap : jours de la semaine (L-D) x tranches horaires (si données timer disponibles)
- Sinon : bar chart des jours les plus productifs de la semaine
- Insight : "Tes mardis et jeudis sont tes jours les plus productifs"

#### D. Temps d'étude
- Bar chart empilé par phase : temps total étudié par semaine
- Ligne de tendance : moyenne mobile sur 4 semaines
- StatCard : "Total : 42h étudiées"

**API** :
- `GET /api/stats/correlation` — données mood vs XP
- `GET /api/stats/predictions` — prédictions de fin par phase
- `GET /api/stats/patterns` — patterns jour/heure
- `GET /api/stats/study-time` — temps d'étude agrégé

---

### 3.3 Notifications & Email

**Problème ADHD** : L'oubli est un symptôme majeur. Sans rappels externes, la streak se perd, les deadlines passent.

#### Notifications navigateur (Web Push)
- Permission demandée au premier login
- Déclencheurs :
  - Streak en danger (pas d'activité aujourd'hui, il est 20h) — **critique**
  - Deadline < 3 jours — **critique**
  - Nudge du timer flow (pause suggérée) — **normal**
  - Level up / récompense débloquée — **célébration**

**Implémentation** : Service Worker + Web Push API. Les notifications sont déclenchées côté client par un check périodique (pas de serveur push nécessaire pour le MVP).

#### Notifications in-app
- Bandeau en haut du dashboard pour :
  - "Ta streak de 12j va se perdre — fais 1 tâche !"
  - "Deadline NCA-GENL dans 5 jours"
  - "Webinar NVIDIA (-50%) dans 34 jours"
- Toast pour les événements immédiats (déjà existant, réutiliser)

#### Email
- **Provider** : Resend (simple, API-first, free tier 100 emails/jour)
- **Digest quotidien** (configurable : matin ou soir) :
  - Résumé de la veille : tâches, XP, temps, streak
  - Prochaines deadlines
  - Encouragement personnalisé basé sur le mood moyen
- **Alertes critiques** (temps réel) :
  - Streak en danger (envoyé à 20h si pas d'activité)
  - Deadline < 3 jours
  - Webinar NVIDIA approche

**Modèle de données** :
```prisma
model NotificationPreference {
  id              String  @id @default(cuid())
  userId          String  @unique
  emailDigest     Boolean @default(true)
  emailAlerts     Boolean @default(true)
  digestTime      String  @default("20:00")
  pushEnabled     Boolean @default(false)
  pushSubscription Json?
  user            User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**API** :
- `GET /api/notifications/preferences` — préférences
- `PATCH /api/notifications/preferences` — mettre à jour
- `POST /api/notifications/subscribe` — enregistrer push subscription
- `POST /api/email/digest` — endpoint appelé par un cron Vercel
- `POST /api/email/alert` — endpoint pour alertes critiques

**Cron Vercel** (`vercel.json`) :
```json
{
  "crons": [
    { "path": "/api/email/digest", "schedule": "0 20 * * *" },
    { "path": "/api/email/alert", "schedule": "0 */6 * * *" }
  ]
}
```

---

## Vague 4 — IA (LLM-powered boost)

**Provider** : OpenRouter (API unifiée, accès à 290+ modèles, pas de markup sur les prix providers). Les appels LLM passent par des API routes serverless — la clé API n'est jamais exposée côté client. Variable d'env : `OPENROUTER_API_KEY`.

**Intégration** : OpenRouter est compatible OpenAI SDK — on utilise le Vercel AI SDK (`ai` npm package) avec le provider OpenRouter. Un seul endpoint, fallback automatique entre providers.

**Modèles recommandés** :

| Usage | Modèle | Prix (input/output per 1M tokens) | Pourquoi |
|-------|--------|-----------------------------------|----------|
| Chat temps réel, nudges, debrief | **DeepSeek V3.2** | $0.32 / $0.89 | ~90% perf GPT-5.4 à 1/50e du coût, excellent en français, rapide |
| Génération micro-tâches, digest email | **Gemini 3.1 Flash Lite** | $0.25 / $1.50 | 1M context, ultra rapide, bon pour les tâches structurées |
| Fallback gratuit (rate-limited) | **DeepSeek R1 (free)** | $0 / $0 | Gratuit, bon raisonnement, 20 req/min max |

**Stratégie de coût** : Commencer avec le modèle le moins cher qui fonctionne, escalader si besoin. DeepSeek V3.2 en défaut → Gemini Flash Lite si besoin de plus de contexte → fallback gratuit DeepSeek R1 si budget épuisé.

---

### 4.1 Coach ADHD personnel

**Problème ADHD** : Pas de feedback humain entre les sessions d'étude. La voix intérieure ADHD est souvent critique ("t'es nul, t'avances pas"). Un coach IA bienveillant contrebalance ça.

**Concept** : Chat contextuel intégré au dashboard. Le LLM a accès à toutes tes données (progression, mood, streaks, sessions, journal) et te parle comme un coach spécialisé ADHD.

**Use cases** :
- "J'arrive pas à me motiver aujourd'hui" → Le coach voit ton mood, ta streak, et adapte sa réponse
- "Explique-moi les Transformers simplement" → Aide à l'étude avec contexte de ta progression
- "Par quoi je commence ?" → Suggestion basée sur ton mood, ton énergie, et ce qui reste à faire
- "Je me sens nul" → Réponse basée sur tes stats réelles : "Tu as fait 45h d'étude, complété 12 tâches, et ta streak est à 8j. C'est pas rien."

**System prompt du coach** :
```
Tu es un coach d'étude spécialisé ADHD. Tu accompagnes {nom} dans sa préparation
aux certifications NVIDIA (NCA-GENL, NCP-GENL, NCP-AAI).

Règles :
- Toujours bienveillant, jamais culpabilisant
- Réponses courtes (3-5 phrases max) sauf si l'utilisateur demande plus
- Utilise les données réelles pour encourager (pas de platitudes vides)
- Si énergie basse : suggère des micro-actions ou valide le repos
- Si énergie haute : challenge et pousse vers les tâches ambitieuses
- Parle en français
- Connais les spécificités ADHD : time blindness, paralysie, hyperfocus, rejet sensible

Contexte actuel :
{données injectées dynamiquement}
```

**UI** :
- Bouton chat flottant en bas à droite (au-dessus du BottomNav)
- Panel slide-up avec historique de conversation
- Input texte + bouton envoyer
- Les messages du coach ont un avatar distinct
- Le chat se ferme facilement (pas intrusif)

**Modèle de données** :
```prisma
model ChatMessage {
  id        String   @id @default(cuid())
  userId    String
  role      String   // "user" | "assistant"
  content   String   @db.Text
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**API** :
- `POST /api/chat` — envoyer un message, reçoit la réponse streamée
- `GET /api/chat/history` — historique (paginé, 50 derniers messages)

**Coins** : 0 — le coach est gratuit, c'est un outil pas une récompense.

---

### 4.2 Debrief de session intelligent

**Problème ADHD** : Après une session d'étude, le cerveau ADHD passe immédiatement à autre chose. Pas de consolidation de ce qui a été appris.

**Concept** : Quand tu arrêtes le timer flow, le LLM génère un mini-debrief basé sur ce que tu as fait pendant la session.

**Déclencheur** : Fin de session (bouton Stop du timer).

**Input au LLM** :
```json
{
  "duration": "1h25",
  "tasksCompleted": ["PyTorch basics"],
  "subtasksCompleted": ["Installer PyTorch", "Suivre tuto tensors", "Coder premier réseau"],
  "mood": 4,
  "notes": "contenu du brain dump pendant la session"
}
```

**Output** : 3-4 lignes max :
```
Session solide ! En 1h25 tu as posé les bases de PyTorch — tensors,
premier réseau, c'est du concret. Demain tu peux enchaîner avec les
DataLoaders, c'est la suite logique. Ta streak passe à 9 jours.
```

**UI** : Modal qui apparaît après le stop du timer (même style que AchievePopup). Bouton "Fermer" + le debrief est sauvegardé dans le journal du jour.

**API** : `POST /api/sessions/[id]/debrief` — génère et retourne le debrief.

---

### 4.3 Journal enrichi par IA

**Problème** : Le journal auto-généré liste des faits. Le LLM transforme ces faits en un récit motivant et personnalisé.

**Concept** : En plus du résumé factuel, le LLM génère un paragraphe de synthèse quotidien.

**Input** : Les `autoData` du JournalEntry du jour.

**Output** (exemple) :
```
Journée productive malgré un démarrage lent (mood 3 → 4 en fin de session).
Tu as attaqué les Transformers, le sujet le plus dense de Phase 1, et tu
as tenu 1h45 de flow. Le fait que tu aies posé 3 captures dans le brain dump
montre que ton cerveau était actif. À ce rythme, Phase 1 sera bouclée d'ici
le 8 avril — bien avant ta deadline.
```

**Déclencheur** : Généré automatiquement à la première visite du journal le lendemain, ou manuellement via un bouton "Générer le résumé IA".

**UI** : Section en haut de l'entrée journal, stylisée différemment (bordure verte, icône IA). Editable si l'utilisateur veut modifier.

**API** : `POST /api/journal/[date]/summary` — génère le résumé IA.

---

### 4.4 Digest email intelligent

**Problème** : Les emails digest template sont ennuyeux et finissent ignorés. Un digest rédigé par un LLM est plus engageant et personnalisé.

**Concept** : Le cron quotidien envoie un email dont le contenu est généré par le LLM, pas un template statique.

**Input au LLM** : Stats de la veille + tendances de la semaine + deadlines + streak.

**Output** (exemple email) :
```
Salut ! Hier tu as enchaîné 2 sessions pour un total de 2h10 d'étude
— ton meilleur jour de la semaine. Tu es à 62% de Phase 2, et au
rythme actuel tu la boucles le 12 avril.

Petite alerte : le webinar NVIDIA (-50% sur les exams) est dans 33 jours.
Si tu veux en profiter pour NCA-GENL, il te reste 4 tâches à finir
avant de tenter l'exam.

Ta streak est à 14 jours. Impressionnant.

À ce soir pour la prochaine session ?
```

**Modèle** : Gemini 3.1 Flash Lite (asynchrone, bon contexte, pas cher).

**Implémentation** : Le cron `/api/email/digest` appelle le LLM avant d'envoyer via Resend.

---

### 4.5 Génération de micro-tâches

**Problème ADHD** : Même avec des sous-étapes pré-remplies, certaines tâches (surtout en Phase 2-3) sont difficiles à décomposer soi-même.

**Concept** : Bouton "Décomposer avec l'IA" sur chaque tâche sans sous-étapes. Le LLM génère 4-6 sous-étapes de 10-15 min adaptées au niveau de l'utilisateur.

**Input** :
```json
{
  "task": { "name": "LoRA & PEFT fine-tuning", "detail": "Fine-tuner un LLM avec LoRA..." },
  "phase": 2,
  "completedTasks": ["liste des tâches déjà faites"],
  "userLevel": "Praticien (500 XP)"
}
```

**Output** :
```json
[
  "Lire l'article 'LoRA: Low-Rank Adaptation' — concepts clés (15 min)",
  "Installer et configurer PEFT avec Hugging Face (10 min)",
  "Fine-tuner un petit modèle (GPT-2) avec LoRA sur un dataset texte (30 min)",
  "Comparer les résultats avant/après fine-tuning (15 min)",
  "Tester avec un modèle plus gros (Llama) si GPU dispo (20 min)",
  "Documenter les hyperparamètres optimaux trouvés (10 min)"
]
```

**UI** : Bouton "Décomposer avec l'IA" visible quand une tâche n'a pas de sous-étapes. Loading state pendant la génération. Les sous-étapes générées sont éditables/supprimables.

**API** : `POST /api/subtasks/generate` — génère les sous-étapes pour une tâche donnée.

---

### 4.6 Encouragements contextuels (Nudge IA)

**Problème ADHD** : Les messages statiques ("Continue !") deviennent invisibles après 3 jours. Le cerveau ADHD a besoin de nouveauté constante.

**Concept** : Les messages d'encouragement dans l'app sont générés par le LLM, différents à chaque fois, basés sur le contexte réel.

**Points d'injection** :
| Moment | Contexte injecté | Exemple |
|--------|-----------------|---------|
| Login du jour | streak, mood veille, dernière activité | "Jour 15. Hier tu as attaqué RAG agents — costaud. Aujourd'hui on fait quoi ?" |
| Tâche complétée | tâche, XP, progression phase | "TensorRT-LLM, check. C'était le boss de Phase 2 et tu l'as eu." |
| Streak milestone (7, 14, 30, 60, 90) | streak, stats | "30 jours. Un mois complet. La plupart des gens lâchent à 5 jours." |
| Retour après absence (>2 jours) | dernière activité, streak perdue | "3 jours off, c'est normal. Ta progression n'a pas bougé — elle t'attend." |
| Mood bas (1-2) | mood, streak, progression | "Jour difficile. Ta streak compte même avec 1 micro-tâche de 5 min." |

**Cache** : Les messages sont générés une fois par événement et cachés en mémoire (pas de re-génération à chaque render). Rafraîchis toutes les 24h max.

**Modèle** : DeepSeek V3.2 (rapide, les messages sont courts).

**API** : `GET /api/nudge?trigger=login` — retourne un message contextuel. Cache côté serveur avec TTL 24h.

---

### Résumé Vague 4

| Feature | Modèle | Fréquence | Coût estimé |
|---------|--------|-----------|-------------|
| Coach ADHD | DeepSeek V3.2 | À la demande | ~$0.002/conversation |
| Debrief session | DeepSeek V3.2 | Fin de session | ~$0.0005/debrief |
| Journal enrichi | DeepSeek V3.2 | 1x/jour | ~$0.0005/jour |
| Digest email | Gemini 3.1 Flash Lite | 1x/jour | ~$0.002/jour |
| Génération micro-tâches | Gemini 3.1 Flash Lite | À la demande | ~$0.001/génération |
| Nudges contextuels | DeepSeek V3.2 | ~5x/jour | ~$0.001/jour |

**Coût mensuel estimé** : < $1 pour un usage quotidien actif (5-10x moins cher qu'Anthropic/OpenAI direct). Avec le fallback gratuit DeepSeek R1, potentiellement $0 pour un usage modéré.

---

## Nouveaux modèles Prisma (résumé)

```prisma
// Vague 1
model StudySession { ... }
model SubTask { ... }
model QuickCapture { ... }

// Vague 2
model Reward { ... }
model JournalEntry { ... }

// Vague 3
model NotificationPreference { ... }

// Vague 4
model ChatMessage { ... }
```

Relations à ajouter sur `User` :
```prisma
model User {
  // ... existant ...
  studySessions          StudySession[]
  subTasks               SubTask[]
  quickCaptures          QuickCapture[]
  rewards                Reward[]
  journalEntries         JournalEntry[]
  notificationPreference NotificationPreference?
  chatMessages           ChatMessage[]
}
```

---

## Navigation mise à jour

Bottom nav actuel : Home | Tasks | Graphs | Budget

Proposition : **5 items** (max pour mobile)
- **Home** (dashboard adaptatif)
- **Tasks** (avec micro-tâches)
- **Journal** (auto-généré + notes)
- **Graphs** (stats avancées)
- **Shop** (coins & récompenses)

Budget devient une section dans la page Home ou un onglet dans Shop.
Ressources est accessible depuis Tasks et via un lien dans le menu.
Brain Dump est accessible via `Cmd+K` depuis partout.

---

## Stack technique ajoutée

| Besoin | Solution |
|--------|----------|
| Email | Resend (`resend` npm package) |
| Cron jobs | Vercel Crons |
| Push notifications | Web Push API + Service Worker |
| Drag & drop (v2) | `@dnd-kit/core` |
| Timer state | React Context + `useRef` pour le timer |
| LLM | OpenRouter via Vercel AI SDK (`ai` + `openai` npm) — DeepSeek V3.2 (temps réel) + Gemini Flash Lite (async) |

---

## Hors scope

- Flashcards / Quiz (NotebookLM utilisé à la place)
- Multi-utilisateur / social features
- App mobile native (PWA possible en v3)
- Sync avec des calendriers externes
