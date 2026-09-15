import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import {
  hashPassword,
  verifyPassword,
  validateUsername,
  validateEmail,
  validatePassword
} from './server/auth.js';
import { User, Profile } from './server/types.js';

interface AuthRequest extends Request {
  user?: User;
  profile?: Profile;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to parse cookies from headers
function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) {
      return decodeURIComponent(v.join('='));
    }
  }
  return undefined;
}

// Authentication middleware
function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  if (!token) {
    token = getCookie(req, 'proofolio_session');
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const session = db.getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  const user = db.getUserById(session.userId);
  if (!user || user.status === 'disabled') {
    return res.status(403).json({ error: 'Account disabled or not found' });
  }

  req.user = user;
  req.profile = db.getProfileByUserId(user.id);
  next();
}

// Optional authentication middleware (for public views that adapt if logged in)
function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  if (!token) {
    token = getCookie(req, 'proofolio_session');
  }

  if (token) {
    const session = db.getSession(token);
    if (session) {
      const user = db.getUserById(session.userId);
      if (user && user.status !== 'disabled') {
        req.user = user;
        req.profile = db.getProfileByUserId(user.id);
      }
    }
  }
  next();
}

// Require Admin middleware
function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    next();
  });
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', product: 'Proofolio', version: '1.0.0-stage1' });
});

// 2. Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { email, username, password, displayName, headline, category } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username, and password are required.' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const userVal = validateUsername(username);
  if (!userVal.valid) {
    return res.status(400).json({ error: userVal.error });
  }

  const passVal = validatePassword(password);
  if (!passVal.valid) {
    return res.status(400).json({ error: passVal.error });
  }

  const existingEmail = db.getUserByEmail(email);
  if (existingEmail) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const existingUser = db.getUserByUsername(username);
  if (existingUser) {
    return res.status(409).json({ error: 'This username is already taken. Please choose another.' });
  }

  const now = new Date().toISOString();
  const { hash, salt } = hashPassword(password);

  const newUser: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: email.trim().toLowerCase(),
    username: username.trim().toLowerCase(),
    passwordHash: hash,
    passwordSalt: salt,
    role: 'user',
    status: 'active',
    createdAt: now,
    updatedAt: now
  };

  const newProfile: Profile = {
    userId: newUser.id,
    username: newUser.username,
    displayName: (displayName || username).trim(),
    headline: (headline || 'Portfolio Creator & Lifelong Learner').trim(),
    bio: '',
    avatarUrl: '',
    location: '',
    category: category || 'other',
    educationSummary: '',
    professionalSummary: '',
    skills: [],
    socialLinks: {},
    visibility: 'public',
    updatedAt: now
  };

  db.createUser(newUser, newProfile);
  const session = db.createSession(newUser.id);

  res.setHeader('Set-Cookie', `proofolio_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);

  const completion = db.calculateProfileCompletion(newProfile);

  return res.status(201).json({
    token: session.token,
    user: { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role },
    profile: newProfile,
    completion
  });
});

// 3. Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

  let user: User | undefined;
  if (identifier.includes('@')) {
    user = db.getUserByEmail(identifier);
  } else {
    user = db.getUserByUsername(identifier);
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  if (user.status === 'disabled') {
    return res.status(403).json({ error: 'This account has been disabled by an administrator. Please contact support.' });
  }

  const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  const session = db.createSession(user.id);
  res.setHeader('Set-Cookie', `proofolio_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);

  const profile = db.getProfileByUserId(user.id);
  const completion = profile ? db.calculateProfileCompletion(profile) : { percentage: 0, missing: [], recommendation: '' };

  return res.json({
    token: session.token,
    user: { id: user.id, email: user.email, username: user.username, role: user.role },
    profile,
    completion
  });
});

