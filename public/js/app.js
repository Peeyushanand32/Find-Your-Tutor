// TutorNest Shared Application Controller
let authResolver;
window.authPromise = new Promise((resolve) => {
  authResolver = resolve;
});

window.isTutorTrialExpired = function(user) {
  if (!user || user.role !== 'tutor') return false;
  return user.plan === 'Basic' || !user.plan;
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Fetch current authentication state
  checkAuth();
  // 2. Convert all currency symbols to Rupees (₹)
  convertCurrencyToRupees();
  // 3. Auto-open login modal if redirected back from a protected page
  const params = new URLSearchParams(window.location.search);
  if (params.get('login') === 'true') {
    setTimeout(() => openAuthModal('login'), 250);
  }
});

let currentUser = null;

// CSS styles to support the dynamic login modal
const styleEl = document.createElement('style');
styleEl.textContent = `
  .auth-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(19, 27, 46, 0.4);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .auth-modal-overlay.active {
    opacity: 1;
  }
  .auth-modal-container {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    transform: scale(0.9);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .auth-modal-overlay.active .auth-modal-container {
    transform: scale(1);
  }
`;
document.head.appendChild(styleEl);

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.loggedIn) {
      currentUser = data.user;
      
      // Route Guard: restrict Basic plan students from dashboard, messages, and calendar
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const isConfirmingSubscription = params.get('session_id') && params.get('plan');

      if (!isConfirmingSubscription) {
        if (currentUser.role === 'student' && (currentUser.plan === 'Basic' || !currentUser.plan)) {
          if (path.includes('student-dashboard.html') || path.includes('student-messages.html') || path.includes('student-calendar.html')) {
            window.location.href = '/pricing.html';
            return;
          }
        }

        // Route Guard: restrict Basic plan tutors whose trial is expired from instructor calendar, requests, and wallet
        if (currentUser.role === 'tutor' && (currentUser.plan === 'Basic' || !currentUser.plan)) {
          if (window.isTutorTrialExpired(currentUser)) {
            if (path.includes('instructor-calendar.html') || path.includes('instructor-wallet.html') || path.includes('instructor-requests-history.html')) {
              window.location.href = '/pricing.html';
              return;
            }
          }
        }
      }

      // Route Guard: restrict active Premium/Pro users from visiting pricing or subscription page
      if (currentUser.plan === 'Premium' || currentUser.plan === 'Pro') {
        if (path.includes('pricing.html') || path.includes('subscription.html')) {
          const dashboardUrl = currentUser.role === 'tutor' ? '/instructor-dashboard.html' : '/student-dashboard.html';
          window.location.href = dashboardUrl;
          return;
        }
      }
    }
    updateNavbar();
    setupSidebarLinks();
  } catch (e) {
    console.error('Auth verification failed', e);
    updateNavbar();
    setupSidebarLinks();
  } finally {
    if (typeof authResolver === 'function') {
      authResolver();
    }
  }
}

