export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'disabled';
export type ProfileVisibility = 'public' | 'unlisted' | 'private';

export interface User {
  id: string;
  email: string;
  username: string; // unique, lowercase
  passwordHash: string;
  passwordSalt: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLinks {
  website?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
}

export interface ProfileThemeConfig {
  theme?: 'editorial' | 'minimalist' | 'cyber' | 'nord' | 'sepia' | 'contrast';
  fontStyle?: 'serif' | 'sans' | 'mono' | 'classical';
  accentColor?: string;
  cardDensity?: 'comfortable' | 'compact' | 'spacious';
}

export interface Profile {
  userId: string;
  username: string;
  displayName: string;
  headline: string;
  bio: string;
  avatarUrl?: string;
  location: string;
  category: 'developer' | 'designer' | 'student' | 'researcher' | 'engineer' | 'entrepreneur' | 'cybersecurity' | 'other';
  educationSummary: string;
  professionalSummary: string;
  skills: string[];
  socialLinks: SocialLinks;
  visibility: ProfileVisibility;
  themeConfig?: ProfileThemeConfig;
  updatedAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  type: 'USER_REGISTERED' | 'PROFILE_UPDATED' | 'USER_FOLLOWED' | 'USER_UNFOLLOWED' | 'ACCOUNT_STATUS_CHANGED' | 'PROJECT_ADDED' | 'PROJECT_UPDATED' | 'PROJECT_DELETED' | 'PROBLEM_SOLVED' | 'ENDORSEMENT_RECEIVED' | 'DISCUSSION_POSTED' | 'ARTICLE_PUBLISHED' | 'INQUIRY_RECEIVED' | 'OPPORTUNITY_POSTED' | 'OPPORTUNITY_APPLIED';
  targetUserId?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ProjectThemeConfig {
  accentColor?: string; // e.g. 'charcoal', 'emerald', 'indigo', 'amber', 'rose', 'cyan'
  fontStyle?: 'serif' | 'sans' | 'mono';
  bannerGradient?: string; // e.g. 'none', 'emerald', 'indigo', 'midnight', 'sunset', 'amber'
  customBannerUrl?: string;
  architectureCode?: string;
  highlights?: string[];
  density?: 'standard' | 'compact' | 'showcase';
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  category: string;
  headline: string;
  problemSolved: string;
  architectureNotes?: string;
  liveUrl?: string;
  repoUrl?: string;
  techStack: string[];
  metrics?: string;
  status: 'completed' | 'in_progress' | 'concept';
  featured: boolean;
  customization?: ProjectThemeConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ProblemCase {
  id: string;
  userId: string;
  title: string;
  domain: string;
  symptoms: string;
  rootCause: string;
  solution: string;
  outcome: string;
  techStack: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Endorsement {
  id: string;
  targetUserId: string;
  authorUserId: string;
  authorName: string;
  authorUsername: string;
  authorRole: string;
  type: 'project' | 'problem' | 'skill' | 'general';
  targetId?: string;
  targetTitle?: string;
  relationship: 'Colleague' | 'Team Lead' | 'Client' | 'Code Reviewer' | 'Collaborator' | 'Mentor';
  content: string;
  verified: boolean;
  createdAt: string;
}

export interface DiscussionReply {
  id: string;
  authorUserId?: string;
  authorName: string;
  authorUsername?: string;
  authorRole?: string;
  content: string;
  createdAt: string;
}

export interface DiscussionPost {
  id: string;
  userId?: string;
  authorName: string;
  authorUsername?: string;
  authorRole?: string;
  title: string;
  category: string;
  content: string;
  upvotes: number;
  upvoters: string[];
  replies: DiscussionReply[];
  createdAt: string;
  updatedAt: string;
}

export interface ArticleThemeConfig {
  readingTheme?: 'paper' | 'dark' | 'sepia' | 'minimal';
  fontStyle?: 'serif' | 'sans' | 'mono';
  accentColor?: string;
  bannerImage?: string;
  keyTakeaways?: string[];
  discussionPrompt?: string;
}

export interface ArticlePost {
  id: string;
  userId?: string;
  authorName: string;
  authorUsername?: string;
  authorRole?: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  content: string;
  upvotes: number;
  upvoters: string[];
  tags: string[];
  customization?: ArticleThemeConfig;
  createdAt: string;
  updatedAt: string;
}

export type InquiryStatus = 'new' | 'in_discussion' | 'proposal_sent' | 'contract_active' | 'completed' | 'declined';

export interface Inquiry {
  id: string;
  targetUserId: string; // The engineer receiving the inquiry
  senderUserId?: string; // Logged in sender user ID
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  projectType: string;
  budgetRange: string;
  timeline: string;
  title: string;
  description: string;
  status: InquiryStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityApplicant {
  userId: string;
  username: string;
  displayName: string;
  headline: string;
  email?: string;
  message?: string;
  appliedAt: string;
}

export interface Opportunity {
  id: string;
  creatorUserId: string;
  creatorName: string;
  creatorRole: string;
  creatorCompany?: string;
  title: string;
  category: 'Contract' | 'Full-Time' | 'Collaboration' | 'Consulting' | 'Security Audit';
  budgetOrSalary: string;
  location: string;
  description: string;
  requiredSkills: string[];
  contactEmailOrUrl: string;
  applicantsCount: number;
  applicants: OpportunityApplicant[];
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  users: User[];
  profiles: Profile[];
  follows: Follow[];
  sessions: Session[];
  activity: ActivityEvent[];
  projects: Project[];
  problems: ProblemCase[];
  endorsements: Endorsement[];
  discussions: DiscussionPost[];
  articles: ArticlePost[];
  inquiries: Inquiry[];
  opportunities: Opportunity[];
}
