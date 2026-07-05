// Instructor Requests History
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

    if (bookings.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-on-surface-variant italic">
            No booking requests in your history logs.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = bookings.map(b => {
      let statusClass = 'bg-amber-100 text-amber-800';
      if (b.status === 'scheduled') statusClass = 'bg-blue-100 text-blue-800';
      else if (b.status === 'completed') statusClass = 'bg-green-100 text-green-800';
      else if (b.status === 'cancelled') statusClass = 'bg-red-100 text-red-800';

      return `
        <tr class="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
          <td class="py-4 font-label-md">${b.studentName}</td>
          <td class="py-4 text-on-surface-variant">${b.subject}</td>
          <td class="py-4 text-on-surface-variant">${b.date} • ${b.time}</td>
          <td class="py-4 font-semibold text-primary">$${b.rate.toFixed(2)}</td>
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