// 4. Auth: Logout
app.post('/api/auth/logout', optionalAuth, (req: AuthRequest, res) => {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
  if (!token) {
    token = getCookie(req, 'proofolio_session');
  }
  if (token) {
    db.deleteSession(token);
  }
  res.setHeader('Set-Cookie', 'proofolio_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 5. Auth: Current user (Me)
app.get('/api/auth/me', optionalAuth, (req: AuthRequest, res) => {
  if (!req.user || !req.profile) {
    return res.json({ user: null, profile: null });
  }

  const completion = db.calculateProfileCompletion(req.profile);
  const followersCount = db.getFollowerCount(req.user.id);
  const followingCount = db.getFollowingCount(req.user.id);

  return res.json({
    user: { id: req.user.id, email: req.user.email, username: req.user.username, role: req.user.role },
    profile: req.profile,
    completion,
    followersCount,
    followingCount
  });
});

// 6. User Dashboard (Authenticated)
app.get('/api/dashboard', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const profile = req.profile!;

  const completion = db.calculateProfileCompletion(profile);
  const followersCount = db.getFollowerCount(user.id);
  const followingCount = db.getFollowingCount(user.id);
  const activity = db.getUserActivity(user.id, 10);
  const userProjects = db.getProjects(user.id);
  const userProblems = db.getProblems(user.id);
  const userEndorsements = db.getEndorsements(user.id);
  const userDiscussions = db.getDiscussions().filter(d => d.userId === user.id);
  const userArticles = db.getArticles().filter(a => a.userId === user.id);
  const userInquiries = db.getInquiries(user.id);

  res.json({
    user: { id: user.id, email: user.email, username: user.username, role: user.role, createdAt: user.createdAt },
    profile,
    completion,
    followersCount,
    followingCount,
    projectsCount: userProjects.length,
    projects: userProjects,
    problems: userProblems,
    receivedEndorsements: userEndorsements,
    endorsements: userEndorsements,
    inquiries: userInquiries,
    inquiriesCount: userInquiries.length,
    myDiscussions: userDiscussions,
    myArticles: userArticles,
    activity
  });
});

// 7. Update own profile
app.put('/api/profiles/me', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const {
    displayName,
    headline,
    bio,
    avatarUrl,
    location,
    category,
    educationSummary,
    professionalSummary,
    skills,
    socialLinks,
    visibility,
    themeConfig
  } = req.body;

  const validVisibilities = ['public', 'unlisted', 'private'];
  const vis = validVisibilities.includes(visibility) ? visibility : 'public';

  const updated = db.updateProfile(user.id, {
    displayName: typeof displayName === 'string' ? displayName.trim() : undefined,
    headline: typeof headline === 'string' ? headline.trim() : undefined,
    bio: typeof bio === 'string' ? bio.trim() : undefined,
    avatarUrl: typeof avatarUrl === 'string' ? avatarUrl.trim() : undefined,
    location: typeof location === 'string' ? location.trim() : undefined,
    category: category || 'other',
    educationSummary: typeof educationSummary === 'string' ? educationSummary.trim() : undefined,
    professionalSummary: typeof professionalSummary === 'string' ? professionalSummary.trim() : undefined,
    skills: Array.isArray(skills) ? skills.map((s: string) => String(s).trim()).filter(Boolean) : undefined,
    socialLinks: typeof socialLinks === 'object' && socialLinks !== null ? socialLinks : undefined,
    visibility: vis,
    themeConfig: typeof themeConfig === 'object' && themeConfig !== null ? themeConfig : undefined
  });

  if (!updated) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const completion = db.calculateProfileCompletion(updated);
  res.json({ profile: updated, completion });
});

// Direct theme preferences update
app.put('/api/profiles/me/theme', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const { theme, fontStyle, accentColor, cardDensity } = req.body;

  const existingProfile = db.getProfileByUserId(user.id);
  if (!existingProfile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const updatedThemeConfig = {
    ...(existingProfile.themeConfig || {}),
    ...(theme ? { theme } : {}),
    ...(fontStyle ? { fontStyle } : {}),
    ...(accentColor ? { accentColor } : {}),
    ...(cardDensity ? { cardDensity } : {})
  };

  const updated = db.updateProfile(user.id, {
    themeConfig: updatedThemeConfig
  });

  res.json({ success: true, themeConfig: updatedThemeConfig, profile: updated });
});

// 8. Public Profile: GET /api/profiles/:username
app.get('/api/profiles/:username', optionalAuth, (req: AuthRequest, res) => {
  const username = req.params.username.toLowerCase();
  const profile = db.getProfileByUsername(username);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const targetUser = db.getUserById(profile.userId);
  if (!targetUser || targetUser.status === 'disabled') {
    return res.status(404).json({ error: 'This account is suspended or unavailable.' });
  }

  const isOwner = req.user?.id === profile.userId;
  const isAdmin = req.user?.role === 'admin';

  // Visibility Check: If private and not owner/admin, hide details!
  if (profile.visibility === 'private' && !isOwner && !isAdmin) {
    return res.json({
      isPrivate: true,
      username: profile.username,
      displayName: profile.displayName,
      message: `${profile.displayName} has set their portfolio to Private.`,
      followersCount: db.getFollowerCount(profile.userId),
      followingCount: db.getFollowingCount(profile.userId),
      isFollowing: req.user ? db.isFollowing(req.user.id, profile.userId) : false,
      isOwner: false,
      projects: [],
      problems: []
    });
  }

  const followersCount = db.getFollowerCount(profile.userId);
  const followingCount = db.getFollowingCount(profile.userId);
  const isFollowing = req.user ? db.isFollowing(req.user.id, profile.userId) : false;
  const activity = db.getUserActivity(profile.userId, 6);
  const userProjects = db.getProjects(profile.userId);
  const userProblems = db.getProblems(profile.userId);
  const userEndorsements = db.getEndorsements(profile.userId);

  res.json({
    isPrivate: false,
    profile,
    followersCount,
    followingCount,
    isFollowing,
    isOwner,
    activity,
    projects: userProjects,
    problems: userProblems,
    endorsements: userEndorsements,
    userJoined: targetUser.createdAt
  });
});

// --- Stage 2: Projects & Problems API Endpoints ---

// Projects: List
app.get('/api/projects', (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  const username = typeof req.query.username === 'string' ? req.query.username.toLowerCase() : undefined;

  if (username) {
    const prof = db.getProfileByUsername(username);
    if (!prof) return res.json({ projects: [] });
    return res.json({ projects: db.getProjects(prof.userId) });
  }

  return res.json({ projects: db.getProjects(userId) });
});

// Projects: Create
app.post('/api/projects', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const {
    title,
    category,
    headline,
    problemSolved,
    architectureNotes,
    liveUrl,
    repoUrl,
    techStack,
    metrics,
    status,
    featured,
    customization
  } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Project title is required' });
  }
  if (!problemSolved || typeof problemSolved !== 'string' || !problemSolved.trim()) {
    return res.status(400).json({ error: 'Please describe the problem this project solved' });
  }

  const project = db.createProject({
    userId: user.id,
    title: title.trim(),
    category: typeof category === 'string' && category.trim() ? category.trim() : 'Software Systems',
    headline: typeof headline === 'string' ? headline.trim() : '',
    problemSolved: problemSolved.trim(),
    architectureNotes: typeof architectureNotes === 'string' ? architectureNotes.trim() : undefined,
    liveUrl: typeof liveUrl === 'string' && liveUrl.trim() ? liveUrl.trim() : undefined,
    repoUrl: typeof repoUrl === 'string' && repoUrl.trim() ? repoUrl.trim() : undefined,
    techStack: Array.isArray(techStack) ? techStack.map((s: string) => String(s).trim()).filter(Boolean) : [],
    metrics: typeof metrics === 'string' ? metrics.trim() : undefined,
    status: status === 'in_progress' || status === 'concept' ? status : 'completed',
    featured: Boolean(featured),
    customization: typeof customization === 'object' && customization !== null ? customization : undefined
  });

  res.status(201).json({ success: true, project });
});

