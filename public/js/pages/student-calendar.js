// Student Calendar specific logic
let allBookings = [];

document.addEventListener('DOMContentLoaded', async () => {
  await window.authPromise;
  initCalendar();
});

async function initCalendar() {
  if (!currentUser) {
    window.location.href = '/index.html';
    return;
  }

  try {
    const res = await fetch('/api/bookings');
    const bookings = await res.json();

    allBookings = bookings.filter(b => b.status === 'scheduled' || b.status === 'pending');

    // Render bookings side list
    const sidebarList = document.querySelector('.space-y-unit-md') || document.querySelector('aside .space-y-unit-md');
    if (sidebarList) {
      if (allBookings.length === 0) {
        sidebarList.innerHTML = `
          <div class="text-center py-8 text-on-surface-variant italic">
            <span class="material-symbols-outlined text-[36px] mb-2">event_busy</span>
            <p>No active lessons scheduled.</p>
          </div>
        `;
      } else {
        sidebarList.innerHTML = allBookings.map(b => {
          const statusText = b.status === 'pending' ? 'Pending Approval' : 'Scheduled';
          const statusClass = b.status === 'pending' ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50';
          
          return `
            <div onclick="selectBooking('${b.id}')" class="p-unit-md bg-white border border-outline-variant/30 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div class="flex justify-between items-start mb-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusClass}">
                  ${statusText}
                </span>
                <span class="text-[12px] font-bold text-primary">₹${b.rate}/hr</span>
              </div>
              <h4 class="font-label-md text-on-surface mb-1">${b.subject}</h4>
              <p class="text-label-sm text-on-surface-variant mb-2">Tutor: ${b.tutorName}</p>
              <div class="flex items-center gap-1 text-[12px] text-outline">
                <span class="material-symbols-outlined text-[16px]">calendar_today</span>
                <span>${b.date} • ${b.time}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Highlight booking dates on the calendar mockup
    const dateElements = document.querySelectorAll('.grid-cols-7 > div:not(.text-outline)');
    dateElements.forEach(el => {
      const dayNum = parseInt(el.textContent.trim());
      if (!isNaN(dayNum)) {
        const dateStr = `2026-07-${dayNum.toString().padStart(2, '0')}`;
        const hasBooking = allBookings.some(b => b.date === dateStr);
        if (hasBooking) {
          el.className = "text-center py-2 text-label-sm bg-primary/10 text-primary font-bold border border-primary/30 rounded cursor-pointer relative";
          el.innerHTML = `${dayNum}<span class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></span>`;
        }
      }
    });

    // Auto-select first booking if available
    if (allBookings.length > 0) {
      selectBooking(allBookings[0].id);
    }

  } catch (err) {
    console.error(err);
  }
}

window.selectBooking = function(id) {
  const booking = allBookings.find(b => b.id === id);
  if (!booking) return;

  const statusBadge = document.getElementById('detail-status');
  const tutorName = document.getElementById('detail-name');
  const subject = document.getElementById('detail-subject');
  const date = document.getElementById('detail-date');
  const time = document.getElementById('detail-time');
  const platform = document.getElementById('detail-platform');
  const joinBtn = document.getElementById('detail-join-btn');
  const avatarContainer = document.getElementById('detail-avatar-container');

  if (statusBadge) {
    statusBadge.textContent = booking.status === 'pending' ? 'Pending Approval' : 'Upcoming';
    statusBadge.className = booking.status === 'pending' 
      ? 'bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider' 
      : 'bg-green-100 text-green-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider';
  }

  if (avatarContainer) {
    const initials = booking.tutorName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    avatarContainer.textContent = initials;
  }

  if (tutorName) tutorName.textContent = booking.tutorName;
  if (subject) subject.textContent = booking.subject;
  
  if (date) {
    const formattedDate = new Date(booking.date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    date.textContent = formattedDate;
  }
  if (time) time.textContent = booking.time;
  
  if (platform) {
    if (booking.status === 'scheduled') {
      const displayLink = `tutornest.com/session?id=${booking.id}`;
      platform.innerHTML = `<a href="/session.html?bookingId=${booking.id}" class="text-primary hover:underline font-mono text-[13px] break-all">${displayLink}</a>`;
    } else {
      platform.textContent = 'Awaiting Tutor Approval';
    }
  }

  if (joinBtn) {
    if (booking.status === 'scheduled' && booking.meetingLink) {
      joinBtn.disabled = false;
      joinBtn.className = 'w-full bg-primary text-on-primary py-4 rounded-xl font-label-md hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 cursor-pointer text-center';
      joinBtn.textContent = 'Join Session';
      joinBtn.onclick = () => window.location.href = `/session.html?bookingId=${booking.id}`;
    } else {
      joinBtn.disabled = true;
      joinBtn.className = 'w-full bg-primary text-on-primary py-4 rounded-xl font-label-md opacity-50 cursor-not-allowed transition-all shadow-lg shadow-primary/20 text-center';
      joinBtn.textContent = booking.status === 'pending' ? 'Awaiting Tutor Approval' : 'Link Pending';
      joinBtn.onclick = null;
    }
  }
};
