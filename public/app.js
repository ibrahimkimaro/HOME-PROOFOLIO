// Pure JavaScript Hypermedia Driver for HTMX Application
// Handles state persistence in localStorage, dynamic lists, upvoting, replies, and modals

// Default Seed Data
const defaultDiscussions = [
  {
    id: 'disc-1',
    category: 'database',
    title: 'How to prevent race conditions during high-volume M-Pesa webhook bursts in PostgreSQL?',
    author: 'Kelvin Massawe',
    role: 'FinTech Backend Dev',
    time: '2 hours ago',
    description: 'When users pay during flash sales, we get 50+ concurrent M-Pesa IPN callbacks per second. Sometimes two simultaneous callbacks update the same ledger entry, causing double-accounting balance anomalies. What is the cleanest locking pattern?',
    upvotes: 14,
    replies: [
      {
        author: 'Ibrahim Kimaro',
        role: 'Systems Engineer',
        time: '1 hour ago',
        text: 'Use PostgreSQL SELECT ... FOR UPDATE with an idempotency key table. Ensure your webhook handler wraps the transaction: BEGIN; SELECT id FROM payment_webhooks WHERE transaction_id = $1 FOR UPDATE; If row exists, COMMIT and return HTTP 200 immediately. Otherwise insert and execute balance update.'
      }
    ]
  },
  {
    id: 'disc-2',
    category: 'performance',
    title: 'Solving 12-second page loads on 3G mobile networks in regional transit corridors',
    author: 'Amina Salum',
    role: 'Fleet Dispatcher',
    time: 'Yesterday',
    description: 'Our truck drivers in Morogoro and Iringa access our shipment dashboard over erratic 3G connections. The JavaScript bundle is 1.8MB, taking over 12 seconds to boot. Drivers give up and call dispatch by phone instead.',
    upvotes: 22,
    replies: [
      {
        author: 'Ibrahim Kimaro',
        role: 'Systems Engineer',
        time: 'Yesterday',
        text: 'This is the exact problem HTMX was made to solve. By eliminating client-side JavaScript SPA bundles and returning compressed server HTML fragments (under 8KB gzip), your time-to-first-interactive drops from 12s to under 300ms even on Edge/3G.'
      }
    ]
  },
  {
    id: 'disc-3',
    category: 'architecture',
    title: 'Multi-tenant database schema: Separate databases vs Row-Level Security (RLS)?',
    author: 'David Ndossi',
    role: 'SaaS Founder',
    time: '2 days ago',
    description: 'Building a property management tool for 100+ landlords across Dar es Salaam. Should we spin up a separate Postgres database per landlord, or use PostgreSQL Row-Level Security with tenant_id?',
    upvotes: 19,
    replies: [
      {
        author: 'Ibrahim Kimaro',
        role: 'Systems Engineer',
        time: '2 days ago',
        text: 'Row-Level Security (RLS) with tenant_id in a single database is significantly easier to migrate, backup, and operate. We used RLS in Panga na Kupangisha (panga.kimaro.dev) and connection pooling with PgBouncer stays optimal even with thousands of active tenants.'
      }
    ]
  }
];

const defaultArticles = [
  {
    id: 'art-1',
    category: 'Architecture',
    title: 'Zero-Bloat Systems: Why We Replaced Heavy Single-Page Apps with HTMX & Go',
    summary: 'How replacing a 2.4MB client-side React bundle with pure hypermedia cut server memory by 75% and delivered sub-50ms render times across mobile networks.',
    author: 'Ibrahim Kimaro',
    role: 'Systems Engineer',
    date: 'Sep 2026',
    body: `Modern web development has accumulated enormous unnecessary complexity. Client-side JavaScript bundles frequently exceed 2 megabytes, requiring mobile phones to parse, compile, and execute heavy code before rendering even a simple table.

By returning to pure hypermedia powered by HTMX, the server renders concise HTML fragments. Instead of transmitting large JSON payloads and executing virtual DOM diffs on battery-constrained devices, the browser directly swaps HTML into the DOM.

Key Results:
1. Bundle size reduced from 2.4MB to 14KB (HTMX runtime).
2. Time-to-Interactive reduced from 4.2s to 120ms on mobile connections.
3. Server memory usage reduced by 75% via lightweight Go goroutines.`
  },
  {
    id: 'art-2',
    category: 'Database',
    title: 'Hardening PostgreSQL Row-Level Security for Multi-Tenant Real Estate Applications',
    summary: 'A step-by-step guide to guaranteeing data isolation between property owners and tenants without managing 100 distinct database instances.',
    author: 'Ibrahim Kimaro',
    role: 'Systems Engineer',
    date: 'Aug 2026',
    body: `In multi-tenant SaaS products, the most catastrophic failure is tenant data cross-contamination—where Tenant A accidentally sees invoices belonging to Tenant B.

Rather than relying purely on application-level WHERE tenant_id = ? clauses (which can be omitted by human error in complex joins), PostgreSQL offers native Row-Level Security (RLS).

By enabling RLS and setting session variables:
SET LOCAL app.current_tenant_id = 'org_123';
PostgreSQL automatically enforces security constraints at the database engine level, rejecting any query that attempts to read unauthorized rows.`
  },
  {
    id: 'art-3',
    category: 'Performance',
    title: 'Resilient Mobile Payment Gateways: Handling M-Pesa Timeouts & Webhook Retries',
    summary: 'Engineering payment verification pipelines that never lose a transaction during network packet loss and telecommunication downtime.',
    author: 'Ibrahim Kimaro',
    role: 'Systems Engineer',
    date: 'July 2026',
    body: `Mobile money integrations in East Africa operate over complex telecom infrastructures. Webhooks can be delayed by minutes, retried repeatedly, or arrive out of sequence.

An effective payment pipeline requires:
1. Strict idempotency keys stored in Redis or PostgreSQL.
2. Background queue reconciliation workers that poll the provider API if a callback is missed.
3. Automated SMS receipt generation sent within 3 seconds of transaction confirmation.`
  }
];

// Helper to get from storage
function getStoredData(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    return fallback;
  }
}

// Helper to save
function setStoredData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error', e);
  }
}

// Global state
let discussions = getStoredData('ik_discussions', defaultDiscussions);
let articles = getStoredData('ik_articles', defaultArticles);
let activeDiscussionFilter = 'all';
let activeArticleFilter = 'all';
let discussionSearchQuery = '';
let articleSearchQuery = '';

// Initialize on page load and on HTMX content swaps
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupDynamicViews();
  });
} else {
  setupDynamicViews();
}

document.addEventListener('htmx:afterSwap', (evt) => {
  setupDynamicViews();
});

// Universal Hypermedia Fallback: Ensures zero-delay navigation even if HTMX is waiting or blocked
document.addEventListener('click', function(e) {
  const trigger = e.target.closest('[hx-get]');
  if (!trigger) return;

  // Check if htmx is initialized and processing
  if (!window.htmx) {
    e.preventDefault();
    const url = trigger.getAttribute('hx-get');
    const targetSelector = trigger.getAttribute('hx-target') || '#main-content';
    const dest = document.querySelector(targetSelector);
    if (url && dest) {
      fetch(url)
        .then(res => res.text())
        .then(html => {
          dest.innerHTML = html;
          setupDynamicViews();
          if (targetSelector === '#main-content') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        })
        .catch(err => console.error('Fetch error for', url, err));
    }
  }
});

function setupDynamicViews() {
  // Apply saved theme and font styles immediately from storage
  const savedTheme = localStorage.getItem('proofolio_theme');
  const savedFont = localStorage.getItem('proofolio_font');
  const savedAccent = localStorage.getItem('proofolio_accent');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  if (savedFont) document.documentElement.setAttribute('data-font', savedFont);
  if (savedAccent) document.documentElement.style.setProperty('--paper-accent', savedAccent);

  loadDiscussions();
  loadArticles();
  loadOpportunities();
  renderPreviewFromStorage();
  checkAuthStatus();
  handleUrlRouteOnLoad();
}

// -------------------------------------------------------------
// PROOFOLIO STAGE 1: AUTHENTICATION, IDENTITY & FOLLOW ENGINE
// -------------------------------------------------------------
let currentUser = null;
let currentViewingUsername = null;
let currentViewingProfileData = null;
let authPendingCallback = null;
let activeDiscoverCategory = 'all';

function getAuthHeaders() {
  const token = localStorage.getItem('proofolio_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Check auth status on load
async function checkAuthStatus() {
  try {
    const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (data && data.user) {
        currentUser = data;
        if (currentUser.profile && currentUser.profile.themeConfig) {
          applySystemTheme(currentUser.profile.themeConfig);
        }
      } else {
        currentUser = null;
      }
    } else {
      currentUser = null;
    }
  } catch (err) {
    console.error('Error checking auth:', err);
    currentUser = null;
  }
  renderHeaderAuthNav();
}

// Update Top Navigation Bar with Authenticated or Guest State
function renderHeaderAuthNav() {
  const container = document.getElementById('nav-auth-container');
  if (!container) return;

  if (currentUser && currentUser.user) {
    const name = currentUser.profile?.displayName || currentUser.user.username;
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'PF';
    const isAdmin = currentUser.user.role === 'admin';

    container.innerHTML = `
      <div class="flex items-center gap-1.5 sm:gap-2">
        <button
          onclick="openDashboardView()"
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#F0EBE3] border border-[#C4BCB2] hover:border-[#2B2A28] hover:bg-[#E7E0D6] transition-colors text-xs font-mono cursor-pointer shadow-2xs"
          title="Open Authenticated Dashboard"
        >
          <div class="w-6 h-6 rounded-lg bg-[#2B2A28] text-[#FAF7F2] flex items-center justify-center font-serif font-bold text-[10px]">
            ${escapeHtml(initials)}
          </div>
          <div class="hidden md:block text-left leading-tight">
            <div class="font-bold text-[#2B2A28] max-w-[110px] truncate">${escapeHtml(name)}</div>
            <div class="text-[9px] text-emerald-800 font-bold uppercase">Dashboard &rarr;</div>
          </div>
        </button>

        ${isAdmin ? `
          <button
            onclick="openAdminView()"
            class="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
            title="Admin User Management"
          >
            Admin
          </button>
        ` : ''}

        <button
          onclick="handleLogout()"
          class="px-2.5 py-1.5 rounded-xl text-xs font-mono text-[#8C8378] hover:text-[#2B2A28] hover:bg-[#F0EBE3] transition-colors cursor-pointer"
          title="Sign Out"
        >
          Sign Out
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="flex items-center gap-1.5 sm:gap-2">
        <button
          onclick="openAuthModal('login')"
          class="px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-[#2B2A28] bg-[#FAF7F2] border border-[#C4BCB2] hover:bg-[#F0EBE3] transition-colors cursor-pointer"
        >
          Sign In
        </button>
        <button
          onclick="openAuthModal('register')"
          class="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378] transition-colors cursor-pointer shadow-2xs"
        >
          Create Portfolio
        </button>
      </div>
    `;
  }
}

// URL Route Handler for direct profile links (/u/:username or ?u=:username)
function handleUrlRouteOnLoad() {
  const urlParams = new URLSearchParams(window.location.search);
  const userParam = urlParams.get('u');
  if (userParam) {
    viewUserProfile(userParam);
    return;
  }

  const path = window.location.pathname;
  if (path.startsWith('/u/')) {
    const u = path.replace('/u/', '').trim();
    if (u) {
      viewUserProfile(u);
    }
  }
}

// Open Auth Modal (Login or Register) with context preservation
async function openAuthModal(defaultTab = 'login', contextMessage = null, onComplete = null) {
  authPendingCallback = onComplete || null;
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  try {
    const res = await fetch('/partials/auth-modal.html');
    const html = await res.text();
    modalContainer.innerHTML = html;

    if (contextMessage) {
      const banner = document.getElementById('auth-context-banner');
      const text = document.getElementById('auth-context-text');
      if (banner && text) {
        text.textContent = contextMessage;
        banner.classList.remove('hidden');
      }
    }

    switchAuthTab(defaultTab);
  } catch (err) {
    console.error('Error opening auth modal:', err);
  }
}

// Switch between Sign In and Create Account tabs
function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-btn-login');
  const tabReg = document.getElementById('tab-btn-register');
  const alertBox = document.getElementById('auth-alert');

  if (alertBox) alertBox.classList.add('hidden');

  if (tab === 'login') {
    loginForm?.classList.remove('hidden');
    regForm?.classList.add('hidden');
    if (tabLogin) {
      tabLogin.className = 'flex-1 py-3 text-center font-bold border-b-2 border-[#2B2A28] text-[#2B2A28] bg-[#FAF7F2] transition-colors cursor-pointer';
    }
    if (tabReg) {
      tabReg.className = 'flex-1 py-3 text-center font-bold border-b-2 border-transparent text-[#8C8378] hover:text-[#2B2A28] transition-colors cursor-pointer';
    }
  } else {
    loginForm?.classList.add('hidden');
    regForm?.classList.remove('hidden');
    if (tabReg) {
      tabReg.className = 'flex-1 py-3 text-center font-bold border-b-2 border-[#2B2A28] text-[#2B2A28] bg-[#FAF7F2] transition-colors cursor-pointer';
    }
    if (tabLogin) {
      tabLogin.className = 'flex-1 py-3 text-center font-bold border-b-2 border-transparent text-[#8C8378] hover:text-[#2B2A28] transition-colors cursor-pointer';
    }
  }
}

// Fill login fields with demo credentials for instant testing
function fillLogin(username) {
  const idEl = document.getElementById('login-identifier');
  const pwEl = document.getElementById('login-password');
  if (idEl) idEl.value = username;
  if (pwEl) pwEl.value = 'proofolio123';
}

// Handle Login Submission
async function handleLoginSubmit(event) {
  event.preventDefault();
  const alertBox = document.getElementById('auth-alert');
  const submitBtn = document.getElementById('login-submit-btn');

  const identifier = document.getElementById('login-identifier')?.value.trim();
  const password = document.getElementById('login-password')?.value;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Verifying credentials...</span>';
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign in.');
    }

    localStorage.setItem('proofolio_token', data.token);
    currentUser = data;
    closeModal();
    renderHeaderAuthNav();

    if (authPendingCallback) {
      const cb = authPendingCallback;
      authPendingCallback = null;
      cb();
    } else {
      openDashboardView();
    }
  } catch (err) {
    if (alertBox) {
      alertBox.textContent = err.message;
      alertBox.className = 'p-3 rounded-xl text-xs font-mono border border-rose-300 bg-rose-50 text-rose-800';
      alertBox.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Sign In to Proofolio</span><span>&rarr;</span>';
    }
  }
}

// Handle Registration Submission
async function handleRegisterSubmit(event) {
  event.preventDefault();
  const alertBox = document.getElementById('auth-alert');
  const submitBtn = document.getElementById('reg-submit-btn');

  const displayName = document.getElementById('reg-display-name')?.value.trim();
  const username = document.getElementById('reg-username')?.value.trim();
  const category = document.getElementById('reg-category')?.value;
  const email = document.getElementById('reg-email')?.value.trim();
  const password = document.getElementById('reg-password')?.value;
  const headline = document.getElementById('reg-headline')?.value.trim();

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating your Proofolio...</span>';
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, username, category, email, password, headline })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    localStorage.setItem('proofolio_token', data.token);
    currentUser = data;
    closeModal();
    renderHeaderAuthNav();

    if (authPendingCallback) {
      const cb = authPendingCallback;
      authPendingCallback = null;
      cb();
    } else {
      openDashboardView();
    }
  } catch (err) {
    if (alertBox) {
      alertBox.textContent = err.message;
      alertBox.className = 'p-3 rounded-xl text-xs font-mono border border-rose-300 bg-rose-50 text-rose-800';
      alertBox.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Create My Proofolio &rarr;</span>';
    }
  }
}

// Handle Logout
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch (err) {
    console.error('Logout error:', err);
  }
  localStorage.removeItem('proofolio_token');
  currentUser = null;
  renderHeaderAuthNav();

  // Return to home portfolio
  const main = document.getElementById('main-content');
  if (main) {
    const res = await fetch('/partials/portfolio.html');
    main.innerHTML = await res.text();
    setupDynamicViews();
  }
}

