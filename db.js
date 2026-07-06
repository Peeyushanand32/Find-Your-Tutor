const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tutornest';
const DB_PATH = path.join(__dirname, 'db.json');

mongoose.connect(MONGODB_URI).then(() => {
  console.log('Successfully connected to MongoDB database');
}).catch((err) => {
  console.warn('MongoDB not running. Falling back to local JSON database.');
});

// Seed data definition
const initialData = {
  users: [],
  bookings: [],
  messages: [],
  inquiries: [],
  walletRequests: []
};

class LocalFallbackDB {
  constructor() {
    this.load();
  }
  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(raw);
      } else {
        this.data = JSON.parse(JSON.stringify(initialData));
        this.save();
      }
    } catch (e) {
      this.data = JSON.parse(JSON.stringify(initialData));
    }
  }
  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save fallback database', e);
    }
  }
}
const localDB = new LocalFallbackDB();

// Schema Definitions
const Schemas = {
  User: new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['student', 'tutor'], required: true },
    avatar: { type: String, default: '' },
    plan: { type: String, default: 'Basic' },
    bio: { type: String, default: '' },
    languages: { type: [String], default: ['English'] },
    phone: { type: String, default: '' },
    balance: { type: Number, default: 0 },
    city: { type: String, default: '' },
    targetGrades: { type: [String], default: [] },
    targetSubject: { type: String, default: '' },
    targetExam: { type: String, default: '' },
    budget: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    rating: { type: Number, default: 5 },
    reviewsCount: { type: Number, default: 0 },
    hoursTaught: { type: Number, default: 0 },
    subjects: { type: [String], default: [] },
    title: { type: String, default: '' },
    education: {
      type: [{
        degree: String,
        institution: String,
        year: String
      }],
      default: []
    },
    location: { type: String, default: '' },
    walletBalance: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    availability: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    resetToken: { type: String, default: '' },
    resetExpiry: { type: Date }
  }),
  Booking: new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    tutorId: { type: String, required: true },
    tutorName: { type: String, required: true },
    subject: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['scheduled', 'pending', 'completed', 'cancelled'], default: 'pending' },
    rate: { type: Number, required: true },
    duration: { type: Number, default: 1 }
  }),
  Message: new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    receiverId: { type: String, required: true },
    receiverName: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }),
  Inquiry: new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    name: { type: String, default: '' },
    studentName: { type: String, default: '' },
    grade: { type: String, default: '' },
    subject: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    email: { type: String, default: '' },
    message: { type: String, default: '' },
    date: { type: Date, default: Date.now }
  }),
  WalletRequest: new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    tutorId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    date: { type: String, required: true },
    method: { type: String, default: '' }
  })
};

