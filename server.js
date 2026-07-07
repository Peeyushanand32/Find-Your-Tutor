require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { User, Booking, Message, Inquiry, WalletRequest } = require('./db');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Route Guard: Restrict non-logged in users from accessing any pages except home and reset password
app.get('/*.html', async (req, res, next) => {
  const page = req.path.toLowerCase();
  if (page === '/index.html' || page === '/reset-password.html' || page === '/subscription.html' || page === '/pricing.html') {
    return next();
  }
  
  const userId = req.cookies.userId;
  if (!userId) {
    return res.redirect('/index.html?login=true');
  }

  // Restrict Basic/unsubscribed students from accessing dashboard, messages, or calendar
  const user = await User.findOne({ id: userId });
  if (user && user.role === 'student' && (user.plan === 'Basic' || !user.plan)) {
    if (page === '/student-dashboard.html' || page === '/student-messages.html' || page === '/student-calendar.html') {
      return res.redirect('/pricing.html');
    }
  }

  // Restrict Basic/unsubscribed tutors from accessing instructor dashboard or calendar
  if (user && user.role === 'tutor' && (user.plan === 'Basic' || !user.plan)) {
    if (page === '/instructor-dashboard.html' || page === '/instructor-calendar.html') {
      return res.redirect('/pricing.html');
    }
  }
  next();
});

app.use(passport.initialize());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "YOUR_GOOGLE_CLIENT_SECRET",
    callbackURL: "/api/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, done) {
    // Check if user already exists in db.json by email or googleId
    const email = profile.emails[0].value;
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Register a new student profile dynamically using Google Details
      user = await User.create({
        email: email.toLowerCase(),
        password: "oauth_generated_password",
        name: profile.displayName,
        role: "student", // default role
        avatar: profile.photos[0].value || "JD",
        balance: 100.00,
        plan: "Basic",
        bio: `Joined via Google.`,
        languages: ["English"],
        phone: ""
      });
    }

    return done(null, user);
  }
));

// Serve static frontend assets from /public
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware helper
async function getCurrentUser(req) {
  const userId = req.cookies.userId;
  if (!userId) return null;
  const user = await User.findOne({ id: userId });
  if (user && !user.createdAt) {
    user.createdAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await User.findOneAndUpdate({ id: userId }, { createdAt: user.createdAt });
  }
  return user;
}

async function requireAuth(req, res, next) {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  req.user = user;
  next();
}

// ----------------- Auth API Endpoints -----------------

app.get('/api/auth/me', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.json({ loggedIn: false });

  // Exclude password
  const { password, ...userSafe } = user;
  res.json({ loggedIn: true, user: userSafe });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.cookie('userId', user.id, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
  const { password: _, ...userSafe } = user;
  res.json({ success: true, user: userSafe });
});

// Trigger Google Login Screen
app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback URL to log user in locally and set cookies
app.get('/api/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/index.html', session: false }),
  (req, res) => {
    // Set cookie session with the authenticated user ID
    res.cookie('userId', req.user.id, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    
    // Redirect new Google users to profile settings, existing ones to dashboard
    const isNew = req.user.bio === "Joined via Google." && (!req.user.phone);
    if (isNew) {
      res.redirect('/student-settings-profile.html');
    } else {
      res.redirect('/student-dashboard.html');
    }
  }
);

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, role, phone } = req.body;
  if (!email || !password || !name || !role || !phone) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
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
    phone,
    createdAt: new Date().toISOString()
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
      location: "Delhi",
      walletBalance: 0.00,
      totalEarnings: 0.00
    });
  }

  const createdUser = await User.create(newUser);
  res.cookie('userId', createdUser.id, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
  const { password: _, ...userSafe } = createdUser;
  res.json({ success: true, user: userSafe });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('userId');
  res.json({ success: true });
});

