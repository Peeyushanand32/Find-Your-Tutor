const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { User, Booking, Message, Inquiry, WalletRequest } = require('./db');

const DB_PATH = path.join(__dirname, 'db.json');

async function runMigration() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.log('No db.json file found to migrate.');
      process.exit(0);
    }

    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    console.log('Clearing existing MongoDB collections...');
    await User.deleteMany({});
    await Booking.deleteMany({});
    await Message.deleteMany({});
    await Inquiry.deleteMany({});
    await WalletRequest.deleteMany({});

    console.log('Migrating Users...');
    if (Array.isArray(data.users)) {
      await User.insertMany(data.users);
      console.log(`Migrated ${data.users.length} users.`);
    }

    console.log('Migrating Bookings...');
    if (Array.isArray(data.bookings)) {
      await Booking.insertMany(data.bookings);
      console.log(`Migrated ${data.bookings.length} bookings.`);
    }

    console.log('Migrating Messages...');
    if (Array.isArray(data.messages)) {
      await Message.insertMany(data.messages);
      console.log(`Migrated ${data.messages.length} messages.`);
    }

    console.log('Migrating Inquiries...');
    if (Array.isArray(data.inquiries)) {
      await Inquiry.insertMany(data.inquiries);
      console.log(`Migrated ${data.inquiries.length} inquiries.`);
    }

    console.log('Migrating WalletRequests...');
    if (Array.isArray(data.walletRequests)) {
      await WalletRequest.insertMany(data.walletRequests);
      console.log(`Migrated ${data.walletRequests.length} wallet requests.`);
    }

    console.log('Migration completed successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Wait for mongoose connection before migrating
mongoose.connection.once('open', runMigration);
mongoose.connection.on('error', (err) => {
  console.error('Migration connection error:', err.message);
  process.exit(1);
});
