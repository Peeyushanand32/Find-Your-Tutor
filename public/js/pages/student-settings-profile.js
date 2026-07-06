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

  // Header summary elements
  const headerName = document.getElementById('headerName');
  const headerGrade = document.getElementById('headerGrade');
  const headerLocation = document.getElementById('headerLocation');

  function updateHeaderSummary() {
    if (headerName) headerName.textContent = currentUser.name;
    if (headerGrade) headerGrade.textContent = currentUser.grade || 'Not Specified';
    if (headerLocation) headerLocation.textContent = currentUser.city || 'Online';
  }
  updateHeaderSummary();

  // Retrieve inputs
  const nameInput = document.getElementById('nameInput');
  const emailInput = document.getElementById('emailInput');
  const phoneInput = document.getElementById('phoneInput');
  const gradeSelect = document.getElementById('gradeSelect');
  const cityInput = document.getElementById('cityInput');
  const budgetInput = document.getElementById('budgetInput');
  const targetSubjectInput = document.getElementById('targetSubjectInput');
  const targetExamInput = document.getElementById('targetExamInput');
  const bioTextarea = document.getElementById('bioTextarea');
  const profileForm = document.getElementById('profileForm');
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarFileInput = document.getElementById('avatarFileInput');
  const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');

  // Avatar Management
  let currentAvatarData = currentUser.avatar || '';

  function loadAvatar() {
    if (!avatarPreview) return;
    if (currentAvatarData.startsWith('http') || currentAvatarData.startsWith('data:image')) {
      avatarPreview.src = currentAvatarData;
    } else {
      avatarPreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0D8ABC&color=fff&size=128`;
    }
  }
  loadAvatar();

  if (uploadAvatarBtn && avatarFileInput) {
    uploadAvatarBtn.addEventListener('click', () => avatarFileInput.click());
    avatarFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          currentAvatarData = event.target.result;
          loadAvatar();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Pre-populate
  if (nameInput) nameInput.value = currentUser.name;
  if (emailInput) emailInput.value = currentUser.email;
  if (phoneInput) phoneInput.value = currentUser.phone || '';
  if (gradeSelect) gradeSelect.value = currentUser.grade || '11th Grade';
  if (cityInput) cityInput.value = currentUser.city || '';
  if (budgetInput) budgetInput.value = currentUser.hourlyBudget || '';
  if (targetSubjectInput) targetSubjectInput.value = currentUser.targetSubject || '';
  if (targetExamInput) targetExamInput.value = currentUser.targetExam || '';
  if (bioTextarea) bioTextarea.value = currentUser.bio || '';

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        grade: gradeSelect.value,
        city: cityInput.value.trim(),
        hourlyBudget: parseFloat(budgetInput.value) || 0,
        targetSubject: targetSubjectInput.value.trim(),
        targetExam: targetExamInput.value.trim(),
        bio: bioTextarea.value.trim(),
        avatar: currentAvatarData
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
          currentAvatarData = currentUser.avatar || '';
          loadAvatar();
          updateHeaderSummary();
          if (typeof updateNavbar === 'function') {
            updateNavbar();
          }
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