// Projects: Update
app.put('/api/projects/:id', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const projectId = req.params.id;

  const existing = db.getProjectById(projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }
  if (existing.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to edit this project' });
  }

  const updated = db.updateProject(projectId, existing.userId, req.body);
  res.json({ success: true, project: updated });
});

// Projects: Delete
app.delete('/api/projects/:id', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const projectId = req.params.id;

  const existing = db.getProjectById(projectId);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }
  if (existing.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this project' });
  }

  db.deleteProject(projectId, existing.userId);
  res.json({ success: true, message: 'Project deleted successfully' });
});

// Problems: List
app.get('/api/problems', (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  const username = typeof req.query.username === 'string' ? req.query.username.toLowerCase() : undefined;

  if (username) {
    const prof = db.getProfileByUsername(username);
    if (!prof) return res.json({ problems: [] });
    return res.json({ problems: db.getProblems(prof.userId) });
  }

  return res.json({ problems: db.getProblems(userId) });
});

// Problems: Create
app.post('/api/problems', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const { title, domain, symptoms, rootCause, solution, outcome, techStack } = req.body;

  if (!title || !symptoms || !solution) {
    return res.status(400).json({ error: 'Title, symptoms, and solution are required' });
  }

  const problem = db.createProblem({
    userId: user.id,
    title: String(title).trim(),
    domain: typeof domain === 'string' && domain.trim() ? domain.trim() : 'Engineering',
    symptoms: String(symptoms).trim(),
    rootCause: typeof rootCause === 'string' ? rootCause.trim() : '',
    solution: String(solution).trim(),
    outcome: typeof outcome === 'string' ? outcome.trim() : '',
    techStack: Array.isArray(techStack) ? techStack.map((s: string) => String(s).trim()).filter(Boolean) : []
  });

  res.status(201).json({ success: true, problem });
});

