// Student Dashboard (student-dashboard.html) specific logic
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for auth to complete
  await window.authPromise;
  initDashboard();
});

async function initDashboard() {
  if (!currentUser) {
    // If not logged in, redirect to index
    window.location.href = '/index.html';
    return;
  }
  if (currentUser.role !== 'student') {
    window.location.href = '/instructor-dashboard.html';
    return;
  }

  // Check URL params for Stripe checkout confirmation callback
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const planName = urlParams.get('plan');
  if (sessionId && planName) {
    try {
      const confirmRes = await fetch('/api/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, planName })
      });
      if (confirmRes.ok) {
        const confirmData = await confirmRes.json();
        currentUser = confirmData.user;
        // Clean URL parameters to prevent multiple alerts on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        showToast(`Successfully activated your ${planName} subscription!`, 'success');
        if (typeof setupSidebarLinks === 'function') {
          setupSidebarLinks();
        }
        if (typeof updateNavbar === 'function') {
          updateNavbar();
        }
      }
    } catch (err) {
      console.error('Subscription activation callback failed:', err);
    }
  }

  // 1. Greet User
  const greetHeading = document.querySelector('h2.font-display-lg');
  const greetSub = document.querySelector('p.text-body-lg');
  if (greetHeading) {
    greetHeading.textContent = `Hello, ${currentUser.name}!`;
  }

  // 2. Fetch bookings
  try {
    const res = await fetch('/api/bookings');
    const bookings = await res.json();

    // 3. Calculate statistics
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const totalHours = completedBookings.reduce((sum, b) => sum + (b.duration || 1), 0);
    const completedCount = completedBookings.length;
    const upcomingBookings = bookings.filter(b => b.status === 'scheduled' || b.status === 'pending');

    // Update stats widget
    const statsContainer = document.querySelector('.glass.p-unit-lg.bg-primary');
    if (statsContainer) {
      const hoursPara = statsContainer.querySelectorAll('p.text-headline-md')[0];
      const completedPara = statsContainer.querySelectorAll('p.text-headline-md')[1];
      if (hoursPara) hoursPara.textContent = totalHours.toFixed(1);
      if (completedPara) completedPara.textContent = completedCount;
    }

    if (greetSub) {
      greetSub.textContent = `You're making great progress. You have ${upcomingBookings.length} lesson(s) scheduled or pending approval.`;
    }

    // 4. Populate Upcoming Lessons
    const lessonsListContainer = document.querySelector('.space-y-unit-md:has(.bg-surface-container)');
    if (lessonsListContainer) {
      if (upcomingBookings.length === 0) {
        lessonsListContainer.innerHTML = `
          <div class="text-center py-8 text-on-surface-variant italic">
            <span class="material-symbols-outlined text-[36px] mb-2">event_busy</span>
            <p>No upcoming lessons scheduled.</p>
            <button onclick="window.location.href='/find-tutors.html'" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-label-sm font-semibold">Book a Session</button>
          </div>
        `;
      } else {
        lessonsListContainer.innerHTML = upcomingBookings.slice(0, 3).map(booking => {
          const bookingDate = new Date(booking.date);
          const day = bookingDate.getDate();
          const month = bookingDate.toLocaleString('default', { month: 'short' });
          const statusBadge = booking.status === 'pending'
            ? `<span class="bg-amber-500/10 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Pending Approval</span>`
            : `<span class="bg-green-500/10 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Scheduled</span>`;

          const joinBtn = (booking.status === 'scheduled' && booking.meetingLink)
            ? `<a href="/session.html?bookingId=${booking.id}" class="mt-2 inline-flex items-center gap-1 text-[12px] text-primary hover:underline font-bold"><span class="material-symbols-outlined text-[16px]">video_call</span> Join Call</a>`
            : '';

          return `
            <div class="flex items-center gap-unit-lg p-unit-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors group">
              <div class="w-16 h-16 rounded-xl bg-primary-container/10 flex flex-col items-center justify-center text-primary border border-primary/10">
                <span class="font-headline-sm">${day}</span>
                <span class="text-[10px] font-bold uppercase tracking-wider">${month}</span>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-unit-sm mb-1">
                  <span class="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">${booking.subject}</span>
                  ${statusBadge}
                  <span class="text-on-surface-variant text-label-sm">${booking.time} (${booking.duration * 60} min)</span>
                </div>
                <h4 class="font-headline-sm text-[18px]">1-on-1 Session with ${booking.tutorName}</h4>
                <p class="text-on-surface-variant text-label-md">Instructor: ${booking.tutorName}</p>
                ${joinBtn}
              </div>
              <button onclick="window.location.href='/student-calendar.html'" class="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward_ios</button>
            </div>
          `;
        }).join('');
      }
    }

    // 5. Populate Recent Tutors
    const tutorsListContainer = document.querySelector('.space-y-unit-lg:has(.flex-1)');
    if (tutorsListContainer) {
      // Find unique tutors who have accepted requests
      const tutorMap = {};
      const acceptedBookings = bookings.filter(b => b.status === 'scheduled' || b.status === 'completed');
      acceptedBookings.forEach(b => {
        tutorMap[b.tutorId] = { id: b.tutorId, name: b.tutorName, subject: b.subject };
      });
      const uniqueTutors = Object.values(tutorMap);

      if (uniqueTutors.length === 0) {
        tutorsListContainer.innerHTML = `<p class="text-on-surface-variant italic text-label-sm py-4">No tutors booked yet. Check out our directory!</p>`;
      } else {
        // Fetch matching tutor avatar images from API to make it premium
        const tutorDataRes = await fetch('/api/tutors');
        const allTutors = await tutorDataRes.json();
        const avatarMap = {};
        allTutors.forEach(t => { avatarMap[t.id] = t.avatar; });

        tutorsListContainer.innerHTML = uniqueTutors.slice(0, 3).map(tutor => {
          const avatar = avatarMap[tutor.id] || '';
          const avatarHtml = avatar.startsWith('http')
            ? `<img class="w-12 h-12 rounded-full object-cover border border-outline-variant" src="${avatar}">`
            : `<div class="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold flex items-center justify-center">${tutor.name.split(' ').map(n => n[0]).join('')}</div>`;

          return `
            <div class="flex items-center gap-unit-md">
              ${avatarHtml}
              <div class="flex-1">
                <h5 class="font-label-md">${tutor.name}</h5>
                <p class="text-label-sm text-on-surface-variant">${tutor.subject}</p>
              </div>
              <button onclick="window.location.href='/tutor-detail.html?id=${tutor.id}'" class="text-primary font-bold text-label-sm hover:underline">Re-book</button>
            </div>
          `;
        }).join('');
      }
    }

  } catch (err) {
    console.error('Error rendering dashboard data', err);
  }

  // Handle Pro upgrade button
  const upgradeBtn = document.querySelector('button.gradient-button');
  if (upgradeBtn && upgradeBtn.textContent.includes('Upgrade')) {
    upgradeBtn.addEventListener('click', () => {
      window.location.href = '/pricing.html';
    });
  }

  // Handle Book New Session button
  const bookNewBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Book New Session'));
  if (bookNewBtn) {
    bookNewBtn.addEventListener('click', () => {
      window.location.href = '/find-tutors.html';
    });
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
  setTimeout(() => toast.classList.remove('translate-y-10', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