function setupSidebarLinks() {
  // Dynamically inject student wallet link if logged in as student and not already present
  const navContainer = document.querySelector('nav .space-y-unit-sm, nav .flex-1, .sidebar');
  if (navContainer && currentUser && currentUser.role === 'student' && !navContainer.innerHTML.includes('account_balance_wallet')) {
    const settingsLink = Array.from(navContainer.querySelectorAll('a')).find(a => a.textContent.includes('Settings'));
    if (settingsLink) {
      const walletLinkHtml = `
        <a class="flex items-center gap-unit-md p-unit-sm rounded-lg text-on-surface-variant hover:bg-primary-container/10 hover:text-primary transition-all duration-200" href="/student-wallet.html">
          <span class="material-symbols-outlined">account_balance_wallet</span>
          <span class="font-label-md">Wallet</span>
        </a>
      `;
      settingsLink.insertAdjacentHTML('beforebegin', walletLinkHtml);
    }
  }

  // Select all sidebar anchor tags (usually inside nav or aside elements)
  const anchors = document.querySelectorAll('nav a, aside a, .sidebar a');
  const isExpiredTutor = currentUser && currentUser.role === 'tutor' && window.isTutorTrialExpired(currentUser);
  
  anchors.forEach(a => {
    const text = a.textContent.trim().toLowerCase();
    const isStudent = currentUser ? currentUser.role === 'student' : true;

    if (isExpiredTutor && (
      text.includes('schedule') || text.includes('calendar') || 
      text.includes('wallet') || text.includes('earnings') || text.includes('request history') ||
      text.includes('requests')
    )) {
      a.href = '/pricing.html';
      return;
    }

    // Direct mappings
    if (text.includes('dashboard') || text.includes('overview')) {
      a.href = isStudent ? '/student-dashboard.html' : '/instructor-dashboard.html';
    } else if (text.includes('schedule') || text.includes('calendar')) {
      a.href = isStudent ? '/student-calendar.html' : '/instructor-calendar.html';
    } else if (text.includes('tutor history') || text.includes('my tutors') || text === 'tutors') {
      a.href = isStudent ? '/student-tutors-history.html' : '/students-directory.html';
    } else if (text.includes('lesson history') || text.includes('history') || text.includes('lessons')) {
      a.href = isStudent ? '/student-lessons-history.html' : '/instructor-requests-history.html';
    } else if (text.includes('messages') || text.includes('inbox') || text.includes('hub')) {
      a.href = isStudent ? '/student-messages.html' : '/instructor-messages.html';
    } else if (text.includes('settings') || text.includes('profile')) {
      a.href = isStudent ? '/student-settings-profile.html' : '/instructor-settings.html';
    } else if (text.includes('wallet') || text.includes('earnings') || text.includes('balance') || text.includes('request history')) {
      a.href = isStudent ? '/student-wallet.html' : '/instructor-wallet.html';
    } else if (text.includes('directory')) {
      a.href = '/students-directory.html';
    } else if (text.includes('requests')) {
      a.href = isStudent ? '/student-dashboard.html' : '/instructor-dashboard.html#requests';
    }
  });
}


