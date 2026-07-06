// Instructor Settings specific logic
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
  const nameInput = document.querySelector('input[placeholder*="Name"]');
  const titleInput = document.querySelector('input[placeholder*="Expert"], input[placeholder*="Title"], input[placeholder*="Mathematics"]');
  const rateInput = document.querySelector('input[placeholder*="Rate"], input[placeholder*="hour"], input[type="number"]');
  const locationInput = document.querySelector('input[placeholder*="Location"], input[placeholder*="Boston"]');
  const bioTextarea = document.querySelector('textarea');
  const saveBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Save') || el.textContent.includes('Update') || el.textContent.includes('Save Changes'));

  if (nameInput) nameInput.value = currentUser.name;
  if (titleInput) titleInput.value = currentUser.title || '';
  if (rateInput) rateInput.value = currentUser.rate || 45;
  if (locationInput) locationInput.value = currentUser.location || 'Online';
  if (bioTextarea) bioTextarea.value = currentUser.bio || '';

  if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const payload = {
        name: nameInput ? nameInput.value.trim() : currentUser.name,
        title: titleInput ? titleInput.value.trim() : '',
        rate: rateInput ? parseFloat(rateInput.value) : 45,
        location: locationInput ? locationInput.value.trim() : 'Online',
        bio: bioTextarea ? bioTextarea.value.trim() : ''
      };

      try {
        const res = await fetch(`/api/tutors/${currentUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Profile settings saved successfully!', 'success');
          currentUser = data.user;
        } else {
          showToast(data.error || 'Failed to update settings', 'error');
        }
      } catch (err) {
        showToast('Connection error updating settings.', 'error');
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
