import fs from 'fs';
import path from 'path';
import { 
  DatabaseSchema, 
  User, 
  Profile, 
  Follow, 
  Session, 
  ActivityEvent, 
  Project, 
  ProblemCase,
  Endorsement,
  DiscussionPost,
  DiscussionReply,
  ArticlePost,
  Inquiry,
  InquiryStatus,
  Opportunity,
  OpportunityApplicant
} from './types.js';
import { hashPassword } from './auth.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

class Database {
  private data: DatabaseSchema = {
    users: [],
    profiles: [],
    follows: [],
    sessions: [],
    activity: [],
    projects: [],
    problems: [],
    endorsements: [],
    discussions: [],
    articles: [],
    inquiries: [],
    opportunities: []
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(content);
        if (!this.data.projects) this.data.projects = [];
        if (!this.data.problems) this.data.problems = [];
        if (!this.data.endorsements) this.data.endorsements = [];
        if (!this.data.discussions) this.data.discussions = [];
        if (!this.data.articles) this.data.articles = [];
        if (!this.data.inquiries) this.data.inquiries = [];
        if (!this.data.opportunities) this.data.opportunities = [];

        if (this.data.projects.length === 0) {
          this.seedProjectsAndProblems();
        }
        if (this.data.endorsements.length === 0 || this.data.discussions.length === 0 || this.data.articles.length === 0) {
          this.seedStage3Data();
        }
        if (this.data.inquiries.length === 0 || this.data.opportunities.length === 0) {
          this.seedStage4Data();
        }
      } catch (err) {
        console.error('Error reading db.json, re-initializing', err);
        this.seed();
      }
    } else {
      this.seed();
    }
  }

  private persist() {
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  private seed() {
    const now = new Date().toISOString();

    // 1. Ibrahim Kimaro (Admin & Systems Engineer)
    const ibrahimAuth = hashPassword('proofolio123');
    const ibrahimUser: User = {
      id: 'usr_ibrahim',
      email: 'ibrahimkimaro01@gmail.com',
      username: 'ibrahim',
      passwordHash: ibrahimAuth.hash,
      passwordSalt: ibrahimAuth.salt,
      role: 'admin',
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
    const ibrahimProfile: Profile = {
      userId: ibrahimUser.id,
      username: ibrahimUser.username,
      displayName: 'Ibrahim Kimaro',
      headline: 'Systems Engineer & Full-Stack Architect',
      bio: 'Specialized in hypermedia architectures, low-latency logistics, resilient transaction processing, and community problem-solving platforms.',
      avatarUrl: '',
      location: 'Dar es Salaam, Tanzania',
      category: 'engineer',
      educationSummary: 'B.Sc. in Computer Science & Software Engineering',
      professionalSummary: 'Over 5+ years architecting high-throughput logistics backends, multi-tenant property management platforms, and fintech gateways.',
      skills: ['Go', 'PostgreSQL', 'HTML5 / HTMX', 'Distributed Systems', 'M-Pesa Webhooks', 'Linux'],
      socialLinks: {
        website: 'https://panga.kimaro.dev',
        github: 'https://github.com/ibrahimkimaro',
        linkedin: 'https://linkedin.com/in/ibrahimkimaro'
      },
      visibility: 'public',
      updatedAt: now
    };

    // 2. Tamim Al-Mansoor (Cybersecurity Learner & Network Analyst) - Referenced in prompt: /u/tamim
    const tamimAuth = hashPassword('proofolio123');
    const tamimUser: User = {
      id: 'usr_tamim',
      email: 'tamim@example.com',
      username: 'tamim',
      passwordHash: tamimAuth.hash,
      passwordSalt: tamimAuth.salt,
      role: 'user',
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
    const tamimProfile: Profile = {
      userId: tamimUser.id,
      username: tamimUser.username,
      displayName: 'Tamim Al-Mansoor',
      headline: 'Cybersecurity Learner & Network Analyst',
      bio: 'Investigating offensive security fundamentals, SOC operations, Wireshark packet analysis, and building hands-on homelab defensibility testbeds.',
      avatarUrl: '',
      location: 'Zanzibar, Tanzania',
      category: 'cybersecurity',
      educationSummary: 'Network Security Certification Track (CompTIA Security+ in progress)',
      professionalSummary: 'Focused on packet inspection, vulnerability scoring, and incident triage for mid-size networks.',
      skills: ['Network Forensics', 'Wireshark', 'Linux Hardening', 'Python Scripting', 'Firewall Rules'],
      socialLinks: {
        github: 'https://github.com/tamim-sec',
        linkedin: 'https://linkedin.com/in/tamim-almansoor'
      },
      visibility: 'public',
      updatedAt: now
    };

    // 3. Sarah Mwangi (Product Designer & Design Researcher)
    const sarahAuth = hashPassword('proofolio123');
    const sarahUser: User = {
      id: 'usr_sarah',
      email: 'sarah.mwangi@example.com',
      username: 'sarah_ux',
      passwordHash: sarahAuth.hash,
      passwordSalt: sarahAuth.salt,
      role: 'user',
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
    const sarahProfile: Profile = {
      userId: sarahUser.id,
      username: sarahUser.username,
      displayName: 'Sarah Mwangi',
      headline: 'Product Designer & Human-Centered Researcher',
      bio: 'Translating complex agricultural logistics and offline healthcare workflows into accessible, clean digital interfaces.',
      avatarUrl: '',
      location: 'Nairobi, Kenya',
      category: 'designer',
      educationSummary: 'B.A. in Industrial Design & Digital Media',
      professionalSummary: 'Conducted 80+ ethnographic interviews with smallholder farmers to design simplified USSD and web transaction flows.',
      skills: ['User Research', 'Design Systems', 'Figma', 'Usability Testing', 'Field Work', 'Information Architecture'],
      socialLinks: {
        website: 'https://sarahmwangi.design',
        linkedin: 'https://linkedin.com/in/sarah-mwangi-ux'
      },
      visibility: 'public',
      updatedAt: now
    };

    // 4. Dr. Daudi Kilonzo (Agricultural Economics Researcher & Lecturer)
    const daudiAuth = hashPassword('proofolio123');
    const daudiUser: User = {
      id: 'usr_daudi',
      email: 'daudi.kilonzo@example.com',
      username: 'daudi_agri',
      passwordHash: daudiAuth.hash,
      passwordSalt: daudiAuth.salt,
      role: 'user',
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
    const daudiProfile: Profile = {
      userId: daudiUser.id,
      username: daudiUser.username,
      displayName: 'Dr. Daudi Kilonzo',
      headline: 'Agricultural Economics Researcher & Lecturer',
      bio: 'Researching cereal supply chains, price volatility in East Africa, and open-source data telemetry for cooperative federations.',
      avatarUrl: '',
      location: 'Morogoro, Tanzania',
      category: 'researcher',
      educationSummary: 'Ph.D. in Applied Economics, Sokoine University of Agriculture',
      professionalSummary: 'Published 14 peer-reviewed studies on grain storage economics and mobile pricing transparency.',
      skills: ['Econometrics', 'R & Stata', 'Supply Chain Analysis', 'Field Surveys', 'Policy Papers'],
      socialLinks: {
        website: 'https://scholar.google.com',
        linkedin: 'https://linkedin.com/in/daudi-kilonzo'
      },
      visibility: 'public',
      updatedAt: now
    };

    // 5. Amara Vance (Tech Entrepreneur & Digital Health Founder)
    const amaraAuth = hashPassword('proofolio123');
    const amaraUser: User = {
      id: 'usr_amara',
      email: 'amara@example.com',
      username: 'amara_biz',
      passwordHash: amaraAuth.hash,
      passwordSalt: amaraAuth.salt,
      role: 'user',
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
    const amaraProfile: Profile = {
      userId: amaraUser.id,
      username: amaraUser.username,
      displayName: 'Amara Vance',
      headline: 'Entrepreneur & Community Health Innovator',
      bio: 'Building sustainable micro-clinics and maternal healthcare supplies distribution networks across the Great Lakes region.',
      avatarUrl: '',
      location: 'Arusha, Tanzania',
      category: 'entrepreneur',
      educationSummary: 'Master in Public Health (MPH) & Business Administration',
      professionalSummary: 'Scaled healthcare delivery ventures reaching 45,000+ rural patients with essential pharmaceutical deliveries.',
      skills: ['Ventures Building', 'Health Logistics', 'Financial Modeling', 'Public-Private Partnerships', 'Operations'],
      socialLinks: {
        linkedin: 'https://linkedin.com/in/amaravance'
      },
      visibility: 'public',
      updatedAt: now
    };

    this.data.users = [ibrahimUser, tamimUser, sarahUser, daudiUser, amaraUser];
    this.data.profiles = [ibrahimProfile, tamimProfile, sarahProfile, daudiProfile, amaraProfile];

    // Seed initial follow relationships
    this.data.follows = [
      { id: 'fol_1', followerId: ibrahimUser.id, followingId: tamimUser.id, createdAt: now },
      { id: 'fol_2', followerId: ibrahimUser.id, followingId: sarahUser.id, createdAt: now },
      { id: 'fol_3', followerId: sarahUser.id, followingId: ibrahimUser.id, createdAt: now },
      { id: 'fol_4', followerId: daudiUser.id, followingId: ibrahimUser.id, createdAt: now },
      { id: 'fol_5', followerId: amaraUser.id, followingId: ibrahimUser.id, createdAt: now },
      { id: 'fol_6', followerId: tamimUser.id, followingId: ibrahimUser.id, createdAt: now },
      { id: 'fol_7', followerId: daudiUser.id, followingId: sarahUser.id, createdAt: now }
    ];

    // Seed initial activity
    this.data.activity = [
      {
        id: 'act_1',
        userId: ibrahimUser.id,
        type: 'PROFILE_UPDATED',
        description: 'Updated verified portfolio systems and architecture highlights.',
        createdAt: now
      },
      {
        id: 'act_2',
        userId: tamimUser.id,
        type: 'PROFILE_UPDATED',
        description: 'Published cybersecurity learning track and packet analysis notes.',
        createdAt: now
      },
      {
        id: 'act_3',
        userId: sarahUser.id,
        type: 'USER_FOLLOWED',
        targetUserId: ibrahimUser.id,
        description: 'Started following Ibrahim Kimaro.',
        createdAt: now
      }
    ];

    this.persist();
  }

  // User queries
  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  getUserByUsername(username: string): User | undefined {
    return this.data.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  }

  createUser(user: User, profile: Profile): { user: User; profile: Profile } {
    this.data.users.push(user);
    this.data.profiles.push(profile);
    this.logActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      type: 'USER_REGISTERED',
      description: `Created a new Proofolio profile @${user.username}.`,
      createdAt: user.createdAt
    });
    this.persist();
    return { user, profile };
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return undefined;
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    this.persist();
    return user;
  }

  // Profile queries
  getProfileByUserId(userId: string): Profile | undefined {
    return this.data.profiles.find(p => p.userId === userId);
  }

  getProfileByUsername(username: string): Profile | undefined {
    return this.data.profiles.find(p => p.username.toLowerCase() === username.trim().toLowerCase());
  }

  updateProfile(userId: string, updates: Partial<Profile>): Profile | undefined {
    const profile = this.data.profiles.find(p => p.userId === userId);
    if (!profile) return undefined;

    // Do not allow changing userId
    delete (updates as any).userId;

    Object.assign(profile, updates, { updatedAt: new Date().toISOString() });
    
    // If username changed, update in users and profile
    if (updates.username) {
      const user = this.getUserById(userId);
      if (user) {
        user.username = updates.username;
        user.updatedAt = new Date().toISOString();
      }
    }

    this.logActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      type: 'PROFILE_UPDATED',
      description: 'Updated professional identity and portfolio information.',
      createdAt: new Date().toISOString()
    });

    this.persist();
    return profile;
  }

  // Follow system
  followUser(followerId: string, followingId: string): { success: boolean; message?: string } {
    if (followerId === followingId) {
      return { success: false, message: 'You cannot follow yourself.' };
    }

    const targetUser = this.getUserById(followingId);
    if (!targetUser || targetUser.status === 'disabled') {
      return { success: false, message: 'User not found or unavailable.' };
    }

    const existing = this.data.follows.find(
      f => f.followerId === followerId && f.followingId === followingId
    );
    if (existing) {
      return { success: true, message: 'Already following.' };
    }

    const now = new Date().toISOString();
    const followRecord: Follow = {
      id: `fol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      followerId,
      followingId,
      createdAt: now
    };

    this.data.follows.push(followRecord);

    const followerProfile = this.getProfileByUserId(followerId);
    const followingProfile = this.getProfileByUserId(followingId);

    this.logActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: followerId,
      type: 'USER_FOLLOWED',
      targetUserId: followingId,
      description: `Started following ${followingProfile?.displayName || targetUser.username}.`,
      createdAt: now
    });

    this.persist();
    return { success: true };
  }

  unfollowUser(followerId: string, followingId: string): { success: boolean } {
    const initialLen = this.data.follows.length;
    this.data.follows = this.data.follows.filter(
      f => !(f.followerId === followerId && f.followingId === followingId)
    );

    if (this.data.follows.length !== initialLen) {
      const targetUser = this.getUserById(followingId);
      const followingProfile = this.getProfileByUserId(followingId);
      this.logActivity({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: followerId,
        type: 'USER_UNFOLLOWED',
        targetUserId: followingId,
        description: `Unfollowed ${followingProfile?.displayName || targetUser?.username || 'user'}.`,
        createdAt: new Date().toISOString()
      });
      this.persist();
    }

    return { success: true };
  }

  isFollowing(followerId: string, followingId: string): boolean {
    return this.data.follows.some(
      f => f.followerId === followerId && f.followingId === followingId
    );
  }

  getFollowerCount(userId: string): number {
    return this.data.follows.filter(f => f.followingId === userId).length;
  }

  getFollowingCount(userId: string): number {
    return this.data.follows.filter(f => f.followerId === userId).length;
  }

  // Sessions
  createSession(userId: string): Session {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const token = `${Math.random().toString(36).substring(2)}${Date.now()}${Math.random().toString(36).substring(2)}`;

    const session: Session = {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt
    };

    this.data.sessions.push(session);
    this.persist();
    return session;
  }

  getSession(token: string): Session | undefined {
    const session = this.data.sessions.find(s => s.token === token);
    if (!session) return undefined;
    if (new Date(session.expiresAt) < new Date()) {
      this.deleteSession(token);
      return undefined;
    }
    return session;
  }

  deleteSession(token: string) {
    this.data.sessions = this.data.sessions.filter(s => s.token !== token);
    this.persist();
  }

  deleteUserSessions(userId: string) {
    this.data.sessions = this.data.sessions.filter(s => s.userId !== userId);
    this.persist();
  }

  // Activity
  logActivity(event: ActivityEvent) {
    this.data.activity.unshift(event);
    if (this.data.activity.length > 500) {
      this.data.activity = this.data.activity.slice(0, 500);
    }
    this.persist();
  }

  getUserActivity(userId: string, limit: number = 10): ActivityEvent[] {
    return this.data.activity
      .filter(a => a.userId === userId || a.targetUserId === userId)
      .slice(0, limit);
  }

  getRecentPublicActivity(limit: number = 20): ActivityEvent[] {
    return this.data.activity.slice(0, limit);
  }

  // Admin & Discovery
  getAllUsers(): { user: User; profile?: Profile; followersCount: number; followingCount: number }[] {
    return this.data.users.map(user => ({
      user,
      profile: this.getProfileByUserId(user.id),
      followersCount: this.getFollowerCount(user.id),
      followingCount: this.getFollowingCount(user.id)
    }));
  }

  discoverProfiles(query: string = '', category: string = 'all'): { profile: Profile; followersCount: number }[] {
    const q = query.trim().toLowerCase();
    return this.data.profiles
      .filter(p => {
        const user = this.getUserById(p.userId);
        if (!user || user.status === 'disabled') return false;
        if (p.visibility !== 'public') return false; // Strictly respect visibility!

        if (category !== 'all' && p.category !== category) return false;

        if (!q) return true;

        const matchName = p.displayName.toLowerCase().includes(q);
        const matchUsername = p.username.toLowerCase().includes(q);
        const matchHeadline = p.headline.toLowerCase().includes(q);
        const matchSkills = p.skills.some(s => s.toLowerCase().includes(q));
        const matchLocation = p.location.toLowerCase().includes(q);

        return matchName || matchUsername || matchHeadline || matchSkills || matchLocation;
      })
      .map(profile => ({
        profile,
        followersCount: this.getFollowerCount(profile.userId)
      }))
      .sort((a, b) => b.followersCount - a.followersCount);
  }

  // Dynamic Profile Completion Calculation
  calculateProfileCompletion(profile: Profile): { percentage: number; missing: string[]; recommendation: string } {
    let score = 0;
    const missing: string[] = [];

    if (profile.displayName?.trim().length > 1) score += 10;
    else missing.push('Display Name');

    if (profile.headline?.trim().length > 5) score += 15;
    else missing.push('Professional Headline');

    if (profile.bio?.trim().length > 15) score += 15;
    else missing.push('Biography');

    if (profile.location?.trim().length > 1) score += 10;
    else missing.push('Location');

    if (profile.skills && profile.skills.length > 0) score += 15;
    else missing.push('Skills & Proficiencies');

    if (profile.educationSummary?.trim() || profile.professionalSummary?.trim()) score += 15;
    else missing.push('Education or Experience Summary');

    if (profile.socialLinks && (profile.socialLinks.website || profile.socialLinks.github || profile.socialLinks.linkedin)) score += 10;
    else missing.push('At least one Social or Web Link');

    if (profile.avatarUrl?.trim()) score += 10;
    else missing.push('Profile Avatar');

    let recommendation = 'Your profile has a solid foundation. Next: prepare to document projects in Stage 2.';
    if (missing.includes('Professional Headline')) {
      recommendation = 'Add a headline (e.g. "Cybersecurity Learner" or "Systems Architect") to stand out.';
    } else if (missing.includes('Biography')) {
      recommendation = 'Write a short biography describing what you build, learn, or solve.';
    } else if (missing.includes('Skills & Proficiencies')) {
      recommendation = 'Add 3 or more of your core skills or areas of study.';
    } else if (missing.includes('Education or Experience Summary')) {
      recommendation = 'Add your education or work background.';
    } else if (missing.includes('At least one Social or Web Link')) {
      recommendation = 'Connect a GitHub, LinkedIn, or website link for verification.';
    }

    return { percentage: Math.min(100, score), missing, recommendation };
  }

  // --- Stage 2: Projects & Problems ---

  seedProjectsAndProblems() {
    const now = new Date().toISOString();
    this.data.projects = [
      {
        id: 'proj_ibrahim_1',
        userId: 'usr_ibrahim',
        title: 'Panga na Kupangisha (Tenant & Property Cloud)',
        category: 'FinTech & Real Estate',
        headline: 'Multi-tenant property management platform with PostgreSQL Row-Level Security',
        problemSolved: 'Solved double-entry accounting and manual rent collection delays for 100+ landlords across Dar es Salaam by implementing automated M-Pesa C2B payment reconciliation and tenant lease isolation via PostgreSQL RLS.',
        architectureNotes: 'Built with Go, PostgreSQL RLS, HTMX hypermedia driver, and Docker. Zero single-page-app bundle overhead.',
        liveUrl: 'https://panga.kimaro.dev',
        repoUrl: 'https://github.com/ibrahimkimaro/panga-system',
        techStack: ['Go', 'PostgreSQL RLS', 'HTMX', 'M-Pesa API', 'Tailwind CSS'],
        metrics: '450+ Active Tenants • <35ms Response Latency • 99.98% Uptime',
        status: 'completed',
        featured: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'proj_ibrahim_2',
        userId: 'usr_ibrahim',
        title: 'Transit Logistics & Fleet Dispatcher',
        category: 'Logistics & Edge Systems',
        headline: 'Ultra-lean tracking dashboard operable over intermittent 3G cellular corridors',
        problemSolved: 'Replaced a 2.4MB bloated tracking portal that failed on highway 3G connections (Morogoro-Iringa corridor) with an 8KB compressed server-rendered hypermedia interface that boots in under 300ms.',
        architectureNotes: 'Single Go binary with embedded SQLite WAL mode, Server-Sent Events for location pulses, and zero node_modules in production container.',
        liveUrl: 'https://tna.kimaro.dev',
        repoUrl: 'https://github.com/ibrahimkimaro/transit-edge',
        techStack: ['Go', 'HTML5', 'HTMX', 'SQLite', 'Debian Linux'],
        metrics: '8KB Gzipped Payload • 280ms Boot on 3G • 40 Trucks Tracked',
        status: 'completed',
        featured: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'proj_ibrahim_3',
        userId: 'usr_ibrahim',
        title: 'Kilimo Bora Agri-Marketplace',
        category: 'Agritech & Direct Trade',
        headline: 'Direct crop auction and price transparency portal for rural horticultural growers',
        problemSolved: 'Eliminated predatory middleman margins by connecting avocado and onion farmers in Kilimanjaro directly with wholesale food aggregators via SMS webhooks and mobile-responsive bidding.',
        liveUrl: 'https://kilimo.kimaro.dev',
        techStack: ['TypeScript', 'Node.js', 'PostgreSQL', 'USSD Webhook', 'Tailwind'],
        metrics: '1,200+ Farmers Enrolled • $42,000+ Trade Volume Documented',
        status: 'completed',
        featured: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'proj_tamim_1',
        userId: 'usr_tamim',
        title: 'PacketVault Network Forensic Analyzer',
        category: 'Cybersecurity',
        headline: 'Automated PCAP packet triage and lateral movement detection testbed',
        problemSolved: 'Identified encrypted DNS tunneling and unauthorized remote C2 beacons across simulated enterprise LAN traffic by analyzing packet timing variance and entropy thresholds.',
        liveUrl: 'https://packetvault.demo.dev',
        repoUrl: 'https://github.com/tamim-sec/packetvault',
        techStack: ['Python', 'Wireshark', 'Scapy', 'Linux Hardening', 'Bash'],
        metrics: '100% Detection Rate on Test C2 Beacons • 500k Packets Analyzed/min',
        status: 'completed',
        featured: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'proj_sarah_1',
        userId: 'usr_sarah',
        title: 'EHR Prescription Flow Redesign',
        category: 'Product Design & Healthcare',
        headline: 'Clinical EHR user experience eliminating doctor medication entry fatigue',
        problemSolved: 'Streamlined medication order entry from 4.2 minutes down to 45 seconds per patient through cognitive load reduction and progressive disclosure.',
        liveUrl: 'https://figma.com/@sarahchen/ehr-redesign',
        techStack: ['Figma', 'Design Systems', 'WCAG 2.1 AA', 'User Research'],
        metrics: '82% Reduction in Medication Entry Time • 0 Usability Violations',
        status: 'completed',
        featured: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'proj_daudi_1',
        userId: 'usr_daudi',
        title: 'AfriSolar Microgrid Telematics',
        category: 'Hardware & IoT',
        headline: 'Solar battery health and payload telemetry for off-grid rural clinics',
        problemSolved: 'Prevented battery catastrophic failure in 14 rural clinics by deploying ESP32 LoRa sensor nodes that transmit cell voltage and thermal drift to a central dashboard.',
        liveUrl: 'https://afrisolar.demo.dev',
        techStack: ['ESP32', 'C++', 'LoRaWAN', 'MQTT', 'Grafana'],
        metrics: '14 Clinics Protected • 40km LoRa Range • 1.5-Year Node Battery Life',
        status: 'completed',
        featured: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    this.data.problems = [
      {
        id: 'prob_1',
        userId: 'usr_ibrahim',
        title: 'Race Condition Ledger Anomaly in Concurrent M-Pesa IPN Callbacks',
        domain: 'FinTech & Databases',
        symptoms: 'When 50+ concurrent customer checkout webhooks fired within 2 seconds, duplicate database rows were inserted and customer balances showed double credit.',
        rootCause: 'Non-atomic check-then-act logic without row locks; read occurred before simultaneous insert committed.',
        solution: 'Implemented PostgreSQL SELECT ... FOR UPDATE on an idempotency key table inside a serialized transaction. First callback acquires lock; concurrent duplicates safely hit duplicate key constraint and return HTTP 200 without re-processing.',
        outcome: 'Zero duplicate payments recorded across 14,000+ subsequent transactions.',
        techStack: ['PostgreSQL', 'Go', 'ACID Transactions', 'M-Pesa IPN'],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'prob_2',
        userId: 'usr_tamim',
        title: 'Silent Exfiltration via DNS Port 53 Tunneling',
        domain: 'Cybersecurity',
        symptoms: 'Outbound traffic firewall did not alert, but external server was receiving base64 encoded chunks in subdomains of an attacker domain.',
        rootCause: 'Standard firewalls allow UDP port 53 by default; payload was encoded into base64 TXT queries with high entropy.',
        solution: 'Configured Suricata IDS rule flagging DNS queries with subdomain length > 50 characters and Shannon entropy > 3.8. Blocked domain and isolated host.',
        outcome: 'Exfiltration aborted within 4 seconds of initial beacon.',
        techStack: ['Suricata', 'Wireshark', 'Python', 'DNS Protocol'],
        createdAt: now,
        updatedAt: now
      }
    ];

    this.persist();
  }

  // Projects CRUD
  getProjects(userId?: string): Project[] {
    if (!this.data.projects) this.data.projects = [];
    if (userId) {
      return this.data.projects.filter(p => p.userId === userId).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return this.data.projects;
  }

  getProjectById(id: string): Project | undefined {
    if (!this.data.projects) this.data.projects = [];
    return this.data.projects.find(p => p.id === id);
  }

  createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    if (!this.data.projects) this.data.projects = [];
    const now = new Date().toISOString();
    const newProject: Project = {
      ...data,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };
    this.data.projects.unshift(newProject);
    this.logActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: data.userId,
      type: 'PROJECT_ADDED',
      description: `Published proof of work: "${data.title}" in ${data.category}.`,
      metadata: { projectId: newProject.id },
      createdAt: now
    });
    this.persist();
    return newProject;
  }

  updateProject(id: string, userId: string, updates: Partial<Project>): Project | null {
    if (!this.data.projects) this.data.projects = [];
    const project = this.data.projects.find(p => p.id === id);
    if (!project || project.userId !== userId) return null;

    delete (updates as any).id;
    delete (updates as any).userId;
    delete (updates as any).createdAt;

    Object.assign(project, updates, { updatedAt: new Date().toISOString() });
    this.persist();
    return project;
  }

  deleteProject(id: string, userId: string): boolean {
    if (!this.data.projects) this.data.projects = [];
    const index = this.data.projects.findIndex(p => p.id === id && p.userId === userId);
    if (index === -1) return false;
    const removed = this.data.projects.splice(index, 1)[0];
    this.logActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      type: 'PROJECT_DELETED',
      description: `Removed project "${removed.title}".`,
      createdAt: new Date().toISOString()
    });
    this.persist();
    return true;
  }

  // Problems CRUD
  getProblems(userId?: string): ProblemCase[] {
    if (!this.data.problems) this.data.problems = [];
    if (userId) {
      return this.data.problems.filter(p => p.userId === userId);
    }
    return this.data.problems;
  }

  createProblem(data: Omit<ProblemCase, 'id' | 'createdAt' | 'updatedAt'>): ProblemCase {
    if (!this.data.problems) this.data.problems = [];
    const now = new Date().toISOString();
    const newProblem: ProblemCase = {
      ...data,
      id: `prob_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };
    this.data.problems.unshift(newProblem);
    this.logActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: data.userId,
      type: 'PROBLEM_SOLVED',
      description: `Documented solution for: "${data.title}".`,
      metadata: { problemId: newProblem.id },
      createdAt: now
    });
    this.persist();
    return newProblem;
  }

  deleteProblem(id: string, userId: string): boolean {
    if (!this.data.problems) this.data.problems = [];
    const index = this.data.problems.findIndex(p => p.id === id && p.userId === userId);
    if (index === -1) return false;
    this.data.problems.splice(index, 1);
    this.persist();
    return true;
  }

  // --- Stage 3: Endorsements, Discussions & Articles ---

  seedStage3Data() {
    const now = new Date().toISOString();

    this.data.endorsements = [
      {
        id: 'end_1',
        targetUserId: 'usr_ibrahim',
        authorUserId: 'usr_tamim',
        authorName: 'Tamim Al-Mansoor',
        authorUsername: 'tamim',
        authorRole: 'Cybersecurity Learner & Network Analyst',
        type: 'project',
        targetId: 'proj_ibrahim_1',
        targetTitle: 'Panga na Kupangisha (Tenant & Property Cloud)',
        relationship: 'Code Reviewer',
        content: 'Audited Ibrahim’s PostgreSQL Row-Level Security isolation queries and idempotent webhook listeners. The RLS policies strictly quarantine tenant records and safely prevent race-condition balance updates under high concurrency.',
        verified: true,
        createdAt: now
      },
      {
        id: 'end_2',
        targetUserId: 'usr_ibrahim',
        authorUserId: 'usr_sarah',
        authorName: 'Sarah Chen',
        authorUsername: 'sarah',
        authorRole: 'Product Designer & UX Researcher',
        type: 'skill',
        targetTitle: 'Distributed Systems & Hypermedia',
        relationship: 'Collaborator',
        content: 'Ibrahim has an exceptional ability to eliminate client-side JavaScript bloat. Replacing monolithic frontend frameworks with clean Go + HTMX cut mobile bounce rates significantly on low-bandwidth networks.',
        verified: true,
        createdAt: now
      },
      {
        id: 'end_3',
        targetUserId: 'usr_ibrahim',
        authorUserId: 'usr_daudi',
        authorName: 'Daudi Mushi',
        authorUsername: 'daudi_iot',
        authorRole: 'Embedded Systems & IoT Engineer',
        type: 'project',
        targetId: 'proj_ibrahim_2',
        targetTitle: 'Transit Logistics & Fleet Dispatcher',
        relationship: 'Colleague',
        content: 'Tested Ibrahim’s transit fleet endpoint on telemetry trackers travelling through the Morogoro-Iringa highway corridor. The 8KB compressed payload maintained reliable connectivity where bloated apps failed completely.',
        verified: true,
        createdAt: now
      },
      {
        id: 'end_4',
        targetUserId: 'usr_tamim',
        authorUserId: 'usr_ibrahim',
        authorName: 'Ibrahim Kimaro',
        authorUsername: 'ibrahim',
        authorRole: 'Systems Engineer & Full-Stack Architect',
        type: 'problem',
        targetId: 'prob_2',
        targetTitle: 'Silent Exfiltration via DNS Port 53 Tunneling',
        relationship: 'Mentor',
        content: 'Reviewed Tamim’s Suricata IDS rules and Shannon entropy calculations for detecting DNS tunneling. Methodical threat modeling and verifiable defensive execution.',
        verified: true,
        createdAt: now
      }
    ];

    this.data.discussions = [
      {
        id: 'disc-1',
        userId: 'usr_kelvin',
        authorName: 'Kelvin Massawe',
        authorUsername: 'kelvin',
        authorRole: 'FinTech Backend Dev',
        title: 'How to prevent race conditions during high-volume M-Pesa webhook bursts in PostgreSQL?',
        category: 'database',
        content: 'When users pay during flash sales, we get 50+ concurrent M-Pesa IPN callbacks per second. Sometimes two simultaneous callbacks update the same ledger entry, causing double-accounting balance anomalies. What is the cleanest locking pattern?',
        upvotes: 14,
        upvoters: ['usr_ibrahim', 'usr_tamim'],
        replies: [
          {
            id: 'rep-1',
            authorUserId: 'usr_ibrahim',
            authorName: 'Ibrahim Kimaro',
            authorUsername: 'ibrahim',
            authorRole: 'Systems Engineer & Full-Stack Architect',
            content: 'Use PostgreSQL SELECT ... FOR UPDATE with an idempotency key table. Ensure your webhook handler wraps the transaction: BEGIN; SELECT id FROM payment_webhooks WHERE transaction_id = $1 FOR UPDATE; If row exists, COMMIT and return HTTP 200 immediately. Otherwise insert and execute balance update.',
            createdAt: now
          }
        ],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'disc-2',
        userId: 'usr_amina',
        authorName: 'Amina Salum',
        authorUsername: 'amina',
        authorRole: 'Fleet Dispatcher',
        title: 'Solving 12-second page loads on 3G mobile networks in regional transit corridors',
        category: 'performance',
        content: 'Our truck drivers in Morogoro and Iringa access our shipment dashboard over erratic 3G connections. The JavaScript bundle is 1.8MB, taking over 12 seconds to boot. Drivers give up and call dispatch by phone instead.',
        upvotes: 22,
        upvoters: ['usr_ibrahim', 'usr_daudi'],
        replies: [
          {
            id: 'rep-2',
            authorUserId: 'usr_ibrahim',
            authorName: 'Ibrahim Kimaro',
            authorUsername: 'ibrahim',
            authorRole: 'Systems Engineer & Full-Stack Architect',
            content: 'This is the exact problem HTMX was made to solve. By eliminating client-side JavaScript SPA bundles and returning compressed server HTML fragments (under 8KB gzip), your time-to-first-interactive drops from 12s to under 300ms even on Edge/3G.',
            createdAt: now
          }
        ],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'disc-3',
        userId: 'usr_david',
        authorName: 'David Ndossi',
        authorUsername: 'david_n',
        authorRole: 'SaaS Founder',
        title: 'Multi-tenant database schema: Separate databases vs Row-Level Security (RLS)?',
        category: 'architecture',
        content: 'Building a property management tool for 100+ landlords across Dar es Salaam. Should we spin up a separate Postgres database per landlord, or use PostgreSQL Row-Level Security with tenant_id?',
        upvotes: 19,
        upvoters: ['usr_ibrahim', 'usr_sarah'],
        replies: [
          {
            id: 'rep-3',
            authorUserId: 'usr_ibrahim',
            authorName: 'Ibrahim Kimaro',
            authorUsername: 'ibrahim',
            authorRole: 'Systems Engineer & Full-Stack Architect',
            content: 'Row-Level Security (RLS) with tenant_id in a single database is significantly easier to migrate, backup, and operate. We used RLS in Panga na Kupangisha (panga.kimaro.dev) and connection pooling with PgBouncer stays optimal even with thousands of active tenants.',
            createdAt: now
          }
        ],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'disc-4',
        userId: 'usr_tamim',
        authorName: 'Tamim Al-Mansoor',
        authorUsername: 'tamim',
        authorRole: 'Cybersecurity Learner & Network Analyst',
        title: 'Detecting anomalous DNS tunneling without breaking legitimate cloud resolvers',
        category: 'cybersecurity',
        content: 'We noticed attackers encoding data in base64 subdomains over UDP port 53. If we block long domains, CDNs and cloud services throw false positives. What mathematical threshold separates legitimate DNS traffic from exfiltration?',
        upvotes: 11,
        upvoters: ['usr_ibrahim'],
        replies: [
          {
            id: 'rep-4',
            authorUserId: 'usr_ibrahim',
            authorName: 'Ibrahim Kimaro',
            authorUsername: 'ibrahim',
            authorRole: 'Systems Engineer & Full-Stack Architect',
            content: 'Use Shannon Entropy in combination with request frequency per IP. Normal domains have entropy around 2.5 - 3.2. Base64 encoded covert data consistently exceeds 3.8 to 4.2. Require entropy > 3.8 AND query frequency > 20 req/minute to trigger firewall drop.',
            createdAt: now
          }
        ],
        createdAt: now,
        updatedAt: now
      }
    ];

    this.data.articles = [
      {
        id: 'art-1',
        userId: 'usr_ibrahim',
        authorName: 'Ibrahim Kimaro',
        authorUsername: 'ibrahim',
        authorRole: 'Systems Engineer & Full-Stack Architect',
        title: 'Zero-Bloat Systems: Why We Replaced Heavy Single-Page Apps with HTMX & Go',
        category: 'Architecture',
        readTime: '4 min read',
        summary: 'How replacing a 2.4MB client-side React bundle with pure hypermedia cut server memory by 75% and delivered sub-50ms render times across mobile networks.',
        content: `Modern web development has accumulated enormous unnecessary complexity. Client-side JavaScript bundles frequently exceed 2 megabytes, requiring mobile phones to parse, compile, and execute heavy code before rendering even a simple table.

By returning to pure hypermedia powered by HTMX, the server renders concise HTML fragments. Instead of transmitting large JSON payloads and executing virtual DOM diffs on battery-constrained devices, the browser directly swaps HTML into the DOM.

Key Results:
1. Bundle size reduced from 2.4MB to 14KB (HTMX runtime).
2. Time-to-Interactive reduced from 4.2s to 120ms on mobile connections.
3. Server memory usage reduced by 75% via lightweight Go goroutines.`,
        upvotes: 28,
        upvoters: ['usr_tamim', 'usr_sarah', 'usr_daudi'],
        tags: ['Go', 'HTMX', 'Web Performance', 'Hypermedia'],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'art-2',
        userId: 'usr_ibrahim',
        authorName: 'Ibrahim Kimaro',
        authorUsername: 'ibrahim',
        authorRole: 'Systems Engineer & Full-Stack Architect',
        title: 'Hardening PostgreSQL Row-Level Security for Multi-Tenant Real Estate Applications',
        category: 'Database',
        readTime: '6 min read',
        summary: 'A step-by-step guide to guaranteeing data isolation between property owners and tenants without managing 100 distinct database instances.',
        content: `In multi-tenant SaaS products, the most catastrophic failure is tenant data cross-contamination—where Tenant A accidentally sees invoices belonging to Tenant B.

Rather than relying purely on application-level WHERE tenant_id = ? clauses (which can be omitted by human error in complex joins), PostgreSQL offers native Row-Level Security (RLS).

By enabling RLS and setting session variables:
SET LOCAL app.current_tenant_id = 'org_123';
PostgreSQL automatically enforces security constraints at the database engine level, rejecting any query that attempts to read unauthorized rows.`,
        upvotes: 34,
        upvoters: ['usr_tamim', 'usr_daudi'],
        tags: ['PostgreSQL', 'Security', 'SaaS', 'RLS'],
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'art-3',
        userId: 'usr_tamim',
        authorName: 'Tamim Al-Mansoor',
        authorUsername: 'tamim',
        authorRole: 'Cybersecurity Learner & Network Analyst',
        title: 'Defending UDP Port 53: Identifying Base64 Exfiltration via Shannon Entropy Analysis',
        category: 'Cybersecurity',
        readTime: '5 min read',
        summary: 'Building intrusion detection rules to stop silent covert channels in restricted network environments.',
        content: `Port 53 is the blind spot of enterprise firewalls. Administrators leave UDP 53 unrestricted because without DNS, external internet access breaks entirely.

Attackers exploit this by encoding sensitive data into subdomains:
e.g. dGhpcyBpcyBzZWNyZXQ.attacker.com

By computing Shannon entropy on the character distribution of hostname labels:
H(X) = - SUM P(x_i) * log2(P(x_i))
We can isolate randomized data chunks in real time and quarantine offending hosts before large files are exfiltrated.`,
        upvotes: 19,
        upvoters: ['usr_ibrahim'],
        tags: ['Cybersecurity', 'Wireshark', 'Suricata', 'Network Defense'],
        createdAt: now,
        updatedAt: now
      }
    ];

    this.persist();
  }

  // Endorsements CRUD
  getEndorsements(targetUserId?: string): Endorsement[] {
    if (!this.data.endorsements) this.data.endorsements = [];
    if (targetUserId) {
      return this.data.endorsements.filter(e => e.targetUserId === targetUserId);
    }
    return this.data.endorsements;
  }

  createEndorsement(data: Omit<Endorsement, 'id' | 'createdAt'>): Endorsement {
    if (!this.data.endorsements) this.data.endorsements = [];
    const now = new Date().toISOString();
    const newEndorsement: Endorsement = {
      ...data,
      id: `end_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now
    };
    this.data.endorsements.unshift(newEndorsement);
    this.logActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: data.authorUserId,
      targetUserId: data.targetUserId,
      type: 'ENDORSEMENT_RECEIVED',
      description: `${data.authorName} endorsed work: "${data.targetTitle || data.type}".`,
      createdAt: now
    });
    this.persist();
    return newEndorsement;
  }

  deleteEndorsement(id: string, userId: string, isAdmin?: boolean): boolean {
    if (!this.data.endorsements) this.data.endorsements = [];
    const index = this.data.endorsements.findIndex(e => e.id === id);
    if (index === -1) return false;
    const item = this.data.endorsements[index];
    if (item.authorUserId !== userId && item.targetUserId !== userId && !isAdmin) {
      return false;
    }
    this.data.endorsements.splice(index, 1);
    this.persist();
    return true;
  }

  // Discussions CRUD
  getDiscussions(category?: string, search?: string): DiscussionPost[] {
    if (!this.data.discussions) this.data.discussions = [];
    let list = [...this.data.discussions];
    if (category && category !== 'all') {
      list = list.filter(d => d.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.trim().toLowerCase();
      list = list.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.content.toLowerCase().includes(q) ||
        d.authorName.toLowerCase().includes(q)
      );
    }
    return list;
  }

  getDiscussionById(id: string): DiscussionPost | undefined {
    if (!this.data.discussions) this.data.discussions = [];
    return this.data.discussions.find(d => d.id === id);
  }

  createDiscussion(data: Omit<DiscussionPost, 'id' | 'upvotes' | 'upvoters' | 'replies' | 'createdAt' | 'updatedAt'>): DiscussionPost {
    if (!this.data.discussions) this.data.discussions = [];
    const now = new Date().toISOString();
    const newPost: DiscussionPost = {
      ...data,
      id: `disc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      upvotes: 1,
      upvoters: data.userId ? [data.userId] : [],
      replies: [],
      createdAt: now,
      updatedAt: now
    };
    this.data.discussions.unshift(newPost);
    if (data.userId) {
      this.logActivity({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: data.userId,
        type: 'DISCUSSION_POSTED',
        description: `Posted discussion: "${data.title}"`,
        createdAt: now
      });
    }
    this.persist();
    return newPost;
  }

  addDiscussionReply(id: string, reply: Omit<DiscussionReply, 'id' | 'createdAt'>): DiscussionReply | null {
    if (!this.data.discussions) this.data.discussions = [];
    const post = this.data.discussions.find(d => d.id === id);
    if (!post) return null;
    const now = new Date().toISOString();
    const newReply: DiscussionReply = {
      ...reply,
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now
    };
    post.replies.push(newReply);
    post.updatedAt = now;
    this.persist();
    return newReply;
  }

  upvoteDiscussion(id: string, voterIdOrIp: string): { upvotes: number; userUpvoted: boolean } | null {
    if (!this.data.discussions) this.data.discussions = [];
    const post = this.data.discussions.find(d => d.id === id);
    if (!post) return null;
    if (!post.upvoters) post.upvoters = [];
    const idx = post.upvoters.indexOf(voterIdOrIp);
    let userUpvoted = false;
    if (idx > -1) {
      post.upvoters.splice(idx, 1);
      post.upvotes = Math.max(0, post.upvotes - 1);
      userUpvoted = false;
    } else {
      post.upvoters.push(voterIdOrIp);
      post.upvotes = (post.upvotes || 0) + 1;
      userUpvoted = true;
    }
    this.persist();
    return { upvotes: post.upvotes, userUpvoted };
  }

  deleteDiscussion(id: string, userId: string, isAdmin?: boolean): boolean {
    if (!this.data.discussions) this.data.discussions = [];
    const idx = this.data.discussions.findIndex(d => d.id === id);
    if (idx === -1) return false;
    const post = this.data.discussions[idx];
    if (post.userId !== userId && !isAdmin) return false;
    this.data.discussions.splice(idx, 1);
    this.persist();
    return true;
  }

  // Articles CRUD
  getArticles(category?: string, search?: string): ArticlePost[] {
    if (!this.data.articles) this.data.articles = [];
    let list = [...this.data.articles];
    if (category && category !== 'all') {
      list = list.filter(a => a.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.trim().toLowerCase();
      list = list.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.summary.toLowerCase().includes(q) || 
        a.content.toLowerCase().includes(q) ||
        a.authorName.toLowerCase().includes(q)
      );
    }
    return list;
  }

  getArticleById(id: string): ArticlePost | undefined {
    if (!this.data.articles) this.data.articles = [];
    return this.data.articles.find(a => a.id === id);
  }

  createArticle(data: Omit<ArticlePost, 'id' | 'upvotes' | 'upvoters' | 'createdAt' | 'updatedAt'>): ArticlePost {
    if (!this.data.articles) this.data.articles = [];
    const now = new Date().toISOString();
    const newArt: ArticlePost = {
      ...data,
      id: `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      upvotes: 1,
      upvoters: data.userId ? [data.userId] : [],
      createdAt: now,
      updatedAt: now
    };
    this.data.articles.unshift(newArt);
    if (data.userId) {
      this.logActivity({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: data.userId,
        type: 'ARTICLE_PUBLISHED',
        description: `Published engineering article: "${data.title}"`,
        createdAt: now
      });
    }
    this.persist();
    return newArt;
  }

  upvoteArticle(id: string, voterIdOrIp: string): { upvotes: number; userUpvoted: boolean } | null {
    if (!this.data.articles) this.data.articles = [];
    const art = this.data.articles.find(a => a.id === id);
    if (!art) return null;
    if (!art.upvoters) art.upvoters = [];
    const idx = art.upvoters.indexOf(voterIdOrIp);
    let userUpvoted = false;
    if (idx > -1) {
      art.upvoters.splice(idx, 1);
      art.upvotes = Math.max(0, art.upvotes - 1);
      userUpvoted = false;
    } else {
      art.upvoters.push(voterIdOrIp);
      art.upvotes = (art.upvotes || 0) + 1;
      userUpvoted = true;
    }
    this.persist();
    return { upvotes: art.upvotes, userUpvoted };
  }

  deleteArticle(id: string, userId: string, isAdmin?: boolean): boolean {
    if (!this.data.articles) this.data.articles = [];
    const idx = this.data.articles.findIndex(a => a.id === id);
    if (idx === -1) return false;
    const art = this.data.articles[idx];
    if (art.userId !== userId && !isAdmin) return false;
    this.data.articles.splice(idx, 1);
    this.persist();
    return true;
  }

  // =============================================================
  // STAGE 4: CLIENT INQUIRIES, CONTRACTS & OPPORTUNITIES BOARD
  // =============================================================

  seedStage4Data() {
    const now = new Date().toISOString();

    this.data.inquiries = [
      {
        id: 'inq_1',
        targetUserId: 'usr_ibrahim',
        senderName: 'Daudi K. Mrema',
        senderEmail: 'dmrema@mwambalogistics.co.tz',
        senderPhone: '+255 754 883 912',
        projectType: 'Edge / Logistics Systems',
        budgetRange: '2.5M - 5M TZS',
        timeline: '2 Weeks',
        title: 'Morogoro-Dodoma Freight Fleet Tracking & Offline Dashboard',
        description: 'We manage a fleet of 35 freight trucks transporting cargo through central Tanzania corridors. Our current portal crashes on 3G highways. We want to commission you to build an ultra-lean Go + HTMX tracking interface matching your Transit Logistics system, with automated SMS alerts and local caching.',
        status: 'in_discussion',
        notes: 'Requested proposal walkthrough via WhatsApp on Monday at 10:00 AM.',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'inq_2',
        targetUserId: 'usr_ibrahim',
        senderName: 'Amina Rashid',
        senderEmail: 'arashid@kilimodirect.co.tz',
        senderPhone: '+255 689 332 110',
        projectType: 'M-Pesa / FinTech',
        budgetRange: '1.5M - 2.5M TZS',
        timeline: 'Immediate (< 1 week)',
        title: 'M-Pesa C2B Webhook Reconciliation & Idempotent Escrow Ledger',
        description: 'Need to prevent race condition anomalies during peak avocado harvest bidding on our agricultural portal. We need your idempotent transaction listener with PostgreSQL row-level locks and instant SMS payout webhooks for our cooperative growers.',
        status: 'contract_active',
        notes: 'Deposit received. Production deployment scheduled for Friday.',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'inq_3',
        targetUserId: 'usr_ibrahim',
        senderName: 'Michael Van Der Berg',
        senderEmail: 'mvanderberg@africasolarcapital.com',
        senderPhone: '+255 784 901 234',
        projectType: 'Database / RLS',
        budgetRange: '$1,000 - $3,000 USD',
        timeline: '1 Month',
        title: 'Multi-Tenant Microfinance Database Architecture & Row-Level Security Audit',
        description: 'We are expanding our pay-as-you-go solar lease platform across East Africa. We need an architect to design and verify PostgreSQL Row-Level Security isolation rules ensuring investor portfolios and customer loans are strictly partitioned.',
        status: 'proposal_sent',
        notes: 'Sent formal SLA and system design specification document.',
        createdAt: now,
        updatedAt: now
      }
    ];

    this.data.opportunities = [
      {
        id: 'opp_1',
        creatorUserId: 'usr_ibrahim',
        creatorName: 'Ibrahim Kimaro',
        creatorRole: 'Systems Lead',
        creatorCompany: 'Proofolio Network & Client Partners',
        title: 'Senior Hypermedia & Go Systems Developer (FinTech Billing Hub)',
        category: 'Contract',
        budgetOrSalary: 'TZS 3,500,000 / month',
        location: 'Remote / Dar es Salaam',
        description: 'Looking for a skilled backend systems developer proficient in Go, PostgreSQL ACID locks, and server-rendered hypermedia (HTMX) to collaborate on multi-tenant billing pipelines. Must understand low-latency systems and concurrent webhooks.',
        requiredSkills: ['Go', 'PostgreSQL', 'HTMX', 'M-Pesa API', 'Docker'],
        contactEmailOrUrl: 'ibrahimkimaro01@gmail.com',
        applicantsCount: 2,
        applicants: [
          {
            userId: 'usr_kelvin',
            username: 'kelvin',
            displayName: 'Kelvin Massawe',
            headline: 'FinTech Backend Dev',
            email: 'kelvin@example.com',
            message: 'Extensive experience in Go channels and PostgreSQL payment reconciliation.',
            appliedAt: now
          },
          {
            userId: 'usr_daudi',
            username: 'daudi_iot',
            displayName: 'Daudi Mushi',
            headline: 'Embedded Systems & IoT Engineer',
            email: 'daudi@example.com',
            message: 'Interested in the telemetry pipeline and lightweight payload compression.',
            appliedAt: now
          }
        ],
        status: 'open',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'opp_2',
        creatorUserId: 'usr_sarah',
        creatorName: 'Sarah Chen',
        creatorRole: 'Head of Product',
        creatorCompany: 'AfyaCloud Health',
        title: 'PostgreSQL Database Performance & Security Auditor',
        category: 'Consulting',
        budgetOrSalary: '$1,500 - $2,500 USD fixed',
        location: 'Remote',
        description: 'We need an experienced database engineer to audit our EHR clinical database. Tasks include checking query execution plans, indexing strategies, and configuring Row-Level Security policies to maintain data isolation and privacy.',
        requiredSkills: ['PostgreSQL', 'Row-Level Security (RLS)', 'SQL Optimization', 'Security Hardening'],
        contactEmailOrUrl: 'careers@afyacloud.health',
        applicantsCount: 1,
        applicants: [
          {
            userId: 'usr_ibrahim',
            username: 'ibrahim',
            displayName: 'Ibrahim Kimaro',
            headline: 'Systems Engineer & Full-Stack Architect',
            email: 'ibrahimkimaro01@gmail.com',
            message: 'Designed production RLS for multi-tenant property and leasing systems in East Africa.',
            appliedAt: now
          }
        ],
        status: 'open',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'opp_3',
        creatorUserId: 'usr_tamim',
        creatorName: 'Tamim Al-Mansoor',
        creatorRole: 'Cybersecurity Analyst',
        creatorCompany: 'SecuredCorridors',
        title: 'Suricata Intrusion Detection & Packet Filter Engineer',
        category: 'Collaboration',
        budgetOrSalary: 'TZS 1,800,000 / project milestone',
        location: 'Dar es Salaam / Hybrid',
        description: 'Building an automated alert pipeline for detecting DNS covert channels and abnormal outbound entropy in financial networks. Seeking an engineer to write Suricata rules and Python pcap parsers.',
        requiredSkills: ['Python', 'Wireshark', 'Suricata', 'Linux Hardening', 'Network Protocols'],
        contactEmailOrUrl: 'security@securedcorridors.co.tz',
        applicantsCount: 0,
        applicants: [],
        status: 'open',
        createdAt: now,
        updatedAt: now
      }
    ];

    this.persist();
  }

  // --- Inquiries CRUD ---

  getInquiries(targetUserId?: string): Inquiry[] {
    if (!this.data.inquiries) this.data.inquiries = [];
    if (targetUserId) {
      return this.data.inquiries.filter(i => i.targetUserId === targetUserId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return this.data.inquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getInquiryById(id: string): Inquiry | undefined {
    if (!this.data.inquiries) this.data.inquiries = [];
    return this.data.inquiries.find(i => i.id === id);
  }

  createInquiry(data: Omit<Inquiry, 'id' | 'createdAt' | 'updatedAt'>): Inquiry {
    if (!this.data.inquiries) this.data.inquiries = [];
    const now = new Date().toISOString();
    const newInquiry: Inquiry = {
      ...data,
      id: `inq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };
    this.data.inquiries.unshift(newInquiry);

    this.logActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: data.senderUserId || 'guest',
      targetUserId: data.targetUserId,
      type: 'INQUIRY_RECEIVED',
      description: `New project inquiry received from ${data.senderName}: "${data.title}".`,
      createdAt: now
    });

    this.persist();
    return newInquiry;
  }

  updateInquiryStatus(id: string, targetUserId: string, status: InquiryStatus, notes?: string, isAdmin?: boolean): Inquiry | null {
    if (!this.data.inquiries) this.data.inquiries = [];
    const inq = this.data.inquiries.find(i => i.id === id);
    if (!inq) return null;
    if (inq.targetUserId !== targetUserId && !isAdmin) return null;

    inq.status = status;
    if (typeof notes === 'string') inq.notes = notes;
    inq.updatedAt = new Date().toISOString();
    this.persist();
    return inq;
  }

  deleteInquiry(id: string, targetUserId: string, isAdmin?: boolean): boolean {
    if (!this.data.inquiries) this.data.inquiries = [];
    const idx = this.data.inquiries.findIndex(i => i.id === id);
    if (idx === -1) return false;
    const inq = this.data.inquiries[idx];
    if (inq.targetUserId !== targetUserId && !isAdmin) return false;

    this.data.inquiries.splice(idx, 1);
    this.persist();
    return true;
  }

  // --- Opportunities CRUD ---

  getOpportunities(category?: string, search?: string): Opportunity[] {
    if (!this.data.opportunities) this.data.opportunities = [];
    let list = [...this.data.opportunities];
    if (category && category !== 'all') {
      list = list.filter(o => o.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.trim().toLowerCase();
      list = list.filter(o => 
        o.title.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.location.toLowerCase().includes(q) ||
        o.creatorCompany?.toLowerCase().includes(q) ||
        o.requiredSkills.some(s => s.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getOpportunityById(id: string): Opportunity | undefined {
    if (!this.data.opportunities) this.data.opportunities = [];
    return this.data.opportunities.find(o => o.id === id);
  }

  createOpportunity(data: Omit<Opportunity, 'id' | 'applicantsCount' | 'applicants' | 'status' | 'createdAt' | 'updatedAt'>): Opportunity {
    if (!this.data.opportunities) this.data.opportunities = [];
    const now = new Date().toISOString();
    const newOpp: Opportunity = {
      ...data,
      id: `opp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      applicantsCount: 0,
      applicants: [],
      status: 'open',
      createdAt: now,
      updatedAt: now
    };
    this.data.opportunities.unshift(newOpp);

    this.logActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: data.creatorUserId,
      type: 'OPPORTUNITY_POSTED',
      description: `Posted new ${data.category} opportunity: "${data.title}".`,
      createdAt: now
    });

    this.persist();
    return newOpp;
  }

  applyToOpportunity(id: string, applicant: OpportunityApplicant): { success: boolean; message?: string } {
    if (!this.data.opportunities) this.data.opportunities = [];
    const opp = this.data.opportunities.find(o => o.id === id);
    if (!opp) return { success: false, message: 'Opportunity not found' };

    if (!opp.applicants) opp.applicants = [];
    const alreadyApplied = opp.applicants.some(a => a.userId === applicant.userId);
    if (alreadyApplied) {
      return { success: false, message: 'You have already applied to this opportunity.' };
    }

    opp.applicants.push(applicant);
    opp.applicantsCount = opp.applicants.length;
    opp.updatedAt = new Date().toISOString();

    this.logActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: applicant.userId,
      targetUserId: opp.creatorUserId,
      type: 'OPPORTUNITY_APPLIED',
      description: `${applicant.displayName} applied to: "${opp.title}".`,
      createdAt: new Date().toISOString()
    });

    this.persist();
    return { success: true };
  }

  deleteOpportunity(id: string, userId: string, isAdmin?: boolean): boolean {
    if (!this.data.opportunities) this.data.opportunities = [];
    const idx = this.data.opportunities.findIndex(o => o.id === id);
    if (idx === -1) return false;
    const opp = this.data.opportunities[idx];
    if (opp.creatorUserId !== userId && !isAdmin) return false;

    this.data.opportunities.splice(idx, 1);
    this.persist();
    return true;
  }
}

export const db = new Database();