// Problems: Delete
app.delete('/api/problems/:id', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const problemId = req.params.id;

  const success = db.deleteProblem(problemId, user.id);
  if (!success) {
    return res.status(404).json({ error: 'Problem not found or unauthorized' });
  }
  res.json({ success: true });
});

// Resume Payload Generator for ANY user: GET /api/resume/:username
app.get('/api/resume/:username', (req, res) => {
  const username = req.params.username.toLowerCase();
  const profile = db.getProfileByUsername(username);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const targetUser = db.getUserById(profile.userId);
  const projects = db.getProjects(profile.userId);
  const problems = db.getProblems(profile.userId);
  const endorsements = db.getEndorsements(profile.userId);

  res.json({
    user: {
      username: profile.username,
      email: profile.visibility === 'public' ? targetUser?.email : undefined
    },
    profile,
    projects,
    problems,
    endorsements
  });
});

// 9. Follow / Unfollow System
app.post('/api/users/:username/follow', requireAuth, (req: AuthRequest, res) => {
  const targetUsername = req.params.username.toLowerCase();
  const targetProfile = db.getProfileByUsername(targetUsername);

  if (!targetProfile) {
    return res.status(404).json({ error: 'User not found' });
  }

  const result = db.followUser(req.user!.id, targetProfile.userId);
  if (!result.success) {
    return res.status(400).json({ error: result.message || 'Could not follow user.' });
  }

  const followersCount = db.getFollowerCount(targetProfile.userId);
  const followingCount = db.getFollowingCount(targetProfile.userId);

  res.json({
    success: true,
    isFollowing: true,
    followersCount,
    followingCount
  });
});

app.delete('/api/users/:username/follow', requireAuth, (req: AuthRequest, res) => {
  const targetUsername = req.params.username.toLowerCase();
  const targetProfile = db.getProfileByUsername(targetUsername);

  if (!targetProfile) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.unfollowUser(req.user!.id, targetProfile.userId);

  const followersCount = db.getFollowerCount(targetProfile.userId);
  const followingCount = db.getFollowingCount(targetProfile.userId);

  res.json({
    success: true,
    isFollowing: false,
    followersCount,
    followingCount
  });
});

// 10. Profile Discovery: GET /api/users/discover
app.get('/api/users/discover', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const category = typeof req.query.category === 'string' ? req.query.category : 'all';

  const results = db.discoverProfiles(q, category);
  res.json({ results });
});

// 11. Activity Stream Foundation
app.get('/api/activity', (req, res) => {
  const events = db.getRecentPublicActivity(15);
  res.json({ events });
});

