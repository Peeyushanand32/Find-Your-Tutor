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
  const nameInput = document.getElementById('nameInput');
  const titleInput = document.getElementById('titleInput');
  const rateInput = document.getElementById('rateInput');
  const locationInput = document.getElementById('locationInput');
  const bioTextarea = document.getElementById('bioTextarea');
  const targetGradesInput = document.getElementById('targetGradesInput');
  const subjectsContainer = document.getElementById('subjectsContainer');
  const addSubjectBtn = document.getElementById('addSubjectBtn');
  const educationContainer = document.getElementById('educationContainer');
  const addEducationBtn = document.getElementById('addEducationBtn');
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarFileInput = document.getElementById('avatarFileInput');
  const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
  const saveBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Save') || el.textContent.includes('Update') || el.textContent.includes('Save Changes'));

  if (nameInput) nameInput.value = currentUser.name;
  if (titleInput) titleInput.value = currentUser.title || '';
  if (rateInput) rateInput.value = currentUser.rate || 45;
  if (locationInput) locationInput.value = currentUser.location || 'Online';
  if (bioTextarea) bioTextarea.value = currentUser.bio || '';
  if (targetGradesInput) targetGradesInput.value = currentUser.targetGrades || '';

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

  // Render & Manage Specialized Subjects
  let activeSubjects = [...(currentUser.subjects || [])];
  
  function renderSubjects() {
    if (!subjectsContainer) return;
    if (activeSubjects.length === 0) {
      subjectsContainer.innerHTML = '<span class="text-xs text-outline italic py-2">No subjects listed. Click "Add Subject" to begin.</span>';
      return;
    }
    subjectsContainer.innerHTML = activeSubjects.map((sub, index) => `
      <div class="group flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/30 hover:border-primary transition-colors">
        <span class="font-label-md">${sub}</span>
        <button type="button" onclick="removeSubject(${index})" class="material-symbols-outlined text-sm text-outline hover:text-error font-normal outline-none focus:outline-none">close</button>
      </div>
    `).join('');
  }

  window.removeSubject = (index) => {
    activeSubjects.splice(index, 1);
    renderSubjects();
  };

  if (addSubjectBtn) {
    addSubjectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const newSub = prompt("Enter new subject name:");
      if (newSub && newSub.trim()) {
        const trimmed = newSub.trim();
        if (!activeSubjects.includes(trimmed)) {
          activeSubjects.push(trimmed);
          renderSubjects();
        }
      }
    });
  }

  // Render & Manage Education
  let activeEducation = [...(currentUser.education || [])];

  function renderEducation() {
    if (!educationContainer) return;
    if (activeEducation.length === 0) {
      educationContainer.innerHTML = '<span class="text-xs text-outline italic py-2">No education or certifications listed. Click "Add New" to begin.</span>';
      return;
    }
    educationContainer.innerHTML = activeEducation.map((edu, index) => `
      <div class="flex gap-4 p-4 rounded-xl border border-outline-variant/20 bg-surface-container-low hover:border-primary/30 transition-all group">
        <div class="h-12 w-12 bg-white rounded-lg flex items-center justify-center border border-outline-variant/30 shrink-0">
          <span class="material-symbols-outlined text-primary text-3xl">workspace_premium</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-label-md text-on-surface truncate">${edu.degree}</h4>
              <p class="text-label-sm text-outline truncate">${edu.institution}</p>
              <p class="text-[10px] text-outline-variant font-medium mt-1">${edu.year}</p>
            </div>
            <button type="button" onclick="removeEducation(${index})" class="material-symbols-outlined text-sm text-outline hover:text-error font-normal outline-none focus:outline-none ml-2">delete</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  window.removeEducation = (index) => {
    activeEducation.splice(index, 1);
    renderEducation();
  };

  if (addEducationBtn) {
    addEducationBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const degree = prompt("Enter Degree or Certification name (e.g. PhD in Mathematics):");
      if (!degree || !degree.trim()) return;

      const institution = prompt("Enter Institution or Issuing Authority (e.g. Oxford University):");
      if (!institution || !institution.trim()) return;

      const year = prompt("Enter Year completed (e.g. 2016):");
      if (!year || !year.trim()) return;

      activeEducation.push({
        degree: degree.trim(),
        institution: institution.trim(),
        year: year.trim()
      });
      renderEducation();
    });
  }

  // Render & Manage Availability
  const availabilityGrid = document.getElementById('availabilityGrid');
  const availabilityStatus = document.getElementById('availabilityStatus');
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let activeAvailability = [...(currentUser.availability || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])];

  function renderAvailability() {
    if (!availabilityGrid) return;
    availabilityGrid.innerHTML = DAY_NAMES.map((name, index) => {
      const isSelected = activeAvailability.includes(name);
      const bgClass = isSelected ? 'bg-primary text-on-primary shadow-sm cursor-pointer' : 'bg-surface-container-high text-outline cursor-pointer';
      return `
        <button type="button" onclick="toggleAvailability('${name}')" class="h-10 ${bgClass} flex items-center justify-center rounded-lg text-xs font-bold transition-all outline-none focus:outline-none">
          ${DAY_LABELS[index]}
        </button>
      `;
    }).join('');

    if (availabilityStatus) {
      availabilityStatus.textContent = `Current: ${activeAvailability.length} day(s) selected/week`;
    }
  }

  window.toggleAvailability = (dayName) => {
    const idx = activeAvailability.indexOf(dayName);
    if (idx > -1) {
      activeAvailability.splice(idx, 1);
    } else {
      activeAvailability.push(dayName);
    }
    renderAvailability();
  };

  renderSubjects();
  renderEducation();
  renderAvailability();

  if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const payload = {
        name: nameInput ? nameInput.value.trim() : currentUser.name,
        title: titleInput ? titleInput.value.trim() : '',
        rate: rateInput ? parseFloat(rateInput.value) : 45,
        location: locationInput ? locationInput.value.trim() : 'Online',
        bio: bioTextarea ? bioTextarea.value.trim() : '',
        targetGrades: targetGradesInput ? targetGradesInput.value.trim() : '',
        subjects: activeSubjects,
        education: activeEducation,
        avatar: currentAvatarData,
        availability: activeAvailability
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
          currentAvatarData = currentUser.avatar || '';
          loadAvatar();
          activeSubjects = [...(currentUser.subjects || [])];
          activeEducation = [...(currentUser.education || [])];
          activeAvailability = [...(currentUser.availability || [])];
          renderSubjects();
          renderEducation();
          renderAvailability();
          if (typeof updateNavbar === 'function') {
            updateNavbar();
          }
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
