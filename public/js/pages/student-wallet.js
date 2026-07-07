// Student Wallet Page Logic
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for currentUser to be populated via app.js checkAuth promise
  await window.authPromise;

  if (!currentUser) {
    window.location.href = '/index.html?login=true';
    return;
  }

  if (currentUser.role !== 'student') {
    window.location.href = '/instructor-wallet.html';
    return;
  }

  // Populate avatar header
  populateHeaderAvatar();

  // Populate initial balance
  updateBalanceDisplay(currentUser.balance);

  // Load bookings and display transactions
  await loadTransactions();

  // Setup topup button event
  const btnTopup = document.getElementById('btnTopup');
  if (btnTopup) {
    btnTopup.addEventListener('click', handleTopup);
  }
});

function populateHeaderAvatar() {
  const avatarContainer = document.getElementById('avatarContainer');
  const avatarFallback = document.getElementById('avatarFallback');
  if (currentUser && avatarContainer) {
    if (currentUser.avatar.startsWith('http')) {
      avatarContainer.innerHTML = `<img src="${currentUser.avatar}" class="w-full h-full object-cover">`;
    } else {
      if (avatarFallback) avatarFallback.textContent = currentUser.avatar;
    }
  }
}

function updateBalanceDisplay(balance) {
  const balanceEl = document.getElementById('walletBalance');
  if (balanceEl) {
    balanceEl.textContent = `₹${parseFloat(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function selectQuickAmount(amount) {
  const amountInput = document.getElementById('topupAmount');
  if (amountInput) {
    amountInput.value = amount;
  }
}

async function handleTopup() {
  const amountInput = document.getElementById('topupAmount');
  if (!amountInput) return;

  const amount = parseFloat(amountInput.value);
  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid top-up amount', 'error');
    return;
  }

  try {
    const res = await fetch('/api/wallet/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();

    if (res.ok) {
      showToast(`Successfully added ₹${amount} to your wallet!`, 'success');
      amountInput.value = '';
      currentUser.balance = data.balance;
      updateBalanceDisplay(data.balance);
      await loadTransactions();
    } else {
      showToast(data.error || 'Failed to add money to wallet', 'error');
    }
  } catch (err) {
    showToast('Network error topping up wallet.', 'error');
  }
}

async function loadTransactions() {
  const transactionList = document.getElementById('transactionList');
  if (!transactionList) return;

  try {
    const res = await fetch('/api/bookings');
    if (!res.ok) throw new Error('Failed to load history');
    const bookings = await res.json();

    // Map bookings to transaction entries
    const transactions = [];

    bookings.forEach(booking => {
      const rate = booking.rate || 0;
      const amount = rate * booking.duration;

      // Initial debit/booking request transaction
      transactions.push({
        type: 'debit',
        description: rate === 0 
          ? `Free Trial Booking: 1-on-1 Lesson with ${booking.tutorName} (${booking.subject})`
          : `Lesson Booking: 1-on-1 Session with ${booking.tutorName} (${booking.subject})`,
        date: booking.date,
        status: booking.status,
        amount: -amount
      });

      // If cancelled, show a refund credit transaction
      if (booking.status === 'cancelled') {
        transactions.push({
          type: 'credit',
          description: rate === 0 
            ? `Refund: Free Trial Cancelled with ${booking.tutorName}`
            : `Refund: Lesson Cancelled with ${booking.tutorName}`,
          date: booking.date,
          status: 'completed',
          amount: amount
        });
      }
    });

    // Sort by date soonest first/latest first? Usually transaction history shows latest first.
    // Let's sort bookings by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (transactions.length === 0) {
      transactionList.innerHTML = `
        <tr>
          <td colspan="4" class="py-8 text-center text-on-surface-variant italic">
            No transactions found.
          </td>
        </tr>
      `;
      return;
    }

    transactionList.innerHTML = transactions.map(tx => {
      const isDebit = tx.amount < 0;
      const formattedAmount = tx.amount === 0 
        ? 'Free'
        : `${isDebit ? '-' : '+'} ₹${Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      
      const amountClass = tx.amount === 0 
        ? 'text-primary font-bold'
        : isDebit ? 'text-on-surface' : 'text-green-600 font-bold';

      const statusBadge = tx.status === 'completed'
        ? `<span class="inline-flex items-center gap-1.5 py-1 px-3 bg-green-100 text-green-700 rounded-full font-label-md text-label-sm"><span class="w-1.5 h-1.5 rounded-full bg-green-700"></span> Completed</span>`
        : tx.status === 'cancelled'
          ? `<span class="inline-flex items-center gap-1.5 py-1 px-3 bg-error-container/20 text-error rounded-full font-label-md text-label-sm"><span class="w-1.5 h-1.5 rounded-full bg-error"></span> Cancelled</span>`
          : `<span class="inline-flex items-center gap-1.5 py-1 px-3 bg-amber-100 text-amber-700 rounded-full font-label-md text-label-sm"><span class="w-1.5 h-1.5 rounded-full bg-amber-700"></span> Pending</span>`;

      return `
        <tr class="hover:bg-primary/5 transition-colors">
          <td class="py-5 font-label-md text-label-md text-on-surface">${tx.description}</td>
          <td class="py-5 font-body-md text-label-md text-on-surface-variant">${new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          <td class="py-5">${statusBadge}</td>
          <td class="py-5 text-right font-display-lg text-label-md ${amountClass}">${formattedAmount}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    transactionList.innerHTML = `
      <tr>
        <td colspan="4" class="py-8 text-center text-error italic">
          Failed to load transaction history.
        </td>
      </tr>
    `;
  }
}
