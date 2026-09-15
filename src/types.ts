export type Language = 'en' | 'sw';

export type ExperienceMode = 'simple' | 'technical' | 'journey' | 'explorer';

export type ThemeMode = 'light' | 'dark';

export type ProjectMaturity = 
  | 'IDEA' 
  | 'DISCOVERY' 
  | 'PLANNED' 
  | 'BUILDING' 
  | 'BLOCKED' 
  | 'TESTING' 
  | 'DEPLOYED' 
  | 'COMPLETED' 
  | 'ARCHIVED';

export type ProjectCategory = 
  | 'all'
  | 'enterprise' 
  | 'ai-rag' 
  | 'client' 
  | 'saas' 
  | 'cybersecurity' 
  | 'innovation';

export interface EvidenceArtifact {
  id: string;
  title: string;
  type: 'screenshot' | 'architecture' | 'api' | 'test' | 'security' | 'document' | 'metric';
  description: string;
  dataSnippet?: string;
  url?: string;
  date: string;
  isVerified: boolean;
}

export interface ProjectReplayStep {
  date: string;
  phase: string;
  title: string;
  decisionNote: string;
  challengeFaced?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  tagline: {
    en: string;
    sw: string;
  };
  category: ProjectCategory;
  maturity: ProjectMaturity;
  startDate: string;
  lastUpdated: string;
  simpleSummary: {
    en: string;
    sw: string;
  };
  technicalSummary: {
    en: string;
    sw: string;
  };
  problem: {
    en: string;
    sw: string;
  };
  context: {
    en: string;
    sw: string;
  };
  hypothesis: {
    en: string;
    sw: string;
  };
  approachesConsidered: {
    en: string;
    sw: string;
  };
  decision: {
    en: string;
    sw: string;
  };
  buildHighlights: string[];
  validation: {
    en: string;
    sw: string;
  };
  outcome: {
    en: string;
    sw: string;
  };
  failureLearned: {
    en: string;
    sw: string;
  };
  nextStep: {
    en: string;
    sw: string;
  };
  techStack: string[];
  evidence: EvidenceArtifact[];
  replay: ProjectReplayStep[];
  featured?: boolean;
  liveUrl?: string;
  demoUrl?: string;
  repoUrl?: string;
}

export interface ProblemLabEntry {
  id: string;
  title: string;
  category: string;
  date: string;
  problem: string;
  affected: string;
  evidenceKnown: string;
  constraints: string;
  experiment: string;
  result: string;
  decision: 'Continue' | 'Change Direction' | 'Pause';
  lesson: string;
}

export interface FailureEntry {
  id: string;
  title: string;
  project: string;
  date: string;
  bugDescription: string;
  wrongAssumption: string;
  breakdownCause: string;
  recoveryResolution: string;
  ruleAdopted: string;
}

export interface SecurityTrack {
  level: string;
  title: string;
  focus: string;
  status: 'Mastered' | 'In Progress' | 'Planned';
  labName: string;
  labObjective: string;
  methodology: string;
  finding: string;
  remediation: string;
  proofArtifact: string;
}

export interface EvidenceChainNode {
  skill: string;
  project: string;
  problem: string;
  artifact: string;
  outcome: string;
}

export interface ChatMessage {
  id: string;
  sender: 'visitor' | 'kimmy' | 'system';
  authorName: string;
  channel: string;
  text: string;
  timestamp: string;
  verified?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  headline: string;
  bio: string;
  location: string;
  githubUrl?: string;
  linkedinUrl?: string;
  skills: string[];
  customProjects: ProjectItem[];
  createdAt: string;
}

export interface HtmxLogEntry {
  id: string;
  timestamp: string;
  verb: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  status: number;
  durationMs: number;
  target: string;
  swapType: string;
  payloadSize: string;
  goHandler: string;
}

export interface StoreProduct {
  id: string;
  title: string;
  targetAudience: 'For Students' | 'For Small Businesses';
  category: 'student' | 'business';
  summary: string;
  features: string[];
  priceTzs: number;
  priceUsd: number;
  badge: string;
  format: string;
  sampleItems?: string[];
}

export interface SecurityRoadmapItem {
  id: string;
  level: string; // "Level 01", "Level 02", etc.
  category: 'Beginner Basics' | 'Web Safety' | 'Data Protection';
  difficulty: 'Beginner Friendly' | 'Intermediate' | 'Advanced';
  title: string;
  objective: string;
  plainFinding: string;
  beforeFix: string;
  afterFix: string;
  walkthrough: string[];
  toolsUsed: string[];
}