// 12. Admin: User Management
app.get('/api/admin/users', requireAdmin, (req: AuthRequest, res) => {
  const users = db.getAllUsers();
  res.json({ users });
});

app.post('/api/admin/users/:userId/toggle-status', requireAdmin, (req: AuthRequest, res) => {
  const targetUserId = req.params.userId;

  if (targetUserId === req.user!.id) {
    return res.status(400).json({ error: 'Administrators cannot disable their own account.' });
  }

  const target = db.getUserById(targetUserId);
  if (!target) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const newStatus = target.status === 'active' ? 'disabled' : 'active';
  db.updateUser(target.id, { status: newStatus });

  if (newStatus === 'disabled') {
    db.deleteUserSessions(target.id);
  }

  db.logActivity({
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: req.user!.id,
    type: 'ACCOUNT_STATUS_CHANGED',
    targetUserId: target.id,
    description: `Admin ${req.user!.username} changed account status of ${target.username} to ${newStatus}.`,
    createdAt: new Date().toISOString()
  });

  res.json({
    success: true,
    userId: target.id,
    status: newStatus
  });
});

// =============================================================
// STAGE 3 API ENDPOINTS: ENDORSEMENTS, DISCUSSIONS, ARTICLES
// =============================================================

// --- Endorsements ---

app.get('/api/endorsements', (req, res) => {
  const { targetUserId, username } = req.query;

  if (username && typeof username === 'string') {
    const prof = db.getProfileByUsername(username.toLowerCase());
    if (!prof) return res.json({ endorsements: [] });
    return res.json({ endorsements: db.getEndorsements(prof.userId) });
  }

  const list = db.getEndorsements(typeof targetUserId === 'string' ? targetUserId : undefined);
  res.json({ endorsements: list });
});

app.post('/api/endorsements', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const profile = req.profile!;
  let { targetUserId, targetUsername, type, targetId, targetTitle, relationship, content } = req.body;

  if (targetUsername && !targetUserId) {
    const targetProf = db.getProfileByUsername(String(targetUsername).toLowerCase());
    if (targetProf) targetUserId = targetProf.userId;
  }

  if (!targetUserId) {
    return res.status(400).json({ error: 'Target user ID or username is required.' });
  }

  if (targetUserId === user.id) {
    return res.status(400).json({ error: 'You cannot endorse your own work.' });
  }

  const targetUser = db.getUserById(targetUserId);
  if (!targetUser || targetUser.status === 'disabled') {
    return res.status(404).json({ error: 'Target recipient account not found or inactive.' });
  }

  if (!content || String(content).trim().length < 8) {
    return res.status(400).json({ error: 'Endorsement content must be at least 8 characters explaining the verifiable impact.' });
  }

  const validRelationships = ['Colleague', 'Team Lead', 'Client', 'Code Reviewer', 'Collaborator', 'Mentor'] as const;
  const rel = (validRelationships as readonly string[]).includes(relationship) ? relationship as typeof validRelationships[number] : 'Colleague';

  const endorsement = db.createEndorsement({
    targetUserId,
    authorUserId: user.id,
    authorName: profile.displayName || user.username,
    authorUsername: user.username,
    authorRole: profile.headline || 'Contributor',
    type: ['project', 'problem', 'skill', 'general'].includes(type) ? type : 'project',
    targetId: typeof targetId === 'string' ? targetId : undefined,
    targetTitle: typeof targetTitle === 'string' && targetTitle.trim() ? targetTitle.trim() : undefined,
    relationship: rel,
    content: String(content).trim(),
    verified: true
  });

  res.status(201).json({ success: true, endorsement });
});

app.delete('/api/endorsements/:id', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const id = req.params.id;
  const isAdmin = user.role === 'admin';

  const deleted = db.deleteEndorsement(id, user.id, isAdmin);
  if (!deleted) {
    return res.status(404).json({ error: 'Endorsement not found or you are not authorized to delete it.' });
  }

  res.json({ success: true });
});

// --- Discussions ---

