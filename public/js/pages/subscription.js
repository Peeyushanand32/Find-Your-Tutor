// Subscription checkout page logic
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initSubscription, 150);
});

function initSubscription() {
  if (!currentUser) {
    // Open auth modal if not logged in
    openAuthModal('login');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const planName = urlParams.get('plan') || 'Premium';

  // Find plan display text and update it
  const planHeaders = Array.from(document.querySelectorAll('h2, h3, p'));
  const header = planHeaders.find(el => el.textContent.includes('Subscription') || el.textContent.includes('Complete') || el.textContent.includes('checkout') || el.textContent.includes('Premium'));
  if (header) {
    header.textContent = `Checkout: ${planName} Plan`;
  }

  // Find payment form
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing Payment...';
      }

      try {
        const res = await fetch('/api/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planName })
        });
        const data = await res.json();
        
        if (res.ok) {
          showToast(`Successfully subscribed to ${planName}!`, 'success');
          currentUser = data.user; // refresh state
          
          setTimeout(() => {
            window.location.href = currentUser.role === 'student' ? '/student-dashboard.html' : '/instructor-dashboard.html';
          }, 2000);
        } else {
          showToast(data.error || 'Subscription failed', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Pay Now';
          }
        }
      } catch (err) {
        showToast('Connection error processing subscription.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Pay Now';
        }
      }
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
  
  setTimeout(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
