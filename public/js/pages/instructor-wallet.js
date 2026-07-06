// Instructor Wallet page logic
document.addEventListener('DOMContentLoaded', async () => {
  await window.authPromise;
  initWallet();
});

async function initWallet() {
  if (!currentUser) {
    window.location.href = '/index.html';
    return;
  }
  if (currentUser.role !== 'tutor') {
    window.location.href = '/student-dashboard.html';
    return;
  }

  // Populate balance card
  const balanceText = document.querySelector('.md\\:col-span-4.glass p.font-display-lg');
  if (balanceText) {
    balanceText.textContent = `₹${(currentUser.walletBalance || 0).toFixed(2)}`;
  }

  // Load transactions
  await loadTransactions();

  // Withdraw button click handler
  const withdrawBtn = document.querySelector('.md\\:col-span-4.glass button.gradient-btn') || 
                      Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Withdraw'));
  if (withdrawBtn) {
    withdrawBtn.addEventListener('click', () => {
      openWithdrawModal();
    });
  }
}

async function loadTransactions() {
  const tableBody = document.querySelector('table tbody');
  if (!tableBody) return;

  try {
    const res = await fetch('/api/wallet');
    const data = await res.json();

    // Fetch student history or completed bookings to list under transactions
    const bookingsRes = await fetch('/api/bookings');
    const bookings = await bookingsRes.json();
    const completed = bookings.filter(b => b.status === 'completed');

    // Combine completed bookings and withdrawal requests
    const transactions = [];

    completed.forEach(b => {
      transactions.push({
        type: 'session',
        title: `Session: ${b.subject}`,
        subtitle: `Student: ${b.studentName}`,
        date: b.date,
        status: 'completed',
        amount: b.rate * b.duration,
        isPositive: true
      });
    });

    data.history.forEach(req => {
      transactions.push({
        type: 'withdrawal',
        title: `Withdrawal: ${req.method}`,
        subtitle: `Ref ID: ${req.id}`,
        date: req.date,
        status: req.status,
        amount: req.amount,
        isPositive: false
      });
    });

    // Sort by date, newest first
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (transactions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="py-8 text-center text-on-surface-variant italic">
            No transactions recorded yet.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = transactions.map(tx => {
      const amountText = tx.isPositive ? `+₹${tx.amount.toFixed(2)}` : `-₹${tx.amount.toFixed(2)}`;
      const amountClass = tx.isPositive ? 'text-green-600 font-bold' : 'text-on-surface font-semibold';
      const statusClass = tx.status === 'completed' || tx.status === 'paid' 
        ? 'bg-green-500/10 text-green-600' 
        : 'bg-amber-500/10 text-amber-600';

      const initialLetters = tx.title.split(': ')[1]?.split(' ').map(n => n[0]).join('') || 'TX';

      return `
        <tr class="group hover:bg-primary/5 transition-colors">
          <td class="py-5">
            <div class="flex items-center gap-4 text-left">
              <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                ${initialLetters}
              </div>
              <div>
                <p class="font-label-md text-on-surface">${tx.title}</p>
                <p class="text-label-sm text-on-surface-variant">${tx.subtitle}</p>
              </div>
            </div>
          </td>
          <td class="py-5 text-label-md text-on-surface-variant">${tx.date}</td>
          <td class="py-5">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusClass}">
              ${tx.status}
            </span>
          </td>
          <td class="py-5 text-right font-label-md ${amountClass}">${amountText}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
  }
}

function openWithdrawModal() {
  const overlay = document.createElement('div');
  overlay.id = 'withdraw-modal';
  overlay.className = 'auth-modal-overlay active';
  overlay.innerHTML = `
    <div class="auth-modal-container w-[400px] max-w-[90%] rounded-2xl p-unit-lg space-y-unit-md text-left">
      <div class="flex justify-between items-center mb-2">
        <h3 class="font-headline-sm text-headline-sm text-on-surface">Withdraw Earnings</h3>
        <button onclick="document.getElementById('withdraw-modal').remove()" class="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      <p class="text-label-sm text-on-surface-variant">Available balance: <b>₹${(currentUser.walletBalance || 0).toFixed(2)}</b></p>
      
      <div id="withdraw-error" class="hidden bg-error-container text-on-error-container p-3 rounded-lg text-label-sm border border-error/20"></div>

      <form id="withdraw-form" class="space-y-4" onsubmit="handleWithdrawSubmit(event)">
        <div class="space-y-1">
          <label class="font-label-md text-label-md text-on-surface-variant">Amount to Withdraw</label>
          <input type="number" step="0.01" name="amount" min="1" max="${currentUser.walletBalance}" required 
            class="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md" placeholder="e.g. 100.00">
        </div>
        <div class="space-y-1">
          <label class="font-label-md text-label-md text-on-surface-variant">Transfer Method</label>
          <select name="method" required class="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-md bg-white">
            <option value="UPI Transfer (GPay/PhonePe)">UPI Transfer (GPay/PhonePe)</option>
            <option value="Direct Bank Transfer (NEFT/IMPS)">Direct Bank Transfer (NEFT/IMPS)</option>
            <option value="Stripe Account Payout">Stripe Instant Payout</option>
          </select>
        </div>
        <button type="submit" class="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-label-md rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 mt-2">
          Request Withdrawal
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function handleWithdrawSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const amount = parseFloat(form.amount.value);
  const method = form.method.value;

  const errorDiv = document.getElementById('withdraw-error');
  errorDiv.classList.add('hidden');

  try {
    const res = await fetch('/api/wallet/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, method })
    });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('withdraw-modal').remove();
      showToast('Withdrawal request submitted successfully!', 'success');
      // Refresh current user and reload wallet
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (authData.loggedIn) {
        currentUser = authData.user;
      }
      initWallet();
    } else {
      errorDiv.textContent = data.error || 'Failed to request withdrawal';
      errorDiv.classList.remove('hidden');
    }
  } catch (err) {
    errorDiv.textContent = 'Connection error. Please try again.';
    errorDiv.classList.remove('hidden');
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
