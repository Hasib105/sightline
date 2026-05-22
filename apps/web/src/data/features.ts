import {
  Code2,
  FileText,
  Globe2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  accent?: "wide";
};

export const features: Feature[] = [
  {
    icon: FileText,
    title: "Uploaded video analysis",
    body: "Teachers upload an exam video and Sightline queues analysis without requiring CCTV or a live camera setup.",
    accent: "wide",
  },
  {
    icon: Sparkles,
    title: "Human-centered integrity workflow",
    body: "Sightline flags observable activity; people still make the judgment. Every action is reviewable and auditable.",
  },
  {
    icon: Globe2,
    title: "Simple exam setup",
    body: "Keep the MVP to users, courses, halls, exam sessions, video jobs, alerts, evidence, and review actions.",
  },
  {
    icon: MessageCircle,
    title: "Four role model",
    body: "Admin, teacher, student, and invigilator are the only roles needed for the first build.",
  },
  {
    icon: Code2,
    title: "Django API foundation",
    body: "A structured backend owns users, exam context, analysis jobs, alerts, evidence, and audit-friendly records.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence-first alerts",
    body: "Alert cards carry timestamps, suspicion type, confidence, summaries, and linked snapshots or clips for review.",
  },
  {
    icon: Zap,
    title: "ProcBot later",
    body: "Browser monitoring starts later with realtime tab-switch events, then face and phone checks after the event pipe works.",
    accent: "wide",
  },
];

export const dna = [
  { icon: Waves, title: "Human review", body: "The system produces suspicion, not cheating verdicts or disciplinary actions." },
  { icon: Sparkles, title: "Upload first", body: "The MVP analyzes uploaded videos before adding live camera or browser monitoring." },
  { icon: Globe2, title: "Small model", body: "The first build stays centered on videos, jobs, alerts, evidence, and review." },
  { icon: ShieldCheck, title: "Trust by design", body: "Evidence, confidence, failure states, and review actions stay visible." },
] as const;

export const useCases = [
  { label: "Video uploads", color: "from-brand-1 to-brand-2" },
  { label: "Invigilators", color: "from-brand-2 to-brand-1" },
  { label: "Teacher review", color: "from-brand-1 to-brand-2" },
  { label: "Student context", color: "from-brand-2 to-brand-1" },
  { label: "Alert evidence", color: "from-brand-1 to-brand-2" },
  { label: "Analysis jobs", color: "from-brand-2 to-brand-1" },
  { label: "Admin setup", color: "from-brand-1 to-brand-2" },
  { label: "ProcBot later", color: "from-brand-2 to-brand-1" },
] as const;

export const integrations = [
  "Django", "Channels", "Celery", "Redis",
  "PostgreSQL", "React", "Next.js", "Video Uploads", "Inference Worker", "Object Storage",
] as const;

export const trustedBy = [
  "Invigilators", "Teachers", "Students", "Admins", "Exam Teams",
  "Video Uploads", "Analysis Jobs", "Alert Review", "Evidence Review", "ProcBot Roadmap",
] as const;

export { Code2 };
