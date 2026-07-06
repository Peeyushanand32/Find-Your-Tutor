// Student Calendar specific logic
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

    const activeBookings = bookings.filter(b => b.status === 'scheduled' || b.status === 'pending');

    // Render bookings side list
    const sidebarList = document.querySelector('.space-y-unit-md') || document.querySelector('aside .space-y-unit-md');
    if (sidebarList) {
      if (activeBookings.length === 0) {
        sidebarList.innerHTML = `
          <div class="text-center py-8 text-on-surface-variant italic">
            <span class="material-symbols-outlined text-[36px] mb-2">event_busy</span>
            <p>No active lessons scheduled.</p>
          </div>
        `;
      } else {
        sidebarList.innerHTML = activeBookings.map(b => {
          const statusText = b.status === 'pending' ? 'Pending Approval' : 'Scheduled';
          const statusClass = b.status === 'pending' ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50';
          
          return `
            <div class="p-unit-md bg-white border border-outline-variant/30 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div class="flex justify-between items-start mb-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusClass}">
                  ${statusText}
                </span>
                <span class="text-[12px] font-bold text-primary">$${b.rate}/hr</span>
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
        const hasBooking = activeBookings.some(b => b.date === dateStr);
        if (hasBooking) {
          el.className = "text-center py-2 text-label-sm bg-primary/10 text-primary font-bold border border-primary/30 rounded cursor-pointer relative";
          el.innerHTML = `${dayNum}<span class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></span>`;
        }
      }
    });

  } catch (err) {
    console.error(err);
  }
}
