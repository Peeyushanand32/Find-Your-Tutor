const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

const files = [
  'index.html',
  'find-tutors.html',
  'tutor-detail.html',
  'student-dashboard.html',
  'instructor-dashboard.html',
  'student-messages.html',
  'instructor-messages.html',
  'student-calendar.html',
  'instructor-calendar.html',
  'student-lessons-history.html',
  'student-tutors-history.html',
  'instructor-requests-history.html',
  'pricing.html',
  'subscription.html',
  'student-settings-profile.html',
  'student-settings-security.html',
  'instructor-settings.html',
  'students-directory.html',
  'instructor-wallet.html'
];

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let html = fs.readFileSync(filePath, 'utf8');

  // Inject app.js before </body> if not already injected
  if (!html.includes('/js/app.js')) {
    html = html.replace('</body>', '<script src="/js/app.js"></script>\n</body>');
  }

  // Rewrite navigation links to map them correctly
  html = html.replace(/href="#"/g, 'href="javascript:void(0)"'); // Default safe click
  
  // Custom script injection placeholder for page specific js
  const pageScriptName = file.replace('.html', '.js');
  const pageScriptTag = `<script src="/js/pages/${pageScriptName}"></script>`;
  if (!html.includes(`/js/pages/${pageScriptName}`) && fs.existsSync(path.join(publicDir, 'js', 'pages', pageScriptName))) {
    html = html.replace('</body>', `${pageScriptTag}\n</body>`);
  } else if (!html.includes(`/js/pages/${pageScriptName}`)) {
    // We will still inject it, because we'll create the script soon!
    html = html.replace('</body>', `${pageScriptTag}\n</body>`);
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Processed and updated scripts/links in ${file}`);
});