// -------------------------------------------------------------
// AUTHENTICATED DASHBOARD
// -------------------------------------------------------------
async function openDashboardView() {
  if (!currentUser) {
    openAuthModal('login', 'Please sign in to access your private dashboard.', () => openDashboardView());
    return;
  }

  const main = document.getElementById('main-content');
  if (!main) return;

  try {
    const res = await fetch('/partials/dashboard.html');
    main.innerHTML = await res.text();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Fetch fresh dashboard data from server
    const dashRes = await fetch('/api/dashboard', { headers: getAuthHeaders() });
    if (!dashRes.ok) {
      throw new Error('Failed to load dashboard data.');
    }

    const data = await dashRes.json();
    populateDashboard(data);
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

function populateDashboard(data) {
  const p = data.profile || {};
  const u = data.user || {};
  const c = data.completion || { percentage: 0, recommendation: 'Update your profile.' };

  // Banner
  const nameEl = document.getElementById('dash-display-name');
  if (nameEl) nameEl.textContent = p.displayName || u.username;

  const userEl = document.getElementById('dash-username');
  if (userEl) userEl.textContent = u.username;

  const catEl = document.getElementById('dash-category-badge');
  if (catEl) catEl.textContent = p.category || 'Professional';

  const visEl = document.getElementById('dash-visibility-badge');
  if (visEl) visEl.textContent = p.visibility || 'PUBLIC';

  // Completion
  const pctEl = document.getElementById('dash-completion-pct');
  if (pctEl) pctEl.textContent = `${c.percentage}%`;

  const barEl = document.getElementById('dash-completion-bar');
  if (barEl) barEl.style.width = `${c.percentage}%`;

  const recEl = document.getElementById('dash-recommendation-text');
  if (recEl) recEl.textContent = c.recommendation;

  const publicUrlEl = document.getElementById('dash-public-url');
  if (publicUrlEl) {
    publicUrlEl.textContent = `/u/${u.username}`;
    publicUrlEl.onclick = (e) => {
      e.preventDefault();
      viewUserProfile(u.username);
    };
  }

  // Stats
  const folEl = document.getElementById('dash-stat-followers');
  if (folEl) folEl.textContent = data.followersCount || 0;

  const fowEl = document.getElementById('dash-stat-following');
  if (fowEl) fowEl.textContent = data.followingCount || 0;

  const roleEl = document.getElementById('dash-stat-role');
  if (roleEl) roleEl.textContent = u.role;

  const projCountEl = document.getElementById('dash-stat-projects');
  if (projCountEl) projCountEl.textContent = (data.projects && data.projects.length) || data.projectsCount || 0;

  const probCountEl = document.getElementById('dash-stat-problems');
  if (probCountEl) probCountEl.textContent = (data.problems && data.problems.length) || 0;

  const endCountEl = document.getElementById('dash-stat-endorsements');
  if (endCountEl) endCountEl.textContent = (data.endorsements && data.endorsements.length) || 0;

  const inqCountEl = document.getElementById('dash-stat-inquiries');
  if (inqCountEl) inqCountEl.textContent = (data.inquiries && data.inquiries.length) || data.inquiriesCount || 0;

  // Render Projects list in Dashboard
  const projContainer = document.getElementById('dash-projects-list');
  if (projContainer) {
    if (data.projects && data.projects.length > 0) {
      projContainer.innerHTML = data.projects.map(proj => `
        <div class="p-5 sm:p-6 rounded-2xl bg-[#FAF7F2] border border-[#C4BCB2] space-y-3.5 hover:border-[#2B2A28] transition-all">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-[#F0EBE3] border border-[#C4BCB2] text-[#2B2A28]">
                ${escapeHtml(proj.category)}
              </span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                proj.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }">
                ${proj.status === 'completed' ? 'Completed &bull; Verified' : proj.status}
              </span>
              ${proj.featured ? '<span class="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-mono font-bold">★ Featured</span>' : ''}
            </div>

            <div class="flex items-center gap-2">
              <button
                onclick="deleteProject('${proj.id}')"
                class="text-xs font-mono text-rose-700 hover:text-rose-900 font-bold hover:underline cursor-pointer"
                title="Delete project"
              >
                Delete
              </button>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-serif font-bold text-[#2B2A28]">${escapeHtml(proj.title)}</h3>
            <p class="text-xs font-mono text-[#8C8378] mt-0.5">${escapeHtml(proj.headline)}</p>
          </div>

          <div class="p-3.5 rounded-xl bg-[#F0EBE3] border border-[#C4BCB2] space-y-1">
            <div class="text-[10px] font-mono uppercase font-bold text-[#8C8378]">Problem Solved</div>
            <p class="text-xs text-[#2B2A28] leading-relaxed">${escapeHtml(proj.problemSolved)}</p>
          </div>

          ${proj.architectureNotes ? `
            <div class="text-xs font-mono text-[#55504A]">
              <strong>Architecture:</strong> ${escapeHtml(proj.architectureNotes)}
            </div>
          ` : ''}

          ${proj.metrics ? `
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FAF7F2] border border-[#C4BCB2] text-xs font-mono font-bold text-emerald-800">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>${escapeHtml(proj.metrics)}</span>
            </div>
          ` : ''}

          <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#C4BCB2]/60">
            <div class="flex flex-wrap gap-1.5 text-[11px] font-mono">
              ${(proj.techStack || []).map(t => `<span class="px-2 py-0.5 rounded bg-[#F0EBE3] border border-[#C4BCB2] text-[#2B2A28]">${escapeHtml(t)}</span>`).join('')}
            </div>

            <div class="flex items-center gap-3 text-xs font-mono">
              ${proj.liveUrl ? `<a href="${proj.liveUrl}" target="_blank" class="font-bold text-emerald-800 hover:underline flex items-center gap-1"><span>Live Demo</span> &rarr;</a>` : ''}
              ${proj.repoUrl ? `<a href="${proj.repoUrl}" target="_blank" class="text-[#2B2A28] hover:underline flex items-center gap-1"><span>Source Code</span> &nearr;</a>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    } else {
      projContainer.innerHTML = `
        <div class="p-8 rounded-2xl bg-[#FAF7F2] border border-[#C4BCB2] text-center space-y-3">
          <div class="w-10 h-10 rounded-full bg-[#F0EBE3] border border-[#C4BCB2] mx-auto flex items-center justify-center text-lg">
            💼
          </div>
          <h4 class="font-serif font-bold text-base text-[#2B2A28]">No Projects Published Yet</h4>
          <p class="text-xs font-mono text-[#8C8378] max-w-md mx-auto">
            Stage 2 lets you showcase real systems you have built, problems solved, live deployment links, and verifiable metrics.
          </p>
          <button
            onclick="openAddProjectModal()"
            class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378] transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>+ Add Your First Project</span>
          </button>
        </div>
      `;
    }
  }

  // Render Problems list in Dashboard
  const probContainer = document.getElementById('dash-problems-list');
  if (probContainer) {
    if (data.problems && data.problems.length > 0) {
      probContainer.innerHTML = data.problems.map(prob => `
        <div class="p-5 sm:p-6 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] space-y-3.5 hover:border-[#2B2A28] transition-all">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-[#FAF7F2] border border-[#C4BCB2] text-amber-800">
              ${escapeHtml(prob.domain)}
            </span>
            <button
              onclick="deleteProblem('${prob.id}')"
              class="text-xs font-mono text-rose-700 hover:text-rose-900 font-bold hover:underline cursor-pointer"
            >
              Delete
            </button>
          </div>

          <h3 class="text-lg font-serif font-bold text-[#2B2A28]">${escapeHtml(prob.title)}</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="p-3 rounded-xl bg-[#FAF7F2] border border-[#C4BCB2] space-y-1">
              <div class="font-mono text-[10px] uppercase font-bold text-rose-800">Observed Symptoms</div>
              <p class="text-[#2B2A28] leading-relaxed">${escapeHtml(prob.symptoms)}</p>
            </div>

            <div class="p-3 rounded-xl bg-[#FAF7F2] border border-[#C4BCB2] space-y-1">
              <div class="font-mono text-[10px] uppercase font-bold text-emerald-800">Solution Implemented</div>
              <p class="text-[#2B2A28] leading-relaxed">${escapeHtml(prob.solution)}</p>
            </div>
          </div>

          ${prob.outcome ? `
            <div class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono flex items-center gap-2">
              <span class="font-bold">Outcome:</span>
              <span>${escapeHtml(prob.outcome)}</span>
            </div>
          ` : ''}

          <div class="flex flex-wrap gap-1.5 text-[11px] font-mono">
            ${(prob.techStack || []).map(t => `<span class="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#C4BCB2] text-[#2B2A28]">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      `).join('');
    } else {
      probContainer.innerHTML = `
        <div class="p-8 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] text-center space-y-3">
          <div class="w-10 h-10 rounded-full bg-[#FAF7F2] border border-[#C4BCB2] mx-auto flex items-center justify-center text-lg">
            🛡️
          </div>
          <h4 class="font-serif font-bold text-base text-[#2B2A28]">No Problems Documented Yet</h4>
          <p class="text-xs font-mono text-[#8C8378] max-w-md mx-auto">
            Documenting real production bugs, concurrency issues, or architectural bottlenecks is the strongest proof of technical depth.
          </p>
          <button
            onclick="openAddProblemModal()"
            class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#FAF7F2] text-[#2B2A28] border border-[#C4BCB2] hover:border-[#2B2A28] transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>+ Document a Problem You Solved</span>
          </button>
        </div>
      `;
    }
  }

  // Render Endorsements list in Dashboard (Stage 3)
  const dashEndContainer = document.getElementById('dash-endorsements-list');
  if (dashEndContainer) {
    if (data.endorsements && data.endorsements.length > 0) {
      dashEndContainer.innerHTML = data.endorsements.map(end => `
        <div class="p-5 rounded-2xl bg-[#FAF7F2] border border-[#C4BCB2] space-y-3 hover:border-[#2B2A28] transition-all">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <button
                onclick="viewUserProfile('${escapeHtml(end.authorUsername)}')"
                class="font-serif font-bold text-sm text-[#2B2A28] hover:underline cursor-pointer"
              >
                ${escapeHtml(end.authorName)}
              </button>
              <span class="text-xs font-mono text-[#8C8378]">@${escapeHtml(end.authorUsername)}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F0EBE3] border border-[#C4BCB2] text-emerald-900">
                ${escapeHtml(end.relationship)}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-[10px] font-mono text-[#8C8378]">${new Date(end.createdAt).toLocaleDateString()}</span>
              <button
                onclick="deleteEndorsement('${end.id}')"
                class="text-xs font-mono text-rose-700 hover:text-rose-900 font-bold hover:underline cursor-pointer ml-1"
                title="Remove endorsement"
              >
                Delete
              </button>
            </div>
          </div>

          ${end.targetTitle ? `
            <div class="inline-flex items-center gap-1 text-[11px] font-mono text-[#55504A]">
              <span class="font-bold uppercase text-[9px] text-[#8C8378]">Endorsed ${escapeHtml(end.type)}:</span>
              <span class="font-bold text-[#2B2A28]">${escapeHtml(end.targetTitle)}</span>
            </div>
          ` : ''}

          <p class="text-xs sm:text-sm text-[#2B2A28] leading-relaxed italic border-l-2 border-[#C4BCB2] pl-3">
            &ldquo;${escapeHtml(end.content)}&rdquo;
          </p>
        </div>
      `).join('');
    } else {
      dashEndContainer.innerHTML = `
        <div class="p-8 rounded-2xl bg-[#FAF7F2] border border-[#C4BCB2] text-center space-y-3">
          <div class="w-10 h-10 rounded-full bg-[#F0EBE3] border border-[#C4BCB2] mx-auto flex items-center justify-center text-lg">
            🤝
          </div>
          <h4 class="font-serif font-bold text-base text-[#2B2A28]">No Endorsements Received Yet</h4>
          <p class="text-xs font-mono text-[#8C8378] max-w-md mx-auto">
            Stage 3 introduces peer reviews and verified testimonials. Share your public portfolio with teammates or clients to request your first endorsement.
          </p>
          <button
            onclick="copyProfileUrl()"
            class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378] transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Copy Portfolio Link to Share</span>
          </button>
        </div>
      `;
    }
  }

  // Snapshot Preview
  const initials = (p.displayName || u.username).split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'PF';
  const circleEl = document.getElementById('dash-avatar-circle');
  if (circleEl) circleEl.textContent = initials;

  const prevName = document.getElementById('dash-preview-name');
  if (prevName) prevName.textContent = p.displayName || u.username;

  const prevHead = document.getElementById('dash-preview-headline');
  if (prevHead) prevHead.textContent = p.headline || 'No headline set yet.';

  const prevLoc = document.getElementById('dash-preview-location');
  if (prevLoc) prevLoc.textContent = p.location ? `📍 ${p.location}` : '📍 Location not specified';

  const prevBio = document.getElementById('dash-preview-bio');
  if (prevBio) prevBio.textContent = p.bio || 'No biography added yet. Click "Edit My Profile" to introduce what you build and learn.';

  // Skills
  const skillsContainer = document.getElementById('dash-preview-skills');
  if (skillsContainer) {
    if (p.skills && p.skills.length > 0) {
      skillsContainer.innerHTML = p.skills.map(s => `
        <span class="px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#C4BCB2] text-[#2B2A28]">
          ${escapeHtml(s)}
        </span>
      `).join('');
    } else {
      skillsContainer.innerHTML = '<span class="text-xs text-[#8C8378] italic">No skills listed yet. Click "Edit My Profile" to add some.</span>';
    }
  }

  // Links
  const linksContainer = document.getElementById('dash-preview-links');
  if (linksContainer) {
    const links = p.socialLinks || {};
    const items = [];
    if (links.website) items.push(`<a href="${links.website}" target="_blank" class="px-2.5 py-1 rounded bg-[#FAF7F2] border border-[#C4BCB2] text-emerald-800 underline">Website</a>`);
    if (links.github) items.push(`<a href="${links.github}" target="_blank" class="px-2.5 py-1 rounded bg-[#FAF7F2] border border-[#C4BCB2] text-[#2B2A28] underline">GitHub</a>`);
    if (links.linkedin) items.push(`<a href="${links.linkedin}" target="_blank" class="px-2.5 py-1 rounded bg-[#FAF7F2] border border-[#C4BCB2] text-blue-800 underline">LinkedIn</a>`);

    linksContainer.innerHTML = items.length > 0 ? items.join('') : '<span class="text-xs text-[#8C8378] italic">No external links connected yet.</span>';
  }

  // Activity list
  const actContainer = document.getElementById('dash-activity-list');
  if (actContainer) {
    if (data.activity && data.activity.length > 0) {
      actContainer.innerHTML = data.activity.map(a => `
        <div class="p-3 rounded-xl bg-[#F0EBE3] border border-[#C4BCB2] space-y-1">
          <div class="flex items-center justify-between text-[10px] text-[#8C8378]">
            <span class="uppercase font-bold text-[#2B2A28]">${escapeHtml(a.type.replace(/_/g, ' '))}</span>
            <span>${new Date(a.createdAt).toLocaleDateString()}</span>
          </div>
          <p class="text-[#2B2A28]">${escapeHtml(a.description)}</p>
        </div>
      `).join('');
    } else {
      actContainer.innerHTML = '<div class="p-3 rounded-xl bg-[#F0EBE3] border border-[#C4BCB2] text-[#8C8378] text-center">No recent activity recorded yet.</div>';
    }
  }

  // Render Stage 4 Client Inquiries
  renderDashboardInquiries(data.inquiries || []);
}

function viewMyPublicProfile() {
  if (currentUser && currentUser.user) {
    viewUserProfile(currentUser.user.username);
  }
}

// -------------------------------------------------------------
// EDIT PROFILE MODAL & LOGIC
// -------------------------------------------------------------
async function openEditProfileModal() {
  if (!currentUser) {
    openAuthModal('login', 'Please sign in to edit your profile.');
    return;
  }

  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  try {
    const res = await fetch('/partials/edit-profile.html');
    modalContainer.innerHTML = await res.text();

    const p = currentUser.profile || {};
    const dName = document.getElementById('edit-display-name');
    const cat = document.getElementById('edit-category');
    const head = document.getElementById('edit-headline');
    const loc = document.getElementById('edit-location');
    const av = document.getElementById('edit-avatar-url');
    const bio = document.getElementById('edit-bio');
    const skills = document.getElementById('edit-skills');
    const edu = document.getElementById('edit-education');
    const exp = document.getElementById('edit-experience');
    const web = document.getElementById('edit-link-website');
    const gh = document.getElementById('edit-link-github');
    const li = document.getElementById('edit-link-linkedin');

    if (dName) dName.value = p.displayName || '';
    if (cat) cat.value = p.category || 'developer';
    if (head) head.value = p.headline || '';
    if (loc) loc.value = p.location || '';
    if (av) av.value = p.avatarUrl || '';
    if (bio) bio.value = p.bio || '';
    if (skills) skills.value = (p.skills || []).join(', ');
    if (edu) edu.value = p.educationSummary || '';
    if (exp) exp.value = p.professionalSummary || '';

    const links = p.socialLinks || {};
    if (web) web.value = links.website || '';
    if (gh) gh.value = links.github || '';
    if (li) li.value = links.linkedin || '';

    const visRadio = document.getElementById(`vis-${p.visibility || 'public'}`);
    if (visRadio) visRadio.checked = true;

    const tc = p.themeConfig || {};
    const themeSel = document.getElementById('edit-theme');
    const fontSel = document.getElementById('edit-font-style');
    const accentSel = document.getElementById('edit-accent-color');
    if (themeSel) themeSel.value = tc.theme || 'editorial';
    if (fontSel) fontSel.value = tc.fontStyle || 'serif';
    if (accentSel) accentSel.value = tc.accentColor || '#2B2A28';
  } catch (err) {
    console.error('Error opening edit profile modal:', err);
  }
}

async function handleProfileEditSubmit(event) {
  event.preventDefault();
  const alertBox = document.getElementById('edit-alert');
  const saveBtn = document.getElementById('edit-save-btn');

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>Saving...</span>';
  }

  const displayName = document.getElementById('edit-display-name')?.value.trim();
  const category = document.getElementById('edit-category')?.value;
  const headline = document.getElementById('edit-headline')?.value.trim();
  const location = document.getElementById('edit-location')?.value.trim();
  const avatarUrl = document.getElementById('edit-avatar-url')?.value.trim();
  const bio = document.getElementById('edit-bio')?.value.trim();
  const skillsRaw = document.getElementById('edit-skills')?.value || '';
  const skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
  const educationSummary = document.getElementById('edit-education')?.value.trim();
  const professionalSummary = document.getElementById('edit-experience')?.value.trim();
  const website = document.getElementById('edit-link-website')?.value.trim();
  const github = document.getElementById('edit-link-github')?.value.trim();
  const linkedin = document.getElementById('edit-link-linkedin')?.value.trim();

  const visibility = document.querySelector('input[name="visibility"]:checked')?.value || 'public';

  const theme = document.getElementById('edit-theme')?.value || 'editorial';
  const fontStyle = document.getElementById('edit-font-style')?.value || 'serif';
  const accentColor = document.getElementById('edit-accent-color')?.value || '#2B2A28';

  const payload = {
    displayName,
    category,
    headline,
    location,
    avatarUrl,
    bio,
    skills,
    educationSummary,
    professionalSummary,
    socialLinks: { website, github, linkedin },
    visibility,
    themeConfig: {
      theme,
      fontStyle,
      accentColor
    }
  };

  try {
    const res = await fetch('/api/profiles/me', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save profile changes.');
    }

    if (currentUser) {
      currentUser.profile = data.profile;
      currentUser.completion = data.completion;
    }

    applySystemTheme(payload.themeConfig);

    closeModal();
    renderHeaderAuthNav();

    // If currently on dashboard or viewing own profile, refresh
    if (document.getElementById('dash-display-name')) {
      openDashboardView();
    } else if (currentViewingUsername === currentUser.user.username) {
      viewUserProfile(currentUser.user.username);
    }
  } catch (err) {
    if (alertBox) {
      alertBox.textContent = err.message;
      alertBox.className = 'p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-xs';
      alertBox.classList.remove('hidden');
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span>Save Changes</span><span>&rarr;</span>';
    }
  }
}

// -------------------------------------------------------------
// PUBLIC PROFILE VIEW & SOCIAL INTERACTION ENGINE
// -------------------------------------------------------------
async function viewUserProfile(username) {
  currentViewingUsername = username.toLowerCase();
  const main = document.getElementById('main-content');
  if (!main) return;

  try {
    const res = await fetch('/partials/public-profile.html');
    main.innerHTML = await res.text();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Fetch user profile from server
    const profileRes = await fetch(`/api/profiles/${encodeURIComponent(username)}`, {
      headers: getAuthHeaders()
    });

    if (!profileRes.ok) {
      const errData = await profileRes.json();
      main.innerHTML = `
        <div class="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
          <h2 class="text-2xl font-serif font-bold text-[#2B2A28]">Profile Not Found</h2>
          <p class="text-xs font-mono text-[#8C8378]">${escapeHtml(errData.error || 'This user does not exist or has been suspended.')}</p>
          <button onclick="openDiscoverView()" class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2]">
            &larr; Discover Other Profiles
          </button>
        </div>
      `;
      return;
    }

    const data = await profileRes.json();
    currentViewingProfileData = data;
    renderPublicProfile(data);
  } catch (err) {
    console.error('Error viewing profile:', err);
  }
}

function renderPublicProfile(data) {
  const isPrivate = data.isPrivate;
  const privateAlert = document.getElementById('pub-private-alert') || document.getElementById('pub-private-notice');
  const contentWrapper = document.getElementById('pub-content-wrapper') || document.getElementById('pub-profile-content');

  if (isPrivate) {
    if (privateAlert) privateAlert.classList.remove('hidden');
    if (contentWrapper) contentWrapper.classList.add('hidden');
    const pTitle = document.getElementById('pub-private-title');
    const pMsg = document.getElementById('pub-private-msg') || document.getElementById('pub-private-desc');
    if (pTitle) pTitle.textContent = `${data.displayName} (@${data.username})`;
    if (pMsg) pMsg.textContent = data.message || 'This profile is set to Private. Only the owner and administrators can view its contents.';
    return;
  }

  if (privateAlert) privateAlert.classList.add('hidden');
  if (contentWrapper) contentWrapper.classList.remove('hidden');

  const p = data.profile || {};
  const isOwner = !!data.isOwner;
  const isFollowing = !!data.isFollowing;

  // Apply creator's customized theme and typography if configured
  if (p.themeConfig) {
    if (p.themeConfig.theme) {
      document.documentElement.setAttribute('data-theme', p.themeConfig.theme);
    }
    if (p.themeConfig.fontStyle) {
      document.documentElement.setAttribute('data-font', p.themeConfig.fontStyle);
    }
  }

  // Header Elements
  const initials = (p.displayName || p.username || 'PF').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'PF';
  const avatarEl = document.getElementById('pub-avatar');
  if (avatarEl) avatarEl.textContent = initials;

  const nameEl = document.getElementById('pub-display-name') || document.getElementById('pub-name');
  if (nameEl) nameEl.textContent = p.displayName || p.username;

  const userEl = document.getElementById('pub-username-tag') || document.getElementById('pub-username');
  if (userEl) userEl.textContent = `@${p.username}`;

  const catBadge = document.getElementById('pub-category-badge');
  if (catBadge) catBadge.textContent = p.category || 'Professional';

  const locEl = document.getElementById('pub-location');
  if (locEl) locEl.textContent = p.location ? `📍 ${p.location}` : '📍 Global / Remote';

  const followerStatEl = document.getElementById('pub-follower-stat');
  if (followerStatEl) {
    followerStatEl.textContent = `${data.followersCount || 0} Followers • ${data.followingCount || 0} Following`;
  }

  const folCount = document.getElementById('pub-followers-count');
  if (folCount) folCount.textContent = data.followersCount || 0;

  const fowCount = document.getElementById('pub-following-count');
  if (fowCount) fowCount.textContent = data.followingCount || 0;

  const headEl = document.getElementById('pub-headline');
  if (headEl) headEl.textContent = p.headline || 'Portfolio Creator & Systems Architect';

  // Follow / Edit Action Button Container
  const btnContainer = document.getElementById('pub-follow-btn-container') || document.getElementById('pub-action-container');
  if (btnContainer) {
    if (isOwner) {
      btnContainer.innerHTML = `
        <button
          onclick="openEditProfileModal()"
          class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#FAF7F2] text-[#2B2A28] border border-[#C4BCB2] hover:border-[#2B2A28] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <svg class="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          <span>Edit Profile</span>
        </button>
        <button
          onclick="openThemeModal()"
          class="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          title="Customize Theme, Fonts and Visual Style"
        >
          <span>🎨 Style Studio</span>
        </button>
      `;
    } else {
      btnContainer.innerHTML = `
        <button
          id="pub-follow-btn"
          onclick="handleFollowButtonClick()"
          class="px-4 py-2 rounded-xl text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
            isFollowing 
              ? 'bg-[#FAF7F2] text-[#2B2A28] border border-[#C4BCB2] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300' 
              : 'bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378]'
          }"
        >
          <svg class="w-3.5 h-3.5 ${isFollowing ? 'text-emerald-700' : 'text-amber-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isFollowing ? 'M5 13l4 4L19 7' : 'M12 4v16m8-8H4'}"/>
          </svg>
          <span id="pub-follow-label">${isFollowing ? 'Following' : 'Follow'}</span>
        </button>
      `;
    }
  }

  // Resume button wiring
  const resumeBtn = document.getElementById('pub-resume-btn');
  if (resumeBtn) {
    resumeBtn.onclick = () => openUserResume(p.username);
  }

  // Bio
  const bioEl = document.getElementById('pub-bio');
  if (bioEl) {
    bioEl.textContent = p.bio || `${p.displayName || p.username} has not added an executive biography yet.`;
  }

  // Skills
  const skillsEl = document.getElementById('pub-skills-list');
  if (skillsEl) {
    if (p.skills && p.skills.length > 0) {
      skillsEl.innerHTML = p.skills.map(s => `
        <span class="px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#C4BCB2] text-[#2B2A28]">
          ${escapeHtml(s)}
        </span>
      `).join('');
    } else {
      skillsEl.innerHTML = '<span class="text-[#8C8378] italic">No skills listed yet.</span>';
    }
  }

  // Education & Experience
  const eduEl = document.getElementById('pub-education');
  if (eduEl) eduEl.textContent = p.educationSummary || 'No formal education details listed.';

  const expEl = document.getElementById('pub-experience');
  if (expEl) expEl.textContent = p.professionalSummary || 'No professional experience details listed.';

  // Links
  const linksEl = document.getElementById('pub-links-list');
  if (linksEl) {
    const links = p.socialLinks || {};
    const list = [];
    if (links.website) list.push(`<a href="${links.website}" target="_blank" class="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#C4BCB2] text-emerald-800 underline flex items-center gap-1.5"><span>🌐 Website</span></a>`);
    if (links.github) list.push(`<a href="${links.github}" target="_blank" class="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#C4BCB2] text-[#2B2A28] underline flex items-center gap-1.5"><span>💻 GitHub</span></a>`);
    if (links.linkedin) list.push(`<a href="${links.linkedin}" target="_blank" class="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#C4BCB2] text-blue-800 underline flex items-center gap-1.5"><span>👔 LinkedIn</span></a>`);
    linksEl.innerHTML = list.length > 0 ? list.join('') : '<span class="text-[#8C8378] italic">No public social links provided.</span>';
  }

  // -------------------------------------------------------------
  // STAGE 2: PROJECTS & PROOF OF WORK (PUBLIC PROFILE)
  // -------------------------------------------------------------
  const projects = data.projects || [];
  const projCountChip = document.getElementById('pub-projects-count-chip');
  if (projCountChip) projCountChip.textContent = projects.length;

  const ownerAddProjBtn = document.getElementById('pub-owner-add-project-btn');
  if (ownerAddProjBtn) {
    if (isOwner) ownerAddProjBtn.classList.remove('hidden');
    else ownerAddProjBtn.classList.add('hidden');
  }

  const projectsContainer = document.getElementById('pub-projects-container');
  if (projectsContainer) {
    if (projects.length > 0) {
      projectsContainer.innerHTML = projects.map(proj => {
        const cust = proj.customization || {};
        const accent = cust.accentColor || 'charcoal';
        const fontStyle = cust.fontStyle || 'serif';
        const banner = cust.bannerPreset || 'none';
        const bannerUrl = cust.bannerImageUrl;
        const highlights = cust.highlights || [];
        const archCode = cust.architectureSnippet;

        let accentBorderClass = 'border-[#C4BCB2] hover:border-[#2B2A28]';
        let accentPillClass = 'bg-[#F0EBE3] text-[#2B2A28] border-[#C4BCB2]';
        if (accent === 'emerald') {
          accentBorderClass = 'border-emerald-700/40 hover:border-emerald-600 shadow-emerald-900/5';
          accentPillClass = 'bg-emerald-50 text-emerald-900 border-emerald-300';
        } else if (accent === 'indigo') {
          accentBorderClass = 'border-indigo-700/40 hover:border-indigo-600 shadow-indigo-900/5';
          accentPillClass = 'bg-indigo-50 text-indigo-900 border-indigo-300';
        } else if (accent === 'amber') {
          accentBorderClass = 'border-amber-700/40 hover:border-amber-600 shadow-amber-900/5';
          accentPillClass = 'bg-amber-50 text-amber-900 border-amber-300';
        } else if (accent === 'rose') {
          accentBorderClass = 'border-rose-700/40 hover:border-rose-600 shadow-rose-900/5';
          accentPillClass = 'bg-rose-50 text-rose-900 border-rose-300';
        } else if (accent === 'cyan') {
          accentBorderClass = 'border-cyan-700/40 hover:border-cyan-600 shadow-cyan-900/5';
          accentPillClass = 'bg-cyan-50 text-cyan-900 border-cyan-300';
        }

        let fontTitleClass = 'font-serif';
        if (fontStyle === 'sans') fontTitleClass = 'font-sans font-bold';
        else if (fontStyle === 'mono') fontTitleClass = 'font-mono font-bold tracking-tight';

        return `
        <article class="p-6 rounded-2xl bg-[#FAF7F2] border ${accentBorderClass} space-y-4 transition-all shadow-2xs">
          ${bannerUrl ? `
            <div class="w-full h-32 rounded-xl overflow-hidden mb-2 border border-[#C4BCB2]/60">
              <img src="${escapeHtml(bannerUrl)}" alt="${escapeHtml(proj.title)}" class="w-full h-full object-cover" />
            </div>
          ` : (banner !== 'none' ? `
            <div class="w-full h-14 rounded-xl banner-mesh-${escapeHtml(banner)} border border-[#C4BCB2]/50 flex items-center px-4 mb-2">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-white/90 drop-shadow-xs">${escapeHtml(proj.category)} Showcase</span>
            </div>
          ` : '')}

          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold border ${accentPillClass}">
                ${escapeHtml(proj.category)}
              </span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                proj.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }">
                ${proj.status === 'completed' ? 'Shipped &bull; Verified' : proj.status}
              </span>
              ${proj.featured ? '<span class="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-mono font-bold">★ Featured</span>' : ''}
            </div>

            ${isOwner ? `
              <button
                onclick="deleteProject('${proj.id}')"
                class="text-xs font-mono text-rose-700 hover:text-rose-900 font-bold hover:underline cursor-pointer"
                title="Delete project"
              >
                Delete
              </button>
            ` : ''}
          </div>

          <div>
            <h3 class="text-xl ${fontTitleClass} text-[#2B2A28] leading-snug">
              ${escapeHtml(proj.title)}
            </h3>
            <p class="text-xs font-mono text-[#8C8378] mt-1">
              ${escapeHtml(proj.headline)}
            </p>
          </div>

          <!-- Proof Callout: Problem Solved -->
          <div class="p-4 rounded-xl bg-[#F0EBE3] border border-[#C4BCB2] space-y-1.5">
            <div class="text-[10px] font-mono uppercase font-bold text-amber-800 tracking-wider">
              Real-World Problem Solved
            </div>
            <p class="text-xs text-[#2B2A28] leading-relaxed font-sans">
              ${escapeHtml(proj.problemSolved)}
            </p>
          </div>

          ${highlights.length > 0 ? `
            <div class="space-y-1 pt-1">
              <div class="text-[10px] font-mono uppercase font-bold text-[#8C8378] tracking-wider">Key Deliverables & Proof Points:</div>
              <div class="flex flex-wrap gap-1.5">
                ${highlights.map(h => `<span class="px-2 py-0.5 rounded-md text-[11px] font-mono bg-[#F0EBE3] border border-[#C4BCB2] text-[#2B2A28]">&check; ${escapeHtml(h)}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${archCode ? `
            <div class="rounded-xl bg-[#1E1E1E] border border-[#333] p-3 text-xs font-mono text-[#E0E0E0] overflow-x-auto space-y-1">
              <div class="flex items-center justify-between text-[10px] text-[#888] pb-1 border-b border-[#333]">
                <span>// Architecture Blueprint</span>
                <span class="text-[#CE9178]">Code Snippet</span>
              </div>
              <pre class="text-[11px] leading-relaxed text-[#DCDCAA] whitespace-pre-wrap"><code>${escapeHtml(archCode)}</code></pre>
            </div>
          ` : ''}

          ${proj.architectureNotes ? `
            <div class="text-xs font-mono text-[#55504A]">
              <strong>Architecture &amp; Decisions:</strong> ${escapeHtml(proj.architectureNotes)}
            </div>
          ` : ''}

          ${proj.metrics ? `
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FAF7F2] border border-[#C4BCB2] text-xs font-mono font-bold text-emerald-800">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>${escapeHtml(proj.metrics)}</span>
            </div>
          ` : ''}

          <!-- Tech Stack & Live Links -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#C4BCB2]/60">
            <div class="flex flex-wrap gap-1.5 text-[11px] font-mono">
              ${(proj.techStack || []).map(t => `<span class="px-2 py-0.5 rounded bg-[#F0EBE3] border border-[#C4BCB2] text-[#2B2A28]">${escapeHtml(t)}</span>`).join('')}
            </div>

            <div class="flex items-center gap-3 text-xs font-mono">
              ${proj.liveUrl ? `
                <a href="${proj.liveUrl}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378] font-bold inline-flex items-center gap-1.5 transition-colors">
                  <span>Visit Live System</span> &rarr;
                </a>
              ` : ''}
              ${proj.repoUrl ? `
                <a href="${proj.repoUrl}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#C4BCB2] text-[#2B2A28] hover:border-[#2B2A28] inline-flex items-center gap-1 transition-colors">
                  <span>Code</span> &nearr;
                </a>
              ` : ''}
            </div>
          </div>
        </article>
      `;
      }).join('');
    } else {
      projectsContainer.innerHTML = `
        <div class="p-8 rounded-2xl bg-[#FAF7F2] border border-[#C4BCB2] text-center space-y-3">
          <div class="w-10 h-10 rounded-full bg-[#F0EBE3] border border-[#C4BCB2] mx-auto flex items-center justify-center text-lg">
            💼
          </div>
          <h4 class="font-serif font-bold text-base text-[#2B2A28]">No Projects Published Yet</h4>
          <p class="text-xs font-mono text-[#8C8378] max-w-sm mx-auto">
            ${isOwner ? 'Click "+ Add Project" to demonstrate the production systems you have designed and deployed.' : 'This member has not yet published proof of work projects.'}
          </p>
          ${isOwner ? `
            <button
              onclick="openAddProjectModal()"
              class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378] transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>+ Add Your First Project</span>
            </button>
          ` : ''}
        </div>
      `;
    }
  }

  // -------------------------------------------------------------
  // STAGE 2: PROBLEMS & SOLUTIONS (PUBLIC PROFILE)
  // -------------------------------------------------------------
  const problems = data.problems || [];
  const ownerAddProbBtn = document.getElementById('pub-owner-add-problem-btn');
  if (ownerAddProbBtn) {
    if (isOwner) ownerAddProbBtn.classList.remove('hidden');
    else ownerAddProbBtn.classList.add('hidden');
  }

  const problemsContainer = document.getElementById('pub-problems-container');
  if (problemsContainer) {
    if (problems.length > 0) {
      problemsContainer.innerHTML = problems.map(prob => `
        <article class="p-5 sm:p-6 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] space-y-3.5 hover:border-[#2B2A28] transition-all">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-[#FAF7F2] border border-[#C4BCB2] text-amber-800">
              ${escapeHtml(prob.domain)}
            </span>
            ${isOwner ? `
              <button
                onclick="deleteProblem('${prob.id}')"
                class="text-xs font-mono text-rose-700 hover:text-rose-900 font-bold hover:underline cursor-pointer"
              >
                Delete
              </button>
            ` : ''}
          </div>

          <h3 class="text-lg font-serif font-bold text-[#2B2A28]">${escapeHtml(prob.title)}</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#C4BCB2] space-y-1">
              <div class="font-mono text-[10px] uppercase font-bold text-rose-800">Observed Symptoms &amp; Root Cause</div>
              <p class="text-[#2B2A28] leading-relaxed font-sans">${escapeHtml(prob.symptoms)}</p>
              ${prob.rootCause ? `<div class="text-[11px] font-mono text-[#8C8378] pt-1"><strong>Root Cause:</strong> ${escapeHtml(prob.rootCause)}</div>` : ''}
            </div>

            <div class="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#C4BCB2] space-y-1">
              <div class="font-mono text-[10px] uppercase font-bold text-emerald-800">Solution Implemented</div>
              <p class="text-[#2B2A28] leading-relaxed font-sans">${escapeHtml(prob.solution)}</p>
            </div>
          </div>

          ${prob.outcome ? `
            <div class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono flex items-center gap-2">
              <span class="font-bold">Outcome:</span>
              <span>${escapeHtml(prob.outcome)}</span>
            </div>
          ` : ''}

          <div class="flex flex-wrap gap-1.5 text-[11px] font-mono">
            ${(prob.techStack || []).map(t => `<span class="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#C4BCB2] text-[#2B2A28]">${escapeHtml(t)}</span>`).join('')}
          </div>
        </article>
      `).join('');
    } else {
      problemsContainer.innerHTML = `
        <div class="p-8 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] text-center space-y-3">
          <div class="w-10 h-10 rounded-full bg-[#FAF7F2] border border-[#C4BCB2] mx-auto flex items-center justify-center text-lg">
            🛡️
          </div>
          <h4 class="font-serif font-bold text-base text-[#2B2A28]">No Problem Case Studies Documented</h4>
          <p class="text-xs font-mono text-[#8C8378] max-w-sm mx-auto">
            ${isOwner ? 'Document a difficult bug, concurrency issue, or system failure you resolved to prove problem-solving depth.' : 'This member has not yet posted problem-solving case studies.'}
          </p>
          ${isOwner ? `
            <button
              onclick="openAddProblemModal()"
              class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#FAF7F2] text-[#2B2A28] border border-[#C4BCB2] hover:border-[#2B2A28] transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>+ Document First Problem Case</span>
            </button>
          ` : ''}
        </div>
      `;
    }
  }

  // Activity list
  const actEl = document.getElementById('pub-activity-list');
  if (actEl) {
    if (data.activity && data.activity.length > 0) {
      actEl.innerHTML = data.activity.map(a => `
        <div class="p-3 rounded-xl bg-[#F0EBE3] border border-[#C4BCB2] space-y-1">
          <div class="flex items-center justify-between text-[10px] text-[#8C8378]">
            <span class="font-bold text-[#2B2A28] uppercase">${escapeHtml(a.type.replace(/_/g, ' '))}</span>
            <span>${new Date(a.createdAt).toLocaleDateString()}</span>
          </div>
          <p class="text-[#2B2A28] text-[11px] leading-relaxed">${escapeHtml(a.description)}</p>
        </div>
      `).join('');
    } else {
      actEl.innerHTML = '<div class="p-3 text-center text-[#8C8378] italic">No public activities recorded yet.</div>';
    }
  }

  // -------------------------------------------------------------
  // STAGE 3: VERIFIED PEER ENDORSEMENTS (PUBLIC PROFILE)
  // -------------------------------------------------------------
  const endorsements = data.endorsements || [];
  const endCountChip = document.getElementById('pub-endorsements-count-chip');
  if (endCountChip) endCountChip.textContent = endorsements.length;

  const heroEndorseBtn = document.getElementById('pub-hero-endorse-btn');
  const sectionEndorseBtn = document.getElementById('pub-endorse-btn');

  if (isOwner) {
    if (heroEndorseBtn) heroEndorseBtn.classList.add('hidden');
    if (sectionEndorseBtn) sectionEndorseBtn.classList.add('hidden');
  } else {
    if (heroEndorseBtn) {
      heroEndorseBtn.classList.remove('hidden');
      heroEndorseBtn.onclick = () => openEndorseModal(u.id, u.username, p.displayName);
    }
    if (sectionEndorseBtn) {
      sectionEndorseBtn.classList.remove('hidden');
      sectionEndorseBtn.onclick = () => openEndorseModal(u.id, u.username, p.displayName);
    }
  }

  const endorsementsContainer = document.getElementById('pub-endorsements-container');
  if (endorsementsContainer) {
    if (endorsements.length > 0) {
      endorsementsContainer.innerHTML = endorsements.map(end => {
        const canDelete = isOwner || (currentUser && currentUser.user && (currentUser.user.id === end.authorId || currentUser.user.role === 'admin'));
        return `
          <div class="p-5 sm:p-6 rounded-2xl bg-[#FAF7F2] border border-[#C4BCB2] space-y-3.5 hover:border-[#2B2A28] transition-all">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <button
                  onclick="viewUserProfile('${escapeHtml(end.authorUsername)}')"
                  class="font-serif font-bold text-sm text-[#2B2A28] hover:underline cursor-pointer"
                >
                  ${escapeHtml(end.authorName)}
                </button>
                <span class="text-xs font-mono text-[#8C8378]">@${escapeHtml(end.authorUsername)}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F0EBE3] border border-[#C4BCB2] text-emerald-900">
                  ${escapeHtml(end.relationship)}
                </span>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-[10px] font-mono text-[#8C8378]">${new Date(end.createdAt).toLocaleDateString()}</span>
                ${canDelete ? `
                  <button
                    onclick="deleteEndorsement('${end.id}')"
                    class="text-xs font-mono text-rose-700 hover:text-rose-900 font-bold hover:underline cursor-pointer ml-1"
                    title="Remove endorsement"
                  >
                    Delete
                  </button>
                ` : ''}
              </div>
            </div>

            ${end.targetTitle ? `
              <div class="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#55504A]">
                <span class="font-bold uppercase text-[9px] text-[#8C8378]">Endorsing ${escapeHtml(end.type)}:</span>
                <span class="font-bold text-[#2B2A28]">${escapeHtml(end.targetTitle)}</span>
              </div>
            ` : ''}

            <p class="text-xs sm:text-sm text-[#2B2A28] leading-relaxed italic border-l-2 border-[#C4BCB2] pl-3.5 font-sans">
              &ldquo;${escapeHtml(end.content)}&rdquo;
            </p>
          </div>
        `;
      }).join('');
    } else {
      endorsementsContainer.innerHTML = `
        <div class="p-8 rounded-2xl bg-[#FAF7F2] border border-[#C4BCB2] text-center space-y-3">
          <div class="w-10 h-10 rounded-full bg-[#F0EBE3] border border-[#C4BCB2] mx-auto flex items-center justify-center text-lg">
            🤝
          </div>
          <h4 class="font-serif font-bold text-base text-[#2B2A28]">No Peer Endorsements Yet</h4>
          <p class="text-xs font-mono text-[#8C8378] max-w-sm mx-auto">
            ${isOwner ? 'Stage 3 introduces peer reviews and verified testimonials. Share your public portfolio with teammates or clients to receive endorsements.' : 'Be the first teammate or collaborator to write a verified peer endorsement for this engineer!'}
          </p>
          ${!isOwner ? `
            <button
              onclick="openEndorseModal('${u.id}', '${escapeHtml(u.username)}', '${escapeHtml(p.displayName || u.username)}')"
              class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378] transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
            >
              <span>+ Write First Endorsement</span>
            </button>
          ` : ''}
        </div>
      `;
    }
  }
}

// -------------------------------------------------------------
// STAGE 2: PROJECT & PROBLEM MODALS & CRUD
// -------------------------------------------------------------
async function openAddProjectModal() {
  if (!currentUser) {
    openAuthModal('login', 'Please sign in to publish projects to your portfolio.', () => openAddProjectModal());
    return;
  }

  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  try {
    const res = await fetch('/partials/add-project.html');
    modalContainer.innerHTML = await res.text();
  } catch (err) {
    console.error('Error opening add project modal:', err);
  }
}

async function handleProjectModalSubmit(event) {
  event.preventDefault();
  const title = document.getElementById('new-proj-title')?.value.trim();
  const category = document.getElementById('new-proj-category')?.value || 'Full-Stack Web App';
  const headline = document.getElementById('new-proj-headline')?.value.trim();
  const problemSolved = document.getElementById('new-proj-problem')?.value.trim();
  const architectureNotes = document.getElementById('new-proj-arch')?.value.trim();
  const liveUrl = document.getElementById('new-proj-url')?.value.trim();
  const repoUrl = document.getElementById('new-proj-repo')?.value.trim();
  const techStack = (document.getElementById('new-proj-tech')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  const metrics = document.getElementById('new-proj-metrics')?.value.trim();
  const status = document.getElementById('new-proj-status')?.value || 'completed';
  const featured = document.getElementById('new-proj-featured')?.checked || false;

  const accentColor = document.getElementById('new-proj-accent')?.value || 'charcoal';
  const fontStyle = document.getElementById('new-proj-font')?.value || 'serif';
  const bannerPreset = document.getElementById('new-proj-banner')?.value || 'none';
  const bannerImageUrl = document.getElementById('new-proj-banner-url')?.value.trim();
  const highlights = (document.getElementById('new-proj-highlights')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  const architectureSnippet = document.getElementById('new-proj-arch-code')?.value.trim();

  const customization = {
    accentColor,
    fontStyle,
    bannerPreset,
    bannerImageUrl,
    highlights,
    architectureSnippet
  };

  if (!title || !headline || !problemSolved) {
    alert('Please provide a title, one-line headline, and the problem solved.');
    return;
  }

  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
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
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create project.');

    closeModal();

    // Refresh view
    if (currentViewingUsername && currentViewingUsername === (currentUser?.user?.username?.toLowerCase())) {
      viewUserProfile(currentUser.user.username);
    } else {
      openDashboardView();
    }
  } catch (err) {
    alert(err.message);
  }
}

async function deleteProject(id) {
  if (!confirm('Are you sure you want to remove this project from your portfolio?')) return;

  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete project.');

    // Refresh current view
    if (currentViewingUsername) {
      viewUserProfile(currentViewingUsername);
    } else {
      openDashboardView();
    }
  } catch (err) {
    alert(err.message);
  }
}

async function openAddProblemModal() {
  if (!currentUser) {
    openAuthModal('login', 'Please sign in to document problem-solving case studies.', () => openAddProblemModal());
    return;
  }

  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  try {
    const res = await fetch('/partials/add-problem.html');
    modalContainer.innerHTML = await res.text();
  } catch (err) {
    console.error('Error opening add problem modal:', err);
  }
}

async function handleProblemModalSubmit(event) {
  event.preventDefault();
  const title = document.getElementById('new-prob-title')?.value.trim();
  const domain = document.getElementById('new-prob-domain')?.value || 'Distributed Systems';
  const symptoms = document.getElementById('new-prob-symptoms')?.value.trim();
  const rootCause = document.getElementById('new-prob-rootcause')?.value.trim();
  const solution = document.getElementById('new-prob-solution')?.value.trim();
  const outcome = document.getElementById('new-prob-outcome')?.value.trim();
  const techStack = (document.getElementById('new-prob-tech')?.value || '').split(',').map(s => s.trim()).filter(Boolean);

  if (!title || !symptoms || !solution) {
    alert('Please provide the problem title, observed symptoms, and the solution implemented.');
    return;
  }

  try {
    const res = await fetch('/api/problems', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title,
        domain,
        symptoms,
        rootCause,
        solution,
        outcome,
        techStack
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to document problem.');

    closeModal();

    if (currentViewingUsername && currentViewingUsername === (currentUser?.user?.username?.toLowerCase())) {
      viewUserProfile(currentUser.user.username);
    } else {
      openDashboardView();
    }
  } catch (err) {
    alert(err.message);
  }
}

async function deleteProblem(id) {
  if (!confirm('Are you sure you want to remove this problem-solving case study?')) return;

  try {
    const res = await fetch(`/api/problems/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete problem.');

    if (currentViewingUsername) {
      viewUserProfile(currentViewingUsername);
    } else {
      openDashboardView();
    }
  } catch (err) {
    alert(err.message);
  }
}

// -------------------------------------------------------------
// STAGE 2: DYNAMIC RESUME & PDF GENERATION ENGINE
// -------------------------------------------------------------
let currentResumeData = null;
let activeResumeStyle = 'editorial';

function openCurrentProfileResume() {
  const username = currentViewingUsername || (currentUser?.user?.username) || 'ibrahim';
  openUserResume(username);
}

function openMyResume() {
  const username = (currentUser?.user?.username) || 'ibrahim';
  openUserResume(username);
}

async function openUserResume(username) {
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  try {
    // 1. Fetch resume HTML template
    const res = await fetch('/partials/resume-pdf.html');
    modalContainer.innerHTML = await res.text();

    // 2. Fetch user resume data from backend API
    const targetUser = username || 'ibrahim';
    const resumeRes = await fetch(`/api/resume/${encodeURIComponent(targetUser)}`);
    if (!resumeRes.ok) throw new Error('Could not load resume data for this user.');

    const data = await resumeRes.json();
    currentResumeData = data;
    populateResumeModal(data);
  } catch (err) {
    console.error('Error loading resume:', err);
    alert('Unable to load resume: ' + err.message);
  }
}

function populateResumeModal(data) {
  const p = data.profile || {};
  const u = data.user || {};
  const projects = data.projects || [];
  const problems = data.problems || [];
  const initials = (p.displayName || u.username || 'PF').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'PF';

  // Badge & Title
  const badge = document.getElementById('resume-avatar-badge');
  if (badge) badge.textContent = initials;

  const topTitle = document.getElementById('resume-top-title');
  if (topTitle) topTitle.textContent = `${p.displayName || u.username} • Curriculum Vitae`;

  // CV Header
  const nameEl = document.getElementById('cv-display-name');
  if (nameEl) nameEl.textContent = p.displayName || u.username;

  const headEl = document.getElementById('cv-headline');
  if (headEl) headEl.textContent = p.headline || 'Software Systems & Solutions Engineer';

  const locEl = document.getElementById('cv-location');
  if (locEl) locEl.textContent = p.location ? `📍 ${p.location}` : '📍 Dar es Salaam, Tanzania';

  const emailEl = document.getElementById('cv-email');
  if (emailEl) emailEl.textContent = u.email ? `📧 ${u.email}` : '📧 Contact via Proofolio';

  const tagEl = document.getElementById('cv-proofolio-tag');
  if (tagEl) tagEl.textContent = `proofolio.dev/u/${u.username}`;

  // Verified links
  const linksEl = document.getElementById('cv-verified-links');
  if (linksEl) {
    const links = p.socialLinks || {};
    const items = [];
    if (links.website) items.push(`<a href="${links.website}" target="_blank" class="text-emerald-800 font-bold underline">Website: ${links.website}</a>`);
    if (links.github) items.push(`<a href="${links.github}" target="_blank" class="text-[#2B2A28] underline">GitHub: ${links.github}</a>`);
    if (links.linkedin) items.push(`<a href="${links.linkedin}" target="_blank" class="text-blue-800 underline">LinkedIn: ${links.linkedin}</a>`);
    if (items.length > 0) {
      linksEl.innerHTML = `<span class="text-[#776F65] uppercase tracking-wider text-[10px] font-bold">Verified Links:</span> ` + items.join(' &bull; ');
    } else {
      linksEl.innerHTML = `<span class="text-[#776F65] uppercase tracking-wider text-[10px] font-bold">Verified Portal:</span> <span class="text-emerald-800 font-bold">https://proofolio.dev/u/${u.username}</span>`;
    }
  }

  // Executive Summary
  const bioEl = document.getElementById('cv-bio');
  if (bioEl) bioEl.textContent = p.bio || 'Systems engineer with proven record of building and deploying production-grade applications.';

  // Skills Toolchain
  const skillsContainer = document.getElementById('cv-skills-grid');
  if (skillsContainer) {
    const skills = p.skills || [];
    if (skills.length > 0) {
      skillsContainer.innerHTML = skills.map(s => `
        <span class="px-2.5 py-1 rounded bg-[#F0EBE3] border border-[#C4BCB2] text-[#2B2A28] font-bold text-xs">
          ${escapeHtml(s)}
        </span>
      `).join('');
    } else {
      skillsContainer.innerHTML = '<span class="text-xs text-[#8C8378] italic">Technical competencies to be listed.</span>';
    }
  }

  // Projects List
  const projContainer = document.getElementById('cv-projects-list');
  if (projContainer) {
    if (projects.length > 0) {
      projContainer.innerHTML = projects.map((proj, idx) => `
        <div class="space-y-1.5 text-xs pb-3 border-b border-[#E5E0D8]/80 last:border-0 last:pb-0">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <div class="font-serif font-bold text-sm text-[#1A1918]">
              ${idx + 1}. ${escapeHtml(proj.title)}
              <span class="font-mono font-normal text-[11px] text-[#776F65]">(${escapeHtml(proj.category)})</span>
            </div>
            ${proj.metrics ? `
              <div class="font-mono font-bold text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ${escapeHtml(proj.metrics)}
              </div>
            ` : ''}
          </div>

          <p class="text-[#2B2A28] leading-relaxed">
            <strong>Problem &amp; Impact:</strong> ${escapeHtml(proj.problemSolved)}
          </p>

          ${proj.architectureNotes ? `
            <p class="text-[#55504A] font-mono text-[11px]">
              <strong>Engineering Architecture:</strong> ${escapeHtml(proj.architectureNotes)}
            </p>
          ` : ''}

          <div class="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[11px] text-[#776F65]">
            <div class="flex flex-wrap gap-1">
              <strong>Stack:</strong> ${(proj.techStack || []).join(', ')}
            </div>
            <div class="flex items-center gap-2">
              ${proj.liveUrl ? `<a href="${proj.liveUrl}" target="_blank" class="text-emerald-800 font-bold underline">Verified Live URL</a>` : ''}
              ${proj.repoUrl ? `<a href="${proj.repoUrl}" target="_blank" class="text-[#2B2A28] underline">Source Code</a>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    } else {
      projContainer.innerHTML = '<div class="text-xs text-[#8C8378] italic">No projects recorded yet.</div>';
    }
  }

  // Problems Section
  const probSection = document.getElementById('cv-problems-section');
  const probContainer = document.getElementById('cv-problems-list');
  if (problems.length > 0 && probContainer) {
    if (probSection) probSection.classList.remove('hidden');
    probContainer.innerHTML = problems.map((prob, idx) => `
      <div class="p-3 rounded-xl bg-[#FAF7F2] border border-[#E5E0D8] space-y-1.5 text-xs">
        <div class="flex items-center justify-between font-mono text-[11px]">
          <span class="font-serif font-bold text-xs text-[#1A1918]">${idx + 1}. ${escapeHtml(prob.title)}</span>
          <span class="font-bold text-amber-800 uppercase text-[10px]">${escapeHtml(prob.domain)}</span>
        </div>
        <p class="text-[#2B2A28] leading-relaxed">
          <strong class="text-rose-800">Challenge:</strong> ${escapeHtml(prob.symptoms)}
        </p>
        <p class="text-[#2B2A28] leading-relaxed">
          <strong class="text-emerald-800">Resolution:</strong> ${escapeHtml(prob.solution)}
        </p>
        ${prob.outcome ? `
          <div class="font-mono text-[11px] text-emerald-800 font-bold pt-0.5">
            Outcome: ${escapeHtml(prob.outcome)}
          </div>
        ` : ''}
      </div>
    `).join('');
  } else if (probSection) {
    probSection.classList.add('hidden');
  }

  // Endorsements Section (Stage 3)
  const endorsements = data.endorsements || [];
  const endSection = document.getElementById('cv-endorsements-section');
  const endContainer = document.getElementById('cv-endorsements-list');
  if (endContainer) {
    if (endorsements.length > 0) {
      if (endSection) endSection.classList.remove('hidden');
      endContainer.innerHTML = endorsements.map((end, idx) => `
        <div class="p-3 rounded-xl bg-[#FAF7F2] border border-[#E5E0D8] space-y-1 text-xs">
          <div class="flex items-center justify-between font-mono text-[11px]">
            <span class="font-bold text-[#1A1918]">
              ${idx + 1}. ${escapeHtml(end.authorName)}
              <span class="text-[#776F65] font-normal">(@${escapeHtml(end.authorUsername)}) &bull; ${escapeHtml(end.authorRole || 'Peer')}</span>
            </span>
            <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-900 font-bold uppercase">
              ${escapeHtml(end.relationship)}
            </span>
          </div>
          ${end.targetTitle ? `
            <div class="text-[10px] font-mono text-[#776F65]">
              Endorsing ${escapeHtml(end.type)}: <strong class="text-[#2B2A28]">${escapeHtml(end.targetTitle)}</strong>
            </div>
          ` : ''}
          <p class="text-[#2B2A28] italic leading-relaxed pt-0.5 font-sans">
            &ldquo;${escapeHtml(end.content)}&rdquo;
          </p>
        </div>
      `).join('');
    } else if (endSection) {
      endSection.classList.add('hidden');
    }
  }

  // Experience & Education
  const expEl = document.getElementById('cv-experience');
  if (expEl) expEl.textContent = p.professionalSummary || 'Senior Engineering & Architecture Consultant.';

  const edEl = document.getElementById('cv-education');
  if (edEl) edEl.textContent = p.educationSummary || 'B.Sc. in Computer Science / Software Engineering.';

  // Timestamp
  const timeEl = document.getElementById('cv-timestamp');
  if (timeEl) timeEl.textContent = `Validated • ${new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;

  setResumeStyle(activeResumeStyle || 'editorial');
}

// Resume Typography Style Selector
function setResumeStyle(style) {
  activeResumeStyle = style;
  const sheet = document.getElementById('printable-resume');
  if (!sheet) return;

  const btnSerif = document.getElementById('style-serif-btn');
  const btnModern = document.getElementById('style-modern-btn');
  const btnLedger = document.getElementById('style-ledger-btn');

  [btnSerif, btnModern, btnLedger].forEach(b => {
    if (b) {
      b.className = 'px-2.5 py-1 rounded-lg text-[#2B2A28] hover:bg-[#F0EBE3] transition-colors cursor-pointer';
    }
  });

  if (style === 'editorial') {
    if (btnSerif) btnSerif.className = 'px-2.5 py-1 rounded-lg font-bold bg-[#2B2A28] text-[#FAF7F2] transition-colors cursor-pointer';
    sheet.className = 'max-w-3xl mx-auto space-y-7 font-sans print-surface';
    const titles = sheet.querySelectorAll('h1, h2, h3');
    titles.forEach(t => t.classList.add('font-serif'));
  } else if (style === 'modern') {
    if (btnModern) btnModern.className = 'px-2.5 py-1 rounded-lg font-bold bg-[#2B2A28] text-[#FAF7F2] transition-colors cursor-pointer';
    sheet.className = 'max-w-3xl mx-auto space-y-7 font-sans print-surface';
    const titles = sheet.querySelectorAll('h1, h2, h3');
    titles.forEach(t => t.classList.remove('font-serif'));
  } else if (style === 'ledger') {
    if (btnLedger) btnLedger.className = 'px-2.5 py-1 rounded-lg font-bold bg-[#2B2A28] text-[#FAF7F2] transition-colors cursor-pointer';
    sheet.className = 'max-w-3xl mx-auto space-y-7 font-mono text-xs print-surface';
  }
}

function copyResumePlainText() {
  if (!currentResumeData) {
    alert('Resume data is still loading.');
    return;
  }

  const p = currentResumeData.profile || {};
  const u = currentResumeData.user || {};
  const projects = currentResumeData.projects || [];
  const problems = currentResumeData.problems || [];

  let text = `${(p.displayName || u.username).toUpperCase()} — ${(p.headline || 'Software Systems Engineer').toUpperCase()}
Location: ${p.location || 'Dar es Salaam, Tanzania'} | Email: ${u.email || 'Via Proofolio'}
Verified Proofolio: https://proofolio.dev/u/${u.username}

EXECUTIVE SUMMARY
${p.bio || 'Systems engineer with proven record of building and deploying production-grade applications.'}

CORE TECHNICAL TOOLCHAIN
${(p.skills || []).join(', ')}

FEATURED PROOF OF WORK & SHIPPED SYSTEMS
${projects.map((proj, i) => `
${i + 1}. ${proj.title} (${proj.category})
   - Problem Solved: ${proj.problemSolved}
   ${proj.architectureNotes ? `- Architecture: ${proj.architectureNotes}` : ''}
   ${proj.metrics ? `- Key Impact: ${proj.metrics}` : ''}
   - Stack: ${(proj.techStack || []).join(', ')}
   ${proj.liveUrl ? `- Live System: ${proj.liveUrl}` : ''}
`).join('\n')}

PROBLEM-SOLVING & DEFENSIVE ARCHITECTURE
${problems.map((prob, i) => `
${i + 1}. ${prob.title} [${prob.domain}]
   - Observed Challenge: ${prob.symptoms}
   - Solution Implemented: ${prob.solution}
   ${prob.outcome ? `- Outcome: ${prob.outcome}` : ''}
`).join('\n')}

PROFESSIONAL EXPERIENCE
${p.professionalSummary || 'Senior Engineering & Architecture Consultant.'}

EDUCATION & CREDENTIALS
${p.educationSummary || 'B.Sc. in Computer Science / Software Engineering.'}`;

  navigator.clipboard.writeText(text).then(() => {
    const label = document.getElementById('copy-btn-label');
    if (label) {
      const orig = label.textContent;
      label.textContent = 'Copied!';
      setTimeout(() => { label.textContent = orig; }, 2000);
    }
  }).catch(() => {
    alert('Resume text copied to clipboard!');
  });
}

// Global window registrations
window.handleFollowClick = handleFollowButtonClick;
window.openAddProjectModal = openAddProjectModal;
window.handleProjectModalSubmit = handleProjectModalSubmit;
window.deleteProject = deleteProject;
window.openAddProblemModal = openAddProblemModal;
window.handleProblemModalSubmit = handleProblemModalSubmit;
window.deleteProblem = deleteProblem;
window.openCurrentProfileResume = openCurrentProfileResume;
window.openMyResume = openMyResume;
window.openUserResume = openUserResume;
window.setResumeStyle = setResumeStyle;
window.copyResumePlainText = copyResumePlainText;

// Follow / Unfollow Handler
async function handleFollowButtonClick() {
  if (!currentViewingUsername) return;

  // Unauthenticated Participation Gate: If anonymous user clicks follow, prompt login/register
  if (!currentUser) {
    const targetName = currentViewingProfileData?.profile?.displayName || currentViewingUsername;
    openAuthModal(
      'login',
      `An account is required to follow @${currentViewingUsername}. Sign in or create an account to connect with ${targetName}.`,
      () => handleFollowButtonClick() // Preserves context & executes action after authentication
    );
    return;
  }

  const isCurrentlyFollowing = currentViewingProfileData?.isFollowing;
  const method = isCurrentlyFollowing ? 'DELETE' : 'POST';

  const btn = document.getElementById('pub-follow-btn');
  const label = document.getElementById('pub-follow-label');
  if (label) label.textContent = isCurrentlyFollowing ? 'Unfollowing...' : 'Following...';
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`/api/users/${encodeURIComponent(currentViewingUsername)}/follow`, {
      method,
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update follow relationship.');
    }

    if (currentViewingProfileData) {
      currentViewingProfileData.isFollowing = data.isFollowing;
      currentViewingProfileData.followersCount = data.followersCount;
      currentViewingProfileData.followingCount = data.followingCount;
    }

    renderPublicProfile(currentViewingProfileData);
  } catch (err) {
    alert(err.message);
    if (currentViewingProfileData) {
      renderPublicProfile(currentViewingProfileData);
    }
  }
}

function copyProfileUrl() {
  const url = `${window.location.origin}/u/${currentViewingUsername}`;
  navigator.clipboard.writeText(url).then(() => {
    const label = document.getElementById('pub-share-label');
    if (label) {
      const orig = label.textContent;
      label.textContent = '✓ Link copied to clipboard!';
      setTimeout(() => { label.textContent = orig; }, 2500);
    }
  }).catch(() => {
    prompt('Copy profile link:', url);
  });
}

// -------------------------------------------------------------
// PROFILE DISCOVERY ENGINE
// -------------------------------------------------------------
async function openDiscoverView() {
  const main = document.getElementById('main-content');
  if (!main) return;

  try {
    const res = await fetch('/partials/discover.html');
    main.innerHTML = await res.text();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadDiscoverProfiles();
  } catch (err) {
    console.error('Error opening discover view:', err);
  }
}

async function loadDiscoverProfiles() {
  const grid = document.getElementById('discover-profiles-grid');
  if (!grid) return;

  const searchInput = document.getElementById('discover-search-input');
  const q = searchInput ? searchInput.value.trim() : '';

  try {
    const res = await fetch(`/api/users/discover?q=${encodeURIComponent(q)}&category=${encodeURIComponent(activeDiscoverCategory)}`);
    const data = await res.json();
    renderDiscoverGrid(data.results || []);
  } catch (err) {
    grid.innerHTML = '<div class="col-span-full p-8 text-center text-xs font-mono text-rose-700">Failed to load profiles.</div>';
  }
}

function renderDiscoverGrid(results) {
  const grid = document.getElementById('discover-profiles-grid');
  if (!grid) return;

  if (results.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full p-12 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] text-center space-y-2">
        <div class="text-sm font-serif font-bold text-[#2B2A28]">No matching public profiles found.</div>
        <p class="text-xs font-mono text-[#8C8378]">Try changing your search keywords or switching category filters.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = results.map(item => {
    const p = item.profile;
    const initials = (p.displayName || p.username).split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'PF';
    return `
      <div class="p-6 rounded-2xl bg-[#FAF7F2] border border-[#C4BCB2] hover:border-[#2B2A28] transition-all space-y-4 shadow-2xs flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-[#2B2A28] text-[#FAF7F2] flex items-center justify-center font-serif font-bold text-base shrink-0 shadow-2xs">
                ${escapeHtml(initials)}
              </div>
              <div class="leading-tight">
                <h3 class="font-serif font-bold text-base text-[#2B2A28] hover:underline cursor-pointer" onclick="viewUserProfile('${p.username}')">
                  ${escapeHtml(p.displayName || p.username)}
                </h3>
                <div class="text-[11px] font-mono text-[#8C8378]">@${escapeHtml(p.username)}</div>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F0EBE3] border border-[#C4BCB2] text-emerald-800 uppercase">
              ${escapeHtml(p.category || 'Member')}
            </span>
          </div>

          <p class="text-xs font-body text-[#2B2A28]/85 line-clamp-2 leading-relaxed">
            ${escapeHtml(p.headline || p.bio || 'Building portfolio & documenting work.')}
          </p>

          <div class="flex items-center gap-2 text-[11px] font-mono text-[#8C8378]">
            <span>📍 ${escapeHtml(p.location || 'Remote / Worldwide')}</span>
            <span>&bull;</span>
            <span>${item.followersCount} follower${item.followersCount === 1 ? '' : 's'}</span>
          </div>

          ${p.skills && p.skills.length > 0 ? `
            <div class="flex flex-wrap gap-1.5 pt-1">
              ${p.skills.slice(0, 3).map(s => `
                <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F0EBE3] border border-[#C4BCB2] text-[#2B2A28]">
                  ${escapeHtml(s)}
                </span>
              `).join('')}
              ${p.skills.length > 3 ? `<span class="text-[10px] font-mono text-[#8C8378] self-center">+${p.skills.length - 3} more</span>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="pt-3 border-t border-[#C4BCB2] flex items-center justify-between">
          <button
            onclick="viewUserProfile('${p.username}')"
            class="w-full py-2 rounded-xl text-xs font-mono font-bold bg-[#F0EBE3] text-[#2B2A28] border border-[#C4BCB2] hover:bg-[#2B2A28] hover:text-[#FAF7F2] hover:border-[#2B2A28] transition-colors cursor-pointer text-center"
          >
            View Portfolio Profile &rarr;
          </button>
        </div>
      </div>
    `;
  }).join('');
}

let discoverSearchTimer = null;
function handleDiscoverSearch() {
  clearTimeout(discoverSearchTimer);
  discoverSearchTimer = setTimeout(() => {
    loadDiscoverProfiles();
  }, 250);
}

function setDiscoverCategory(cat) {
  activeDiscoverCategory = cat;
  const pills = ['all', 'cybersecurity', 'developer', 'designer', 'researcher', 'engineer', 'entrepreneur'];
  pills.forEach(id => {
    const el = document.getElementById(`cat-${id}`);
    if (el) {
      if (id === cat) {
        el.className = 'px-3 py-1.5 rounded-lg bg-[#2B2A28] text-[#FAF7F2] font-bold cursor-pointer whitespace-nowrap';
      } else {
        el.className = 'px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#C4BCB2] text-[#2B2A28] hover:border-[#2B2A28] cursor-pointer whitespace-nowrap';
      }
    }
  });
  loadDiscoverProfiles();
}

// -------------------------------------------------------------
// ADMINISTRATOR ACCOUNT MANAGEMENT
// -------------------------------------------------------------
async function openAdminView() {
  if (!currentUser || currentUser.user.role !== 'admin') {
    alert('Access restricted to administrators.');
    return;
  }

  const main = document.getElementById('main-content');
  if (!main) return;

  try {
    const res = await fetch('/partials/admin.html');
    main.innerHTML = await res.text();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadAdminUsers();
  } catch (err) {
    console.error('Error loading admin panel:', err);
  }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  const countEl = document.getElementById('admin-user-count');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-[#8C8378]">Loading users...</td></tr>';

  try {
    const res = await fetch('/api/admin/users', { headers: getAuthHeaders() });
    if (!res.ok) {
      throw new Error('Failed to load user list.');
    }

    const data = await res.json();
    const users = data.users || [];
    if (countEl) countEl.textContent = `${users.length} Total Accounts`;

    tbody.innerHTML = users.map(item => {
      const u = item.user;
      const p = item.profile;
      const isActive = u.status === 'active';
      const isSelf = currentUser && currentUser.user.id === u.id;

      return `
        <tr class="hover:bg-[#F0EBE3]/50 transition-colors">
          <td class="p-4">
            <div class="font-bold text-[#2B2A28]">${escapeHtml(p?.displayName || u.username)}</div>
            <div class="text-[#8C8378] text-[11px]">@${escapeHtml(u.username)}</div>
          </td>
          <td class="p-4 text-[#2B2A28]">${escapeHtml(u.email)}</td>
          <td class="p-4">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-[#F0EBE3] text-[#2B2A28]'}">
              ${escapeHtml(u.role)}
            </span>
          </td>
          <td class="p-4">${item.followersCount}</td>
          <td class="p-4">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${isActive ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'}">
              <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-rose-600'}"></span>
              <span>${escapeHtml(u.status)}</span>
            </span>
          </td>
          <td class="p-4 text-right">
            ${isSelf ? `
              <span class="text-[#8C8378] text-[11px] italic">Current Admin</span>
            ` : `
              <button
                onclick="toggleUserStatus('${u.id}')"
                class="px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100' 
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                }"
              >
                ${isActive ? 'Disable Account' : 'Reactivate Account'}
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-rose-700 font-bold">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function toggleUserStatus(userId) {
  if (!confirm('Are you sure you want to change the status of this account?')) return;

  try {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/toggle-status`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to toggle account status.');
    }

    loadAdminUsers();
  } catch (err) {
    alert(err.message);
  }
}


// -------------------------------------------------------------
// STAGE 3: PEER ENDORSEMENTS ENGINE
// -------------------------------------------------------------
window.openEndorseModal = async function(targetUserId, targetUsername, targetDisplayName, type, targetId, targetTitle) {
  if (!currentUser) {
    openAuthModal('login', 'Please sign in or create an account to submit a verified peer endorsement.', () => {
      openEndorseModal(targetUserId, targetUsername, targetDisplayName, type, targetId, targetTitle);
    });
    return;
  }

  // If no target provided, use current profile data
  const targetData = currentViewingProfileData;
  const tUserId = targetUserId || targetData?.user?.id;
  const tUsername = targetUsername || targetData?.user?.username;
  const tName = targetDisplayName || targetData?.profile?.displayName || tUsername || 'Engineer';

  if (!tUserId) {
    alert('Target engineer not specified.');
    return;
  }

  if (currentUser.user.id === tUserId) {
    alert('You cannot endorse your own profile.');
    return;
  }

  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  try {
    const res = await fetch('/partials/endorse-modal.html');
    modalContainer.innerHTML = await res.text();

    const nameEl = document.getElementById('endorse-target-name');
    if (nameEl) nameEl.textContent = `${tName} (@${tUsername})`;

    const uidInput = document.getElementById('endorse-target-user-id');
    if (uidInput) uidInput.value = tUserId;

    const unameInput = document.getElementById('endorse-target-username');
    if (unameInput) unameInput.value = tUsername;

    const typeSelect = document.getElementById('endorse-type');
    if (typeSelect && type) {
      typeSelect.value = type;
    }

    const titleInput = document.getElementById('endorse-target-title');
    if (titleInput && targetTitle) {
      titleInput.value = targetTitle;
    }

    updateEndorseTargetFields();
  } catch (err) {
    console.error('Error opening endorse modal:', err);
  }
};

window.updateEndorseTargetFields = function() {
  const type = document.getElementById('endorse-type')?.value;
  const wrapper = document.getElementById('endorse-specific-target-wrapper');
  const label = document.getElementById('endorse-specific-label');
  const input = document.getElementById('endorse-target-title');

  if (!wrapper || !label || !input) return;

  if (type === 'general') {
    wrapper.classList.add('hidden');
    input.value = '';
  } else {
    wrapper.classList.remove('hidden');
    if (type === 'project') {
      label.textContent = 'Project Name / Production System *';
      input.placeholder = 'e.g. Panga na Kupangisha, TNA Logistics';
    } else if (type === 'problem') {
      label.textContent = 'Problem / Case Study Title *';
      input.placeholder = 'e.g. Concurrency Deadlock Resolution';
    } else if (type === 'skill') {
      label.textContent = 'Technical Skill / Tool *';
      input.placeholder = 'e.g. PostgreSQL, Go, HTMX, Docker';
    }
  }
};

window.handleEndorsementSubmit = async function(event) {
  event.preventDefault();
  const targetUserId = document.getElementById('endorse-target-user-id')?.value;
  const targetUsername = document.getElementById('endorse-target-username')?.value;
  const type = document.getElementById('endorse-type')?.value || 'general';
  const targetTitle = document.getElementById('endorse-target-title')?.value.trim();
  const relationship = document.getElementById('endorse-relationship')?.value;
  const content = document.getElementById('endorse-content')?.value.trim();

  if (!targetUserId || !content) return;

  try {
    const res = await fetch('/api/endorsements', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        targetUserId,
        type,
        targetTitle,
        relationship,
        content
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit endorsement.');

    closeModal();

    // Refresh profile if currently viewing it
    if (currentViewingUsername && currentViewingUsername === targetUsername?.toLowerCase()) {
      viewUserProfile(targetUsername);
    } else {
      openDashboardView();
    }
  } catch (err) {
    alert(err.message);
  }
};

window.deleteEndorsement = async function(id) {
  if (!confirm('Are you sure you want to remove this peer endorsement?')) return;

  try {
    const res = await fetch(`/api/endorsements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete endorsement.');

    if (currentViewingUsername) {
      viewUserProfile(currentViewingUsername);
    } else {
      openDashboardView();
    }
  } catch (err) {
    alert(err.message);
  }
};

// -------------------------------------------------------------
// STAGE 3: COMMUNITY DISCUSSIONS & REAL-TIME FORUM (API BACKED)
// -------------------------------------------------------------
async function loadDiscussions() {
  const container = document.getElementById('discussions-list');
  if (!container) return;

  try {
    let url = `/api/discussions?category=${encodeURIComponent(activeDiscussionFilter)}`;
    if (discussionSearchQuery) {
      url += `&search=${encodeURIComponent(discussionSearchQuery)}`;
    }

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      discussions = data.discussions || [];
      renderDiscussionsList();
    } else {
      renderDiscussionsList();
    }
  } catch (err) {
    console.warn('Discussions fetch fallback:', err);
    renderDiscussionsList();
  }
}

function renderDiscussionsList() {
  const container = document.getElementById('discussions-list');
  if (!container) return;

  let filtered = activeDiscussionFilter === 'all' 
    ? discussions 
    : discussions.filter(d => d.category.toLowerCase() === activeDiscussionFilter.toLowerCase());

  if (discussionSearchQuery) {
    const q = discussionSearchQuery.toLowerCase();
    filtered = filtered.filter(d => 
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      (d.author && d.author.toLowerCase().includes(q))
    );
  }

  const countEl = document.getElementById('disc-count');
  if (countEl) {
    countEl.textContent = `${filtered.length} Discussion${filtered.length === 1 ? '' : 's'} Available`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="p-8 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] text-center space-y-3">
        <div class="text-sm font-serif font-bold text-[#2B2A28]">No discussions found matching your criteria.</div>
        <p class="text-xs font-mono text-[#8C8378]">Post the first question or architectural challenge in this category!</p>
        <button onclick="toggleElement('post-problem-form')" class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] cursor-pointer">
          Post Problem Now
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const canDelete = currentUser && currentUser.user && (currentUser.user.id === item.userId || currentUser.user.role === 'admin');

    return `
      <article class="p-6 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] space-y-4 hover:border-[#2B2A28] transition-all">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full bg-[#FAF7F2] border border-[#C4BCB2] text-[#8C8378] font-bold uppercase text-[10px]">
              ${escapeHtml(item.category)}
            </span>
            <span class="font-bold text-[#2B2A28]">${escapeHtml(item.author)}</span>
            <span class="text-[#8C8378]">&bull; ${escapeHtml(item.role || 'Contributor')}</span>
          </div>
          <div class="flex items-center gap-2 text-[#8C8378]">
            <span>${escapeHtml(item.time)}</span>
            ${canDelete ? `
              <button
                onclick="deleteDiscussion('${item.id}')"
                class="text-rose-700 hover:text-rose-900 font-bold hover:underline cursor-pointer ml-1"
                title="Delete discussion"
              >
                Delete
              </button>
            ` : ''}
          </div>
        </div>

        <div>
          <h3 class="text-lg font-serif font-bold text-[#2B2A28] leading-snug">
            ${escapeHtml(item.title)}
          </h3>
          <p class="text-xs text-[#2B2A28]/85 mt-2 leading-relaxed font-sans">
            ${escapeHtml(item.description)}
          </p>
        </div>

        <!-- Action Bar: Upvote & Reply -->
        <div class="pt-3 border-t border-[#C4BCB2] flex items-center justify-between text-xs font-mono">
          <div class="flex items-center gap-4">
            <button onclick="upvoteDiscussion('${item.id}')" class="px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#C4BCB2] hover:border-[#2B2A28] flex items-center gap-1.5 text-xs text-[#2B2A28] cursor-pointer">
              <svg class="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>
              <span>Helpful (${item.upvotes || 0})</span>
            </button>

            <button onclick="toggleReplyBox('${item.id}')" class="text-xs text-[#8C8378] hover:text-[#2B2A28] font-bold flex items-center gap-1 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              <span>${(item.replies && item.replies.length) || 0} Replies</span>
            </button>
          </div>

          <a href="https://wa.me/255628726374?text=Hello%20Ibrahim%2C%20I%20want%20to%20discuss%20${encodeURIComponent(item.title)}" target="_blank" rel="noopener noreferrer" class="text-emerald-800 font-bold hover:underline">
            WhatsApp Discussion &rarr;
          </a>
        </div>

        <!-- Replies List -->
        ${item.replies && item.replies.length > 0 ? `
          <div class="space-y-2.5 pt-2">
            ${item.replies.map(r => `
              <div class="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#C4BCB2] space-y-1 text-xs">
                <div class="flex items-center justify-between text-[11px] font-mono text-[#8C8378]">
                  <span class="font-bold text-[#2B2A28]">${escapeHtml(r.author)} <span class="font-normal text-[#8C8378]">(${escapeHtml(r.role || 'Member')})</span></span>
                  <span>${r.time}</span>
                </div>
                <p class="text-[#2B2A28]/85 leading-relaxed font-sans">${escapeHtml(r.text)}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Reply Box Form (Hidden by default) -->
        <div id="reply-box-${item.id}" class="hidden pt-3 border-t border-[#C4BCB2] space-y-2">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input id="reply-author-${item.id}" type="text" placeholder="${currentUser ? (currentUser.profile?.displayName || currentUser.user?.username) : 'Your Name'}" class="px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#C4BCB2] text-xs font-mono" />
            <input id="reply-role-${item.id}" type="text" placeholder="${currentUser ? (currentUser.profile?.headline || 'Engineer') : 'Your Role / Expertise'}" class="px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#C4BCB2] text-xs font-mono" />
          </div>
          <textarea id="reply-text-${item.id}" rows="2" placeholder="Write your solution, recommendation, or test case..." class="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#C4BCB2] text-xs font-sans"></textarea>
          <div class="flex justify-end gap-2">
            <button onclick="toggleReplyBox('${item.id}')" class="px-3 py-1 rounded-lg text-xs font-mono border border-[#C4BCB2] bg-[#FAF7F2] cursor-pointer">Cancel</button>
            <button onclick="submitReply('${item.id}')" class="px-4 py-1 rounded-lg text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] cursor-pointer">Post Reply</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Filter Discussions
window.filterDiscussions = function(category) {
  activeDiscussionFilter = category;
  document.querySelectorAll('.disc-filter-btn').forEach(btn => {
    if (btn.getAttribute('data-cat') === category) {
      btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] shadow-2xs disc-filter-btn';
    } else {
      btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-mono bg-[#F0EBE3] text-[#2B2A28] border border-[#C4BCB2] hover:bg-[#FAF7F2] disc-filter-btn';
    }
  });
  loadDiscussions();
};

// Search Discussions
window.handleDiscussionSearch = function(query) {
  discussionSearchQuery = query.trim();
  loadDiscussions();
};

// Upvote Discussion
window.upvoteDiscussion = async function(id) {
  try {
    const res = await fetch(`/api/discussions/${encodeURIComponent(id)}/upvote`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      const item = discussions.find(d => d.id === id);
      if (item) {
        item.upvotes = data.discussion.upvotes;
      }
      renderDiscussionsList();
    } else {
      const item = discussions.find(d => d.id === id);
      if (item) {
        item.upvotes = (item.upvotes || 0) + 1;
        renderDiscussionsList();
      }
    }
  } catch (err) {
    const item = discussions.find(d => d.id === id);
    if (item) {
      item.upvotes = (item.upvotes || 0) + 1;
      renderDiscussionsList();
    }
  }
};

// Toggle Reply Box
window.toggleReplyBox = function(id) {
  const box = document.getElementById(`reply-box-${id}`);
  if (box) {
    box.classList.toggle('hidden');
  }
};

// Submit Reply
window.submitReply = async function(id) {
  let author = document.getElementById(`reply-author-${id}`)?.value.trim();
  let role = document.getElementById(`reply-role-${id}`)?.value.trim();
  const text = document.getElementById(`reply-text-${id}`)?.value.trim();

  if (!text) {
    alert('Please enter your reply text before submitting.');
    return;
  }

  if (currentUser) {
    if (!author) author = currentUser.profile?.displayName || currentUser.user.username;
    if (!role) role = currentUser.profile?.headline || 'Engineer';
  } else {
    if (!author) author = 'Community Contributor';
    if (!role) role = 'Software Engineer';
  }

  try {
    const res = await fetch(`/api/discussions/${encodeURIComponent(id)}/replies`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ author, role, text })
    });

    if (res.ok) {
      const data = await res.json();
      const item = discussions.find(d => d.id === id);
      if (item) {
        item.replies = data.discussion.replies;
      }
      renderDiscussionsList();
    } else {
      const item = discussions.find(d => d.id === id);
      if (item) {
        if (!item.replies) item.replies = [];
        item.replies.push({ author, role, time: 'Just now', text });
        renderDiscussionsList();
      }
    }
  } catch (err) {
    const item = discussions.find(d => d.id === id);
    if (item) {
      if (!item.replies) item.replies = [];
      item.replies.push({ author, role, time: 'Just now', text });
      renderDiscussionsList();
    }
  }
};

// Handle Problem / Discussion Form Submit
window.handleProblemSubmit = async function(event) {
  event.preventDefault();
  let author = document.getElementById('prob-name')?.value.trim();
  let role = document.getElementById('prob-role')?.value.trim() || 'Software Developer';
  const category = document.getElementById('prob-category')?.value || 'database';
  const title = document.getElementById('prob-title')?.value.trim();
  const description = document.getElementById('prob-description')?.value.trim();

  if (!title || !description) return;

  if (currentUser) {
    if (!author) author = currentUser.profile?.displayName || currentUser.user.username;
    if (!role) role = currentUser.profile?.headline || 'Member';
  } else {
    if (!author) author = 'Community Contributor';
  }

  try {
    const res = await fetch('/api/discussions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ author, role, category, title, description })
    });

    if (res.ok) {
      toggleElement('post-problem-form');
      event.target.reset();
      loadDiscussions();
    } else {
      const data = await res.json();
      throw new Error(data.error || 'Failed to post discussion.');
    }
  } catch (err) {
    alert(err.message);
  }
};

window.deleteDiscussion = async function(id) {
  if (!confirm('Are you sure you want to delete this discussion thread?')) return;

  try {
    const res = await fetch(`/api/discussions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete discussion.');
    }

    loadDiscussions();
  } catch (err) {
    alert(err.message);
  }
};

// -------------------------------------------------------------
// STAGE 3: TECHNICAL ARTICLES & KNOWLEDGE HUB (API BACKED)
// -------------------------------------------------------------
async function loadArticles() {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  try {
    let url = `/api/articles?category=${encodeURIComponent(activeArticleFilter)}`;
    if (articleSearchQuery) {
      url += `&search=${encodeURIComponent(articleSearchQuery)}`;
    }

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      articles = data.articles || [];
      renderArticlesGrid();
    } else {
      renderArticlesGrid();
    }
  } catch (err) {
    console.warn('Articles fetch fallback:', err);
    renderArticlesGrid();
  }
}

// Articles Renderer
function renderArticlesGrid() {
  const container = document.getElementById('articles-grid');
  if (!container) return;

  let filtered = activeArticleFilter === 'all'
    ? articles
    : articles.filter(a => a.category.toLowerCase() === activeArticleFilter.toLowerCase());

  if (articleSearchQuery) {
    const q = articleSearchQuery.toLowerCase();
    filtered = filtered.filter(a =>
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.summary && a.summary.toLowerCase().includes(q)) ||
      (a.author && a.author.toLowerCase().includes(q)) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  const countEl = document.getElementById('art-count');
  if (countEl) {
    countEl.textContent = `${filtered.length} Article${filtered.length === 1 ? '' : 's'}`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-8 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] text-center space-y-3">
        <div class="text-sm font-serif font-bold text-[#2B2A28]">No articles found matching your criteria.</div>
        <p class="text-xs font-mono text-[#8C8378]">Try a different filter or publish the first article on this subject.</p>
        <button onclick="toggleElement('publish-article-form')" class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] cursor-pointer">
          Write / Assign Article
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(art => {
    const canDelete = currentUser && currentUser.user && (currentUser.user.id === art.userId || currentUser.user.role === 'admin');
    const cust = art.customization || {};
    const bannerStyle = cust.bannerStyle || 'none';
    const bannerImg = cust.bannerImageUrl;
    const takeaways = cust.takeaways || [];
    const fontStyle = cust.fontStyle || 'serif';

    let fontClass = 'font-serif';
    if (fontStyle === 'sans') fontClass = 'font-sans font-bold';
    else if (fontStyle === 'mono') fontClass = 'font-mono font-bold tracking-tight';

    return `
      <article class="p-6 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] flex flex-col justify-between hover:border-[#2B2A28] transition-all hover:shadow-sm">
        <div class="space-y-3">
          ${bannerImg ? `
            <div class="w-full h-28 rounded-xl overflow-hidden mb-2 border border-[#C4BCB2]/60">
              <img src="${escapeHtml(bannerImg)}" alt="${escapeHtml(art.title)}" class="w-full h-full object-cover" />
            </div>
          ` : (bannerStyle !== 'none' ? `
            <div class="w-full h-12 rounded-xl banner-mesh-${escapeHtml(bannerStyle)} border border-[#C4BCB2]/50 flex items-center px-4 mb-2">
              <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-white/90 drop-shadow-xs">${escapeHtml(art.category)} Spec</span>
            </div>
          ` : '')}

          <div class="flex items-center justify-between text-xs font-mono">
            <span class="px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#C4BCB2] text-[#8C8378] font-bold uppercase text-[10px]">
              ${escapeHtml(art.category)}
            </span>
            <div class="flex items-center gap-2 text-[#8C8378]">
              <span>${escapeHtml(art.date)}</span>
              ${canDelete ? `
                <button
                  onclick="deleteArticle('${art.id}')"
                  class="text-rose-700 hover:text-rose-900 font-bold hover:underline cursor-pointer ml-1"
                  title="Delete article"
                >
                  Delete
                </button>
              ` : ''}
            </div>
          </div>

          <h3 class="text-xl ${fontClass} text-[#2B2A28] leading-tight">
            ${escapeHtml(art.title)}
          </h3>

          <p class="text-xs text-[#2B2A28]/85 leading-relaxed font-sans">
            ${escapeHtml(art.summary)}
          </p>

          ${takeaways.length > 0 ? `
            <div class="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#C4BCB2]/70 space-y-1">
              <div class="text-[9px] font-mono uppercase font-bold text-[#8C8378]">Key Deliverables &amp; Takeaways (${takeaways.length}):</div>
              <p class="text-[11px] text-[#2B2A28] font-mono truncate">&check; ${escapeHtml(takeaways[0])}${takeaways.length > 1 ? ` +${takeaways.length - 1} more` : ''}</p>
            </div>
          ` : ''}

          ${art.tags && art.tags.length > 0 ? `
            <div class="flex flex-wrap gap-1.5 pt-1">
              ${art.tags.map(t => `<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FAF7F2] border border-[#C4BCB2] text-[#55504A]">#${escapeHtml(t)}</span>`).join('')}
            </div>
          ` : ''}
        </div>

        <div class="mt-6 pt-4 border-t border-[#C4BCB2] flex items-center justify-between">
          <div class="text-xs font-mono text-[#8C8378]">
            By <strong class="text-[#2B2A28]">${escapeHtml(art.author)}</strong>
          </div>
          <div class="flex items-center gap-2">
            <button
              onclick="upvoteArticle('${art.id}')"
              class="px-2.5 py-1.5 rounded-xl text-xs font-mono bg-[#FAF7F2] border border-[#C4BCB2] text-[#2B2A28] hover:border-[#2B2A28] transition-colors flex items-center gap-1 cursor-pointer"
              title="Upvote article"
            >
              <span>▲</span>
              <span>${art.upvotes || 0}</span>
            </button>
            <button
              onclick="openArticleModal('${art.id}')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378] transition-colors cursor-pointer"
            >
              Read &rarr;
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Filter Articles
window.filterArticles = function(category) {
  activeArticleFilter = category;
  document.querySelectorAll('.art-filter-btn').forEach(btn => {
    if (btn.getAttribute('data-cat') === category) {
      btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] shadow-2xs art-filter-btn';
    } else {
      btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-mono bg-[#F0EBE3] text-[#2B2A28] border border-[#C4BCB2] hover:bg-[#FAF7F2] art-filter-btn';
    }
  });
  loadArticles();
};

// Search Articles
window.handleArticleSearch = function(query) {
  articleSearchQuery = query.trim();
  loadArticles();
};

// Upvote Article
window.upvoteArticle = async function(id) {
  try {
    const res = await fetch(`/api/articles/${encodeURIComponent(id)}/upvote`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      const art = articles.find(a => a.id === id);
      if (art) {
        art.upvotes = data.article.upvotes;
      }
      renderArticlesGrid();
    }
  } catch (err) {
    console.error('Error upvoting article:', err);
  }
};

// Handle Article Submit
window.handleArticleSubmit = async function(event) {
  event.preventDefault();
  let author = document.getElementById('art-author')?.value.trim();
  let role = document.getElementById('art-role')?.value.trim() || 'Contributor';
  const category = document.getElementById('art-category')?.value || 'Architecture';
  const title = document.getElementById('art-title')?.value.trim();
  const summary = document.getElementById('art-summary')?.value.trim();
  const body = document.getElementById('art-content')?.value.trim();
  const tagsRaw = document.getElementById('art-tags')?.value.trim() || '';
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const theme = document.getElementById('art-theme')?.value || 'paper';
  const fontStyle = document.getElementById('art-font')?.value || 'serif';
  const bannerStyle = document.getElementById('art-banner-style')?.value || 'none';
  const bannerImageUrl = document.getElementById('art-banner-img')?.value.trim();
  const takeaways = (document.getElementById('art-takeaways')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  const discussionPrompt = document.getElementById('art-prompt')?.value.trim();

  const customization = {
    theme,
    fontStyle,
    bannerStyle,
    bannerImageUrl,
    takeaways,
    discussionPrompt
  };

  if (!title || !summary || !body) return;

  if (currentUser) {
    if (!author) author = currentUser.profile?.displayName || currentUser.user.username;
    if (!role) role = currentUser.profile?.headline || 'Contributor';
  } else {
    if (!author) author = 'Community Contributor';
  }

  try {
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ author, role, category, title, summary, body, tags, customization })
    });

    if (res.ok) {
      toggleElement('publish-article-form');
      event.target.reset();
      loadArticles();
    } else {
      const data = await res.json();
      throw new Error(data.error || 'Failed to publish article.');
    }
  } catch (err) {
    alert(err.message);
  }
};

// Delete Article
window.deleteArticle = async function(id) {
  if (!confirm('Are you sure you want to delete this technical article?')) return;

  try {
    const res = await fetch(`/api/articles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete article.');
    }

    loadArticles();
  } catch (err) {
    alert(err.message);
  }
};

// Open Article Modal
window.openArticleModal = function(id) {
  const art = articles.find(a => a.id === id);
  if (!art) return;

  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  const cust = art.customization || {};
  const readerTheme = cust.theme || 'paper';
  const readerFont = cust.fontStyle || 'serif';
  const bannerStyle = cust.bannerStyle || 'none';
  const bannerImg = cust.bannerImageUrl;
  const takeaways = cust.takeaways || [];
  const prompt = cust.discussionPrompt;

  // Atmosphere palette
  let bgModal = 'bg-[#FAF7F2]';
  let bgHeader = 'bg-[#F0EBE3]';
  let textColor = 'text-[#2B2A28]';
  let subColor = 'text-[#8C8378]';
  let borderColor = 'border-[#C4BCB2]';

  if (readerTheme === 'dark') {
    bgModal = 'bg-[#18181B]';
    bgHeader = 'bg-[#27272A]';
    textColor = 'text-[#F4F4F5]';
    subColor = 'text-[#A1A1AA]';
    borderColor = 'border-[#3F3F46]';
  } else if (readerTheme === 'sepia') {
    bgModal = 'bg-[#F4ECD8]';
    bgHeader = 'bg-[#EADFBE]';
    textColor = 'text-[#433422]';
    subColor = 'text-[#8C7657]';
    borderColor = 'border-[#D9CCA8]';
  } else if (readerTheme === 'minimal') {
    bgModal = 'bg-white';
    bgHeader = 'bg-gray-50';
    textColor = 'text-gray-900';
    subColor = 'text-gray-500';
    borderColor = 'border-gray-200';
  }

  let fontClass = 'font-serif';
  if (readerFont === 'sans') fontClass = 'font-sans';
  else if (readerFont === 'mono') fontClass = 'font-mono text-sm leading-relaxed';

  // Render article reader directly
  modalContainer.innerHTML = `
    <div class="fixed inset-0 z-50 bg-[#2B2A28]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div class="w-full max-w-2xl rounded-3xl ${bgModal} border ${borderColor} shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        ${bannerImg ? `
          <div class="w-full h-40 overflow-hidden border-b ${borderColor}">
            <img src="${escapeHtml(bannerImg)}" alt="${escapeHtml(art.title)}" class="w-full h-full object-cover" />
          </div>
        ` : (bannerStyle !== 'none' ? `
          <div class="w-full h-20 banner-mesh-${escapeHtml(bannerStyle)} flex items-center px-6 border-b ${borderColor}">
            <span class="text-xs font-mono font-bold uppercase tracking-wider text-white drop-shadow-xs">${escapeHtml(art.category)} Technical Publication</span>
          </div>
        ` : '')}

        <div class="p-6 ${bgHeader} border-b ${borderColor} flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-mono uppercase tracking-wider ${subColor} font-bold">
                ${escapeHtml(art.category)}
              </span>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold border ${borderColor} ${subColor}">
                Atmosphere: ${readerTheme} &bull; ${readerFont}
              </span>
            </div>
            <h3 class="text-xl sm:text-2xl ${fontClass} font-bold ${textColor} mt-1.5 leading-snug">
              ${escapeHtml(art.title)}
            </h3>
          </div>
          <button onclick="closeModal()" class="w-8 h-8 rounded-full bg-white/20 border ${borderColor} flex items-center justify-center text-sm font-bold ${subColor} hover:${textColor} cursor-pointer">
            &times;
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm ${textColor}/90 leading-relaxed flex-1">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b ${borderColor} text-xs font-mono ${subColor}">
            <div class="flex items-center gap-2">
              <span class="font-bold ${textColor}">${escapeHtml(art.author)} (${escapeHtml(art.role || 'Author')})</span>
              <span>&bull;</span>
              <span>${art.date}</span>
            </div>
            <button onclick="upvoteArticle('${art.id}')" class="px-2.5 py-1 rounded-lg border ${borderColor} text-xs font-mono font-bold ${textColor} hover:border-[#2B2A28] flex items-center gap-1 cursor-pointer">
              <span>▲ Helpful (${art.upvotes || 0})</span>
            </button>
          </div>

          ${takeaways.length > 0 ? `
            <div class="p-4 rounded-2xl border ${borderColor} space-y-2 bg-black/5 dark:bg-white/5">
              <div class="text-[10px] font-mono uppercase font-bold tracking-wider ${subColor}">
                📌 Key Architecture Deliverables &amp; Takeaways:
              </div>
              <ul class="space-y-1 text-xs font-mono ${textColor}">
                ${takeaways.map(t => `<li class="flex items-start gap-2"><span>&check;</span><span>${escapeHtml(t)}</span></li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${art.tags && art.tags.length > 0 ? `
            <div class="flex flex-wrap gap-1.5 pb-2">
              ${art.tags.map(t => `<span class="px-2 py-0.5 rounded text-[10px] font-mono border ${borderColor} ${subColor}">#${escapeHtml(t)}</span>`).join('')}
            </div>
          ` : ''}

          <div class="space-y-3 whitespace-pre-line ${textColor} ${fontClass} text-sm sm:text-base leading-relaxed">
            ${escapeHtml(art.body)}
          </div>

          ${prompt ? `
            <div class="p-4 rounded-2xl border border-amber-600/40 bg-amber-500/10 space-y-1.5">
              <div class="text-[10px] font-mono uppercase font-bold text-amber-700 dark:text-amber-300">
                💬 Author's Architectural Challenge / Discussion Prompt:
              </div>
              <p class="text-xs sm:text-sm italic ${textColor}">
                &ldquo;${escapeHtml(prompt)}&rdquo;
              </p>
            </div>
          ` : ''}
        </div>

        <div class="p-4 ${bgHeader} border-t ${borderColor} flex items-center justify-between">
          <a
            href="https://wa.me/255628726374?text=Hello%20Ibrahim%2C%20I%20read%20the%20article%20${encodeURIComponent(art.title)}"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
          >
            <span>Discuss with Author on WhatsApp &rarr;</span>
          </a>
          <button
            onclick="closeModal()"
            class="px-4 py-2 rounded-xl text-xs font-mono border ${borderColor} hover:bg-black/5 cursor-pointer ${textColor}"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  `;
};

// Wire the real asynchronous API-backed project submit handler
window.handleProjectModalSubmit = handleProjectModalSubmit;

// -------------------------------------------------------------
// STAGE 5: SYSTEM CUSTOMIZATION, THEMES & TYPOGRAPHY STUDIO
// -------------------------------------------------------------
window.openThemeModal = async function() {
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  try {
    const res = await fetch('/partials/theme-modal.html');
    modalContainer.innerHTML = await res.text();
    updateThemeModalActiveStates();
  } catch (err) {
    console.error('Error opening theme modal:', err);
  }
};

window.previewAndSelectTheme = function(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('proofolio_theme', themeName);
  updateThemeModalActiveStates();
};

window.previewAndSelectFont = function(fontName) {
  document.documentElement.setAttribute('data-font', fontName);
  localStorage.setItem('proofolio_font', fontName);
  updateThemeModalActiveStates();
};

window.previewAndSelectAccent = function(colorHex) {
  document.documentElement.style.setProperty('--paper-accent', colorHex);
  localStorage.setItem('proofolio_accent', colorHex);
};

window.updateThemeModalActiveStates = function() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('proofolio_theme') || 'editorial';
  const currentFont = document.documentElement.getAttribute('data-font') || localStorage.getItem('proofolio_font') || 'serif';

  ['editorial', 'minimalist', 'cyber', 'nord', 'sepia', 'contrast'].forEach(t => {
    const btn = document.getElementById(`theme-btn-${t}`);
    if (btn) {
      if (t === currentTheme) {
        btn.classList.add('ring-2', 'ring-[#2B2A28]', 'scale-[1.02]');
        btn.classList.remove('opacity-75');
      } else {
        btn.classList.remove('ring-2', 'ring-[#2B2A28]', 'scale-[1.02]');
        btn.classList.add('opacity-75');
      }
    }
  });

  ['serif', 'sans', 'mono', 'classical'].forEach(f => {
    const btn = document.getElementById(`font-btn-${f}`);
    if (btn) {
      if (f === currentFont) {
        btn.classList.add('border-[#2B2A28]', 'ring-1', 'ring-[#2B2A28]');
      } else {
        btn.classList.remove('border-[#2B2A28]', 'ring-1', 'ring-[#2B2A28]');
      }
    }
  });
};

window.saveThemeToProfile = async function() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'editorial';
  const currentFont = document.documentElement.getAttribute('data-font') || 'serif';
  const currentAccent = localStorage.getItem('proofolio_accent') || '#2B2A28';

  const btn = document.getElementById('theme-save-profile-btn');
  if (btn) {
    btn.innerHTML = '<span>Saving to Profile...</span>';
    btn.disabled = true;
  }

  if (currentUser) {
    try {
      const res = await fetch('/api/profiles/me/theme', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          theme: currentTheme,
          fontStyle: currentFont,
          accentColor: currentAccent
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (currentUser.profile) {
          currentUser.profile.themeConfig = data.themeConfig;
        }
        if (btn) {
          btn.innerHTML = '<span>Saved to Profile! &check;</span>';
          btn.classList.add('bg-emerald-800');
        }
        setTimeout(() => closeModal(), 700);
        return;
      }
    } catch (err) {
      console.warn('Could not save theme to profile:', err);
    }
  }

  if (btn) {
    btn.innerHTML = '<span>Saved to Browser! &check;</span>';
  }
  setTimeout(() => closeModal(), 600);
};

window.resetThemeToDefault = function() {
  document.documentElement.setAttribute('data-theme', 'editorial');
  document.documentElement.setAttribute('data-font', 'serif');
  document.documentElement.style.removeProperty('--paper-accent');
  localStorage.removeItem('proofolio_theme');
  localStorage.removeItem('proofolio_font');
  localStorage.removeItem('proofolio_accent');
  updateThemeModalActiveStates();
};

window.applySystemTheme = function(config) {
  if (!config) return;
  if (config.theme) {
    document.documentElement.setAttribute('data-theme', config.theme);
    localStorage.setItem('proofolio_theme', config.theme);
  }
  if (config.fontStyle) {
    document.documentElement.setAttribute('data-font', config.fontStyle);
    localStorage.setItem('proofolio_font', config.fontStyle);
  }
  if (config.accentColor) {
    document.documentElement.style.setProperty('--paper-accent', config.accentColor);
    localStorage.setItem('proofolio_accent', config.accentColor);
  }
};

// Custom Portfolio Builder
window.handleSaveCustomPortfolio = function(event) {
  event.preventDefault();
  const name = document.getElementById('cust-name')?.value.trim();
  const headline = document.getElementById('cust-headline')?.value.trim();
  const phone = document.getElementById('cust-phone')?.value.trim();
  const email = document.getElementById('cust-email')?.value.trim();
  const bio = document.getElementById('cust-bio')?.value.trim();
  const projTitle = document.getElementById('cust-proj-title')?.value.trim();
  const projUrl = document.getElementById('cust-proj-url')?.value.trim();
  const projDesc = document.getElementById('cust-proj-desc')?.value.trim();
  const skills = document.getElementById('cust-skills')?.value.trim();

  const customPortfolio = {
    name,
    headline,
    phone,
    email,
    bio,
    projTitle,
    projUrl,
    projDesc,
    skills
  };

  setStoredData('ik_custom_portfolio', customPortfolio);
  renderCustomPortfolioPreview(customPortfolio);
  alert('Your portfolio has been saved and generated! Click "View as Active Portfolio" to preview.');
};

function renderCustomPortfolioPreview(p) {
  if (!p) return;
  const nameEl = document.getElementById('preview-name');
  const avatarEl = document.getElementById('preview-avatar');
  const headlineEl = document.getElementById('preview-headline');
  const bioEl = document.getElementById('preview-bio');
  const projTitleEl = document.getElementById('preview-proj-title');
  const projDescEl = document.getElementById('preview-proj-desc');
  const projUrlEl = document.getElementById('preview-proj-url');
  const phoneEl = document.getElementById('preview-phone');
  const emailEl = document.getElementById('preview-email');

  if (nameEl) nameEl.textContent = p.name || 'Your Name';
  if (avatarEl) {
    const initials = (p.name || 'YOU').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }
  if (headlineEl) headlineEl.textContent = p.headline || 'Your Professional Headline';
  if (bioEl) bioEl.textContent = p.bio || 'Your bio will appear here.';
  if (projTitleEl) projTitleEl.textContent = p.projTitle || 'Sample Project';
  if (projDescEl) projDescEl.textContent = p.projDesc || 'Project description';
  if (projUrlEl) projUrlEl.textContent = p.projUrl || 'https://yourwebsite.com';
  if (phoneEl) phoneEl.textContent = `Phone: ${p.phone || 'Pending'}`;
  if (emailEl) emailEl.textContent = `Email: ${p.email || 'Pending'}`;
}

function renderPreviewFromStorage() {
  const custom = getStoredData('ik_custom_portfolio', null);
  if (custom) {
    renderCustomPortfolioPreview(custom);
  }
}

window.loadDemoCustomPortfolio = function() {
  const demo = {
    name: 'Sarah Kimario',
    headline: 'FinTech Backend Engineer & API Architect',
    phone: '0754123456',
    email: 'sarah@kimaro.dev',
    bio: 'Specialized in ultra-low latency transaction processing, PostgreSQL replication, and building reliable microservices for East African business applications.',
    projTitle: 'FastLipa Gateway',
    projUrl: 'https://fastlipa.demo',
    projDesc: 'High-throughput payment orchestration bridge for mobile money and bank accounts with automatic reconciliation.',
    skills: 'Go, PostgreSQL, Redis, HTMX, Docker'
  };

  const nameInput = document.getElementById('cust-name');
  if (nameInput) {
    nameInput.value = demo.name;
    document.getElementById('cust-headline').value = demo.headline;
    document.getElementById('cust-phone').value = demo.phone;
    document.getElementById('cust-email').value = demo.email;
    document.getElementById('cust-bio').value = demo.bio;
    document.getElementById('cust-proj-title').value = demo.projTitle;
    document.getElementById('cust-proj-url').value = demo.projUrl;
    document.getElementById('cust-proj-desc').value = demo.projDesc;
    document.getElementById('cust-skills').value = demo.skills;
    renderCustomPortfolioPreview(demo);
  }
};

window.activateCustomPortfolio = function() {
  const custom = getStoredData('ik_custom_portfolio', null);
  if (!custom) {
    alert('Please fill in and save your portfolio details first!');
    return;
  }

  const main = document.getElementById('main-content');
  if (!main) return;

  const initials = (custom.name || 'YOU').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  main.innerHTML = `
    <div class="space-y-16 animate-fade-in">
      <section class="py-12 border-b border-[#C4BCB2]">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div class="lg:col-span-8 space-y-6">
              <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium tracking-wide uppercase bg-[#F0EBE3] border border-[#C4BCB2] text-[#8C8378]">
                <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>Custom Created Portfolio &bull; Published Online</span>
              </div>
              <h1 class="text-4xl sm:text-5xl font-serif font-bold text-[#2B2A28]">
                ${escapeHtml(custom.name)}
              </h1>
              <p class="text-lg text-[#8C8378] font-mono">
                ${escapeHtml(custom.headline)}
              </p>
              <p class="text-sm sm:text-base text-[#2B2A28]/85 max-w-2xl leading-relaxed">
                ${escapeHtml(custom.bio || 'Professional engineering and digital solutions.')}
              </p>

              <div class="flex flex-wrap items-center gap-3 pt-2">
                <a href="tel:${custom.phone}" class="px-6 py-3 rounded-xl font-bold text-xs bg-[#2B2A28] text-[#FAF7F2] flex items-center gap-2">
                  <span>Call: ${escapeHtml(custom.phone)}</span>
                </a>
                <a href="mailto:${custom.email}" class="px-5 py-3 rounded-xl font-medium text-xs bg-[#F0EBE3] text-[#2B2A28] border border-[#C4BCB2]">
                  <span>Email: ${escapeHtml(custom.email)}</span>
                </a>
                <button
                  onclick="exportCustomPortfolioPdf()"
                  class="px-4 py-3 rounded-xl font-mono font-bold text-xs bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                  <span>Export as PDF</span>
                </button>
                <button
                  hx-get="/partials/portfolio.html"
                  hx-target="#main-content"
                  hx-swap="innerHTML"
                  class="px-4 py-3 rounded-xl font-mono text-xs text-[#2B2A28] bg-[#FAF7F2] border border-[#C4BCB2] hover:bg-[#E7E0D6] cursor-pointer"
                >
                  &larr; Switch Back to Ibrahim's Portfolio
                </button>
              </div>
            </div>

            <div class="lg:col-span-4 p-6 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] space-y-4 shadow-sm">
              <div class="w-14 h-14 rounded-2xl bg-[#2B2A28] text-[#FAF7F2] flex items-center justify-center font-serif font-bold text-2xl">
                ${initials}
              </div>
              <div class="font-serif font-bold text-xl text-[#2B2A28]">${escapeHtml(custom.name)}</div>
              <div class="text-xs font-mono text-[#8C8378]">Skills: ${escapeHtml(custom.skills || 'Software Systems')}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Featured Custom Project -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <h2 class="text-2xl font-serif font-bold text-[#2B2A28]">Featured Project</h2>
        <div class="p-6 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] max-w-xl space-y-3">
          <div class="font-serif font-bold text-xl text-[#2B2A28]">${escapeHtml(custom.projTitle)}</div>
          <p class="text-xs text-[#2B2A28]/80">${escapeHtml(custom.projDesc)}</p>
          <div class="pt-2">
            <a href="${custom.projUrl}" target="_blank" class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] inline-flex items-center gap-1.5">
              <span>Visit Website</span> &rarr;
            </a>
          </div>
        </div>
      </section>
    </div>
  `;
};

// Global Helpers
window.toggleElement = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
};

window.closeModal = function() {
  const modalContainer = document.getElementById('modal-container');
  if (modalContainer) modalContainer.innerHTML = '';
};

// Chat Helpers
window.sendQuickChatMessage = function(msg) {
  const input = document.getElementById('chat-input');
  if (input) {
    input.value = msg;
    handleChatMessageSubmit(new Event('submit'));
  }
};

window.handleChatMessageSubmit = function(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('chat-input');
  const container = document.getElementById('chat-messages-container');
  if (!input || !container) return;

  const msg = input.value.trim();
  if (!msg) return;

  // Add user message
  const userMsgHtml = `
    <div class="flex justify-end">
      <div class="p-3 rounded-2xl bg-[#2B2A28] text-[#FAF7F2] max-w-[82%] leading-relaxed">
        <p>${escapeHtml(msg)}</p>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', userMsgHtml);
  input.value = '';
  container.scrollTop = container.scrollHeight;

  // Simulate prompt-matched response from Ibrahim
  setTimeout(() => {
    let reply = "Thank you for your message! For an immediate quote or technical blueprint, feel free to call or WhatsApp me at 0628726374.";
    const lower = msg.toLowerCase();
    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
      reply = "Our custom business systems range from TZS 450,000 for high-speed business showcase portals to TZS 1,800,000+ for complete ERP, multi-tenant property management, and billing suites. WhatsApp me at 0628726374 for exact scoping.";
    } else if (lower.includes('mpesa') || lower.includes('m-pesa') || lower.includes('payment')) {
      reply = "Yes! We build automated M-Pesa C2B and B2C webhook integrations with instant receipt generation, SMS alerts, and double-booking race condition prevention.";
    } else if (lower.includes('fast') || lower.includes('timeline') || lower.includes('speed')) {
      reply = "Production MVP systems are typically designed, tested, and deployed in 3 to 7 business days with pure HTML + HTMX and clean Go/PostgreSQL architectures.";
    }

    const replyHtml = `
      <div class="flex gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-[#2B2A28] text-[#FAF7F2] flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
          IK
        </div>
        <div class="p-3 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] text-[#2B2A28] max-w-[82%] leading-relaxed">
          <p>${escapeHtml(reply)}</p>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', replyHtml);
    container.scrollTop = container.scrollHeight;
  }, 450);
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Resume Plain Text Copy Utility
window.copyResumePlainText = function() {
  const text = `IBRAHIM KIMARO — SYSTEMS ENGINEER & FULL-STACK ARCHITECT
Location: Dar es Salaam, Tanzania
Phone: 0628726374 | Email: ibrahimkimaro01@gmail.com
WhatsApp: +255 628 726 374
Verified Portals: https://panga.kimaro.dev | https://tna.kimaro.dev | https://kilimo.kimaro.dev

EXECUTIVE SUMMARY
Systems engineer specialized in high-performance web architecture, resilient transaction processing, and zero-bloat hypermedia platforms. Proven track record designing and launching production multi-tenant platforms, low-latency logistics dashboards operable over 3G cellular connections, and automated mobile money payment reconciliation engines.

CORE TECHNICAL ARSENAL
- Web & Hypermedia: Pure HTML5, HTMX 2.0, CSS3 / Tailwind CSS, Zero-Bloat SPA Replacements, Sub-50ms Render Payloads.
- Backend & Concurrency: Go (Goroutines, Channels), Node.js / TypeScript, POSIX Shell Scripting, REST APIs, Webhooks, Idempotency.
- Databases: PostgreSQL (Row-Level Security, Partitioning, PgBouncer), Redis Caching, SQLite, ACID Ledger Transactions.
- FinTech & Infra: M-Pesa Daraja C2B/B2C, Airtel Money, Linux (Debian, Ubuntu), Docker, Nginx, Cloud Run.

VERIFIED PRODUCTION SYSTEMS
1. Panga na Kupangisha (https://panga.kimaro.dev)
   Multi-tenant property management platform with PostgreSQL Row-Level Security ensuring 100% data boundary isolation. Automated rent collection, lease lifecycle tracking, and penalty calculations.
2. TNA Enterprise Logistics (https://tna.kimaro.dev)
   Real-time freight and fleet dispatch ledger. Slashed initial page load time from 12.4s to under 240ms on 3G transit corridors using pure hypermedia.
3. Kilimo Market Telemetry (https://kilimo.kimaro.dev)
   Agricultural commodity price tracking system across major Tanzanian markets with real-time price feeds for producers.

PROFESSIONAL EXPERIENCE
- Principal Systems Architect & Technical Consultant | Kimaro Systems Studio (2023 - Present)
- Senior Full-Stack & Integration Engineer | FinTech Solutions East Africa (2021 - 2023)

EDUCATION
- B.Sc. in Computer Science / Software Engineering — Dar es Salaam, Tanzania.`;

  navigator.clipboard.writeText(text).then(() => {
    const label = document.getElementById('copy-btn-label');
    if (label) {
      const orig = label.textContent;
      label.textContent = 'Copied!';
      setTimeout(() => { label.textContent = orig; }, 2000);
    }
  }).catch(() => {
    alert('Resume text copied to clipboard!');
  });
};

// Export Custom Generated Portfolio to Formatted PDF
window.exportCustomPortfolioPdf = function() {
  let custom = getStoredData('ik_custom_portfolio', null);
  if (!custom) {
    const name = document.getElementById('cust-name')?.value.trim();
    if (name) {
      custom = {
        name,
        headline: document.getElementById('cust-headline')?.value.trim() || 'Software Engineer',
        phone: document.getElementById('cust-phone')?.value.trim() || 'Pending',
        email: document.getElementById('cust-email')?.value.trim() || 'Pending',
        bio: document.getElementById('cust-bio')?.value.trim() || '',
        projTitle: document.getElementById('cust-proj-title')?.value.trim() || 'Featured Project',
        projUrl: document.getElementById('cust-proj-url')?.value.trim() || 'https://example.com',
        projDesc: document.getElementById('cust-proj-desc')?.value.trim() || '',
        skills: document.getElementById('cust-skills')?.value.trim() || 'Web Systems'
      };
    }
  }

  if (!custom || !custom.name) {
    alert('Please enter your portfolio details first before exporting to PDF!');
    return;
  }

  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  const initials = (custom.name || 'YOU').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  modalContainer.innerHTML = `
    <div class="fixed inset-0 z-50 bg-[#2B2A28]/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div class="w-full max-w-3xl rounded-2xl bg-white border border-[#C4BCB2] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        
        <!-- Top Actions Strip -->
        <div class="p-4 bg-[#F0EBE3] border-b border-[#C4BCB2] flex items-center justify-between no-print">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span class="text-xs font-mono font-bold text-[#2B2A28]">Custom Portfolio &bull; A4 PDF Preview</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              onclick="window.print()"
              class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <svg class="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              <span>Print / Save as PDF</span>
            </button>
            <button onclick="closeModal()" class="px-3 py-1.5 rounded-xl text-xs font-mono bg-[#FAF7F2] border border-[#C4BCB2] hover:bg-[#E7E0D6] cursor-pointer">
              Close
            </button>
          </div>
        </div>

        <!-- Printable Document Body -->
        <div class="p-8 sm:p-12 overflow-y-auto space-y-6 text-[#1A1918] bg-white print-surface">
          <header class="border-b-2 border-[#1A1918] pb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
            <div>
              <h1 class="text-3xl font-serif font-bold text-[#1A1918]">${escapeHtml(custom.name)}</h1>
              <p class="text-sm font-mono text-[#55504A] mt-1">${escapeHtml(custom.headline)}</p>
            </div>
            <div class="text-xs font-mono text-[#55504A] sm:text-right space-y-0.5">
              <div><strong>Phone:</strong> ${escapeHtml(custom.phone)}</div>
              <div><strong>Email:</strong> ${escapeHtml(custom.email)}</div>
            </div>
          </header>

          <section class="space-y-2">
            <h2 class="text-xs font-mono uppercase tracking-wider font-bold text-[#776F65] border-b border-[#E5E0D8] pb-1">
              Professional Biography
            </h2>
            <p class="text-xs sm:text-sm text-[#2B2A28] leading-relaxed">
              ${escapeHtml(custom.bio || 'Professional engineering specialist with expertise in building reliable applications and digital services.')}
            </p>
          </section>

          <section class="space-y-3">
            <h2 class="text-xs font-mono uppercase tracking-wider font-bold text-[#776F65] border-b border-[#E5E0D8] pb-1">
              Featured Case Study &amp; System
            </h2>
            <div class="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5E0D8] space-y-2">
              <div class="flex items-baseline justify-between">
                <h3 class="font-serif font-bold text-base text-[#1A1918]">${escapeHtml(custom.projTitle)}</h3>
                <a href="${custom.projUrl}" target="_blank" class="text-xs font-mono font-bold text-emerald-800 underline">${escapeHtml(custom.projUrl)}</a>
              </div>
              <p class="text-xs text-[#55504A] leading-relaxed">${escapeHtml(custom.projDesc)}</p>
            </div>
          </section>

          <section class="space-y-2">
            <h2 class="text-xs font-mono uppercase tracking-wider font-bold text-[#776F65] border-b border-[#E5E0D8] pb-1">
              Core Technical Skills
            </h2>
            <div class="text-xs font-mono text-[#2B2A28] flex flex-wrap gap-2">
              ${(custom.skills || 'Web Development, Systems Architecture').split(',').map(s => `<span class="px-2.5 py-1 rounded bg-[#FAF7F2] border border-[#E5E0D8]">${escapeHtml(s.trim())}</span>`).join('')}
            </div>
          </section>

          <footer class="pt-4 border-t border-[#E5E0D8] flex items-center justify-between text-[11px] font-mono text-[#776F65]">
            <div>Created via Ibrahim Kimaro Portfolio Studio</div>
            <div>Direct Contact: ${escapeHtml(custom.phone)} &bull; ${escapeHtml(custom.email)}</div>
          </footer>
        </div>

      </div>
    </div>
  `;
};

// =============================================================
// PROOFOLIO STAGE 4: CLIENT INQUIRIES, PROPOSALS & CONTRACTS
// =============================================================

function renderDashboardInquiries(inquiries) {
  const container = document.getElementById('dash-inquiries-list');
  if (!container) return;

  if (!inquiries || inquiries.length === 0) {
    container.innerHTML = `
      <div class="p-8 rounded-2xl bg-[#F0EBE3] border border-[#C4BCB2] text-center space-y-3">
        <div class="w-10 h-10 rounded-full bg-[#FAF7F2] border border-[#C4BCB2] mx-auto flex items-center justify-center text-lg">
          💼
        </div>
        <h4 class="font-serif font-bold text-base text-[#2B2A28]">No Client Inquiries Received Yet</h4>
        <p class="text-xs font-mono text-[#8C8378] max-w-md mx-auto">
          Stage 4 allows clients, founders, and recruiters to commission you or request engineering proposals directly from your public portfolio.
        </p>
        <div class="flex items-center justify-center gap-2 pt-1">
          <button
            onclick="openInquiryModal('ibrahim', 'Ibrahim Kimaro')"
            class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378] transition-colors cursor-pointer"
          >
            Test Inquiry Form
          </button>
          <button
            onclick="openOpportunitiesView()"
            class="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#FAF7F2] text-[#2B2A28] border border-[#C4BCB2] hover:border-[#2B2A28] transition-colors cursor-pointer"
          >
            Browse Contracts Board
          </button>
        </div>
      </div>
    `;
    return;
  }

  const statusColors = {
    new: 'bg-amber-100 text-amber-900 border-amber-300',
    in_discussion: 'bg-blue-100 text-blue-900 border-blue-300',
    proposal_sent: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    contract_active: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    completed: 'bg-emerald-200 text-emerald-950 border-emerald-400',
    declined: 'bg-zinc-100 text-zinc-700 border-zinc-300'
  };

  const statusLabels = {
    new: 'New Inquiry',
    in_discussion: 'In Discussion',
    proposal_sent: 'Proposal Sent',
    contract_active: 'Contract Active',
    completed: 'Completed',
    declined: 'Declined'
  };

  container.innerHTML = inquiries.map(inq => {
    const statusClass = statusColors[inq.status] || 'bg-zinc-100 text-zinc-800';
    const statusLabel = statusLabels[inq.status] || inq.status;
    const cleanPhone = (inq.senderPhone || '').replace(/[^0-9]/g, '');

    return `
      <div class="p-5 sm:p-6 rounded-2xl bg-[#FAF7F2] border border-[#C4BCB2] space-y-4 hover:border-[#2B2A28] transition-all shadow-2xs">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${statusClass}">
                ${statusLabel}
              </span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#F0EBE3] border border-[#C4BCB2] text-[#2B2A28]">
                ${escapeHtml(inq.projectType)}
              </span>
              <span class="text-xs font-mono text-[#8C8378]">
                ${new Date(inq.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h3 class="font-serif font-bold text-base sm:text-lg text-[#2B2A28] mt-1.5">
              ${escapeHtml(inq.title)}
            </h3>
          </div>

          <div class="flex items-center gap-2">
            <select
              onchange="handleInquiryStatusChange('${inq.id}', this.value)"
              class="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#F0EBE3] border border-[#C4BCB2] text-[#2B2A28] focus:outline-none focus:border-[#2B2A28] cursor-pointer"
            >
              <option value="new" ${inq.status === 'new' ? 'selected' : ''}>Status: New</option>
              <option value="in_discussion" ${inq.status === 'in_discussion' ? 'selected' : ''}>Status: In Discussion</option>
              <option value="proposal_sent" ${inq.status === 'proposal_sent' ? 'selected' : ''}>Status: Proposal Sent</option>
              <option value="contract_active" ${inq.status === 'contract_active' ? 'selected' : ''}>Status: Contract Active</option>
              <option value="completed" ${inq.status === 'completed' ? 'selected' : ''}>Status: Completed</option>
              <option value="declined" ${inq.status === 'declined' ? 'selected' : ''}>Status: Declined</option>
            </select>

            <button
              onclick="deleteInquiry('${inq.id}')"
              class="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 hover:text-rose-900 transition-colors cursor-pointer"
              title="Delete Inquiry"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-[#F0EBE3] border border-[#C4BCB2] text-xs font-mono text-[#2B2A28] space-y-2">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-[#C4BCB2]/60 pb-2">
            <div>
              <span class="text-[#8C8378] text-[10px] block uppercase">Client / Sender:</span>
              <strong class="text-[#2B2A28]">${escapeHtml(inq.senderName)}</strong>
            </div>
            <div>
              <span class="text-[#8C8378] text-[10px] block uppercase">Estimated Budget:</span>
              <span class="font-bold text-amber-900">${escapeHtml(inq.budgetRange)}</span>
            </div>
            <div>
              <span class="text-[#8C8378] text-[10px] block uppercase">Target Delivery:</span>
              <span>${escapeHtml(inq.timeline)}</span>
            </div>
          </div>

          <div>
            <span class="text-[#8C8378] text-[10px] block uppercase mb-0.5">Problem / Architecture Scope:</span>
            <p class="text-xs text-[#2B2A28] leading-relaxed whitespace-pre-line font-sans">
              ${escapeHtml(inq.description)}
            </p>
          </div>
        </div>

        <!-- Direct Reply & Action Strip -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs font-mono">
          <div class="flex flex-wrap items-center gap-2">
            <a
              href="mailto:${escapeHtml(inq.senderEmail)}?subject=Re:%20${encodeURIComponent(inq.title)}&body=Hi%20${encodeURIComponent(inq.senderName)},%0D%0A%0D%0AThank%20you%20for%20reaching%20out%20via%20Proofolio.%20I%20have%20reviewed%20your%20project%20scope%20for%20'${encodeURIComponent(inq.title)}'...%0D%0A%0D%0ABest%20regards,%0D%0AIbrahim%20Kimaro"
              class="px-3 py-1.5 rounded-xl bg-[#2B2A28] text-[#FAF7F2] font-bold hover:bg-[#8C8378] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              <span>Email ${escapeHtml(inq.senderEmail)}</span>
            </a>

            ${cleanPhone ? `
              <a
                href="https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(inq.senderName)},%20I%20received%20your%20engineering%20consultation%20request%20on%20Proofolio%20regarding%20'${encodeURIComponent(inq.title)}'."
                target="_blank"
                class="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>WhatsApp ${escapeHtml(inq.senderPhone)}</span>
              </a>
            ` : ''}
          </div>

          <div class="text-[11px] text-[#8C8378]">
            Direct Stage 4 Contract SLA &bull; Verified Lead
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.openInquiryModal = async function(targetUsername, targetName, targetUserId) {
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  const tUsername = targetUsername || 'ibrahim';
  const tName = targetName || 'Ibrahim Kimaro';
  const tUserId = targetUserId || 'user_1';

  try {
    const res = await fetch('/partials/inquiry-modal.html');
    modalContainer.innerHTML = await res.text();

    const nameEl = document.getElementById('inquiry-target-name');
    if (nameEl) nameEl.textContent = `${tName} (@${tUsername})`;

    const uidInput = document.getElementById('inquiry-target-user-id');
    if (uidInput) uidInput.value = tUserId;

    const unameInput = document.getElementById('inquiry-target-username');
    if (unameInput) unameInput.value = tUsername;

    // Pre-fill if current user is logged in
    if (currentUser && currentUser.user) {
      const senderNameEl = document.getElementById('inquiry-sender-name');
      if (senderNameEl && !senderNameEl.value) {
        senderNameEl.value = currentUser.profile?.displayName || currentUser.user.username;
      }
      const senderEmailEl = document.getElementById('inquiry-sender-email');
      if (senderEmailEl && !senderEmailEl.value) {
        senderEmailEl.value = currentUser.user.email || '';
      }
    }
  } catch (err) {
    console.error('Error opening inquiry modal:', err);
  }
};

window.openInquiryModalForCurrentProfile = function() {
  const tName = currentViewingProfileData?.profile?.displayName || currentViewingUsername || 'Ibrahim Kimaro';
  const tUsername = currentViewingUsername || currentViewingProfileData?.username || 'ibrahim';
  const tUserId = currentViewingProfileData?.userId || currentViewingProfileData?.user?.id || 'user_1';
  openInquiryModal(tUsername, tName, tUserId);
};

window.handleInquirySubmit = async function(event) {
  event.preventDefault();

  const targetUserId = document.getElementById('inquiry-target-user-id')?.value;
  const targetUsername = document.getElementById('inquiry-target-username')?.value;
  const senderName = document.getElementById('inquiry-sender-name')?.value.trim();
  const senderEmail = document.getElementById('inquiry-sender-email')?.value.trim();
  const senderPhone = document.getElementById('inquiry-sender-phone')?.value.trim() || undefined;
  const projectType = document.getElementById('inquiry-project-type')?.value;
  const budgetRange = document.getElementById('inquiry-budget-range')?.value;
  const timeline = document.getElementById('inquiry-timeline')?.value;
  const title = document.getElementById('inquiry-title')?.value.trim();
  const description = document.getElementById('inquiry-description')?.value.trim();

  if (!senderName || !senderEmail || !title || !description) {
    alert('Please fill in all required fields marked with *');
    return;
  }

  try {
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
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
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit proposal inquiry.');
    }

    closeModal();
    alert('✅ Your engineering inquiry and consultation proposal has been submitted directly to the engineer! You will receive an email confirmation and can follow up via WhatsApp.');

    // If on dashboard, reload dashboard
    if (document.getElementById('dash-inquiries-list')) {
      openDashboardView();
    }
  } catch (err) {
    alert(err.message);
  }
};

window.handleInquiryStatusChange = async function(id, newStatus) {
  try {
    const res = await fetch(`/api/inquiries/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status.');
    openDashboardView();
  } catch (err) {
    alert(err.message);
  }
};

window.deleteInquiry = async function(id) {
  if (!confirm('Are you sure you want to remove this client inquiry?')) return;

  try {
    const res = await fetch(`/api/inquiries/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete inquiry.');
    openDashboardView();
  } catch (err) {
    alert(err.message);
  }
};

// =============================================================
// PROOFOLIO STAGE 4: ENGINEERING OPPORTUNITIES & CONTRACTS BOARD
// =============================================================

let opportunitiesList = [];
let activeOpportunityFilter = 'all';
let opportunitySearchQuery = '';

window.openOpportunitiesView = async function() {
  const main = document.getElementById('main-content');
  if (!main) return;

  try {
    const res = await fetch('/partials/opportunities.html');
    main.innerHTML = await res.text();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadOpportunities();
  } catch (err) {
    console.error('Error opening opportunities view:', err);
  }
};

window.loadOpportunities = async function() {
  const container = document.getElementById('opportunities-list');
  if (!container) return;

  try {
    let url = `/api/opportunities?category=${encodeURIComponent(activeOpportunityFilter)}`;
    if (opportunitySearchQuery) {
      url += `&q=${encodeURIComponent(opportunitySearchQuery)}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load opportunities.');

    const data = await res.json();
    opportunitiesList = data.opportunities || [];
    renderOpportunities();
  } catch (err) {
    console.error('Error loading opportunities:', err);
    container.innerHTML = `
      <div class="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono text-center">
        Failed to fetch opportunities. Please check connection.
      </div>
    `;
  }
};

window.renderOpportunities = function() {
  const container = document.getElementById('opportunities-list');
  const countEl = document.getElementById('opp-count');
  if (!container) return;

  if (countEl) {
    countEl.textContent = `${opportunitiesList.length} Active Opportunity${opportunitiesList.length === 1 ? '' : 'ies'}`;
  }

  if (opportunitiesList.length === 0) {
    container.innerHTML = `
      <div class="p-12 rounded-3xl bg-[#FAF7F2] border border-[#C4BCB2] text-center space-y-4">
        <div class="w-12 h-12 rounded-full bg-[#F0EBE3] border border-[#C4BCB2] mx-auto flex items-center justify-center text-xl">
          🔍
        </div>
        <h3 class="font-serif font-bold text-lg text-[#2B2A28]">No Opportunities Found</h3>
        <p class="text-xs font-mono text-[#8C8378] max-w-md mx-auto">
          No active gigs or contracts match this filter. Be the first to post a new project or contract RFP!
        </p>
        <button
          onclick="toggleElement('post-opportunity-box')"
          class="px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378] transition-colors cursor-pointer"
        >
          + Post an Opportunity
        </button>
      </div>
    `;
    return;
  }

  const categoryBadges = {
    'Contract': 'bg-amber-100 text-amber-900 border-amber-300',
    'Consulting': 'bg-blue-100 text-blue-900 border-blue-300',
    'Full-Time': 'bg-emerald-100 text-emerald-900 border-emerald-300',
    'Collaboration': 'bg-purple-100 text-purple-900 border-purple-300',
    'Security Audit': 'bg-rose-100 text-rose-900 border-rose-300'
  };

  container.innerHTML = opportunitiesList.map(opp => {
    const badgeClass = categoryBadges[opp.category] || 'bg-zinc-100 text-zinc-800 border-zinc-300';
    const isOwner = currentUser && currentUser.user && (currentUser.user.id === opp.creatorId || currentUser.user.role === 'admin');
    const hasApplied = currentUser && opp.applicants && opp.applicants.some(a => a.userId === currentUser.user.id);

    return `
      <div class="p-6 sm:p-7 rounded-3xl bg-[#FAF7F2] border border-[#C4BCB2] space-y-4 hover:border-[#2B2A28] transition-all shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badgeClass}">
                ${escapeHtml(opp.category)}
              </span>
              <span class="text-xs font-mono text-[#8C8378]">📍 ${escapeHtml(opp.location)}</span>
              <span class="text-xs font-mono text-[#8C8378]">&bull;</span>
              <span class="text-xs font-mono text-[#8C8378]">${new Date(opp.createdAt).toLocaleDateString()}</span>
            </div>

            <h3 class="text-lg sm:text-xl font-serif font-bold text-[#2B2A28]">
              ${escapeHtml(opp.title)}
            </h3>

            <div class="text-xs font-mono text-[#55504A] flex items-center gap-2">
              <span><strong>Company / Team:</strong> ${escapeHtml(opp.company || opp.creatorUsername || 'Direct Client')}</span>
              <span>&bull;</span>
              <span class="text-emerald-800 font-bold">Budget: ${escapeHtml(opp.budget)}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 self-start">
            ${isOwner ? `
              <button
                onclick="deleteOpportunity('${opp.id}')"
                class="px-3 py-1.5 rounded-xl text-xs font-mono text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              >
                Delete
              </button>
            ` : ''}
            <span class="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#F0EBE3] border border-[#C4BCB2] text-[#2B2A28]">
              ${opp.applicantsCount || 0} applicant${opp.applicantsCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <p class="text-xs sm:text-sm text-[#2B2A28]/90 font-sans leading-relaxed whitespace-pre-line">
          ${escapeHtml(opp.description)}
        </p>

        <!-- Required Skills Badges -->
        ${opp.skills && opp.skills.length > 0 ? `
          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            <span class="text-[10px] font-mono text-[#8C8378] uppercase font-bold mr-1">Required Skills:</span>
            ${opp.skills.map(s => `
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-[#F0EBE3] border border-[#C4BCB2] text-[#2B2A28]">
                ${escapeHtml(s)}
              </span>
            `).join('')}
          </div>
        ` : ''}

        <!-- Bottom Action Strip -->
        <div class="pt-3 border-t border-[#C4BCB2]/70 flex flex-wrap items-center justify-between gap-3">
          <div class="text-[11px] font-mono text-[#8C8378]">
            Posted by <button onclick="viewUserProfile('${escapeHtml(opp.creatorUsername)}')" class="font-bold text-[#2B2A28] hover:underline cursor-pointer">@${escapeHtml(opp.creatorUsername)}</button>
          </div>

          <div class="flex items-center gap-2.5">
            ${opp.contactUrl ? `
              <a
                href="${opp.contactUrl.startsWith('http') || opp.contactUrl.startsWith('mailto') ? escapeHtml(opp.contactUrl) : 'mailto:' + escapeHtml(opp.contactUrl)}"
                target="_blank"
                class="px-3 py-1.5 rounded-xl text-xs font-mono text-[#2B2A28] border border-[#C4BCB2] hover:bg-[#E7E0D6] transition-colors cursor-pointer"
              >
                External Link &rarr;
              </a>
            ` : ''}

            <button
              onclick="applyToOpportunity('${opp.id}', '${escapeHtml(opp.title)}')"
              class="px-4 py-2 rounded-xl text-xs font-mono font-bold ${
                hasApplied
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-[#2B2A28] text-[#FAF7F2] hover:bg-[#8C8378]'
              } transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span>${hasApplied ? '✓ Applied with Proofolio' : 'Apply with Proofolio'}</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

window.filterOpportunities = function(cat) {
  activeOpportunityFilter = cat;
  const buttons = document.querySelectorAll('.opp-filter-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-cat') === cat) {
      btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#2B2A28] text-[#FAF7F2] shadow-2xs opp-filter-btn';
    } else {
      btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-mono bg-[#F0EBE3] text-[#2B2A28] border border-[#C4BCB2] hover:bg-[#FAF7F2] opp-filter-btn';
    }
  });
  loadOpportunities();
};

let oppSearchTimer = null;
window.handleOpportunitySearch = function(query) {
  opportunitySearchQuery = query;
  clearTimeout(oppSearchTimer);
  oppSearchTimer = setTimeout(() => {
    loadOpportunities();
  }, 250);
};

window.handleCreateOpportunity = async function(event) {
  event.preventDefault();
  if (!currentUser) {
    openAuthModal('login', 'Please sign in to post a contract opportunity or RFP.');
    return;
  }

  const title = document.getElementById('opp-title')?.value.trim();
  const company = document.getElementById('opp-company')?.value.trim();
  const category = document.getElementById('opp-category')?.value;
  const budget = document.getElementById('opp-budget')?.value.trim();
  const location = document.getElementById('opp-location')?.value.trim();
  const description = document.getElementById('opp-description')?.value.trim();
  const skillsStr = document.getElementById('opp-skills')?.value.trim() || '';
  const skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
  const contactUrl = document.getElementById('opp-contact')?.value.trim();

  if (!title || !budget || !location || !description) {
    alert('Please complete all required fields.');
    return;
  }

  try {
    const res = await fetch('/api/opportunities', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title,
        company,
        category,
        budget,
        location,
        description,
        skills,
        contactUrl
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to post opportunity.');

    document.getElementById('post-opportunity-box')?.classList.add('hidden');
    alert('✅ Engineering opportunity published successfully!');
    loadOpportunities();
  } catch (err) {
    alert(err.message);
  }
};

window.applyToOpportunity = async function(id, title) {
  if (!currentUser) {
    openAuthModal('login', 'Please sign in with your Proofolio profile to submit your verified application.');
    return;
  }

  const note = prompt(`Apply to "${title}":\n\nAdd a brief cover note or pitch highlighting your relevant Proofolio projects & skills:`, 'I would love to collaborate on this architecture based on my verified Proofolio proof of work.');
  if (note === null) return; // cancelled

  try {
    const res = await fetch(`/api/opportunities/${encodeURIComponent(id)}/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ note })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to apply.');

    alert('✅ Application submitted successfully! Your verified Proofolio profile, skills, and projects were attached.');
    loadOpportunities();
  } catch (err) {
    alert(err.message);
  }
};

window.deleteOpportunity = async function(id) {
  if (!confirm('Are you sure you want to remove this opportunity?')) return;

  try {
    const res = await fetch(`/api/opportunities/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete opportunity.');

    loadOpportunities();
  } catch (err) {
    alert(err.message);
  }
};

