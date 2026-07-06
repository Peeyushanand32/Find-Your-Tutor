// Pricing plans logic
document.addEventListener('DOMContentLoaded', () => {
  // Update pricing values dynamically to Rupees
  const priceElements = document.querySelectorAll('.text-4xl.font-bold');
  priceElements.forEach(el => {
    const text = el.textContent.trim();
    if (text === '₹0' || text === '$0') el.textContent = '₹0';
    else if (text === '₹19' || text === '$19') el.textContent = '₹999';
    else if (text === '₹149' || text === '$149') el.textContent = '₹4,999';
  });

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