// Forgot Password Token Request & Email Sender Setup
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || "peeyushanand63@gmail.com",
    pass: process.env.EMAIL_PASS || "jisc cuze bkdz lpjz"
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email' });
  }

  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(16).toString('hex');
  const resetExpiry = Date.now() + 3600000;

  await User.findOneAndUpdate({ id: user.id }, { resetToken, resetExpiry });

  const resetLink = `http://localhost:3000/reset-password.html?token=${resetToken}`;

  const mailOptions = {
    from: `"TutorNest Team" <${process.env.EMAIL_USER || "your-email@gmail.com"}>`,
    to: user.email,
    subject: 'Password Reset Request | TutorNest',
    html: `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #1A56DB; margin-bottom: 20px; font-weight: bold;">TutorNest</h2>
        <p style="font-size: 16px; color: #1f2937; line-height: 1.5;">Hello ${user.name},</p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">We received a request to reset the password for your TutorNest account. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #1A56DB 0%, #7C3AED 100%); color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 9999px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #9ca3af; line-height: 1.5;">This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">© 2024 TutorNest. All rights reserved.</p>
      </div>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Email sending failed:', error);
      // Fallback: still log the link locally so they don't get blocked if credentials are empty
      console.log(`[LOCAL FALLBACK] Password Reset Link: ${resetLink}`);
      return res.json({ 
        success: true, 
        message: 'Email delivery failed, but reset link generated successfully! For local testing, check your console.',
        resetLink: resetLink 
      });
    }
    
    console.log('Email sent successfully:', info.response);
    res.json({ 
      success: true, 
      message: 'A password reset link has been successfully sent to your email address!'
    });
  });
});

// Confirm Reset Password Request
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }

  const user = await User.findOne({ resetToken: token });
  if (!user || user.resetExpiry < Date.now()) {
    return res.status(400).json({ error: 'Reset token is invalid or has expired.' });
  }

  await User.findOneAndUpdate({ id: user.id }, { 
    password, 
    resetToken: null, 
    resetExpiry: null 
  });

  res.json({ success: true, message: 'Password updated successfully!' });
});

// ----------------- Tutors API Endpoints -----------------

app.get('/api/tutors', async (req, res) => {
  const { subject, minPrice, maxPrice, rating, gradeLevel, availability, sort } = req.query;
  let tutors = await User.find({ role: 'tutor' });

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

app.get('/api/users/:id', requireAuth, async (req, res) => {
  const user = await User.findOne({ id: req.params.id });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

app.get('/api/tutors/:id', async (req, res) => {
  const tutor = await User.findOne({ id: req.params.id, role: 'tutor' });
  if (!tutor) {
    return res.status(404).json({ error: 'Tutor not found' });
  }
  const reviews = [];
  res.json({ tutor, reviews });
});

app.put('/api/tutors/:id', requireAuth, async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const { name, title, rate, bio, subjects, location, education, targetGrades, avatar, availability } = req.body;
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (title !== undefined) updateData.title = title;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (rate !== undefined) updateData.rate = parseFloat(rate);
  if (bio !== undefined) updateData.bio = bio;
  if (location !== undefined) updateData.location = location;
  if (targetGrades !== undefined) updateData.targetGrades = targetGrades;
  if (subjects !== undefined) {
    updateData.subjects = Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim());
  }
  if (education !== undefined) {
    updateData.education = Array.isArray(education) ? education : [];
  }
  if (availability !== undefined) {
    updateData.availability = Array.isArray(availability) ? availability : [];
  }

  const updated = await User.findOneAndUpdate({ id: req.user.id }, updateData, { new: true });
  res.json({ success: true, user: updated });
});

// ----------------- Bookings API Endpoints -----------------

app.get('/api/bookings', requireAuth, async (req, res) => {
  let bookings;
  if (req.user.role === 'student') {
    bookings = await Booking.find({ studentId: req.user.id });
  } else {
    bookings = await Booking.find({ tutorId: req.user.id });
  }
  // Sort by date, soonest first
  bookings.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(bookings);
});

app.post('/api/bookings', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can book lessons' });
  }

  if (req.user.plan === 'Basic' || !req.user.plan) {
    return res.status(403).json({ error: 'Booking lessons requires an active subscription. Please upgrade your plan.' });
  }

  const { tutorId, subject, date, time, duration } = req.body;
  if (!tutorId || !subject || !date || !time) {
    return res.status(400).json({ error: 'All booking fields are required' });
  }

  const tutor = await User.findOne({ id: tutorId, role: 'tutor' });
  if (!tutor) {
    return res.status(404).json({ error: 'Tutor not found' });
  }

  const hours = parseFloat(duration) || 1;
  const totalCost = tutor.rate * hours;

  if (req.user.balance < totalCost) {
    return res.status(400).json({ error: 'Insufficient funds. Please top up your wallet or subscribe to a plan.' });
  }

  // Deduct student balance
  await User.findOneAndUpdate({ id: req.user.id }, { balance: parseFloat((req.user.balance - totalCost).toFixed(2)) });

  const meetingRoomName = `TutorNest-${subject.replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).substring(2, 10)}`;
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
    duration: hours,
    meetingLink: `https://meet.jit.si/${meetingRoomName}`
  };

  const booking = await Booking.create(newBooking);

  // Send automatic notification message in chat
  await Message.create({
    senderId: req.user.id,
    senderName: req.user.name,
    receiverId: tutor.id,
    receiverName: tutor.name,
    text: `📅 New Booking Request: I requested a lesson on ${date} at ${time} for "${subject}".`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, booking });
});

