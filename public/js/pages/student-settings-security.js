// Student Settings Security page logic
document.addEventListener('DOMContentLoaded', async () => {
  await window.authPromise;
  initSecurity();
});

function initSecurity() {
  if (!currentUser) {
    window.location.href = '/index.html';
    return;
  }

  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPasswordInput = form.querySelector('input[placeholder*="current"], input[name*="current"]');
      const newPasswordInput = form.querySelector('input[placeholder*="new"], input[name*="new"]');
      const confirmPasswordInput = form.querySelector('input[placeholder*="confirm"], input[name*="confirm"]');
      
      if (!currentPasswordInput || !newPasswordInput) return;

      const currentPassword = currentPasswordInput.value;
      const newPassword = newPasswordInput.value;

      if (confirmPasswordInput && confirmPasswordInput.value !== newPassword) {
        showToast('New passwords do not match!', 'error');
        return;
      }

      try {
        const res = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        
        if (res.ok) {
          showToast('Password updated successfully!', 'success');
          form.reset();
        } else {
          showToast(data.error || 'Failed to change password', 'error');
        }
      } catch (err) {
        showToast('Connection error updating security settings.', 'error');
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
