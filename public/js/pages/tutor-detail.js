// Tutor Detail Page (tutor-detail.html) specific logic
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const tutorId = urlParams.get('id') || 'tutor1'; // Fallback to tutor1 if no ID

  // Select key containers
  const mainContent = document.querySelector('main');
  const bookBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Book Free Trial') || el.textContent.includes('Book Lesson') || el.parentElement.innerHTML.includes('Book Free Trial'));
  const msgBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Message') || el.innerHTML.includes('mail'));
  
  let selectedDate = '2026-07-14'; // Default initial
  let selectedTime = '2:30 PM';   // Default initial
  let tutorData = null;

  try {
    const res = await fetch(`/api/tutors/${tutorId}`);
    if (!res.ok) throw new Error('Tutor not found');
    const { tutor, reviews } = await res.json();
    tutorData = tutor;

    // Populate profile details
    document.title = `${tutor.name} - ${tutor.title} | TutorNest`;
    
    const nameHeading = document.querySelector('h1.font-headline-md');
    if (nameHeading) nameHeading.textContent = tutor.name;

        const titlePara = document.querySelector('p.text-primary-container');
    if (titlePara) titlePara.textContent = tutor.title;

    // If selecting by "About Me" header
    const aboutHeader = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.includes('About'));
    if (aboutHeader && aboutHeader.nextElementSibling) {
      aboutHeader.nextElementSibling.innerHTML = `
        <p class="mb-unit-md">${tutor.bio}</p>
        <p>My teaching philosophy focuses on "Intuitive Mastery"—understanding the 'why' behind the formulas, which builds lasting confidence. We will work at your pace to make real, accelerated progress.</p>
      `;
    }

    const tutorImg = document.querySelector('img[data-alt*="Jenkins"], img[src*="Jenkins"], img[src*="aida-public"]');
    if (tutorImg) {
      if (tutor.avatar.startsWith('http')) {
        tutorImg.src = tutor.avatar;
      } else {
        // Fallback to text box if needed
        tutorImg.parentElement.innerHTML = `<div class="w-full h-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-[64px] flex items-center justify-center">${tutor.avatar}</div>`;
      }
    }

    // Update hourly rate in Sidebar Booking widget
    const rateSpan = document.querySelector('span.font-display-lg');
    if (rateSpan) rateSpan.textContent = `$${tutor.rate}`;

    // Update message button text
    if (msgBtn) {
      msgBtn.innerHTML = `<span class="material-symbols-outlined text-[20px]">mail</span> Message ${tutor.name.split(' ')[0]}`;
    }

    // Populate reviews
    const reviewsHeader = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.includes('Reviews') || el.textContent.includes('Student Reviews'));
    if (reviewsHeader && reviewsHeader.nextElementSibling) {
      const reviewContainer = reviewsHeader.nextElementSibling;
      if (reviews.length === 0) {
        reviewContainer.innerHTML = `<p class="text-on-surface-variant italic py-4">No reviews yet. Be the first to leave a review after your lesson!</p>`;
      } else {
        reviewContainer.innerHTML = reviews.map(rev => {
          const stars = Array(5).fill(0).map((_, i) => 
            `<span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' ${i < rev.rating ? 1 : 0};">star</span>`
          ).join('');
          
          return `
            <div class="bg-white p-unit-lg rounded-xl border border-outline-variant/20 shadow-sm mb-4">
              <div class="flex justify-between items-start mb-unit-sm">
                <div class="flex items-center gap-unit-sm">
                  <div class="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center font-bold text-primary">${rev.studentName.split(' ').map(n => n[0]).join('')}</div>
                  <div>
                    <h5 class="font-label-md text-label-md">${rev.studentName}</h5>
                    <p class="text-label-sm text-outline">${rev.subject} Student</p>
                  </div>
                </div>
                <div class="flex text-secondary">
                  ${stars}
                </div>
              </div>
              <p class="text-body-md text-on-surface-variant italic">"${rev.comment}"</p>
            </div>
          `;
        }).join('');
      }
    }

    // Hook up subject tags
    const subjectsHeader = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.includes('Subjects') || el.textContent.includes('Specialized Subjects'));
    if (subjectsHeader && subjectsHeader.nextElementSibling) {
      const container = subjectsHeader.nextElementSibling;
      container.innerHTML = `
        <div class="bg-surface-container-low p-unit-md rounded-lg border border-primary/10 w-full">
          <h3 class="font-label-md text-label-md text-primary mb-2">Subjects Offered</h3>
          <div class="flex flex-wrap gap-2">
            ${(tutor.subjects || []).map(s => `<span class="bg-white px-3 py-1 rounded-md text-label-sm font-label-sm border border-outline-variant/30">${s}</span>`).join('')}
          </div>
        </div>
      `;
    }

    // Hook up education & certifications
    const eduHeader = Array.from(document.querySelectorAll('h2')).find(el => el.textContent.includes('Education'));
    if (eduHeader && eduHeader.nextElementSibling) {
      const container = eduHeader.nextElementSibling;
      if (tutor.education && tutor.education.length > 0) {
        container.innerHTML = tutor.education.map((edu, idx) => {
          const isSecond = idx % 2 === 1;
          const bgClass = isSecond ? 'bg-secondary/5' : 'bg-primary/5';
          const textClass = isSecond ? 'text-secondary' : 'text-primary';
          const icon = isSecond ? 'card_membership' : 'school';
          
          return `
            <div class="flex items-start gap-unit-md p-unit-md bg-white rounded-xl border border-outline-variant/20 mb-2">
              <div class="w-12 h-12 rounded-lg ${bgClass} flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined ${textClass}">${icon}</span>
              </div>
              <div>
                <h4 class="font-label-md text-label-md">${edu.degree}</h4>
                <p class="text-label-sm text-on-surface-variant">${edu.institution} • ${edu.year}</p>
              </div>
            </div>
          `;
        }).join('');
      } else {
        container.innerHTML = `
          <div class="flex items-start gap-unit-md p-unit-md bg-white rounded-xl border border-outline-variant/20 mb-2">
            <div class="w-12 h-12 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-primary">school</span>
            </div>
            <div>
              <h4 class="font-label-md text-label-md">Certified Educator</h4>
              <p class="text-label-sm text-on-surface-variant">Verified by TutorNest</p>
            </div>
          </div>
        `;
      }
    }

  } catch (err) {
    console.error(err);
  }

  // Calendar slot listeners
  const calendarDays = document.querySelectorAll('div.grid-cols-7 > div:not(.text-outline)');
  calendarDays.forEach(day => {
    day.addEventListener('click', () => {
      calendarDays.forEach(d => {
        d.className = "text-center py-2 text-label-sm hover:bg-primary-container/10 rounded cursor-pointer";
      });
      day.className = "text-center py-2 text-label-sm bg-primary text-white rounded cursor-pointer font-bold";
      
      const dayNum = day.textContent.trim();
      selectedDate = `2026-07-${dayNum.padStart(2, '0')}`;
    });
  });

  // Time slot selection
  const timeSlots = document.querySelectorAll('button.text-label-sm');
  timeSlots.forEach(slot => {
    slot.addEventListener('click', () => {
      timeSlots.forEach(s => {
        s.classList.remove('border-primary', 'text-primary', 'bg-primary-container/10', 'font-bold');
        s.classList.add('border-outline-variant/30');
      });
      slot.classList.remove('border-outline-variant/30');
      slot.classList.add('border-primary', 'text-primary', 'bg-primary-container/10', 'font-bold');
      
      selectedTime = slot.textContent.trim();
    });
  });

  // Message Tutor click handler
  if (msgBtn) {
    msgBtn.addEventListener('click', () => {
      if (!currentUser) {
        openAuthModal('login');
        return;
      }
      const page = currentUser.role === 'student' ? '/student-messages.html' : '/instructor-messages.html';
      window.location.href = `${page}?contactId=${tutorId}`;
    });
  }

  // Book lesson handler
  if (bookBtn) {
    bookBtn.addEventListener('click', async () => {
      if (!currentUser) {
        openAuthModal('login');
        return;
      }

      if (currentUser.role !== 'student') {
        showToast('Only students can book lessons', 'error');
        return;
      }

      if (currentUser.plan === 'Basic' || !currentUser.plan) {
        showToast('Booking lessons requires an active subscription. Redirecting to pricing plans...', 'error');
        setTimeout(() => {
          window.location.href = '/pricing.html';
        }, 2000);
        return;
      }

      const bookingPayload = {
        tutorId: tutorId,
        subject: (tutorData && tutorData.subjects && tutorData.subjects[0]) || 'General Subject',
        date: selectedDate,
        time: selectedTime,
        duration: 1
      };

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingPayload)
        });
        const data = await res.json();

        if (res.ok) {
          showToast('Lesson requested successfully! Redirecting to schedule...', 'success');
          setTimeout(() => {
            window.location.href = '/student-calendar.html';
          }, 2000);
        } else {
          showToast(data.error || 'Failed to book lesson', 'error');
        }
      } catch (err) {
        showToast('Connection error booking lesson.', 'error');
      }
    });
  }
});

// Toast helper
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
