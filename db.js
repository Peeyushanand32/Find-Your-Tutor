const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

// Mock data seed
const initialData = {
  users: [
    {
      id: "student1",
      email: "student@tutornest.com",
      password: "password",
      name: "James Doe",
      role: "student",
      avatar: "JD",
      balance: 15000.00,
      plan: "Basic",
      bio: "High school senior preparing for AP Calculus and college admission.",
      languages: ["English"],
      phone: "+1 (555) 019-2834"
    },
    {
      id: "tutor1",
      email: "tutor1@tutornest.com",
      password: "password",
      name: "Dr. Sarah Jenkins",
      role: "tutor",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAxBTj1Cg8WfDctCwZfizyEbz4G_183JwXPFlGu9CiI2fUToO_rYwm-HP1B5JvTCAHvM4eUjk_nhS3PMkDX4Zb_70hbh0-shbxC7_9JKQ4DdRWmqE3zBlMXYuza7iWXndxjUms3t13-nJltTeLIwIcOhgHNDRSl6H7YcXs1e9qgxmT8tndVqWIcrpOh_hTDk4ciwz3KvaLAvgBhzgBrgr9D1YemW5LOCGfSweqdtJiLq9qxpXLKQsZGhjWDdJmdwGleNeW2nB1RqgSl",
      rate: 1500,
      rating: 4.9,
      reviewsCount: 124,
      hoursTaught: 500,
      languages: ["English", "Spanish"],
      bio: "PhD in Theoretical Physics with over 12 years of experience helping students master complex calculus and mechanics. Specialized in AP prep and University entrance exams.",
      subjects: ["Calculus BC", "Linear Algebra", "Trigonometry", "Algebra II", "Physics", "AP Calculus AB"],
      title: "Advanced Mathematics & Physics Expert",
      education: [
        { degree: "M.Sc. in Mathematics", institution: "Massachusetts Institute of Technology (MIT)", year: "2014" },
        { degree: "Certified Advanced Educator (NTA)", institution: "National Tutoring Association", year: "2016" }
      ],
      location: "Boston & Cambridge area",
      walletBalance: 4200.00,
      totalEarnings: 32500.00
    },
    {
      id: "tutor2",
      email: "tutor2@tutornest.com",
      password: "password",
      name: "Dr. Elena Rodriguez",
      role: "tutor",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDEGg-u5yRLWHdkc27eeFShpa4qFiGMPumwlH9fe0TMLDQm30X-bt-eFwPABmJ_oygIrbgkAbllbaqxVstvST1XybHVYECas_jmu9UbNdoj91cxuKRktf9dBXAUaK8Ed_Lo303kTeqseMKsT5biJGrkK5cSLu72g-8efnVS7NxxWgtc2U32djhhTD-uoU4AGqMhkSlMShsB8YqPFtnyF67ZBfYo3gbi7Oj-j71UP2MCv4MUmbcmePkbjN1Rvv6SZ45sR6oQ7qywVN8z",
      rate: 1800,
      rating: 4.9,
      reviewsCount: 120,
      hoursTaught: 380,
      languages: ["English", "French"],
      bio: "MIT Graduate with 10+ years experience in helping students master complex mathematical theories. Interactive sessions designed for high engagement.",
      subjects: ["Calculus", "SAT Math", "Linear Algebra", "Algebra I"],
      title: "Advanced Mathematics & Calculus",
      education: [
        { degree: "Ph.D. in Applied Mathematics", institution: "Stanford University", year: "2012" }
      ],
      location: "San Francisco, CA & Online",
      walletBalance: 8800.00,
      totalEarnings: 84000.00
    },
    {
      id: "tutor3",
      email: "tutor3@tutornest.com",
      password: "password",
      name: "Prof. Julian Chen",
      role: "tutor",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDqacdh7BOToUcZKkUgWUxlr0kpETq5RPgUbRFD535c4tELKoLXM2JzRUYTX1Q26g2IAga0ckZLudR6sFTQZKsBWF4OO5EnZq_Rd1wmH33V14JVFYMX0P_KULrqY9lA1ttktD6H_E1zsbaU9LFz8O10M7bJ312FReUYVirCGnTAVrhHJj43tQRgwX07aZL_--qXttdnODTfB3SmJcPcBBqR08M9BohWs9lNbS-6kEhIKOAc8R_SFlIYNgDMgO526Vp7r6gGJZUa9_H8",
      rate: 2000,
      rating: 5.0,
      reviewsCount: 85,
      hoursTaught: 450,
      languages: ["English", "Mandarin"],
      bio: "Ex-Google Senior Engineer. Specializing in AI/ML fundamentals and software architecture for students.",
      subjects: ["Python", "Data Science", "Backend", "Computer Science"],
      title: "Computer Science & Python Expert",
      education: [
        { degree: "B.Sc. in Computer Science", institution: "UC Berkeley", year: "2015" }
      ],
      location: "Seattle, WA & Online",
      walletBalance: 12000.00,
      totalEarnings: 154000.00
    }
  ],
  bookings: [
    {
      id: "booking1",
      studentId: "student1",
      studentName: "James Doe",
      tutorId: "tutor1",
      tutorName: "Dr. Sarah Jenkins",
      subject: "Calculus BC",
      date: "2026-07-10",
      time: "2:30 PM",
      status: "scheduled", // scheduled, pending, completed, cancelled
      rate: 1500.00,
      duration: 1
    },
    {
      id: "booking2",
      studentId: "student1",
      studentName: "James Doe",
      tutorId: "tutor3",
      tutorName: "Prof. Julian Chen",
      subject: "Python Basics",
      date: "2026-07-12",
      time: "10:00 AM",
      status: "pending",
      rate: 2000.00,
      duration: 1
    },
    {
      id: "booking3",
      studentId: "student1",
      studentName: "James Doe",
      tutorId: "tutor1",
      tutorName: "Dr. Sarah Jenkins",
      subject: "Trigonometry",
      date: "2026-07-02",
      time: "4:00 PM",
      status: "completed",
      rate: 1500.00,
      duration: 1
    }
  ],
  messages: [
    {
      id: "msg1",
      senderId: "student1",
      senderName: "James Doe",
      receiverId: "tutor1",
      receiverName: "Dr. Sarah Jenkins",
      text: "Hi Dr. Jenkins, I would like to schedule a trial session for Calculus BC prep.",
      timestamp: "2026-07-04T10:15:30Z"
    },
    {
      id: "msg2",
      senderId: "tutor1",
      senderName: "Dr. Sarah Jenkins",
      receiverId: "student1",
      receiverName: "James Doe",
      text: "Hello James! I would be glad to help. Please select an available slot on my profile page.",
      timestamp: "2026-07-04T11:20:00Z"
    }
  ],
  inquiries: [],
  walletRequests: [
    {
      id: "req1",
      tutorId: "tutor1",
      amount: 15000.00,
      status: "paid", // pending, paid
      date: "2026-07-01",
      method: "Direct Deposit to Wells Fargo"
    }
  ]
};

