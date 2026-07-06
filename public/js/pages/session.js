// Live Workspace Controller
let booking = null;
let canvas, ctx;
let drawing = false;
let drawColor = '#ffffff';
let brushSize = 3;
let isEraser = false;

document.addEventListener('DOMContentLoaded', async () => {
  await window.authPromise;
  initSession();
});

async function initSession() {
  if (!currentUser) {
    window.location.href = '/index.html';
    return;
  }

  // Parse bookingId
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingId');
  if (!bookingId) {
    alert('Booking ID is missing');
    window.location.href = currentUser.role === 'student' ? '/student-dashboard.html' : '/instructor-dashboard.html';
    return;
  }

  // Fetch bookings list to find details
  try {
    const res = await fetch('/api/bookings');
    const bookings = await res.json();
    booking = bookings.find(b => b.id === bookingId);

    if (!booking) {
      alert('Session not found or permission denied');
      window.location.href = currentUser.role === 'student' ? '/student-dashboard.html' : '/instructor-dashboard.html';
      return;
    }

    // Set header information
    const subjectEl = document.getElementById('session-subject');
    const participantEl = document.getElementById('session-participant');
    if (subjectEl) subjectEl.textContent = `${booking.subject} - Live Session`;
    if (participantEl) {
      participantEl.textContent = currentUser.role === 'tutor' 
        ? `Student: ${booking.studentName}` 
        : `Instructor: ${booking.tutorName}`;
    }

    // Load Video Call
    loadVideoCall();

    // Start Timer
    startTimer();

    // Setup Tabs
    setupTabs();

    // Setup Whiteboard Drawing
    initWhiteboard();

    // Setup Notes Editor
    initNotesEditor(bookingId);

    // Setup End Session action
    const endBtn = document.getElementById('end-session-btn');
    if (endBtn) {
      if (currentUser.role === 'tutor') {
        endBtn.innerHTML = '<span class="material-symbols-outlined text-sm">check_circle</span> End & Complete Lesson';
      }
      endBtn.addEventListener('click', handleEndSession);
    }

  } catch (err) {
    console.error('Failed to load session workspace', err);
  }
}

// 1. Embedded Video Call Frame
function loadVideoCall() {
  const container = document.getElementById('video-container');
  if (!container || !booking) return;

  const meetingUrl = booking.meetingLink || `https://meet.jit.si/TutorNest-${booking.subject.replace(/[^a-zA-Z0-9]/g, '')}-${booking.id}`;
  
  // Embed Jitsi Meet iframe
  container.innerHTML = `
    <iframe 
      src="${meetingUrl}#config.prejoinPageEnabled=false&interfaceConfig.TOOLBAR_BUTTONS=['microphone','camera','desktop','chat','raisehand','tileview']&interfaceConfig.SHOW_JITSI_WATERMARK=false" 
      allow="camera; microphone; display-capture; fullscreen" 
      class="w-full h-full border-0 rounded-2xl">
    </iframe>
  `;
}

// 2. Countdown Timer
function startTimer() {
  const timerEl = document.getElementById('session-timer');
  if (!timerEl) return;

  let totalSeconds = 0;
  setInterval(() => {
    totalSeconds++;
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    timerEl.textContent = `${hours}:${minutes}:${seconds}`;
  }, 1000);
}

// 3. Tab Switching
function setupTabs() {
  const wbBtn = document.getElementById('tab-whiteboard-btn');
  const notesBtn = document.getElementById('tab-notes-btn');
  const wbView = document.getElementById('whiteboard-view');
  const notesView = document.getElementById('notes-view');
  const toolStatus = document.getElementById('tool-status');

  if (wbBtn && notesBtn && wbView && notesView) {
    wbBtn.addEventListener('click', () => {
      wbBtn.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-white transition-all flex items-center gap-1.5';
      notesBtn.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all flex items-center gap-1.5';
      wbView.classList.remove('hidden');
      notesView.classList.add('hidden');
      if (toolStatus) toolStatus.textContent = 'Whiteboard Active';
      resizeCanvas();
    });

    notesBtn.addEventListener('click', () => {
      notesBtn.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-white transition-all flex items-center gap-1.5';
      wbBtn.className = 'px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all flex items-center gap-1.5';
      notesView.classList.remove('hidden');
      wbView.classList.add('hidden');
      if (toolStatus) toolStatus.textContent = 'Notes Active';
    });
  }
}

// 4. Whiteboard drawing system
function initWhiteboard() {
  canvas = document.getElementById('paint-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  // Resize canvas initially
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Event Listeners
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  // Mobile Touch Support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
  });
  canvas.addEventListener('touchend', () => {
    canvas.dispatchEvent(new MouseEvent('mouseup', {}));
  });

  // Color picker selectors
  const colorBtns = document.querySelectorAll('.color-btn');
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorBtns.forEach(b => b.classList.remove('selected', 'ring-2', 'ring-primary'));
      btn.classList.add('selected', 'ring-2', 'ring-primary');
      drawColor = btn.getAttribute('data-color');
      isEraser = false;
    });
  });

  // Brush Size
  const sizeSlider = document.getElementById('brush-size');
  if (sizeSlider) {
    sizeSlider.addEventListener('input', (e) => {
      brushSize = e.target.value;
    });
  }

  // Eraser
  const eraserBtn = document.getElementById('tool-eraser');
  if (eraserBtn) {
    eraserBtn.addEventListener('click', () => {
      isEraser = true;
      colorBtns.forEach(b => b.classList.remove('selected', 'ring-2', 'ring-primary'));
      eraserBtn.classList.add('bg-slate-800');
    });
  }

  // Clear Canvas
  const clearBtn = document.getElementById('tool-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear the whiteboard?')) {
        ctx.fillStyle = '#0f172a'; // slate-900 background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    });
  }
}

function resizeCanvas() {
  if (!canvas) return;
  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth;
  canvas.height = parent.clientHeight;
  
  // Fill background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function startDrawing(e) {
  drawing = true;
  draw(e);
}

function stopDrawing() {
  drawing = false;
  ctx.beginPath();
}

function draw(e) {
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.strokeStyle = isEraser ? '#0f172a' : drawColor;

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

// 5. Notes Pad and Save
function initNotesEditor(bookingId) {
  const textarea = document.getElementById('notes-textarea');
  const downloadBtn = document.getElementById('download-notes-btn');
  if (!textarea) return;

  // Load auto-save
  const savedNotes = localStorage.getItem(`notes_${bookingId}`);
  if (savedNotes) textarea.value = savedNotes;

  textarea.addEventListener('input', () => {
    localStorage.setItem(`notes_${bookingId}`, textarea.value);
  });

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `TutorNest-SessionNotes-${booking.subject.replace(/\s+/g, '-')}.txt`;
      link.click();
    });
  }
}

// 6. End Session Handling
async function handleEndSession() {
  if (!booking) return;

  if (currentUser.role === 'tutor') {
    if (confirm('Are you sure you want to end this session and mark it as completed? This will finalize calculations and add student funds to your wallet.')) {
      try {
        const res = await fetch(`/api/bookings/${booking.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        });
        if (res.ok) {
          alert('Lesson successfully completed! Returning to dashboard.');
          window.location.href = '/instructor-dashboard.html';
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to complete session');
        }
      } catch (err) {
        alert('Connection error finishing session.');
      }
    }
  } else {
    if (confirm('Leave the workspace and return to your dashboard?')) {
      window.location.href = '/student-dashboard.html';
    }
  }
}
