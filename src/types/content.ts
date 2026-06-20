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
}

export interface PopoverData {
  label: string;
  text: string;
  stat?: string;
  img?: string;
  media?: string[];
  quote?: string;
  link?: string;
  linkText?: string;
}

export type PopoverMap = Record<string, PopoverData>;

export interface CaseStudyMeta {
  title: string;
  description: string;
  ogImage?: string;
  accent?: string;
}

export interface CaseStudyHeroData {
  label?: string;
  title: string;
  subtitle: string;
  image?: string;
  imageAlt?: string;
  background?: string;
}

export interface CaseStudyContext {
  challenge: string;
  role: string;
  company: string;
  scope: string;
  team: string;
  body: string;
}

export type CaseStudySectionType =
  | "cardGrid"
  | "mixedGrid"
  | "featureRow"
  | "textOnly"
  | "largeImage"
  | "fullBleed"
  | "captionedImage"
  | "photoGrid"
  | "statRow";

export interface CaseStudyCard {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}

export interface CaseStudyPhotoItem {
  src: string;
  alt: string;
}

export interface CaseStudyStatItem {
  value: string;
  label: string;
}

export interface CaseStudySectionData {
  type: CaseStudySectionType;
  key?: string;
  label?: string;
  title?: string;
  description?: string;
  isMobile?: boolean;
  bg?: string;
  isDark?: boolean;
  darkBg?: string;
  columns?: 1 | 2 | 3;
  cards?: CaseStudyCard[];
  primaryCard?: CaseStudyCard;
  secondaryCards?: CaseStudyCard[];
  reverse?: boolean;
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  caption?: string;
  images?: CaseStudyPhotoItem[];
  gap?: "tight" | "normal" | "loose";
  stats?: CaseStudyStatItem[];
}

export interface CaseStudyData {
  meta: CaseStudyMeta;
  hero: CaseStudyHeroData;
  context: CaseStudyContext;
  sections: CaseStudySectionData[];
}
