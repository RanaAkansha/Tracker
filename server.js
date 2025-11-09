const express = require("express");
const Database = require("better-sqlite3"); // ✅ replaced sqlite3
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Database setup (persistent path on Render)
const dbPath = path.join(__dirname, "prana.db");
const db = new Database(dbPath);

// Initialize tables
function initializeDatabase() {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scholar_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      hostel TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scholar_id TEXT NOT NULL,
      activity_name TEXT NOT NULL,
      activity_time TEXT,
      status TEXT DEFAULT 'pending',
      date DATE DEFAULT CURRENT_DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS health_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scholar_id TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      date DATE DEFAULT CURRENT_DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
  ).run();

  seedDefaultData();
}

function seedDefaultData() {
  const studentExists = db
    .prepare("SELECT * FROM students WHERE scholar_id = ?")
    .get("23144003");
  if (!studentExists) {
    db.prepare(
      "INSERT INTO students (scholar_id, name, password, hostel, email) VALUES (?, ?, ?, ?, ?)"
    ).run(
      "23144003",
      "Akansha Rana",
      "password123",
      "Nivedita",
      "akansha@dsvv.ac.in"
    );
  }

  const adminExists = db
    .prepare("SELECT * FROM admins WHERE email = ?")
    .get("admin@prana.com");
  if (!adminExists) {
    db.prepare(
      "INSERT INTO admins (email, password, name) VALUES (?, ?, ?)"
    ).run("admin@prana.com", "admin123", "Admin User");
  }

  const activitiesCount = db
    .prepare("SELECT COUNT(*) AS count FROM activities")
    .get();
  if (activitiesCount.count === 0) {
    const activities = [
      ["23144003", "Morning Prayer", "5:00 AM - 5:30 AM", "completed"],
      ["23144003", "Yoga", "5:30 AM - 6:00 AM", "completed"],
      ["23144003", "Yagya", "6:00 AM - 7:00 AM", "completed"],
      ["23144003", "Shramdaan", "4:00 PM - 5:00 PM", "pending"],
      ["23144003", "Naad Yog", "6:00 PM - 6:15 PM", "pending"],
      ["23144003", "Evening Prayer", "8:00 PM - 8:30 PM", "pending"],
    ];

    const stmt = db.prepare(
      "INSERT INTO activities (scholar_id, activity_name, activity_time, status) VALUES (?, ?, ?, ?)"
    );
    for (const act of activities) stmt.run(...act);
  }
}

// ====================== STUDENT AUTH ======================
app.post("/api/student/login", (req, res) => {
  const { scholar_id, password } = req.body;
  if (!scholar_id || !password)
    return res.status(400).json({ error: "Scholar ID and password required" });

  const row = db
    .prepare("SELECT * FROM students WHERE scholar_id = ? AND password = ?")
    .get(scholar_id, password);
  if (!row) return res.status(401).json({ error: "Invalid credentials" });

  res.json({
    success: true,
    student: {
      scholar_id: row.scholar_id,
      name: row.name,
      hostel: row.hostel,
      email: row.email,
    },
  });
});

app.post("/api/student/register", (req, res) => {
  const { scholar_id, name, password, hostel, email } = req.body;
  if (!scholar_id || !name || !password)
    return res
      .status(400)
      .json({ error: "Scholar ID, name, and password required" });

  try {
    db.prepare(
      "INSERT INTO students (scholar_id, name, password, hostel, email) VALUES (?, ?, ?, ?, ?)"
    ).run(scholar_id, name, password, hostel, email);
    res.json({ success: true, message: "Student registered successfully" });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      res.status(400).json({ error: "Scholar ID already exists" });
    } else {
      res.status(500).json({ error: "Database error" });
    }
  }
});

// ====================== ADMIN AUTH ======================
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const admin = db
    .prepare("SELECT * FROM admins WHERE email = ? AND password = ?")
    .get(email, password);
  if (!admin) return res.status(401).json({ error: "Invalid credentials" });

  res.json({
    success: true,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
});

// ====================== FRONTEND CATCH-ALL ======================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Initialize DB and start server
initializeDatabase();
app.listen(PORT, () => {
  console.log(`✅ PRANA server running on port ${PORT}`);
});