function updateNavbar() {
  // Find standard header or nav element
  const header = document.querySelector('header, nav.fixed, nav.sticky');
  if (!header) return;

  // Let's create a beautiful unified header that overrides/replaces the static header
  const isLanding = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
  
  // Custom logo and link
  const logoHref = '/index.html';
  const logoText = 'TutorNest';

  let navItemsHtml = '';
  
  if (currentUser) {
    if (currentUser.role === 'student') {
      navItemsHtml = `
        <a class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-all" href="/find-tutors.html">Find Tutors</a>
        <a class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-all" href="/student-dashboard.html">Dashboard</a>
        <a class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-all" href="/student-calendar.html">My Schedule</a>
        <a class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-all" href="/student-wallet.html">Wallet</a>
        <a class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-all" href="/student-messages.html">Messages</a>
      `;
    } else {
      navItemsHtml = `
        <a class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-all" href="/instructor-dashboard.html">Overview</a>
        <a class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-all" href="/instructor-calendar.html">Requests & Schedule</a>
        <a class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-all" href="/students-directory.html">My Students</a>
        <a class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-all" href="/instructor-wallet.html">Wallet</a>
        <a class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-all" href="/instructor-messages.html">Messages</a>
      `;
    }
  } else {
    navItemsHtml = `
      <a class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-all" href="/find-tutors.html">Find Tutors</a>
      <a class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary transition-all" href="/pricing.html">Pricing</a>
    `;
  }

  let rightNavHtml = '';
  if (currentUser) {
    const isStudent = currentUser.role === 'student';
    const balanceText = '';
    
    const avatarUrl = currentUser.avatar.startsWith('http') ? currentUser.avatar : '';
    const avatarInner = avatarUrl 
      ? `<img src="${avatarUrl}" class="w-10 h-10 rounded-full object-cover border border-primary/20">`
      : `<div class="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold flex items-center justify-center">${currentUser.avatar}</div>`;

    rightNavHtml = `
      <div class="flex items-center gap-3">
        ${balanceText}
        <!-- Notifications/Messages Quick Button -->
        <a href="${isStudent ? '/student-messages.html' : '/instructor-messages.html'}" class="w-10 h-10 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors relative" title="Messages">
          <span class="material-symbols-outlined text-outline">mail</span>
        </a>
        <!-- User Avatar Dropdown -->
        <div class="relative user-dropdown-container">
          <button class="flex items-center gap-2 outline-none focus:outline-none user-dropdown-btn">
            ${avatarInner}
            <span class="material-symbols-outlined text-[18px] text-outline">keyboard_arrow_down</span>
          </button>
          
          <!-- Dropdown Menu -->
          <div class="absolute right-0 mt-3 w-56 bg-white rounded-xl border border-outline-variant/30 shadow-xl py-2 hidden user-dropdown-menu z-50">
            <div class="px-4 py-3 border-b border-outline-variant/20">
              <p class="text-label-md font-bold text-on-surface leading-none">${currentUser.name}</p>
              <p class="text-label-sm text-outline mt-1 capitalize">${currentUser.role} ${currentUser.plan === 'Premium' ? '⭐' : ''}</p>
            </div>
            ${isStudent ? `
              <a href="/student-dashboard.html" class="flex items-center gap-2 px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-[20px]">dashboard</span> Dashboard
              </a>
              <a href="/student-calendar.html" class="flex items-center gap-2 px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-[20px]">calendar_today</span> My Schedule
              </a>
              <a href="/student-wallet.html" class="flex items-center gap-2 px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-[20px]">account_balance_wallet</span> My Wallet
              </a>
              <a href="/student-lessons-history.html" class="flex items-center gap-2 px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-[20px]">history</span> Lesson History
              </a>
              <a href="/student-settings-profile.html" class="flex items-center gap-2 px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-[20px]">settings</span> Settings
              </a>
            ` : `
              <a href="/instructor-dashboard.html" class="flex items-center gap-2 px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-[20px]">dashboard</span> Overview
              </a>
              <a href="/instructor-calendar.html" class="flex items-center gap-2 px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-[20px]">event_note</span> Lesson Requests
              </a>
              <a href="/instructor-wallet.html" class="flex items-center gap-2 px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-[20px]">payments</span> Earnings & Wallet
              </a>
              <a href="/instructor-settings.html" class="flex items-center gap-2 px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
                <span class="material-symbols-outlined text-[20px]">manage_accounts</span> Manage Profile
              </a>
            `}
            <hr class="border-outline-variant/20 my-1">
            <button onclick="logout()" class="w-full text-left flex items-center gap-2 px-4 py-2 text-label-md text-error hover:bg-error-container/10 transition-colors">
              <span class="material-symbols-outlined text-[20px]">logout</span> Log Out
            </button>
          </div>
        </div>
      </div>
    `;
  } else {
    rightNavHtml = `
      <button onclick="openAuthModal('login')" class="text-on-surface-variant font-medium font-label-md text-label-md hover:text-primary px-unit-md py-unit-sm transition-all duration-200 hover:scale-105">Log In</button>
      <button onclick="openAuthModal('signup')" class="bg-gradient-to-r from-primary to-secondary text-on-primary px-unit-lg py-unit-sm rounded-full font-label-md text-label-md hover:scale-105 active:scale-95 transition-all duration-200 shadow-md">Sign Up</button>
    `;
  }

  // Update outer structure to ensure class and styling matches TutorNest's premium design system
  header.className = "bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 top-0 sticky z-50 shadow-sm transition-all duration-300 w-full";
  header.innerHTML = `
    <div class="flex justify-between items-center w-full px-margin-desktop max-w-container-max mx-auto h-20">
      <div class="flex items-center gap-unit-xl">
        <a class="font-headline-sm text-headline-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent" href="${logoHref}">${logoText}</a>
        <nav class="hidden md:flex gap-unit-lg items-center">
          ${navItemsHtml}
        </nav>
      </div>
      <div class="flex items-center gap-unit-md">
        ${rightNavHtml}
      </div>
    </div>
  `;

  // Bind dropdown behavior
  const dropdownBtn = header.querySelector('.user-dropdown-btn');
  const dropdownMenu = header.querySelector('.user-dropdown-menu');
  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
      dropdownMenu.classList.add('hidden');
    });
  }
}

// ----------------- Auth Modal implementation -----------------

function openAuthModal(mode = 'login') {
  let modalOverlay = document.getElementById('auth-modal');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'auth-modal';
    modalOverlay.className = 'auth-modal-overlay';
    document.body.appendChild(modalOverlay);
  }

  renderModalContent(modalOverlay, mode);
  
  // Animate in
  setTimeout(() => {
    modalOverlay.classList.add('active');
  }, 10);

  // Close when clicking overlay
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) {
      closeAuthModal();
    }
  };
}

function closeAuthModal() {
  const modalOverlay = document.getElementById('auth-modal');
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
    setTimeout(() => {
      modalOverlay.innerHTML = '';
    }, 300);
  }
}

