const mongoose = require('mongoose');
require('dotenv').config();
const db = require('./db.js');

async function run() {
  const userId = process.argv[2];
  if (!userId) {
    console.log('Usage: node find-user.js <TN-USER-ID>');
    process.exit(1);
  }

  console.log(`Searching for User with ID: ${userId}...`);
  
  // Wait a moment for mongoose connection if active
  await new Promise(resolve => setTimeout(resolve, 2000));

  let user = await db.User.findOne({ id: userId });

  if (user) {
    console.log('\nUser Found!');
    console.log('------------------------------------');
    console.log('Name:      ', user.name);
    console.log('Email:     ', user.email);
    console.log('Role:      ', user.role);
    console.log('Plan:      ', user.plan || 'Basic');
    console.log('Balance:   ', `₹${user.balance || 0}`);
    console.log('Created At:', user.createdAt);
    console.log('------------------------------------');
  } else {
    console.log('\nUser not found in database.');
  }

  process.exit(0);
}

run();