class LocalDatabase {
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
      console.error('Failed to load database, resetting...', e);
      this.data = JSON.parse(JSON.stringify(initialData));
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save database', e);
    }
  }

  get(table) {
    return this.data[table] || [];
  }

  find(table, filterFn) {
    const list = this.get(table);
    if (typeof filterFn === 'function') {
      return list.filter(filterFn);
    }
    if (typeof filterFn === 'object') {
      return list.filter(item => {
        for (let key in filterFn) {
          if (item[key] !== filterFn[key]) return false;
        }
        return true;
      });
    }
    return list;
  }

  findOne(table, filterFn) {
    const list = this.find(table, filterFn);
    return list.length > 0 ? list[0] : null;
  }

  insert(table, record) {
    if (!this.data[table]) {
      this.data[table] = [];
    }
    const newRecord = {
      id: `${table.substring(0, 3)}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ...record
    };
    this.data[table].push(newRecord);
    this.save();
    return newRecord;
  }

  update(table, filterFn, updateObj) {
    const records = this.find(table, filterFn);
    records.forEach(item => {
      Object.assign(item, updateObj);
    });
    if (records.length > 0) {
      this.save();
    }
    return records;
  }

  delete(table, filterFn) {
    const list = this.get(table);
    let filter;
    if (typeof filterFn === 'function') {
      filter = filterFn;
    } else {
      filter = item => {
        for (let key in filterFn) {
          if (item[key] !== filterFn[key]) return false;
        }
        return true;
      };
    }
    this.data[table] = list.filter(item => !filter(item));
    this.save();
  }
}

module.exports = new LocalDatabase();
