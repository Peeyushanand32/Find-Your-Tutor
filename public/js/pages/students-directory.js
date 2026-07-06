// Instructor Student Directory page logic
document.addEventListener('DOMContentLoaded', async () => {
  await window.authPromise;
  initDirectory();
});

async function initDirectory() {
  if (!currentUser) return;
  const listContainer = document.querySelector('.grid') || document.querySelector('.space-y-unit-lg') || document.querySelector('table tbody');
  if (!listContainer) return;

  try {
    const res = await fetch('/api/bookings');
    const bookings = await res.json();

    // Find unique students
    const studentMap = {};
    bookings.forEach(b => {
      studentMap[b.studentId] = { id: b.studentId, name: b.studentName, subject: b.subject };
    });
    const uniqueStudents = Object.values(studentMap);

    const isTable = listContainer.tagName.toLowerCase() === 'tbody';

    if (uniqueStudents.length === 0) {
      if (isTable) {
        listContainer.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-on-surface-variant italic">No students taught yet.</td></tr>`;
      } else {
        listContainer.innerHTML = `<p class="text-on-surface-variant italic py-8 text-center col-span-full">No students in your directory yet.</p>`;
      }
      return;
    }

    if (isTable) {
      listContainer.innerHTML = uniqueStudents.map(student => {
        return `
          <tr class="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
            <td class="py-4 font-label-md">${student.name}</td>
            <td class="py-4 text-on-surface-variant">${student.subject}</td>
            <td class="py-4">
              <button onclick="window.location.href='/instructor-messages.html?contactId=${student.id}'" class="text-primary font-bold hover:underline flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">mail</span> Message
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      listContainer.innerHTML = uniqueStudents.map(student => {
        return `
          <div class="glass-card p-unit-lg rounded-2xl border border-outline-variant/30 flex items-center justify-between hover:shadow-lg transition-shadow">
            <div class="flex items-center text-left">
              <div class="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold flex items-center justify-center mr-4">
                ${student.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h4 class="font-headline-sm text-[18px] text-on-surface">${student.name}</h4>
                <p class="text-primary text-label-sm font-semibold">Active Subject: ${student.subject}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="window.location.href='/instructor-messages.html?contactId=${student.id}'" class="px-4 py-2 border border-primary text-primary rounded-xl font-label-sm font-bold hover:bg-primary/5 transition-colors flex items-center gap-1">
                <span class="material-symbols-outlined text-[18px]">mail</span> Chat
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
  }
}