app.get('/api/discussions', (req, res) => {
  const { category, q } = req.query;
  const discussions = db.getDiscussions(
    typeof category === 'string' ? category : undefined,
    typeof q === 'string' ? q : undefined
  );
  res.json({ discussions });
});

app.get('/api/discussions/:id', (req, res) => {
  const post = db.getDiscussionById(req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'Discussion not found' });
  }
  res.json({ discussion: post });
});

app.post('/api/discussions', optionalAuth, (req: AuthRequest, res) => {
  const title = req.body.title;
  const content = req.body.content || req.body.description;
  const category = req.body.category;
  const authorName = req.body.authorName || req.body.author;
  const authorRole = req.body.authorRole || req.body.role;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content/description are required for a discussion.' });
  }

  const isUser = !!req.user;
  const author = isUser && req.profile ? req.profile.displayName : (authorName || 'Anonymous Engineer');
  const role = isUser && req.profile ? req.profile.headline : (authorRole || 'Community Member');

  const discussion = db.createDiscussion({
    userId: req.user?.id,
    authorName: author,
    authorUsername: req.user?.username,
    authorRole: role,
    title: String(title).trim(),
    category: typeof category === 'string' && category.trim() ? category.trim().toLowerCase() : 'general',
    content: String(content).trim()
  });

  res.status(201).json({ success: true, discussion });
});

app.post('/api/discussions/:id/replies', optionalAuth, (req: AuthRequest, res) => {
  const content = req.body.content || req.body.text;
  const authorName = req.body.authorName || req.body.author;
  const authorRole = req.body.authorRole || req.body.role;

  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Reply content is required.' });
  }

  const isUser = !!req.user;
  const author = isUser && req.profile ? req.profile.displayName : (authorName || 'Anonymous Engineer');
  const role = isUser && req.profile ? req.profile.headline : (authorRole || 'Community Member');

  const reply = db.addDiscussionReply(req.params.id, {
    authorUserId: req.user?.id,
    authorName: author,
    authorUsername: req.user?.username,
    authorRole: role,
    content: String(content).trim()
  });

  if (!reply) {
    return res.status(404).json({ error: 'Discussion thread not found.' });
  }

  res.status(201).json({ success: true, reply });
});

app.post('/api/discussions/:id/upvote', optionalAuth, (req: AuthRequest, res) => {
  const voterKey = req.user?.id || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'guest';
  const result = db.upvoteDiscussion(req.params.id, voterKey);

  if (!result) {
    return res.status(404).json({ error: 'Discussion not found' });
  }

  res.json({ 
    success: true, 
    upvotes: result.upvotes, 
    userUpvoted: result.userUpvoted,
    discussion: { upvotes: result.upvotes }
  });
});

app.delete('/api/discussions/:id', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const isAdmin = user.role === 'admin';
  const deleted = db.deleteDiscussion(req.params.id, user.id, isAdmin);

  if (!deleted) {
    return res.status(404).json({ error: 'Discussion not found or unauthorized.' });
  }

  res.json({ success: true });
});

// --- Articles ---

app.get('/api/articles', (req, res) => {
  const { category, q } = req.query;
  const articles = db.getArticles(
    typeof category === 'string' ? category : undefined,
    typeof q === 'string' ? q : undefined
  );
  res.json({ articles });
});

