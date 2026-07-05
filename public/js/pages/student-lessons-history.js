// Student Lessons History
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initHistory, 150);
});

async function initHistory() {
  if (!currentUser) return;
  const tableBody = document.querySelector('table tbody');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/bookings');
    const bookings = await res.json();
    const completed = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

    if (completed.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="py-8 text-center text-on-surface-variant italic">
            No completed or cancelled lessons in your history.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = completed.map(b => {
      const statusClass = b.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
      return `
        <tr class="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
          <td class="py-4 font-label-md">${b.subject}</td>
          <td class="py-4 text-on-surface-variant">${b.tutorName}</td>
          <td class="py-4 text-on-surface-variant">${b.date} • ${b.time}</td>
          <td class="py-4">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass}">
              ${b.status}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}
