require('dotenv').config();
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
      for (const item of data.users) {
        await User.create(item);
      }
      console.log(`Migrated ${data.users.length} users.`);
    }

    console.log('Migrating Bookings...');
    if (Array.isArray(data.bookings)) {
      for (const item of data.bookings) {
        await Booking.create(item);
      }
      console.log(`Migrated ${data.bookings.length} bookings.`);
    }

    console.log('Migrating Messages...');
    if (Array.isArray(data.messages)) {
      for (const item of data.messages) {
        await Message.create(item);
      }
      console.log(`Migrated ${data.messages.length} messages.`);
    }

    console.log('Migrating Inquiries...');
    if (Array.isArray(data.inquiries)) {
      for (const item of data.inquiries) {
        await Inquiry.create(item);
      }
      console.log(`Migrated ${data.inquiries.length} inquiries.`);
    }

    console.log('Migrating WalletRequests...');
    if (Array.isArray(data.walletRequests)) {
      for (const item of data.walletRequests) {
        await WalletRequest.create(item);
      }
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