app.get('/api/articles/:id', (req, res) => {
  const article = db.getArticleById(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json({ article });
});

app.post('/api/articles', optionalAuth, (req: AuthRequest, res) => {
  const title = req.body.title;
  const content = req.body.content || req.body.body;
  const category = req.body.category;
  const summary = req.body.summary;
  const tags = req.body.tags;
  const authorName = req.body.authorName || req.body.author;
  const authorRole = req.body.authorRole || req.body.role;
  const readTime = req.body.readTime;
  const customization = req.body.customization;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content/body are required for an article.' });
  }

  const isUser = !!req.user;
  const author = isUser && req.profile ? req.profile.displayName : (authorName || 'Engineering Fellow');
  const role = isUser && req.profile ? req.profile.headline : (authorRole || 'Software Engineer');

  const wordCount = String(content).split(/\s+/).length;
  const computedReadTime = typeof readTime === 'string' && readTime.trim() 
    ? readTime.trim() 
    : `${Math.max(1, Math.ceil(wordCount / 180))} min read`;

  const article = db.createArticle({
    userId: req.user?.id,
    authorName: author,
    authorUsername: req.user?.username,
    authorRole: role,
    title: String(title).trim(),
    category: typeof category === 'string' && category.trim() ? category.trim() : 'Engineering',
    readTime: computedReadTime,
    summary: typeof summary === 'string' && summary.trim() ? summary.trim() : String(content).slice(0, 160) + '...',
    content: String(content).trim(),
    tags: Array.isArray(tags) ? tags.map((t: string) => String(t).trim()).filter(Boolean) : ['Architecture', 'Engineering'],
    customization: typeof customization === 'object' && customization !== null ? customization : undefined
  });

  res.status(201).json({ success: true, article });
});

app.post('/api/articles/:id/upvote', optionalAuth, (req: AuthRequest, res) => {
  const voterKey = req.user?.id || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'guest';
  const result = db.upvoteArticle(req.params.id, voterKey);

  if (!result) {
    return res.status(404).json({ error: 'Article not found' });
  }

  res.json({ 
    success: true, 
    upvotes: result.upvotes, 
    userUpvoted: result.userUpvoted,
    article: { upvotes: result.upvotes }
  });
});

app.delete('/api/articles/:id', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const isAdmin = user.role === 'admin';
  const deleted = db.deleteArticle(req.params.id, user.id, isAdmin);

  if (!deleted) {
    return res.status(404).json({ error: 'Article not found or unauthorized.' });
  }

  res.json({ success: true });
});

// =============================================================
// STAGE 4 API ENDPOINTS: CLIENT INQUIRIES & OPPORTUNITIES BOARD
// =============================================================

// --- Inquiries ---

app.get('/api/inquiries', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const targetUserId = (user.role === 'admin' && typeof req.query.targetUserId === 'string') 
    ? req.query.targetUserId 
    : user.id;

  const inquiries = db.getInquiries(targetUserId);
  res.json({ inquiries });
});

app.post('/api/inquiries', optionalAuth, (req: AuthRequest, res) => {
  let {
    targetUserId,
    targetUsername,
    senderName,
    senderEmail,
    senderPhone,
    projectType,
    budgetRange,
    timeline,
    title,
    description
  } = req.body;

  if (targetUsername && !targetUserId) {
    const targetProf = db.getProfileByUsername(String(targetUsername).toLowerCase());
    if (targetProf) targetUserId = targetProf.userId;
  }

  if (!targetUserId) {
    // Default to Ibrahim Kimaro if not specified
    const ibrahimProf = db.getProfileByUsername('ibrahim');
    targetUserId = ibrahimProf ? ibrahimProf.userId : 'usr_ibrahim';
  }

  if (!senderName || !String(senderName).trim()) {
    return res.status(400).json({ error: 'Your name or organization is required.' });
  }
  if (!senderEmail || !String(senderEmail).trim()) {
    return res.status(400).json({ error: 'Contact email is required.' });
  }
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Project or consultation title is required.' });
  }
  if (!description || !String(description).trim()) {
    return res.status(400).json({ error: 'Please describe the project scope, technical requirements, or consultation goals.' });
  }

  const inquiry = db.createInquiry({
    targetUserId,
    senderUserId: req.user?.id,
    senderName: String(senderName).trim(),
    senderEmail: String(senderEmail).trim(),
    senderPhone: senderPhone ? String(senderPhone).trim() : undefined,
    projectType: projectType ? String(projectType).trim() : 'Web System',
    budgetRange: budgetRange ? String(budgetRange).trim() : 'Flexible',
    timeline: timeline ? String(timeline).trim() : 'Flexible',
    title: String(title).trim(),
    description: String(description).trim(),
    status: 'new'
  });

  res.status(201).json({ success: true, inquiry });
});