function renderModalContent(container, mode) {
  if (mode === 'forgot') {
    container.innerHTML = `
      <div class="auth-modal-container w-[450px] max-w-[90%] rounded-2xl p-unit-lg space-y-unit-md text-left">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-headline-sm text-headline-sm text-on-surface">Reset Password</h3>
          <button onclick="closeAuthModal()" class="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        
        <p class="text-body-md text-on-surface-variant mb-2">Enter your email address and we will generate a password reset link for you.</p>

        <!-- Error alert -->
        <div id="auth-error-alert" class="hidden bg-error-container text-on-error-container p-3 rounded-lg text-label-sm border border-error/20"></div>
        <div id="auth-success-alert" class="hidden bg-green-500/10 text-green-700 p-3 rounded-lg text-label-sm border border-green-500/20"></div>

        <form id="auth-form" class="space-y-4" onsubmit="handleForgotSubmit(event)">
          <div class="space-y-1">
            <label class="font-label-md text-label-md text-on-surface-variant">Email Address</label>
            <input type="email" name="email" required class="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md" placeholder="name@domain.com">
          </div>
          <button type="submit" class="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-label-md rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 mt-2">
            Send Reset Link
          </button>
        </form>
        
        <div class="text-center pt-2">
          <a href="javascript:void(0)" onclick="renderModalContent(document.getElementById('auth-modal'), 'login')" class="text-label-sm text-primary hover:underline">Back to Log In</a>
        </div>
      </div>
    `;
    return;
  }

  const isLogin = mode === 'login';
  container.innerHTML = `
    <div class="auth-modal-container w-[450px] max-w-[90%] rounded-2xl p-unit-lg space-y-unit-md text-left">
      <div class="flex justify-between items-center mb-2">
        <h3 class="font-headline-sm text-headline-sm text-on-surface">${isLogin ? 'Welcome Back' : 'Join TutorNest'}</h3>
        <button onclick="closeAuthModal()" class="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <!-- Tab Toggles -->
      <div class="flex bg-surface-container-high p-1 rounded-lg border border-outline-variant/30">
        <button onclick="renderModalContent(document.getElementById('auth-modal'), 'login')" 
          class="flex-1 py-2 text-label-md rounded-md font-bold transition-all text-center ${isLogin ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}">
          Log In
        </button>
        <button onclick="renderModalContent(document.getElementById('auth-modal'), 'signup')" 
          class="flex-1 py-2 text-label-md rounded-md font-bold transition-all text-center ${!isLogin ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}">
          Sign Up
        </button>
      </div>

      <!-- Error alert -->
      <div id="auth-error-alert" class="hidden bg-error-container text-on-error-container p-3 rounded-lg text-label-sm border border-error/20"></div>

      <!-- Forms -->
      <form id="auth-form" class="space-y-4" onsubmit="handleAuthSubmit(event, '${mode}')">
        <!-- Google Role Selector -->
        <div class="space-y-2">
          <label class="font-label-md text-[13px] text-on-surface-variant block">I want to sign in as:</label>
          <div class="flex bg-surface-container-high p-1 rounded-xl border border-outline-variant/30 text-xs">
            <button type="button" id="google-role-student" onclick="setGoogleRole('student')" 
              class="flex-1 py-2 rounded-lg font-bold transition-all text-center bg-white text-primary shadow-sm">
              Student (Learn)
            </button>
            <button type="button" id="google-role-tutor" onclick="setGoogleRole('tutor')" 
              class="flex-1 py-2 rounded-lg font-bold transition-all text-center text-on-surface-variant hover:text-primary">
              Tutor (Teach)
            </button>
          </div>
        </div>

        <!-- Google Login Button -->
        <a id="google-signin-btn" href="/api/auth/google?role=student" class="w-full flex items-center justify-center gap-3 border border-outline-variant hover:bg-surface-variant/40 rounded-xl py-3 text-label-md font-label-md transition-all active:scale-95">
          <img src="https://www.google.com/favicon.ico" class="w-5 h-5" alt="Google logo">
          <span>Sign in with Google</span>
        </a>

        <div class="flex items-center my-4">
          <hr class="flex-grow border-outline-variant/30">
          <span class="px-3 text-outline text-xs uppercase font-label-sm">Or with Email</span>
          <hr class="flex-grow border-outline-variant/30">
        </div>

        ${!isLogin ? `
          <div class="space-y-1">
            <label class="font-label-md text-label-md text-on-surface-variant">Full Name</label>
            <input type="text" name="name" required class="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md" placeholder="e.g. John Doe">
          </div>
          <div class="space-y-1">
            <label class="font-label-md text-label-md text-on-surface-variant">Phone Number</label>
            <input type="tel" name="phone" required class="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md" placeholder="e.g. +1 (555) 019-2834">
          </div>
          <div class="space-y-1">
            <label class="font-label-md text-label-md text-on-surface-variant">I want to...</label>
            <select name="role" required class="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md bg-white">
              <option value="student">Learn (Student)</option>
              <option value="tutor">Teach (Tutor)</option>
            </select>
          </div>
        ` : ''}

        <div class="space-y-1">
          <label class="font-label-md text-label-md text-on-surface-variant">Email Address</label>
          <input type="email" name="email" required class="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md" placeholder="name@domain.com">
        </div>

        <div class="space-y-1">
          <div class="flex justify-between items-center">
            <label class="font-label-md text-label-md text-on-surface-variant">Password</label>
            <a href="javascript:void(0)" onclick="renderModalContent(document.getElementById('auth-modal'), 'forgot')" class="text-label-sm text-primary hover:underline">Forgot Password?</a>
          </div>
          <input type="password" name="password" required class="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md" placeholder="••••••••">
        </div>

        <button type="submit" class="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-label-md rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 mt-2">
          ${isLogin ? 'Log In' : 'Create Account'}
        </button>

        ${isLogin ? `
          <div class="text-center pt-2">
            <p class="text-label-sm text-outline">Quick test profiles:</p>
            <div class="flex justify-center gap-2 mt-2">
              <button type="button" onclick="fillQuickAuth('student@tutornest.com', 'password')" class="px-2 py-1 bg-surface-container rounded border text-[10px] hover:border-primary">Student Profile</button>
              <button type="button" onclick="fillQuickAuth('tutor1@tutornest.com', 'password')" class="px-2 py-1 bg-surface-container rounded border text-[10px] hover:border-primary">Tutor Profile</button>
            </div>
          </div>
        ` : ''}
      </form>
    </div>
  `;
}

