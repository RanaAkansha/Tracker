const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const path = require("path")
const cors = require("cors")
const bodyParser = require("body-parser")
const fs = require("fs")

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname)))

// Database setup
const dbPath = path.join(__dirname, "prana.db")
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err)
  } else {
    console.log("Connected to SQLite database")
    initializeDatabase()
  }
})

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Students table
    db.run(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scholar_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        hostel TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Activities table
    db.run(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scholar_id TEXT NOT NULL,
        activity_name TEXT NOT NULL,
        activity_time TEXT,
        status TEXT DEFAULT 'pending',
        date DATE DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scholar_id) REFERENCES students(scholar_id)
      )
    `)

    // Health status table
    db.run(`
      CREATE TABLE IF NOT EXISTS health_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scholar_id TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        date DATE DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scholar_id) REFERENCES students(scholar_id)
      )
    `)

    // Admin users table
    db.run(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Seed default data
    seedDefaultData()
  })
}

// Seed default data
function seedDefaultData() {
  // Check if default student exists
  db.get("SELECT * FROM students WHERE scholar_id = ?", ["23144003"], (err, row) => {
    if (!row) {
      db.run("INSERT INTO students (scholar_id, name, password, hostel, email) VALUES (?, ?, ?, ?, ?)", [
        "23144003",
        "Akansha Rana",
        "password123",
        "Nivedita",
        "akansha@dsvv.ac.in",
      ])
    }
  })

  // Check if default admin exists
  db.get("SELECT * FROM admins WHERE email = ?", ["admin@prana.com"], (err, row) => {
    if (!row) {
      db.run("INSERT INTO admins (email, password, name) VALUES (?, ?, ?)", [
        "admin@prana.com",
        "admin123",
        "Admin User",
      ])
    }
  })

  // Seed default activities
  db.get("SELECT COUNT(*) as count FROM activities", (err, row) => {
    if (row && row.count === 0) {
      const activities = [
        {
          scholar_id: "23144003",
          activity_name: "Morning Prayer",
          activity_time: "5:00 AM - 5:30 AM",
          status: "completed",
        },
        { scholar_id: "23144003", activity_name: "Yoga", activity_time: "5:30 AM - 6:00 AM", status: "completed" },
        { scholar_id: "23144003", activity_name: "Yagya", activity_time: "6:00 AM - 7:00 AM", status: "completed" },
        { scholar_id: "23144003", activity_name: "Shramdaan", activity_time: "4:00 PM - 5:00 PM", status: "pending" },
        { scholar_id: "23144003", activity_name: "Naad Yog", activity_time: "6:00 PM - 6:15 PM", status: "pending" },
        {
          scholar_id: "23144003",
          activity_name: "Evening Prayer",
          activity_time: "8:00 PM - 8:30 PM",
          status: "pending",
        },
      ]

      activities.forEach((activity) => {
        db.run("INSERT INTO activities (scholar_id, activity_name, activity_time, status) VALUES (?, ?, ?, ?)", [
          activity.scholar_id,
          activity.activity_name,
          activity.activity_time,
          activity.status,
        ])
      })
    }
  })
}

// ============ STUDENT AUTHENTICATION ============
app.post("/api/student/login", (req, res) => {
  const { scholar_id, password } = req.body

  if (!scholar_id || !password) {
    return res.status(400).json({ error: "Scholar ID and password required" })
  }

  db.get("SELECT * FROM students WHERE scholar_id = ? AND password = ?", [scholar_id, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }
    if (!row) {
      return res.status(401).json({ error: "Invalid credentials" })
    }
    res.json({
      success: true,
      student: {
        scholar_id: row.scholar_id,
        name: row.name,
        hostel: row.hostel,
        email: row.email,
      },
    })
  })
})

app.post("/api/student/register", (req, res) => {
  const { scholar_id, name, password, hostel, email } = req.body

  if (!scholar_id || !name || !password) {
    return res.status(400).json({ error: "Scholar ID, name, and password required" })
  }

  db.run(
    "INSERT INTO students (scholar_id, name, password, hostel, email) VALUES (?, ?, ?, ?, ?)",
    [scholar_id, name, password, hostel, email],
    (err) => {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Scholar ID already exists" })
        }
        return res.status(500).json({ error: "Database error" })
      }
      res.json({ success: true, message: "Student registered successfully" })
    },
  )
})

// ============ ADMIN AUTHENTICATION ============
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" })
  }

  db.get("SELECT * FROM admins WHERE email = ? AND password = ?", [email, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }
    if (!row) {
      return res.status(401).json({ error: "Invalid credentials" })
    }
    res.json({
      success: true,
      admin: {
        id: row.id,
        email: row.email,
        name: row.name,
      },
    })
  })
})

// ============ ACTIVITY TRACKING ============
app.get("/api/activities/:scholar_id", (req, res) => {
  const { scholar_id } = req.params
  const { date } = req.query

  let query = "SELECT * FROM activities WHERE scholar_id = ?"
  const params = [scholar_id]

  if (date) {
    query += " AND date = ?"
    params.push(date)
  } else {
    query += " AND date = CURRENT_DATE"
  }

  query += " ORDER BY created_at DESC"

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }
    res.json({ activities: rows || [] })
  })
})

app.post("/api/activities", (req, res) => {
  const { scholar_id, activity_name, activity_time, status } = req.body

  if (!scholar_id || !activity_name) {
    return res.status(400).json({ error: "Scholar ID and activity name required" })
  }

  db.run(
    "INSERT INTO activities (scholar_id, activity_name, activity_time, status) VALUES (?, ?, ?, ?)",
    [scholar_id, activity_name, activity_time, status || "pending"],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Database error" })
      }
      res.json({ success: true, id: this.lastID })
    },
  )
})

app.put("/api/activities/:id", (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!status) {
    return res.status(400).json({ error: "Status required" })
  }

  db.run("UPDATE activities SET status = ? WHERE id = ?", [status, id], (err) => {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }
    res.json({ success: true, message: "Activity updated" })
  })
})

// ============ HEALTH STATUS ============
app.get("/api/health/:scholar_id", (req, res) => {
  const { scholar_id } = req.params
  const { date } = req.query

  let query = "SELECT * FROM health_status WHERE scholar_id = ?"
  const params = [scholar_id]

  if (date) {
    query += " AND date = ?"
    params.push(date)
  } else {
    query += " AND date = CURRENT_DATE"
  }

  db.get(query, params, (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }
    res.json({ health: row || null })
  })
})

app.post("/api/health", (req, res) => {
  const { scholar_id, status, notes } = req.body

  if (!scholar_id || !status) {
    return res.status(400).json({ error: "Scholar ID and status required" })
  }

  // Check if health status already exists for today
  db.get("SELECT id FROM health_status WHERE scholar_id = ? AND date = CURRENT_DATE", [scholar_id], (err, row) => {
    if (row) {
      // Update existing
      db.run("UPDATE health_status SET status = ?, notes = ? WHERE id = ?", [status, notes, row.id], (err) => {
        if (err) {
          return res.status(500).json({ error: "Database error" })
        }
        res.json({ success: true, message: "Health status updated" })
      })
    } else {
      // Insert new
      db.run(
        "INSERT INTO health_status (scholar_id, status, notes) VALUES (?, ?, ?)",
        [scholar_id, status, notes],
        function (err) {
          if (err) {
            return res.status(500).json({ error: "Database error" })
          }
          res.json({ success: true, id: this.lastID })
        },
      )
    }
  })
})

// ============ ADMIN DASHBOARD ============
app.get("/api/admin/stats", (req, res) => {
  db.serialize(() => {
    const stats = {}

    // Total students
    db.get("SELECT COUNT(*) as count FROM students", (err, row) => {
      stats.totalStudents = row?.count || 0
    })

    // Active today
    db.get(
      'SELECT COUNT(DISTINCT scholar_id) as count FROM activities WHERE date = CURRENT_DATE AND status = "completed"',
      (err, row) => {
        stats.activeToday = row?.count || 0
      },
    )

    // Completion rate
    db.get(
      'SELECT COUNT(*) as completed FROM activities WHERE date = CURRENT_DATE AND status = "completed"',
      (err, row1) => {
        db.get("SELECT COUNT(*) as total FROM activities WHERE date = CURRENT_DATE", (err, row2) => {
          const completed = row1?.completed || 0
          const total = row2?.total || 1
          stats.completionRate = Math.round((completed / total) * 100)
          res.json(stats)
        })
      },
    )
  })
})

app.get("/api/admin/activities", (req, res) => {
  const query = `
    SELECT a.*, s.name, s.scholar_id, s.hostel
    FROM activities a
    JOIN students s ON a.scholar_id = s.scholar_id
    WHERE a.date = CURRENT_DATE
    ORDER BY a.created_at DESC
    LIMIT 50
  `

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }
    res.json({ activities: rows || [] })
  })
})

app.get("/api/admin/students", (req, res) => {
  db.all("SELECT * FROM students ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }
    res.json({ students: rows || [] })
  })
})

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: "Internal server error" })
})

// Start server
app.listen(PORT, () => {
  console.log(`PRANA Server running on http://localhost:${PORT}`)
  console.log("Database: prana.db")
  console.log("\nDefault Credentials:")
  console.log("Student - Scholar ID: 23144003, Password: password123")
  console.log("Admin - Email: admin@prana.com, Password: admin123")
})