const handleUpdateInquiryStatus = (req: AuthRequest, res: any) => {
  const user = req.user!;
  const { status, notes } = req.body;

  const validStatuses = ['new', 'in_discussion', 'proposal_sent', 'contract_active', 'completed', 'declined'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid inquiry status.' });
  }

  const updated = db.updateInquiryStatus(req.params.id, user.id, status, notes, user.role === 'admin');
  if (!updated) {
    return res.status(404).json({ error: 'Inquiry not found or you are not authorized to update it.' });
  }

  res.json({ success: true, inquiry: updated });
};

app.patch('/api/inquiries/:id/status', requireAuth, handleUpdateInquiryStatus);
app.put('/api/inquiries/:id/status', requireAuth, handleUpdateInquiryStatus);

app.delete('/api/inquiries/:id', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const deleted = db.deleteInquiry(req.params.id, user.id, user.role === 'admin');

  if (!deleted) {
    return res.status(404).json({ error: 'Inquiry not found or unauthorized.' });
  }

  res.json({ success: true });
});

// --- Opportunities ---

app.get('/api/opportunities', (req, res) => {
  const { category, q } = req.query;
  const list = db.getOpportunities(
    typeof category === 'string' ? category : undefined,
    typeof q === 'string' ? q : undefined
  );
  res.json({ opportunities: list });
});

app.get('/api/opportunities/:id', (req, res) => {
  const opp = db.getOpportunityById(req.params.id);
  if (!opp) {
    return res.status(404).json({ error: 'Opportunity not found' });
  }
  res.json({ opportunity: opp });
});

app.post('/api/opportunities', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const profile = req.profile!;
  const {
    title,
    category,
    budgetOrSalary,
    location,
    description,
    requiredSkills,
    contactEmailOrUrl,
    creatorCompany
  } = req.body;

  if (!title || !description || !budgetOrSalary) {
    return res.status(400).json({ error: 'Title, budget/salary, and description are required.' });
  }

  const validCategories = ['Contract', 'Full-Time', 'Collaboration', 'Consulting', 'Security Audit'] as const;
  const cat = validCategories.includes(category) ? category : 'Contract';

  const opportunity = db.createOpportunity({
    creatorUserId: user.id,
    creatorName: profile.displayName || user.username,
    creatorRole: profile.headline || 'Engineer',
    creatorCompany: typeof creatorCompany === 'string' ? creatorCompany.trim() : undefined,
    title: String(title).trim(),
    category: cat,
    budgetOrSalary: String(budgetOrSalary).trim(),
    location: location ? String(location).trim() : 'Remote',
    description: String(description).trim(),
    requiredSkills: Array.isArray(requiredSkills) ? requiredSkills.map(s => String(s).trim()).filter(Boolean) : ['Go', 'PostgreSQL'],
    contactEmailOrUrl: contactEmailOrUrl ? String(contactEmailOrUrl).trim() : user.email
  });

  res.status(201).json({ success: true, opportunity });
});

app.post('/api/opportunities/:id/apply', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const profile = req.profile!;
  const { message } = req.body;

  const result = db.applyToOpportunity(req.params.id, {
    userId: user.id,
    username: user.username,
    displayName: profile.displayName || user.username,
    headline: profile.headline || 'Engineer',
    email: user.email,
    message: typeof message === 'string' ? message.trim() : undefined,
    appliedAt: new Date().toISOString()
  });

  if (!result.success) {
    return res.status(400).json({ error: result.message || 'Could not apply to opportunity.' });
  }

  res.json({ success: true, message: 'Application submitted successfully with your verified Proofolio profile!' });
});

app.delete('/api/opportunities/:id', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const deleted = db.deleteOpportunity(req.params.id, user.id, user.role === 'admin');

  if (!deleted) {
    return res.status(404).json({ error: 'Opportunity not found or unauthorized.' });
  }

  res.json({ success: true });
});

// Direct link handler for /u/:username
app.get('/u/:username', (req, res, next) => {
  // Let Vite / static middleware handle serving the SPA entry point
  req.url = '/';
  next();
});

// -------------------------------------------------------------
// VITE / STATIC INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Proofolio server running on port ${PORT}`);
  });
}

startServer();
