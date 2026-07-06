// Find Tutors (find-tutors.html) page-specific logic
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('input[placeholder*="What subject"]');
  const gradeSelect = Array.from(document.querySelectorAll('select')).find(el => el.innerHTML.includes('Grade Level'));
  const priceSelect = Array.from(document.querySelectorAll('select')).find(el => el.innerHTML.includes('Price Range'));
  const ratingSelect = Array.from(document.querySelectorAll('select')).find(el => el.innerHTML.includes('Rating'));
  const availSelect = Array.from(document.querySelectorAll('select')).find(el => el.innerHTML.includes('Availability'));
  const sortSelect = Array.from(document.querySelectorAll('select')).find(el => el.innerHTML.includes('Sort by') || el.parentElement.innerHTML.includes('Sort by'));
  const applyBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Apply'));
  
  const gridContainer = document.querySelector('.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-3');
  const countSpan = document.querySelector('p:has(span.font-bold)');

  // 1. Read URL query param
  const urlParams = new URLSearchParams(window.location.search);
  const initialSubject = urlParams.get('subject');
  if (initialSubject && searchInput) {
    searchInput.value = initialSubject;
  }

  // Load tutors initially
  fetchTutors();

  // Handle Apply button click
  if (applyBtn) {
    applyBtn.addEventListener('click', fetchTutors);
  }

  // Handle Sort selection change
  if (sortSelect) {
    sortSelect.addEventListener('change', fetchTutors);
  }

  // Trigger search on Enter inside the subject input
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') fetchTutors();
    });
  }

  // Mode toggles (All, Online, In-Person)
  const modeButtons = document.querySelectorAll('button.rounded-full.text-label-md');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => {
        b.className = "px-unit-lg py-unit-xs rounded-full text-label-md text-on-surface-variant hover:text-primary transition-all";
      });
      btn.className = "px-unit-lg py-unit-xs rounded-full text-label-md bg-surface-container-lowest shadow-sm text-primary transition-all font-bold";
      
      // Fetch tutors and pass location filters
      const mode = btn.textContent.trim();
      fetchTutors(mode);
    });
  });

  async function fetchTutors(mode = 'All') {
    if (!gridContainer) return;

    gridContainer.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p class="text-on-surface-variant font-label-md mt-4">Finding expert tutors...</p>
      </div>
    `;

    // Construct API query
    const params = new URLSearchParams();
    if (searchInput && searchInput.value.trim() !== '') {
      params.append('subject', searchInput.value.trim());
    }
    if (gradeSelect && gradeSelect.value !== 'Grade Level') {
      params.append('gradeLevel', gradeSelect.value);
    }
    if (priceSelect && priceSelect.value !== 'Price Range') {
      // Extract numeric boundaries if needed, or send literal
      const val = priceSelect.value;
      if (val.includes('200 - 500') || val.includes('₹200 - ₹500')) { params.append('minPrice', '200'); params.append('maxPrice', '500'); }
      else if (val.includes('500 - 1000') || val.includes('₹500 - ₹1000')) { params.append('minPrice', '500'); params.append('maxPrice', '1000'); }
      else if (val.includes('1000+') || val.includes('₹1000+')) { params.append('minPrice', '1000'); }
    }
    if (ratingSelect && ratingSelect.value !== 'Rating') {
      const val = ratingSelect.value;
      if (val.includes('4.5')) params.append('rating', '4.5');
      else if (val.includes('4.0')) params.append('rating', '4.0');
    }
    if (sortSelect) {
      params.append('sort', sortSelect.value);
    }

    try {
      const res = await fetch(`/api/tutors?${params.toString()}`);
      let tutors = await res.json();

      // Client-side location filter based on Mode
      if (mode === 'Online') {
        // All tutors offer online classes
        tutors = tutors;
      } else if (mode === 'In-Person') {
        // In-Person matches physical cities (non-empty/non-generic)
        tutors = tutors.filter(t => t.location && t.location.toLowerCase() !== 'online');
      }

      // Update count
      if (countSpan) {
        countSpan.innerHTML = `Showing <span class="font-bold text-on-surface">${tutors.length}</span> professional tutors`;
      }

      if (tutors.length === 0) {
        gridContainer.innerHTML = `
          <div class="col-span-full text-center py-20 bg-white rounded-2xl border border-outline-variant/20 p-8 shadow-sm">
            <span class="material-symbols-outlined text-[64px] text-outline mb-4">search_off</span>
            <h3 class="font-headline-sm text-headline-sm text-on-surface mb-2">No Tutors Match Your Criteria</h3>
            <p class="text-on-surface-variant max-w-md mx-auto">Try broadening your search term or adjusting filter options to discover more educators.</p>
          </div>
        `;
        return;
      }

      gridContainer.innerHTML = tutors.map(tutor => {
        const ratingVal = tutor.rating ? tutor.rating.toFixed(1) : '5.0';
        const reviewsText = tutor.reviewsCount !== undefined ? `(${tutor.reviewsCount})` : '(0)';
        const subjectsHtml = (tutor.subjects || [])
          .slice(0, 3)
          .map(s => `<span class="bg-primary-fixed/30 text-on-primary-fixed-variant px-3 py-1 rounded-full text-xs font-semibold">${s}</span>`)
          .join('');

        const avatarHtml = tutor.avatar.startsWith('http')
          ? `<img class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="${tutor.avatar}" alt="${tutor.name}">`
          : `<div class="w-full h-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-[36px] flex items-center justify-center">${tutor.avatar}</div>`;

        return `
          <div class="glass-card rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-500 group flex flex-col h-full opacity-100 translate-y-0">
            <div class="relative h-64 overflow-hidden bg-surface-container">
              ${avatarHtml}
              <div class="absolute top-unit-md left-unit-md flex flex-col gap-unit-xs">
                <span class="bg-secondary text-on-secondary px-unit-sm py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1">
                  <span class="material-symbols-outlined text-[12px]" style="font-variation-settings: 'FILL' 1;">verified</span>
                  Verified Educator
                </span>
              </div>
              <div class="absolute bottom-unit-md right-unit-md">
                <div class="bg-surface-container-lowest/90 backdrop-blur px-unit-sm py-1 rounded-lg shadow-sm flex items-center gap-1 border border-outline-variant/30">
                  <span class="material-symbols-outlined text-amber-500 text-[18px]" style="font-variation-settings: 'FILL' 1;">star</span>
                  <span class="font-bold text-label-md">${ratingVal}</span>
                  <span class="text-on-surface-variant text-[12px]">${reviewsText}</span>
                </div>
              </div>
            </div>
            <div class="p-unit-lg flex flex-col flex-grow">
              <div class="flex justify-between items-start mb-unit-sm">
                <div>
                  <h3 class="font-headline-sm text-headline-sm text-on-surface">${tutor.name}</h3>
                  <p class="text-primary font-label-md">${tutor.title || 'Expert Tutor'}</p>
                </div>
                <div class="text-right">
                  <span class="block font-headline-sm text-headline-sm text-on-surface">₹${tutor.rate}</span>
                  <span class="text-[12px] text-on-surface-variant font-medium">/ hour</span>
                </div>
              </div>
              <p class="text-on-surface-variant font-body-md line-clamp-3 mb-unit-lg flex-grow">
                ${tutor.bio}
              </p>
              <div class="flex flex-wrap gap-unit-xs mb-unit-lg">
                ${subjectsHtml}
              </div>
              <button onclick="window.location.href='/tutor-detail.html?id=${tutor.id}'" class="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-label-md shadow-md hover:scale-[1.02] active:scale-95 transition-all">
                View Full Profile
              </button>
            </div>
          </div>
        `;
      }).join('');

    } catch (e) {
      console.error(e);
      gridContainer.innerHTML = `
        <div class="col-span-full text-center py-20 text-error">
          <span class="material-symbols-outlined text-[48px]">warning</span>
          <p class="font-label-md mt-2">Error loading tutors. Please try again.</p>
        </div>
      `;
    }
  }
});
