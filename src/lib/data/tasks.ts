export type Resource = {
  type: "video" | "doc" | "article" | "exam" | "tool" | "course";
  name: string;
  url: string;
};

export type Task = {
  id: string;
  name: string;
  detail: string;
  xp: number;
  certif?: boolean;
  subtasks?: string[];
  resources?: Resource[];
};

export type Phase = {
  id: string;
  num: string;
  name: string;
  duration: string;
  color: "green" | "purple" | "amber";
  tasks: Task[];
};

export const PHASES: Phase[] = [
  {
    id: "p1",
    num: "01",
    name: "Deep Learning & Transformers",
    duration: "6–8 semaines",
    color: "green",
    tasks: [
      {
        id: "t1",
        name: "Deep Learning Spec — Cours 1 & 2",
        detail: "Réseaux neuronaux, backprop · DeepLearning.AI",
        xp: 40,
        subtasks: [
          "Regarder Cours 1 : intro réseaux neuronaux (1h)",
          "Compléter les exercices du Cours 1",
          "Regarder Cours 2 : backpropagation (1h)",
          "Compléter les exercices du Cours 2",
        ],
        resources: [
          {
            type: "course",
            name: "Deep Learning Specialization — DeepLearning.AI",
            url: "https://www.deeplearning.ai/courses/deep-learning-specialization/",
          },
          {
            type: "video",
            name: "But what is a neural network? — 3Blue1Brown",
            url: "https://www.youtube.com/watch?v=aircAruvnKk",
          },
        ],
      },
      {
        id: "t2",
        name: "Fast.ai — Leçons 1 à 4",
        detail: "PyTorch hands-on · Gratuit",
        xp: 60,
        resources: [
          {
            type: "course",
            name: "Practical Deep Learning for Coders — fast.ai",
            url: "https://course.fast.ai/",
          },
          {
            type: "doc",
            name: "PyTorch Tutorials",
            url: "https://pytorch.org/tutorials/",
          },
          {
            type: "tool",
            name: "Google Colab — run notebooks for free",
            url: "https://colab.research.google.com/",
          },
        ],
        subtasks: [
          "Regarder Leçon 1 : intro PyTorch (45 min)",
          "Coder le notebook de la Leçon 1",
          "Regarder Leçon 2 : entraîner un premier modèle (45 min)",
          "Coder le notebook de la Leçon 2",
          "Regarder Leçon 3 : optimisation & SGD (45 min)",
          "Coder le notebook de la Leçon 3",
          "Regarder Leçon 4 : NLP basique (45 min)",
          "Coder le notebook de la Leçon 4",
        ],
      },
      {
        id: "t3",
        name: "Deep Learning Spec — Cours 4 (Seq. Models)",
        detail: "RNN, LSTM, mécanismes attention",
        xp: 50,
        subtasks: [
          "Regarder semaine 1 : RNN & vanishing gradient (45 min)",
          "Compléter le lab semaine 1",
          "Regarder semaine 2 : LSTM & GRU (45 min)",
          "Compléter le lab semaine 2",
          "Regarder semaine 3 : mécanisme d'attention (30 min)",
          "Compléter le lab semaine 3",
        ],
      },
      {
        id: "t4",
        name: "Deep Learning Spec — Cours 5 (Transformers)",
        detail: "Architecture Transformer, BERT, GPT",
        xp: 70,
        resources: [
          {
            type: "video",
            name: "Attention is All You Need — Illustrated Transformer",
            url: "https://jalammar.github.io/illustrated-transformer/",
          },
          {
            type: "article",
            name: "Attention is All You Need (paper — arXiv)",
            url: "https://arxiv.org/abs/1706.03762",
          },
        ],
        subtasks: [
          "Regarder intro : architecture Transformer (1h)",
          "Compléter le lab Transformer from scratch",
          "Regarder section BERT : pre-training & fine-tuning (45 min)",
          "Compléter le lab fine-tuning BERT",
          "Regarder section GPT : auto-regressive language models (30 min)",
          "Faire le quiz récapitulatif du cours",
        ],
      },
      {
        id: "t5",
        name: "Mini-projet : classifier du texte Python",
        detail: "Consolider par la pratique · PyTorch",
        xp: 80,
        subtasks: [
          "Choisir un dataset (ex. IMDb ou AG News)",
          "Mettre en place l'environnement et charger les données",
          "Implémenter le tokenizer et le DataLoader",
          "Coder et entraîner le modèle de classification",
          "Évaluer les métriques (accuracy, F1) sur le jeu de test",
          "Documenter le projet dans un README",
        ],
      },
    ],
  },
  {
    id: "p2",
    num: "02",
    name: "LLMs & Écosystème NVIDIA",
    duration: "8–10 semaines",
    color: "purple",
    tasks: [
      {
        id: "t6",
        name: "NVIDIA DLI — Generative AI Explained",
        detail: "Gratuit · GenAI, LLMs, diffusion",
        xp: 50,
        subtasks: [
          "Créer un compte NVIDIA DLI et accéder au cours",
          "Regarder module 1 : qu'est-ce que l'IA générative (20 min)",
          "Regarder module 2 : LLMs et modèles de diffusion (20 min)",
          "Compléter le quiz de fin de cours",
        ],
      },
      {
        id: "t7",
        name: "Hugging Face NLP Course (chap. 1–4)",
        detail: "Tokenizers, fine-tuning, pipelines",
        xp: 60,
        resources: [
          {
            type: "course",
            name: "Hugging Face NLP Course",
            url: "https://huggingface.co/learn/nlp-course/chapter1/1",
          },
          {
            type: "doc",
            name: "Hugging Face Documentation",
            url: "https://huggingface.co/docs",
          },
          {
            type: "tool",
            name: "Hugging Face Hub — modèles & datasets",
            url: "https://huggingface.co/models",
          },
        ],
        subtasks: [
          "Lire chapitre 1 : introduction aux Transformers (30 min)",
          "Exécuter les exemples de pipelines du chapitre 1",
          "Lire chapitre 2 : tokenizers en profondeur (30 min)",
          "Pratiquer les exercices sur les tokenizers",
          "Lire chapitre 3 : fine-tuning d'un modèle pré-entraîné (30 min)",
          "Lire chapitre 4 : partager des modèles sur le Hub (20 min)",
        ],
      },
      {
        id: "t8",
        name: "DeepLearning.AI — Prompt Engineering",
        detail: "CoT, zero/few-shot · Gratuit",
        xp: 40,
        subtasks: [
          "Regarder leçon 1 : principes du prompting (20 min)",
          "Pratiquer zero-shot et few-shot prompting",
          "Regarder leçon 2 : Chain-of-Thought (CoT) (20 min)",
          "Compléter les notebooks d'exercices",
        ],
      },
      {
        id: "t9",
        name: "NVIDIA DLI — Building RAG Agents",
        detail: "Gratuit · RAG, NIM, embeddings",
        xp: 80,
        resources: [
          {
            type: "course",
            name: "Building RAG Agents with LLMs — NVIDIA DLI",
            url: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1:DLI+S-FX-15+V1",
          },
          {
            type: "doc",
            name: "NVIDIA NIM API Reference",
            url: "https://docs.nvidia.com/nim/",
          },
          {
            type: "video",
            name: "RAG from Scratch — LangChain YouTube",
            url: "https://www.youtube.com/watch?v=sVcwVQRHIc8",
          },
        ],
        subtasks: [
          "Accéder au cours et lire l'introduction RAG (20 min)",
          "Comprendre les embeddings et la recherche vectorielle (30 min)",
          "Lab : construire un pipeline RAG de base avec NIM",
          "Lab : ajouter la mémoire et le contexte à l'agent",
          "Finaliser et tester l'agent RAG complet",
        ],
      },
      {
        id: "t10",
        name: "DeepLearning.AI — LangChain Short Course",
        detail: "Agents, chains, memory · Gratuit",
        xp: 60,
        subtasks: [
          "Regarder intro : concepts LangChain (20 min)",
          "Lab : créer une première chain simple",
          "Regarder section mémoire conversationnelle (20 min)",
          "Lab : construire un agent avec outils",
          "Lab final : assembler une application complète",
        ],
      },
      {
        id: "t11",
        name: "Hugging Face — Fine-tuning LoRA/PEFT",
        detail: "Chapitres 7–9 du cours HF",
        xp: 90,
        resources: [
          {
            type: "doc",
            name: "PEFT Library — Hugging Face",
            url: "https://huggingface.co/docs/peft/index",
          },
          {
            type: "article",
            name: "LoRA: Low-Rank Adaptation of Large Language Models (paper)",
            url: "https://arxiv.org/abs/2106.09685",
          },
          {
            type: "tool",
            name: "Weights & Biases — experiment tracking",
            url: "https://wandb.ai/",
          },
        ],
        subtasks: [
          "Lire chapitre 7 : techniques de fine-tuning (30 min)",
          "Lire chapitre 8 : introduction à PEFT (30 min)",
          "Lab : appliquer LoRA sur un modèle de classification",
          "Lire chapitre 9 : optimisation mémoire et QLoRA (30 min)",
          "Lab : fine-tuner un LLM avec QLoRA sur GPU cloud",
        ],
      },
      {
        id: "t12",
        name: "TensorRT-LLM + Triton Inference Server",
        detail: "Labs NVIDIA NGC cloud",
        xp: 100,
        resources: [
          {
            type: "doc",
            name: "TensorRT-LLM Documentation",
            url: "https://nvidia.github.io/TensorRT-LLM/",
          },
          {
            type: "doc",
            name: "Triton Inference Server Docs",
            url: "https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/index.html",
          },
          {
            type: "tool",
            name: "NVIDIA NGC Catalog",
            url: "https://catalog.ngc.nvidia.com/",
          },
          {
            type: "video",
            name: "TensorRT-LLM Overview — NVIDIA GTC",
            url: "https://www.nvidia.com/en-us/on-demand/session/gtcspring23-s51482/",
          },
        ],
        subtasks: [
          "Lire la documentation TensorRT-LLM (30 min)",
          "Lab : compiler un modèle avec TensorRT-LLM sur NGC",
          "Lire l'intro Triton Inference Server (20 min)",
          "Lab : déployer un modèle sur Triton",
          "Lab : mesurer latence et throughput du déploiement",
          "Documenter les résultats de benchmark",
        ],
      },
    ],
  },
  {
    id: "p3",
    num: "03",
    name: "Certifications NVIDIA",
    duration: "6–8 semaines",
    color: "amber",
    tasks: [
      {
        id: "t13",
        name: "Lire Exam Blueprint NCA-GENL (PDF)",
        detail: "nvidia.com · Obligatoire en premier",
        xp: 20,
        resources: [
          {
            type: "exam",
            name: "NCA-GENL Exam Blueprint — NVIDIA",
            url: "https://www.nvidia.com/en-us/training/certification/",
          },
          {
            type: "doc",
            name: "NVIDIA Certification Overview",
            url: "https://www.nvidia.com/en-us/training/",
          },
        ],
      },
      {
        id: "t14",
        name: "NVIDIA DLI — Fundamentals of Deep Learning",
        detail: "Payant · 8h · Labs GPU cloud",
        xp: 80,
        resources: [
          {
            type: "course",
            name: "Fundamentals of Deep Learning — NVIDIA DLI",
            url: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1:DLI+C-FX-01+V3",
          },
          {
            type: "tool",
            name: "NVIDIA DLI Learning Portal",
            url: "https://learn.nvidia.com/",
          },
        ],
      },
      {
        id: "t15",
        name: "3 séries questions pratiques NCA-GENL",
        detail: "FlashGenius · ~30$",
        xp: 60,
      },
      {
        id: "t16",
        name: "✦ PASSER NCA-GENL (125$)",
        detail: "50 questions · 60 min · Certiverse",
        xp: 150,
        certif: true,
      },
      {
        id: "t17",
        name: "Lire Exam Blueprint NCP-GENL (PDF)",
        detail: "5 domaines, blueprint officiel",
        xp: 20,
      },
      {
        id: "t18",
        name: "6 mock exams NCP-GENL + NCP-AAI",
        detail: "Udemy / FlashGenius · ~30$",
        xp: 80,
      },
      {
        id: "t19",
        name: "✦ PASSER NCP-GENL (200$)",
        detail: "60–70 questions · 120 min · Certiverse",
        xp: 200,
        certif: true,
      },
      {
        id: "t20",
        name: "✦ PASSER NCP-AAI (200$)",
        detail: "60–70 questions · 90 min · Certiverse",
        xp: 200,
        certif: true,
      },
    ],
  },
];