app.put('/api/bookings/:id', requireAuth, async (req, res) => {
  const booking = await Booking.findOne({ id: req.params.id });
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
    const tutor = await User.findOne({ id: booking.tutorId });
    if (tutor) {
      const newBal = parseFloat((tutor.walletBalance + earnings).toFixed(2));
      const newTotal = parseFloat((tutor.totalEarnings + earnings).toFixed(2));
      const newHours = (tutor.hoursTaught || 0) + booking.duration;
      await User.findOneAndUpdate({ id: tutor.id }, {
        walletBalance: newBal,
        totalEarnings: newTotal,
        hoursTaught: newHours
      });
    }
  } else if (status === 'cancelled' && booking.status !== 'cancelled' && booking.status !== 'completed') {
    // Refund Student (if it wasn't cancelled already)
    const refund = booking.rate * booking.duration;
    const student = await User.findOne({ id: booking.studentId });
    if (student) {
      await User.findOneAndUpdate({ id: student.id }, { balance: parseFloat((student.balance + refund).toFixed(2)) });
    }
  }

  const oldStatus = booking.status;
  let updatedFields = { status };
  if (status === 'scheduled' && !booking.meetingLink) {
    const meetingRoomName = `TutorNest-${booking.subject.replace(/[^a-zA-Z0-9]/g, '')}-${booking.id}`;
    updatedFields.meetingLink = `https://meet.jit.si/${meetingRoomName}`;
    booking.meetingLink = updatedFields.meetingLink;
  }
  await Booking.findOneAndUpdate({ id: booking.id }, updatedFields);

  // Send status update notification message
  const updaterName = req.user.name;
  let msgText = `🔔 Lesson Update: The lesson on ${booking.date} at ${booking.time} was updated to: ${status.toUpperCase()} by ${updaterName}.`;
  if (status === 'scheduled' && booking.meetingLink) {
    msgText += `\n🔗 Join Video Session: ${booking.meetingLink}`;
  }

  await Message.create({
    senderId: req.user.id,
    senderName: updaterName,
    receiverId: req.user.id === booking.studentId ? booking.tutorId : booking.studentId,
    receiverName: req.user.id === booking.studentId ? booking.tutorName : booking.studentName,
    text: msgText,
    timestamp: new Date().toISOString()
  });

  // If request is accepted by the teacher, send email and SMS
  const wasAccepted = (status === 'scheduled' && oldStatus !== 'scheduled' && req.user.id === booking.tutorId);
  if (wasAccepted) {
    const student = await User.findOne({ id: booking.studentId });
    if (student) {
      const tutor = req.user;
      const meetingUrl = updatedFields.meetingLink || booking.meetingLink;
      
      // 1. Send Email via Nodemailer
      if (student.email) {
        const mailOptions = {
          from: `"TutorNest Team" <${process.env.EMAIL_USER || "your-email@gmail.com"}>`,
          to: student.email,
          subject: 'Lesson Request Accepted | TutorNest',
          html: `
            <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #1A56DB; margin-bottom: 20px; font-weight: bold;">TutorNest</h2>
              <p style="font-size: 16px; color: #1f2937; line-height: 1.5;">Hello ${student.name},</p>
              <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">Your lesson request with <b>${tutor.name}</b> has been accepted!</p>
              
              <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151;"><b>Subject:</b> ${booking.subject}</p>
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151;"><b>Date:</b> ${booking.date}</p>
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151;"><b>Time:</b> ${booking.time}</p>
                <p style="margin: 0; font-size: 14px; color: #374151;"><b>Join Link:</b> <a href="${meetingUrl}" style="color: #1A56DB; font-weight: 600; text-decoration: underline;">Join Video Session</a></p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">© 2024 TutorNest. All rights reserved.</p>
            </div>
          `
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Failed to send acceptance email to student:', error);
          } else {
            console.log('Acceptance email sent successfully to student:', info.response);
          }
        });
      }

      // 2. Send SMS (Mocked via console log)
      if (student.phone) {
        const smsText = `Hello ${student.name}, your lesson request with ${tutor.name} for "${booking.subject}" on ${booking.date} at ${booking.time} has been accepted! Join: ${meetingUrl}`;
        console.log(`[SMS MOCK] Sent to ${student.phone}: "${smsText}"`);
      } else {
        console.log(`[SMS MOCK] Student ${student.name} has no registered phone number.`);
      }
    }
  }

  res.json({ success: true, booking: { ...booking, status } });
});

