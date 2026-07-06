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

  // Update order summary pricing to Rupees dynamically
  const summaryPlanName = document.getElementById('summaryPlanName');
  const basePrice = document.getElementById('basePrice');
  const totalPrice = document.getElementById('totalPrice');

  let priceText = "₹999.00";
  if (planName === 'Premium') priceText = "₹4,999.00";
  if (planName === 'Basic') priceText = "₹0.00";

  if (summaryPlanName) summaryPlanName.textContent = `${planName} Plan - Active Access`;
  if (basePrice) basePrice.textContent = priceText;
  if (totalPrice) totalPrice.textContent = priceText;

  // Find payment form
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.querySelector('button.gradient-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span><span>Processing Payment...</span>';
      }

      try {
        const res = await fetch('/api/checkout/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planName })
        });
        const data = await res.json();
        
        if (res.ok) {
          showToast('Redirecting to secure checkout...', 'success');
          setTimeout(() => {
            window.location.href = data.url;
          }, 1000);
        } else {
          showToast(data.error || 'Checkout failed', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Pay Securely</span>';
          }
        }
      } catch (err) {
        showToast('Connection error processing payment.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Pay Securely</span>';
        }
      }
    });

    const payBtn = document.querySelector('button.gradient-btn');
    if (payBtn) {
      payBtn.addEventListener('click', () => {
        if (form.reportValidity ? form.reportValidity() : true) {
          if (form.requestSubmit) {
            form.requestSubmit();
          } else {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }
      });
    }
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
