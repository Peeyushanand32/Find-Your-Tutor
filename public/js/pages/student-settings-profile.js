// Student Settings Profile specific logic
document.addEventListener('DOMContentLoaded', async () => {
  await window.authPromise;
  initSettings();
});

function initSettings() {
  if (!currentUser) {
    window.location.href = '/index.html';
    return;
  }

  // Pre-populate fields
  const nameInput = document.querySelector('input[placeholder*="Name"], input[value*="Alex"]');
  const emailInput = document.querySelector('input[type="email"]');
  const phoneInput = document.querySelector('input[type="tel"]');
  const bioTextarea = document.querySelector('textarea');
  const saveBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Save') || el.textContent.includes('Update') || el.textContent.includes('Save Changes'));

  if (nameInput) nameInput.value = currentUser.name;
  if (emailInput) {
    emailInput.value = currentUser.email;
    emailInput.disabled = true; // disable changing email for security mockup simplicity
  }
  if (phoneInput) phoneInput.value = currentUser.phone || '';
  if (bioTextarea) bioTextarea.value = currentUser.bio || '';

  if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const payload = {
        name: nameInput ? nameInput.value.trim() : currentUser.name,
        phone: phoneInput ? phoneInput.value.trim() : '',
        bio: bioTextarea ? bioTextarea.value.trim() : ''
      };

      try {
        const res = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Profile updated successfully!', 'success');
          currentUser = data.user; // refresh current user variable
        } else {
          showToast(data.error || 'Failed to update profile', 'error');
        }
      } catch (err) {
        showToast('Connection error updating profile.', 'error');
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
