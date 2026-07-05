// Landing Page (index.html) specific logic
document.addEventListener('DOMContentLoaded', () => {
  // 1. AI Study Compass Match Search
  const compassInput = document.querySelector('input[placeholder*="Quantum Physics"]');
    const compassBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('AI Match Now') || el.querySelector('span')?.textContent.includes('explore'));

  if (compassInput && compassBtn) {
    const triggerSearch = () => {
      const subject = compassInput.value.trim();
      window.location.href = `/find-tutors.html?subject=${encodeURIComponent(subject)}`;
    };

    compassBtn.addEventListener('click', triggerSearch);
    compassInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') triggerSearch();
    });
  }

  // 2. Inquiry Form Handler
  const inquiryForm = document.querySelector('form');
  if (inquiryForm) {
    inquiryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const parentNameInput = inquiryForm.querySelector('input[placeholder="Full Name"]');
      const studentNameInput = inquiryForm.querySelector('input[placeholder="Student\'s Full Name"]');
      const gradeSelect = inquiryForm.querySelector('select');
      const subjectInput = inquiryForm.querySelector('input[placeholder*="Advanced Calculus"]');
      const phoneInput = inquiryForm.querySelector('input[type="tel"]');
      const locationInput = inquiryForm.querySelector('input[placeholder*="Palo Alto"]');

      const payload = {
        name: parentNameInput ? parentNameInput.value : '',
        studentName: studentNameInput ? studentNameInput.value : '',
        grade: gradeSelect ? gradeSelect.value : '',
        subject: subjectInput ? subjectInput.value : '',
        phone: phoneInput ? phoneInput.value : '',
        location: locationInput ? locationInput.value : '',
        email: currentUser ? currentUser.email : 'visitor@tutornest.com', // default or current user
        message: `Inquiry for student ${studentNameInput?.value || ''} in grade ${gradeSelect?.value || ''} for subject ${subjectInput?.value || ''}.`
      };

      try {
        const res = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
          showToast('Inquiry submitted successfully! Our team will contact you shortly.', 'success');
          inquiryForm.reset();
        } else {
          showToast(data.error || 'Failed to submit inquiry', 'error');
        }
      } catch (err) {
        showToast('Error sending inquiry. Please try again.', 'error');
        console.error(err);
      }
    });
  }
});

// Reusable toast function (appends a beautiful glassmorphic alert dynamically)
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
