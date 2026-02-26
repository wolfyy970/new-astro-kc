// ── Content type definitions ──────────────────────────────────────────────────
// These interfaces define the exact shape of data coming from the JSON "database"
// (resume.json, popovers.json). They enforce type safety at the boundary between
// build-time Astro data and both server-rendered templates and client-side scripts.

export interface Education {
  degree: string;
  school: string;
  focus?: string;
}

export interface ExperienceEntry {
  company: string;
  dates: string;
  title: string;
  description?: string;
  bullets: string[];
}

export interface KeyAchievementCluster {
  heading: string;
  items: string[];
}

export interface Contact {
  email: string;
  phone: string;
  linkedin: string;
  linkedinUrl: string;
  location: string;
}

export interface PatentsAndRecognition {
  patents: string;
  awards: string;
  certifications: string;
}

export interface ScrollAnnotation {
  key: string;
  side: 'left' | 'right';
}

export interface ResumeData {
  name: string;
  displayName: string;
  titleLine: string;
  contact: Contact;
  hero: {
    tagline: string;
    credentials: string[];
  };
  summary: string;
  keyAchievements: KeyAchievementCluster[];
  experience: ExperienceEntry[];
  education: Education[];
  patentsAndRecognition: PatentsAndRecognition;
  scrollAnnotations: ScrollAnnotation[];
}

export interface PopoverData {
  label: string;
  text: string;
  stat?: string;
  img?: string;
  quote?: string;
  link?: string;
  linkText?: string;
}

export type PopoverMap = Record<string, PopoverData>;