// ----------------- Messages API Endpoints -----------------

app.get('/api/messages', requireAuth, async (req, res) => {
  const messages = await Message.find({
    $or: [{ senderId: req.user.id }, { receiverId: req.user.id }]
  });
  // Sort chronologically
  messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  res.json(messages);
});

app.get('/api/messages/channels', requireAuth, async (req, res) => {
  const messages = await Message.find({
    $or: [{ senderId: req.user.id }, { receiverId: req.user.id }]
  });

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

app.post('/api/messages', requireAuth, async (req, res) => {
  const { receiverId, text } = req.body;
  if (!receiverId || !text) {
    return res.status(400).json({ error: 'Receiver ID and message content are required' });
  }

  // Trial Expired Check
  if (req.user.role === 'tutor' && req.user.plan !== 'Premium') {
    const createdAtStr = req.user.createdAt || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const createdTime = new Date(createdAtStr).getTime();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    if ((Date.now() - createdTime) > twoDaysMs) {
      return res.status(403).json({ error: 'Your trial has expired. Please subscribe to Premium to send messages.' });
    }
  }

  const receiver = await User.findOne({ id: receiverId });
  if (!receiver) {
    return res.status(404).json({ error: 'Recipient not found' });
  }

  // Restriction: messaging is restricted between student and tutor until a lesson request is accepted
  const isStudent = req.user.role === 'student';
  const isReceiverStudent = receiver.role === 'student';
  if ((isStudent && receiver.role === 'tutor') || (req.user.role === 'tutor' && isReceiverStudent)) {
    const studentId = isStudent ? req.user.id : receiver.id;
    const tutorId = isStudent ? receiver.id : req.user.id;
    
    const bookings = await Booking.find({ studentId, tutorId });
    const hasAcceptedBooking = bookings.some(b => b.status === 'scheduled' || b.status === 'completed');
    
    if (!hasAcceptedBooking) {
      return res.status(403).json({ error: 'Messaging is restricted until the lesson request has been accepted.' });
    }
  }

  const newMsg = {
    senderId: req.user.id,
    senderName: req.user.name,
    receiverId: receiver.id,
    receiverName: receiver.name,
    text,
    timestamp: new Date().toISOString()
  };

  const created = await Message.create(newMsg);
  res.json(created);
});

app.delete('/api/messages/:id', requireAuth, async (req, res) => {
  const msg = await Message.findOne({ id: req.params.id });
  if (!msg) {
    return res.status(404).json({ error: 'Message not found' });
  }

  // A user can delete a message if they sent it or if they received it
  if (msg.senderId !== req.user.id && msg.receiverId !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized to delete this message' });
  }

  await Message.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

// ----------------- Wallet API Endpoints -----------------

app.get('/api/wallet', requireAuth, async (req, res) => {
  if (req.user.role !== 'tutor') {
    return res.status(403).json({ error: 'Only tutors have wallets' });
  }
  const history = await WalletRequest.find({ tutorId: req.user.id });
  res.json({
    balance: req.user.walletBalance || 0,
    earnings: req.user.totalEarnings || 0,
    history
  });
});

app.post('/api/wallet/payout', requireAuth, async (req, res) => {
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
  await User.findOneAndUpdate({ id: req.user.id }, { walletBalance: newBal });

  const payoutReq = await WalletRequest.create({
    tutorId: req.user.id,
    amount,
    status: "pending",
    date: new Date().toISOString().split('T')[0],
    method
  });

  res.json({ success: true, payout: payoutReq, walletBalance: newBal });
});

// ----------------- Profile / Settings Endpoints -----------------

app.put('/api/users/profile', requireAuth, async (req, res) => {
  const { name, bio, phone, languages, currentPassword, newPassword, grade, city, hourlyBudget, targetSubject, targetExam, avatar } = req.body;
  const updateData = {};

  if (name !== undefined) updateData.name = name;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (bio !== undefined) updateData.bio = bio;
  if (phone !== undefined) updateData.phone = phone;
  if (grade !== undefined) updateData.grade = grade;
  if (city !== undefined) updateData.city = city;
  if (hourlyBudget !== undefined) updateData.hourlyBudget = parseFloat(hourlyBudget) || 0;
  if (targetSubject !== undefined) updateData.targetSubject = targetSubject;
  if (targetExam !== undefined) updateData.targetExam = targetExam;
  if (languages) {
    updateData.languages = Array.isArray(languages) ? languages : languages.split(',').map(l => l.trim());
  }

  if (currentPassword && newPassword) {
    if (req.user.password !== currentPassword) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }
    updateData.password = newPassword;
  }

  const updated = await User.findOneAndUpdate({ id: req.user.id }, updateData, { new: true });
  res.json({ success: true, user: updated });
});

// ----------------- Inquiry Endpoints & Export -----------------

app.post('/api/inquiries', async (req, res) => {
  const { name, studentName, grade, subject, phone, location, email, message } = req.body;
  if (!email && !phone) {
    return res.status(400).json({ error: 'Email or phone number is required' });
  }

  const newInquiry = {
    name: name || 'Anonymous',
    studentName: studentName || '',
    grade: grade || '',
    subject: subject || 'General Inquiry',
    phone: phone || '',
    location: location || '',
    email: email || 'visitor@tutornest.com',
    message: message || '',
    date: new Date().toISOString()
  };

  const inquiry = await Inquiry.create(newInquiry);

  // Optional: Sync to Google Sheets Webhook online in real-time
  const googleSheetWebhook = process.env.GOOGLE_SHEET_WEBHOOK || "https://script.google.com/macros/s/AKfycbzUbbpYRq8gVXJSas2474ReotIvkINrHaVyV4ImHm9dVVteNEGa1kVZIrwvHkUXtX1mlA/exec";
  if (googleSheetWebhook) {
    fetch(googleSheetWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiry)
    }).catch(err => console.error('Failed to sync to Google Sheets:', err));
  }

  res.json({ success: true, inquiry });
});

app.get('/api/admin/inquiries/export', async (req, res) => {
  const inquiries = await Inquiry.find({});

  // UTF-8 BOM to ensure Excel opens accented characters correctly
  let csvContent = '\uFEFF';
  csvContent += 'Date,Parent/Guardian Name,Student Name,Grade Level,Subject,Phone,Email,Location,Message\n';

  inquiries.forEach(inq => {
    const row = [
      inq.date ? new Date(inq.date).toLocaleString() : '',
      inq.name || '',
      inq.studentName || '',
      inq.grade || '',
      inq.subject || '',
      inq.phone || '',
      inq.email || '',
      inq.location || '',
      (inq.message || '').replace(/"/g, '""').replace(/\n/g, ' ')
    ].map(val => `"${val}"`).join(',');

    csvContent += row + '\n';
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tutornest-inquiries.csv"');
  res.status(200).send(csvContent);
});

// ----------------- Subscription / Stripe Payment Endpoints -----------------

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key');

// ----------------- Razorpay Payment Endpoints -----------------
const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: 'rzp_live_TA7tJ4AmblMiTb',
  key_secret: 'fAzrp2zto37Mn0plMUg9KTlj',
});

app.post('/api/payments/order', async (req, res) => {
  const { amount, currency } = req.body; // e.g., amount: 500 (INR 500)

  const options = {
    amount: amount * 100, // Razorpay expects amount in the smallest currency sub-unit (paise for INR, e.g., 50000 paise = 500 INR)
    currency: currency || 'INR',
    receipt: `receipt_order_${Date.now()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments/verify', requireAuth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planName } = req.body;
  const crypto = require('crypto');

  const generatedSignature = crypto
    .createHmac('sha256', 'fAzrp2zto37Mn0plMUg9KTlj')
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature === razorpay_signature) {
    // Signature verified successfully
    // Update user's subscription plan in DB
    const updated = await User.findOneAndUpdate({ id: req.user.id }, { plan: planName || 'Premium' }, { new: true });
    const { password, ...userSafe } = updated;
    res.status(200).json({ success: true, message: 'Payment verified successfully', user: userSafe });
  } else {
    res.status(400).json({ success: false, message: 'Invalid payment signature' });
  }
});

app.post('/api/checkout/create-session', requireAuth, async (req, res) => {
  const { planName } = req.body;
  if (!planName) {
    return res.status(400).json({ error: 'Plan name is required' });
  }

  let priceCents = 99900;
  if (planName === 'Premium') priceCents = 499900;

  try {
    const dashboardUrl = req.user.role === 'tutor' ? '/instructor-dashboard.html' : '/student-dashboard.html';

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder_key') {
      // Mock session for local offline testing
      return res.json({
        id: `mock_session_${Date.now()}`,
        url: `${dashboardUrl}?session_id=mock_session_${Date.now()}&plan=${encodeURIComponent(planName)}`
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: {
            name: `TutorNest ${planName} Plan`,
            description: `Monthly access to all premium features`,
          },
          unit_amount: priceCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `http://localhost:3000${dashboardUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(planName)}`,
      cancel_url: 'http://localhost:3000/pricing.html',
      client_reference_id: req.user.id
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('Stripe session creation failed:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/checkout/confirm', requireAuth, async (req, res) => {
  const { sessionId, planName } = req.body;
  if (!sessionId || !planName) {
    return res.status(400).json({ error: 'Session ID and Plan Name are required' });
  }

  const updated = await User.findOneAndUpdate({ id: req.user.id }, { plan: planName }, { new: true });
  const { password, ...userSafe } = updated;
  res.json({ success: true, user: userSafe });
});

// Helper for routing: serve index.html for client route fallback or direct HTML routing
app.get('*', (req, res, next) => {
  // Let express.static handle standard files first
  next();
});

app.listen(PORT, () => {
  console.log(`TutorNest server running at http://localhost:${PORT}`);
});