export const TOTAL_XP = PHASES.flatMap((p) => p.tasks).reduce(
  (s, t) => s + t.xp,
  0
);

export const LEVELS = [
  { id: "lv1", label: "Débutant", min: 0 },
  { id: "lv2", label: "Apprenti", min: 250 },
  { id: "lv3", label: "Praticien", min: 500 },
  { id: "lv4", label: "Expert", min: 900 },
  { id: "lv5", label: "Architecte 🏆", min: 1300 },
] as const;

export type Level = (typeof LEVELS)[number];

export const BUDGET_ITEMS = [
  { key: "b-dli", name: "Cours DLI payants", price: 120 },
  { key: "b-tests", name: "Practice tests", price: 30 },
  { key: "b-nca", name: "NCA-GENL", price: 125, certif: true },
  { key: "b-ncpg", name: "NCP-GENL", price: 200, certif: true },
  { key: "b-ncpa", name: "NCP-AAI", price: 200, certif: true },
  { key: "b-mock", name: "Mock exams (Udemy)", price: 30 },
] as const;

export type BudgetItemDef = (typeof BUDGET_ITEMS)[number];

export const DEFAULT_DEADLINES = [
  {
    name: "Webinaire NVIDIA (-50% examens)",
    targetDate: "2026-04-30",
    isFixed: true,
  },
  { name: "Objectif : passer NCA-GENL", targetDate: null, isFixed: false },
  { name: "Objectif : passer NCP-GENL", targetDate: null, isFixed: false },
  { name: "Objectif : passer NCP-AAI", targetDate: null, isFixed: false },
] as const;

export const MOODS = [
  {
    level: 5,
    emoji: "🔥",
    label: "En feu",
    colorClass: "text-green-400",
    advice:
      "État parfait. Attaque TensorRT-LLM, un examen blanc ou du fine-tuning. Profite du flow.",
  },
  {
    level: 4,
    emoji: "💪",
    label: "Motivé",
    colorClass: "text-green-300",
    advice:
      "Super élan ! Lance une tâche NVIDIA DLI ou Hugging Face.",
  },
  {
    level: 3,
    emoji: "😐",
    label: "Correct",
    colorClass: "text-yellow-400",
    advice:
      "Fais UNE seule petite tâche — lire un blueprint ou 10 min de vidéo. C'est assez.",
  },
  {
    level: 2,
    emoji: "😴",
    label: "Fatigué",
    colorClass: "text-purple-400",
    advice:
      "Mode passif. Regarde une vidéo courte sans notes. Ne force pas.",
  },
  {
    level: 1,
    emoji: "😶",
    label: "Pas là",
    colorClass: "text-red-400",
    advice:
      "Journée off. Reviens demain. Forcer avec l'ADHD = contre-productif.",
  },
] as const;

export type MoodDef = (typeof MOODS)[number];
