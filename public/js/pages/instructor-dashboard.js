// Instructor Dashboard specific logic
document.addEventListener('DOMContentLoaded', async () => {
  await window.authPromise;
  initDashboard();
});

async function initDashboard() {
  if (!currentUser) {
    window.location.href = '/index.html';
    return;
  }
  if (currentUser.role !== 'tutor') {
    window.location.href = '/student-dashboard.html';
    return;
  }

  // 1. Set Tutor Name
  const greeting = document.querySelector('h2.font-display-lg');
  const greetingSub = document.querySelector('h2.font-display-lg + p');
  if (greeting) {
    greeting.textContent = `Hello, ${currentUser.name}`;
  }

  // 2. Fetch booking data
  try {
    const res = await fetch('/api/bookings');
    const bookings = await res.json();

    const pending = bookings.filter(b => b.status === 'pending');
    const scheduled = bookings.filter(b => b.status === 'scheduled');
    const completed = bookings.filter(b => b.status === 'completed');

    if (greetingSub) {
      greetingSub.textContent = `You have ${scheduled.length} session(s) scheduled and ${pending.length} new request(s).`;
    }

    // 3. Render Upcoming Sessions
    const sessionsList = document.querySelector('.space-y-unit-md:has(.bg-primary-container\\/5)');
    if (sessionsList) {
      if (scheduled.length === 0) {
        sessionsList.innerHTML = `
          <div class="text-center py-8 text-on-surface-variant italic">
            <span class="material-symbols-outlined text-[36px] mb-2">event_busy</span>
            <p>No upcoming sessions scheduled.</p>
          </div>
        `;
      } else {
        sessionsList.innerHTML = scheduled.slice(0, 4).map(session => {
          return `
            <div class="flex flex-wrap md:flex-nowrap items-center justify-between p-unit-md hover:bg-surface-container-low transition-colors rounded-2xl border border-outline-variant/20 mb-2">
              <div class="flex items-center gap-unit-md">
                <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  ${session.time.split(' ')[0]}
                </div>
                <div>
                  <p class="font-label-md text-on-surface">${session.subject}</p>
                  <p class="text-label-sm text-on-surface-variant">Student: ${session.studentName} • ${session.duration * 60} min</p>
                </div>
              </div>
              <div class="mt-unit-md md:mt-0 flex items-center gap-unit-md">
                <span class="text-label-sm text-outline">${session.date}</span>
                <button onclick="completeLesson('${session.id}')" class="bg-gradient-to-r from-primary to-secondary px-unit-md py-2 rounded-xl text-white font-label-md flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform">
                  <span class="material-symbols-outlined text-sm">check_circle</span>
                  Mark Completed
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 4. Render Pending Requests
    const requestsGrid = document.querySelector('.grid-cols-1.sm\\:grid-cols-2');
    if (requestsGrid) {
      if (pending.length === 0) {
        requestsGrid.innerHTML = `
          <div class="col-span-full text-center py-8 text-on-surface-variant italic border border-outline-variant/30 rounded-2xl bg-white/30">
            <span class="material-symbols-outlined text-[36px] mb-2">check_circle</span>
            <p>All requests processed!</p>
          </div>
        `;
      } else {
        requestsGrid.innerHTML = pending.map(req => {
          return `
            <div class="border border-outline-variant/50 p-unit-md rounded-2xl bg-white/50 flex flex-col justify-between">
              <div class="flex items-center gap-unit-md mb-unit-md">
                <div class="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold flex items-center justify-center">
                  ${req.studentName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p class="font-label-md text-on-surface">${req.studentName}</p>
                  <p class="text-label-sm text-on-surface-variant">${req.subject}</p>
                </div>
              </div>
              <p class="text-label-sm text-on-surface-variant italic mb-unit-md">
                Requested date: <b>${req.date}</b> at <b>${req.time}</b> (${req.duration} hour)
              </p>
              <div class="grid grid-cols-2 gap-unit-sm">
                <button onclick="updateRequest('${req.id}', 'cancelled')" class="py-2 border border-outline rounded-xl font-label-sm hover:bg-surface-container-low transition-colors">Decline</button>
                <button onclick="updateRequest('${req.id}', 'scheduled')" class="py-2 bg-primary text-white rounded-xl font-label-sm hover:shadow-lg transition-all">Accept</button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 5. Render Wallet Overview
    const walletBalanceText = document.querySelector('.glass-card.p-unit-lg.bg-on-surface h3.font-display-lg');
    if (walletBalanceText) {
      walletBalanceText.textContent = `₹${(currentUser.walletBalance || 0).toFixed(2)}`;
    }

    // 6. Stats performance
    const monthlySessions = document.querySelector('.grid-cols-2:has(.text-secondary) p.text-secondary');
    if (monthlySessions) {
      monthlySessions.textContent = completed.length;
    }

  } catch (err) {
    console.error('Error loading instructor data', err);
  }

  // Withdraw earnings redirection
    const withdrawBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Withdraw Earnings'));
  if (withdrawBtn) {
    withdrawBtn.addEventListener('click', () => {
      window.location.href = '/instructor-wallet.html';
    });
  }
}

async function updateRequest(id, status) {
  try {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast(`Request ${status === 'scheduled' ? 'accepted' : 'declined'} successfully!`, 'success');
      // Refresh dynamically
      initDashboard();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to update request', 'error');
    }
  } catch (e) {
    showToast('Network error processing request.', 'error');
  }
}

async function completeLesson(id) {
  try {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
    if (res.ok) {
      showToast('Lesson marked as completed! Earnings added to wallet.', 'success');
      // Reload current user state and dashboard to show updated earnings dynamically
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (authData.loggedIn) {
        currentUser = authData.user;
        if (typeof updateNavbar === 'function') {
          updateNavbar();
        }
      }
      initDashboard();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to update lesson status', 'error');
    }
  } catch (e) {
    showToast('Network error processing request.', 'error');
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl z-[2000] border backdrop-blur-md transition-all duration-300 transform translate-y-10 opacity-0 ${
    type === 'success' 
      ? 'bg-green-500/10 border-green-500/30 text-green-700' 
      : 'bg-error-container/80 border-error/30 text-on-error-container'
  }`;
  toast.innerHTML = `
    <div class="flex items-center gap-2 font-label-md">
      <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