function fillQuickAuth(email, pass) {
  const form = document.getElementById('auth-form');
  if (form) {
    form.email.value = email;
    form.password.value = pass;
  }
}

async function handleAuthSubmit(e, mode) {
  e.preventDefault();
  const form = e.target;
  const errorAlert = document.getElementById('auth-error-alert');
  errorAlert.classList.add('hidden');

  const payload = {};
  if (form.name) payload.name = form.name.value;
  if (form.role) payload.role = form.role.value;
  if (form.phone) payload.phone = form.phone.value;
  payload.email = form.email.value;
  payload.password = form.password.value;

  const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
    closeAuthModal();
    // Redirect role-based
    if (mode === 'signup') {
      if (data.user.role === 'student') {
        window.location.href = '/student-settings-profile.html';
      } else {
        window.location.href = '/instructor-settings.html';
      }
    } else {
      // Reload if on subscription or tutor details to preserve context
      if (window.location.pathname.includes('subscription.html') || window.location.pathname.includes('tutor-detail.html')) {
        window.location.reload();
      } else {
        if (data.user.role === 'student') {
          window.location.href = '/student-dashboard.html';
        } else {
          window.location.href = '/instructor-dashboard.html';
        }
      }
    }
  } catch (err) {
    errorAlert.textContent = err.message;
    errorAlert.classList.remove('hidden');
  }
}

async function logout() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      currentUser = null;
      window.location.href = '/index.html';
    }
  } catch (e) {
    console.error('Logout failed', e);
  }
}

function convertCurrencyToRupees() {
  function convertNode(node) {
    if (!node) return;
    if (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'SCRIPT' || node.tagName === 'STYLE')) {
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue.includes('$')) {
        node.nodeValue = node.nodeValue.replace(/\$/g, '₹');
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.placeholder && node.placeholder.includes('$')) {
        node.placeholder = node.placeholder.replace(/\$/g, '₹');
      }
      if (node.tagName === 'OPTION' && node.textContent.includes('$')) {
        node.textContent = node.textContent.replace(/\$/g, '₹');
      }
      node.childNodes.forEach(convertNode);
    }
  }

  // Initial conversion
  convertNode(document.body);

  // Set up observer for dynamic changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        convertNode(node);
      });
      if (mutation.type === 'characterData') {
        convertNode(mutation.target);
      }
      if (mutation.type === 'attributes' && mutation.attributeName === 'placeholder') {
        convertNode(mutation.target);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder']
  });
}