function makeModelWrapper(modelName, collectionName) {
  const MongooseModel = mongoose.model(modelName, Schemas[modelName]);
  
  return {
    find: async function(filter = {}) {
      if (mongoose.connection.readyState === 1) {
        return await MongooseModel.find(filter).lean();
      }
      localDB.load();
      let list = localDB.data[collectionName] || [];
      if (typeof filter === 'function') {
        return list.filter(filter);
      }
      return list.filter(item => {
        if (filter.$or && Array.isArray(filter.$or)) {
          return filter.$or.some(subFilter => {
            for (let key in subFilter) {
              if (item[key] !== subFilter[key]) return false;
            }
            return true;
          });
        }
        for (let key in filter) {
          if (item[key] !== filter[key]) return false;
        }
        return true;
      });
    },

    findOne: async function(filter = {}) {
      if (mongoose.connection.readyState === 1) {
        return await MongooseModel.findOne(filter).lean();
      }
      const results = await this.find(filter);
      return results.length > 0 ? results[0] : null;
    },

    create: async function(data) {
      if (mongoose.connection.readyState === 1) {
        const doc = await MongooseModel.create(data);
        return doc.toObject();
      }
      localDB.load();
      if (!localDB.data[collectionName]) {
        localDB.data[collectionName] = [];
      }
      const newRecord = {
        id: data.id || `${collectionName.substring(0, 3)}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ...data
      };
      localDB.data[collectionName].push(newRecord);
      localDB.save();
      return newRecord;
    },

    updateOne: async function(filter, updateObj) {
      if (mongoose.connection.readyState === 1) {
        return await MongooseModel.updateOne(filter, updateObj);
      }
      localDB.load();
      const records = await this.find(filter);
      records.forEach(item => {
        const actualUpdate = updateObj.$set ? updateObj.$set : updateObj;
        Object.assign(item, actualUpdate);
      });
      localDB.save();
      return { nModified: records.length };
    },

    updateMany: async function(filter, updateObj) {
      return await this.updateOne(filter, updateObj);
    },

    findOneAndUpdate: async function(filter, updateObj, options = {}) {
      if (mongoose.connection.readyState === 1) {
        return await MongooseModel.findOneAndUpdate(filter, updateObj, { new: true, ...options }).lean();
      }
      localDB.load();
      const record = await this.findOne(filter);
      if (record) {
        const actualUpdate = updateObj.$set ? updateObj.$set : updateObj;
        Object.assign(record, actualUpdate);
        localDB.save();
      }
      return record;
    },

    deleteOne: async function(filter) {
      if (mongoose.connection.readyState === 1) {
        return await MongooseModel.deleteOne(filter);
      }
      localDB.load();
      const list = localDB.data[collectionName] || [];
      localDB.data[collectionName] = list.filter(item => {
        for (let key in filter) {
          if (item[key] === filter[key]) return false;
        }
        return true;
      });
      localDB.save();
      return { deletedCount: 1 };
    },

    deleteMany: async function(filter = {}) {
      if (mongoose.connection.readyState === 1) {
        return await MongooseModel.deleteMany(filter);
      }
      localDB.load();
      if (Object.keys(filter).length === 0) {
        localDB.data[collectionName] = [];
      } else {
        const list = localDB.data[collectionName] || [];
        localDB.data[collectionName] = list.filter(item => {
          for (let key in filter) {
            if (item[key] === filter[key]) return false;
          }
          return true;
        });
      }
      localDB.save();
      return { deletedCount: 1 };
    }
  };
}

const User = makeModelWrapper('User', 'users');
const Booking = makeModelWrapper('Booking', 'bookings');
const Message = makeModelWrapper('Message', 'messages');
const Inquiry = makeModelWrapper('Inquiry', 'inquiries');
const WalletRequest = makeModelWrapper('WalletRequest', 'walletRequests');

function getModelByTable(table) {
  switch (table) {
    case 'users': return User;
    case 'bookings': return Booking;
    case 'messages': return Message;
    case 'inquiries': return Inquiry;
    case 'walletRequests': return WalletRequest;
    default:
      return {
        find: async () => [],
        findOne: async () => null,
        create: async (data) => data,
        updateMany: async () => ({ nModified: 0 }),
        deleteMany: async () => ({ deletedCount: 0 })
      };
  }
}

module.exports = {
  findOne: async (table, filter) => {
    const model = getModelByTable(table);
    return await model.findOne(filter);
  },
  find: async (table, filter) => {
    const model = getModelByTable(table);
    return await model.find(filter);
  },
  insert: async (table, record) => {
    const model = getModelByTable(table);
    return await model.create(record);
  },
  update: async (table, filter, updateObj) => {
    const model = getModelByTable(table);
    return await model.updateMany(filter, updateObj);
  },
  delete: async (table, filter) => {
    const model = getModelByTable(table);
    return await model.deleteMany(filter);
  },
  get: async (table) => {
    const model = getModelByTable(table);
    return await model.find({});
  },
  User,
  Booking,
  Message,
  Inquiry,
  WalletRequest
};
