// Subscription checkout page logic
document.addEventListener('DOMContentLoaded', async () => {
  await window.authPromise;
  initSubscription();
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

  let priceText = "₹1.00";
  if (planName === 'Premium') priceText = "₹5.00";
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

      if (window.isNote100Applied) {
        try {
          showToast('Activating subscription...', 'success');
          const confirmRes = await fetch('/api/checkout/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: `free_coupon_Note100_${Date.now()}`,
              planName: planName
            })
          });
          const confirmData = await confirmRes.json();
          if (confirmRes.ok && confirmData.success) {
            showToast('Subscription activated successfully!', 'success');
            if (window.currentUser) {
              window.currentUser.plan = planName;
            }
            setTimeout(() => {
              const dashboardUrl = currentUser.role === 'tutor' ? '/instructor-dashboard.html' : '/student-dashboard.html';
              window.location.href = `${dashboardUrl}?session_id=mock_session_${Date.now()}&plan=${encodeURIComponent(planName)}`;
            }, 1500);
          } else {
            showToast(confirmData.error || 'Failed to activate plan', 'error');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Activate Plan (Free)</span>';
            }
          }
        } catch (confirmErr) {
          showToast('Error activating subscription.', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Activate Plan (Free)</span>';
          }
        }
        return;
      }

      try {
        const isAnnual = document.getElementById('annualBtn')?.classList.contains('bg-white');
        let amount = 1;
        if (planName === 'Premium') {
          amount = isAnnual ? 40 : 5;
        } else {
          amount = isAnnual ? 8 : 1;
        }

        const keyRes = await fetch('/api/payments/key');
        const { key } = await keyRes.json();

        const res = await fetch('/api/payments/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, currency: 'INR' })
        });
        const orderData = await res.json();
        
        if (res.ok && orderData.success) {
          const options = {
            key: key || '',
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'TutorNest',
            description: `${planName} Plan Subscription`,
            order_id: orderData.order_id,
            handler: async function (paymentRes) {
              try {
                showToast('Verifying payment...', 'success');
                const verifyRes = await fetch('/api/payments/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_order_id: paymentRes.razorpay_order_id,
                    razorpay_payment_id: paymentRes.razorpay_payment_id,
                    razorpay_signature: paymentRes.razorpay_signature,
                    planName: planName
                  })
                });
                const verifyData = await verifyRes.json();
                if (verifyRes.ok && verifyData.success) {
                  showToast('Payment successful! Plan updated.', 'success');
                  // Update current user state dynamically if needed
                  if (window.currentUser) {
                    window.currentUser.plan = planName;
                  }
                  setTimeout(() => {
                    const dashboardUrl = currentUser.role === 'tutor' ? '/instructor-dashboard.html' : '/student-dashboard.html';
                    window.location.href = `${dashboardUrl}?session_id=mock_session_${Date.now()}&plan=${encodeURIComponent(planName)}`;
                  }, 1500);
                } else {
                  showToast(verifyData.message || 'Verification failed', 'error');
                  if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Pay Securely</span>';
                  }
                }
              } catch (verifyErr) {
                showToast('Error verifying payment.', 'error');
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Pay Securely</span>';
                }
              }
            },
            prefill: {
              name: currentUser ? currentUser.name : '',
              email: currentUser ? currentUser.email : '',
            },
            theme: {
              color: '#004ac6'
            },
            modal: {
              ondismiss: function() {
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = '<span class="material-symbols-outlined">lock</span><span>Pay Securely</span>';
                }
              }
            }
          };
          const rzp = new Razorpay(options);
          rzp.open();
        } else {
          showToast(orderData.error || 'Failed to initialize payment', 'error');
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

    // Handle coupon apply
    const applyBtn = document.getElementById('applyCouponBtn');
    const couponInput = document.getElementById('couponInput');
    const couponStatus = document.getElementById('couponStatus');
    const totalPriceEl = document.getElementById('totalPrice');
    const submitBtn = document.querySelector('button.gradient-btn');

    if (applyBtn && couponInput) {
      applyBtn.addEventListener('click', () => {
        const code = couponInput.value.trim().toUpperCase();
        if (code === 'DISCOUNT100' || code === 'NOTE100') {
          window.isNote100Applied = true;
          
          if (couponStatus) {
            couponStatus.textContent = `Coupon ${code} applied successfully! 100% off.`;
            couponStatus.className = 'text-xs mt-1 text-green-600 font-semibold';
            couponStatus.classList.remove('hidden');
          }
          
          if (totalPriceEl) {
            totalPriceEl.textContent = '₹0.00';
          }

          if (submitBtn) {
            const btnText = submitBtn.querySelector('span:not(.material-symbols-outlined)');
            if (btnText) btnText.textContent = 'Activate Plan (Free)';
          }

          showToast(`Coupon ${code} applied! 100% discount.`, 'success');
        } else {
          window.isNote100Applied = false;
          
          if (couponStatus) {
            couponStatus.textContent = 'Invalid coupon code.';
            couponStatus.className = 'text-xs mt-1 text-red-600 font-semibold';
            couponStatus.classList.remove('hidden');
          }

          // Restore original pricing display
          const isAnnual = document.getElementById('annualBtn')?.classList.contains('bg-white');
          let priceText = "₹1.00";
          if (planName === 'Premium') {
            priceText = isAnnual ? "₹40.00" : "₹5.00";
          } else {
            priceText = isAnnual ? "₹8.00" : "₹1.00";
          }
          if (totalPriceEl) {
            totalPriceEl.textContent = priceText;
          }

          // Restore payment button text
          if (submitBtn) {
            const btnText = submitBtn.querySelector('span:not(.material-symbols-outlined)');
            if (btnText) btnText.textContent = 'Pay Securely';
          }

          showToast('Invalid coupon code.', 'error');
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