async function handleForgotSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value;
  const errorAlert = document.getElementById('auth-error-alert');
  const successAlert = document.getElementById('auth-success-alert');
  
  errorAlert.classList.add('hidden');
  successAlert.classList.add('hidden');

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    
    if (res.ok) {
      successAlert.textContent = data.message || 'Reset link generated successfully.';
      successAlert.classList.remove('hidden');
      if (data.resetLink) {
        console.log('Reset Link:', data.resetLink);
      }
    } else {
      errorAlert.textContent = data.error || 'Failed to request reset link.';
      errorAlert.classList.remove('hidden');
    }
  } catch (err) {
    errorAlert.textContent = 'Connection error. Please try again.';
    errorAlert.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Reset Link';
  }
}

// Global UI Interactivity Handlers
document.addEventListener('click', (e) => {
  // 1. Handle user avatar dropdown menu toggle
  const btnDropdown = e.target.closest('.user-dropdown-btn');
  const menu = document.querySelector('.user-dropdown-menu');
  if (btnDropdown && menu) {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  } else if (menu && !e.target.closest('.user-dropdown-container')) {
    menu.classList.add('hidden');
  }

  // 2. Block request action buttons for expired trial tutors
  const actionBtn = e.target.closest('button');
  if (actionBtn && currentUser && currentUser.role === 'tutor' && window.isTutorTrialExpired(currentUser)) {
    const text = actionBtn.textContent.trim().toLowerCase();
    const onclickAttr = actionBtn.getAttribute('onclick') || '';
    if (text.includes('accept') || text.includes('decline') || onclickAttr.includes('updateRequest')) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = '/pricing.html';
      return;
    }
  }

  // 3. Intercept sidebar and navigation links containing javascript:void(0) or restricted paths
  const a = e.target.closest('nav a, aside a, .sidebar a');
  if (a) {
    const text = a.textContent.trim().toLowerCase();
    
    if (currentUser && currentUser.role === 'tutor' && window.isTutorTrialExpired(currentUser)) {
      if (text.includes('schedule') || text.includes('calendar') || 
          text.includes('wallet') || text.includes('earnings') || text.includes('request history') ||
          text.includes('requests')) {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = '/pricing.html';
        return;
      }
    }

    const href = a.getAttribute('href');
    if (href === 'javascript:void(0)' || !href) {
      const isStudent = currentUser ? currentUser.role === 'student' : true;
      
      if (text.includes('dashboard') || text.includes('overview')) {
        window.location.href = isStudent ? '/student-dashboard.html' : '/instructor-dashboard.html';
      } else if (text.includes('schedule') || text.includes('calendar')) {
        window.location.href = isStudent ? '/student-calendar.html' : '/instructor-calendar.html';
      } else if (text.includes('tutor history') || text.includes('my tutors') || text === 'tutors') {
        window.location.href = isStudent ? '/student-tutors-history.html' : '/students-directory.html';
      } else if (text.includes('lesson history') || text.includes('history') || text.includes('lessons')) {
        window.location.href = isStudent ? '/student-lessons-history.html' : '/instructor-requests-history.html';
      } else if (text.includes('messages') || text.includes('inbox') || text.includes('hub')) {
        window.location.href = isStudent ? '/student-messages.html' : '/instructor-messages.html';
      } else if (text.includes('settings') || text.includes('profile')) {
        window.location.href = isStudent ? '/student-settings-profile.html' : '/instructor-settings.html';
      } else if (text.includes('wallet') || text.includes('earnings') || text.includes('request history')) {
        window.location.href = '/instructor-wallet.html';
      } else if (text.includes('directory')) {
        window.location.href = '/students-directory.html';
      } else if (text.includes('requests')) {
        window.location.href = isStudent ? '/student-dashboard.html' : '/instructor-dashboard.html#requests';
      }
    }
  }
});

// Google Role Selection function
window.setGoogleRole = function(role) {
  const btn = document.getElementById('google-signin-btn');
  if (btn) {
    btn.href = `/api/auth/google?role=${role}`;
  }
  const studentBtn = document.getElementById('google-role-student');
  const tutorBtn = document.getElementById('google-role-tutor');
  if (studentBtn && tutorBtn) {
    if (role === 'student') {
      studentBtn.className = "flex-1 py-2 rounded-lg font-bold transition-all text-center bg-white text-primary shadow-sm";
      tutorBtn.className = "flex-1 py-2 rounded-lg font-bold transition-all text-center text-on-surface-variant hover:text-primary";
    } else {
      studentBtn.className = "flex-1 py-2 rounded-lg font-bold transition-all text-center text-on-surface-variant hover:text-primary";
      tutorBtn.className = "flex-1 py-2 rounded-lg font-bold transition-all text-center bg-white text-primary shadow-sm";
    }
  }
};
