// Pricing plans logic
document.addEventListener('DOMContentLoaded', () => {
  // Find pricing cards and buttons
  const buttons = document.querySelectorAll('button');
  
  buttons.forEach(btn => {
    const text = btn.textContent.trim().toLowerCase();
    if (text.includes('get started') || text.includes('choose') || text.includes('upgrade') || text.includes('subscribe')) {
      // Find the card title
      let card = btn.closest('.glass-card') || btn.parentElement;
      let planName = 'Premium';
      if (card) {
        const titleEl = card.querySelector('h3, h4');
        if (titleEl) planName = titleEl.textContent.trim();
      }
      
      btn.addEventListener('click', () => {
        window.location.href = `/subscription.html?plan=${encodeURIComponent(planName)}`;
      });
    }
  });
});
