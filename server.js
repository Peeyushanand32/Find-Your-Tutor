const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend assets from /public
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware helper
function getCurrentUser(req) {
  const userId = req.cookies.userId;
  if (!userId) return null;
  return db.findOne('users', { id: userId });
}

function requireAuth(req, res, next) {
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  req.user = user;
  next();
}

// ----------------- Auth API Endpoints -----------------

app.get('/api/auth/me', (req, res) => {
  const user = getCurrentUser(req);
  if (!user) return res.json({ loggedIn: false });
  
  // Exclude password
  const { password, ...userSafe } = user;
  res.json({ loggedIn: true, user: userSafe });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.findOne('users', { email: email.toLowerCase() });
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.cookie('userId', user.id, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
  const { password: _, ...userSafe } = user;
  res.json({ success: true, user: userSafe });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existingUser = db.findOne('users', { email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const newUser = {
    email: email.toLowerCase(),
    password,
    name,
    role, // student or tutor
    avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
    balance: role === 'student' ? 100.00 : 0.00,
    plan: "Basic",
    bio: `Hello! I am ${name}.`,
    languages: ["English"],
    phone: ""
  };

  // If registering as tutor, seed default fields
  if (role === 'tutor') {
    Object.assign(newUser, {
      rate: 45,
      rating: 5.0,
      reviewsCount: 0,
      hoursTaught: 0,
      bio: `I am an expert tutor in various subjects. Ready to help you learn!`,
      subjects: ["General Education"],
      title: "Expert Tutor",
      education: [],
      location: "Online",
      walletBalance: 0.00,
      totalEarnings: 0.00
    });
  }

  const createdUser = db.insert('users', newUser);
  res.cookie('userId', createdUser.id, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
  const { password: _, ...userSafe } = createdUser;
  res.json({ success: true, user: userSafe });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('userId');
  res.json({ success: true });
});

// ----------------- Tutors API Endpoints -----------------

app.get('/api/tutors', (req, res) => {
  const { subject, minPrice, maxPrice, rating, gradeLevel, availability, sort } = req.query;
  let tutors = db.find('users', { role: 'tutor' });

  // Apply filters
  if (subject && subject.trim() !== '') {
    const term = subject.toLowerCase();
    tutors = tutors.filter(t => 
      t.name.toLowerCase().includes(term) || 
      (t.subjects && t.subjects.some(s => s.toLowerCase().includes(term))) ||
      (t.title && t.title.toLowerCase().includes(term))
    );
  }

  if (minPrice) {
    tutors = tutors.filter(t => t.rate >= parseFloat(minPrice));
  }
  if (maxPrice) {
    tutors = tutors.filter(t => t.rate <= parseFloat(maxPrice));
  }
  if (rating) {
    tutors = tutors.filter(t => t.rating >= parseFloat(rating));
  }
  // Grade level & Availability would require matching fields. Let's simplify and filter by tag if matches
  if (gradeLevel && gradeLevel !== 'Grade Level') {
    const term = gradeLevel.toLowerCase();
    tutors = tutors.filter(t => 
      t.subjects && t.subjects.some(s => s.toLowerCase().includes(term))
    );
  }

  // Sort
  if (sort === 'Price: Low to High') {
    tutors.sort((a, b) => a.rate - b.rate);
  } else if (sort === 'Price: High to Low') {
    tutors.sort((a, b) => b.rate - a.rate);
  } else {
    // Default or "Top Rated"
    tutors.sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
  }

  res.json(tutors);
});

app.get('/api/tutors/:id', (req, res) => {
  const tutor = db.findOne('users', { id: req.params.id, role: 'tutor' });
  if (!tutor) {
    return res.status(404).json({ error: 'Tutor not found' });
  }
  const reviews = db.find('reviews', { tutorId: tutor.id });
  res.json({ tutor, reviews });
});

app.put('/api/tutors/:id', requireAuth, (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const { title, rate, bio, subjects, location } = req.body;
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (rate !== undefined) updateData.rate = parseFloat(rate);
  if (bio !== undefined) updateData.bio = bio;
  if (location !== undefined) updateData.location = location;
  if (subjects !== undefined) {
    updateData.subjects = Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim());
  }

  const updated = db.update('users', { id: req.user.id }, updateData);
  res.json({ success: true, user: updated[0] });
});

// ----------------- Bookings API Endpoints -----------------

app.get('/api/bookings', requireAuth, (req, res) => {
  let bookings;
  if (req.user.role === 'student') {
    bookings = db.find('bookings', { studentId: req.user.id });
  } else {
    bookings = db.find('bookings', { tutorId: req.user.id });
  }
  // Sort by date, soonest first
  bookings.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(bookings);
});

app.post('/api/bookings', requireAuth, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can book lessons' });
  }

  const { tutorId, subject, date, time, duration } = req.body;
  if (!tutorId || !subject || !date || !time) {
    return res.status(400).json({ error: 'All booking fields are required' });
  }

  const tutor = db.findOne('users', { id: tutorId, role: 'tutor' });
  if (!tutor) {
    return res.status(404).json({ error: 'Tutor not found' });
  }

  const hours = parseFloat(duration) || 1;
  const totalCost = tutor.rate * hours;

  if (req.user.balance < totalCost) {
    return res.status(400).json({ error: 'Insufficient funds. Please top up your wallet or subscribe to a plan.' });
  }

  // Deduct student balance
  db.update('users', { id: req.user.id }, { balance: parseFloat((req.user.balance - totalCost).toFixed(2)) });

  const newBooking = {
    studentId: req.user.id,
    studentName: req.user.name,
    tutorId: tutor.id,
    tutorName: tutor.name,
    subject,
    date,
    time,
    status: "pending", // starts as pending for instructor approval
    rate: tutor.rate,
    duration: hours
  };

  const booking = db.insert('bookings', newBooking);

  // Send automatic notification message in chat
  db.insert('messages', {
    senderId: req.user.id,
    senderName: req.user.name,
    receiverId: tutor.id,
    receiverName: tutor.name,
    text: `📅 New Booking Request: I requested a lesson on ${date} at ${time} for "${subject}".`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, booking });
});

app.put('/api/bookings/:id', requireAuth, (req, res) => {
  const booking = db.findOne('bookings', { id: req.params.id });
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  // Authorize: must be the student or tutor involved
  if (req.user.id !== booking.studentId && req.user.id !== booking.tutorId) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const { status } = req.body;
  if (!['scheduled', 'completed', 'cancelled', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Handle financial transactions when status transitions
  if (status === 'completed' && booking.status !== 'completed') {
    // Transfer funds to Tutor's wallet balance
    const earnings = booking.rate * booking.duration;
    const tutor = db.findOne('users', { id: booking.tutorId });
    if (tutor) {
      const newBal = parseFloat((tutor.walletBalance + earnings).toFixed(2));
      const newTotal = parseFloat((tutor.totalEarnings + earnings).toFixed(2));
      const newHours = (tutor.hoursTaught || 0) + booking.duration;
      db.update('users', { id: tutor.id }, { 
        walletBalance: newBal, 
        totalEarnings: newTotal,
        hoursTaught: newHours
      });
    }
  } else if (status === 'cancelled' && booking.status !== 'cancelled' && booking.status !== 'completed') {
    // Refund Student (if it wasn't cancelled already)
    const refund = booking.rate * booking.duration;
    const student = db.findOne('users', { id: booking.studentId });
    if (student) {
      db.update('users', { id: student.id }, { balance: parseFloat((student.balance + refund).toFixed(2)) });
    }
  }

  db.update('bookings', { id: booking.id }, { status });

  // Send status update notification message
  const updaterName = req.user.name;
  db.insert('messages', {
    senderId: req.user.id,
    senderName: updaterName,
    receiverId: req.user.id === booking.studentId ? booking.tutorId : booking.studentId,
    receiverName: req.user.id === booking.studentId ? booking.tutorName : booking.studentName,
    text: `🔔 Lesson Update: The lesson on ${booking.date} at ${booking.time} was updated to: ${status.toUpperCase()} by ${updaterName}.`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, booking: { ...booking, status } });
});

// ----------------- Messages API Endpoints -----------------

app.get('/api/messages', requireAuth, (req, res) => {
  const messages = db.find('messages', item => 
    item.senderId === req.user.id || item.receiverId === req.user.id
  );
  // Sort chronologically
  messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  res.json(messages);
});

app.get('/api/messages/channels', requireAuth, (req, res) => {
  const messages = db.find('messages', item => 
    item.senderId === req.user.id || item.receiverId === req.user.id
  );

  const channels = {};
  messages.forEach(msg => {
    const isSender = msg.senderId === req.user.id;
    const contactId = isSender ? msg.receiverId : msg.senderId;
    const contactName = isSender ? msg.receiverName : msg.senderName;
    
    if (!channels[contactId]) {
      channels[contactId] = {
        contactId,
        contactName,
        lastMessage: msg.text,
        timestamp: msg.timestamp,
        unread: false // Simple simulation: read is true
      };
    } else {
      if (new Date(msg.timestamp) > new Date(channels[contactId].timestamp)) {
        channels[contactId].lastMessage = msg.text;
        channels[contactId].timestamp = msg.timestamp;
      }
    }
  });

  res.json(Object.values(channels).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

app.post('/api/messages', requireAuth, (req, res) => {
  const { receiverId, text } = req.body;
  if (!receiverId || !text) {
    return res.status(400).json({ error: 'Receiver ID and message content are required' });
  }

  const receiver = db.findOne('users', { id: receiverId });
  if (!receiver) {
    return res.status(404).json({ error: 'Recipient not found' });
  }

  const newMsg = {
    senderId: req.user.id,
    senderName: req.user.name,
    receiverId: receiver.id,
    receiverName: receiver.name,
    text,
    timestamp: new Date().toISOString()
  };

  const created = db.insert('messages', newMsg);
  res.json(created);
});

// ----------------- Wallet API Endpoints -----------------

app.get('/api/wallet', requireAuth, (req, res) => {
  if (req.user.role !== 'tutor') {
    return res.status(403).json({ error: 'Only tutors have wallets' });
  }
  const history = db.find('walletRequests', { tutorId: req.user.id });
  res.json({
    balance: req.user.walletBalance || 0,
    earnings: req.user.totalEarnings || 0,
    history
  });
});

app.post('/api/wallet/payout', requireAuth, (req, res) => {
  if (req.user.role !== 'tutor') {
    return res.status(403).json({ error: 'Only tutors can request payouts' });
  }

  const amount = parseFloat(req.body.amount);
  const method = req.body.method || "Direct Deposit";
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid payout amount' });
  }

  if (req.user.walletBalance < amount) {
    return res.status(400).json({ error: 'Insufficient wallet balance' });
  }

  // Deduct
  const newBal = parseFloat((req.user.walletBalance - amount).toFixed(2));
  db.update('users', { id: req.user.id }, { walletBalance: newBal });

  const payoutReq = db.insert('walletRequests', {
    tutorId: req.user.id,
    amount,
    status: "pending",
    date: new Date().toISOString().split('T')[0],
    method
  });

  res.json({ success: true, payout: payoutReq, walletBalance: newBal });
});

// ----------------- Profile / Settings Endpoints -----------------

app.put('/api/users/profile', requireAuth, (req, res) => {
  const { name, bio, phone, languages, currentPassword, newPassword } = req.body;
  const updateData = {};
  
  if (name) updateData.name = name;
  if (bio) updateData.bio = bio;
  if (phone) updateData.phone = phone;
  if (languages) {
    updateData.languages = Array.isArray(languages) ? languages : languages.split(',').map(l => l.trim());
  }

  if (currentPassword && newPassword) {
    if (req.user.password !== currentPassword) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }
    updateData.password = newPassword;
  }

  const updated = db.update('users', { id: req.user.id }, updateData);
  res.json({ success: true, user: updated[0] });
});

// ----------------- Inquiry Endpoint -----------------

app.post('/api/inquiries', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required' });
  }

  const inquiry = db.insert('inquiries', {
    name: name || 'Anonymous',
    email,
    subject: subject || 'General Study Compass Inquiry',
    message,
    date: new Date().toISOString()
  });

  res.json({ success: true, inquiry });
});

// ----------------- Subscription Endpoint -----------------

app.post('/api/subscription', requireAuth, (req, res) => {
  const { planName } = req.body;
  if (!planName) {
    return res.status(400).json({ error: 'Plan name is required' });
  }
  
  // Set user plan status in DB
  const updated = db.update('users', { id: req.user.id }, { plan: planName });
  res.json({ success: true, user: updated[0] });
});

// Helper for routing: serve index.html for client route fallback or direct HTML routing
app.get('*', (req, res, next) => {
  // Let express.static handle standard files first
  next();
});

app.listen(PORT, () => {
  console.log(`TutorNest server running at http://localhost:${PORT}`);
});
