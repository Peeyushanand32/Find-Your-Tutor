// Student Tutors History
document.addEventListener('DOMContentLoaded', async () => {
  await window.authPromise;
  initHistory();
});

async function initHistory() {
  if (!currentUser) return;
  const listContainer = document.querySelector('.grid') || document.querySelector('.space-y-unit-lg') || document.querySelector('main div:has(.flex)');
  if (!listContainer) return;

  try {
    const res = await fetch('/api/bookings');
    const bookings = await res.json();
    
    // Find unique tutors who have accepted requests
    const tutorMap = {};
    const acceptedBookings = bookings.filter(b => b.status === 'scheduled' || b.status === 'completed');
    acceptedBookings.forEach(b => {
      tutorMap[b.tutorId] = { id: b.tutorId, name: b.tutorName, subject: b.subject };
    });
    const uniqueTutors = Object.values(tutorMap);

    if (uniqueTutors.length === 0) {
      listContainer.innerHTML = `<p class="text-on-surface-variant italic py-8 text-center col-span-full">No tutors booked yet. Visit "Find Tutors" to start!</p>`;
      return;
    }

    const tutorDataRes = await fetch('/api/tutors');
    const allTutors = await tutorDataRes.json();
    const avatarMap = {};
    const bioMap = {};
    allTutors.forEach(t => { 
      avatarMap[t.id] = t.avatar; 
      bioMap[t.id] = t.bio;
    });

    listContainer.innerHTML = uniqueTutors.map(tutor => {
      const avatar = avatarMap[tutor.id] || '';
      const bio = bioMap[tutor.id] || 'Expert instructor on TutorNest.';
      const avatarHtml = avatar.startsWith('http')
        ? `<img class="w-16 h-16 rounded-full object-cover border border-outline-variant mr-4" src="${avatar}">`
        : `<div class="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold flex items-center justify-center mr-4">${tutor.name.split(' ').map(n => n[0]).join('')}</div>`;

      return `
        <div class="glass-card p-unit-lg rounded-2xl border border-outline-variant/30 flex items-center justify-between hover:shadow-lg transition-shadow">
          <div class="flex items-center text-left">
            ${avatarHtml}
            <div>
              <h4 class="font-headline-sm text-[18px] text-on-surface">${tutor.name}</h4>
              <p class="text-primary text-label-sm font-semibold">${tutor.subject} Specialization</p>
              <p class="text-on-surface-variant text-label-sm mt-1 line-clamp-1 max-w-md">${bio}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button onclick="window.location.href='/student-messages.html?contactId=${tutor.id}'" class="p-2 border border-outline-variant/50 rounded-xl hover:bg-surface-container-high transition-colors">
              <span class="material-symbols-outlined text-[20px]">mail</span>
            </button>
            <button onclick="window.location.href='/tutor-detail.html?id=${tutor.id}'" class="px-4 py-2 bg-primary text-white rounded-xl font-label-sm font-bold hover:scale-105 active:scale-95 transition-transform">
              Book Again
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}
