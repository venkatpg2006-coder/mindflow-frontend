// ============================================
// MINDFLOW - Backend Starter (Express + SQLite)
// ============================================

const express = require('express');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const db = new sqlite3.Database('./wellness.db');

// Middleware
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

// ============================================
// DATABASE INITIALIZATION
// ============================================

const initDB = () => {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        plan TEXT DEFAULT 'free',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        timezone TEXT DEFAULT 'UTC'
      )
    `);

    // Habits table
    db.run(`
      CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    // Logs table (daily entries)
    db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        habit_id INTEGER NOT NULL,
        value REAL NOT NULL,
        notes TEXT,
        date DATE NOT NULL,
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(habit_id) REFERENCES habits(id)
      )
    `);

    console.log('✅ Database initialized');
  });
};

// ============================================
// MIDDLEWARE UTILITIES
// ============================================

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// ============================================
// AUTH ROUTES
// ============================================

// SIGNUP
app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await dbRun(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, hashedPassword]
    );

    const token = jwt.sign({ id: result.lastID, email }, SECRET);
    
    // Create default habits for new users
    const defaultHabits = ['Sleep', 'Mood', 'Exercise', 'Meditation'];
    for (const habit of defaultHabits) {
      await dbRun(
        'INSERT INTO habits (user_id, name, category) VALUES (?, ?, ?)',
        [result.lastID, habit, 'health']
      );
    }

    res.status(201).json({ token, userId: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// LOGIN
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET);
    res.json({ token, userId: user.id, plan: user.plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============================================
// HABIT ROUTES
// ============================================

// GET ALL HABITS FOR USER
app.get('/habits', verifyToken, async (req, res) => {
  try {
    const habits = await dbAll(
      'SELECT * FROM habits WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE HABIT
app.post('/habits', verifyToken, async (req, res) => {
  const { name, category } = req.body;
  
  try {
    const result = await dbRun(
      'INSERT INTO habits (user_id, name, category) VALUES (?, ?, ?)',
      [req.userId, name, category || 'health']
    );
    
    res.status(201).json({ id: result.lastID, name, category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE HABIT
app.delete('/habits/:id', verifyToken, async (req, res) => {
  try {
    await dbRun('DELETE FROM habits WHERE id = ? AND user_id = ?', 
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// LOGGING ROUTES
// ============================================

// LOG HABIT ENTRY
app.post('/logs', verifyToken, async (req, res) => {
  const { habit_id, value, notes } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check if entry already exists for today
    const existing = await dbGet(
      'SELECT id FROM logs WHERE user_id = ? AND habit_id = ? AND date = ?',
      [req.userId, habit_id, today]
    );

    if (existing) {
      // Update existing
      await dbRun(
        'UPDATE logs SET value = ?, notes = ? WHERE id = ?',
        [value, notes, existing.id]
      );
    } else {
      // Create new
      await dbRun(
        'INSERT INTO logs (user_id, habit_id, value, notes, date) VALUES (?, ?, ?, ?, ?)',
        [req.userId, habit_id, value, notes, today]
      );
    }

    res.json({ success: true, date: today });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET LOGS (last N days)
app.get('/logs', verifyToken, async (req, res) => {
  const days = req.query.days || 7;
  
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const dateStr = startDate.toISOString().split('T')[0];

    const logs = await dbAll(
      `SELECT l.*, h.name as habit_name FROM logs l
       JOIN habits h ON l.habit_id = h.id
       WHERE l.user_id = ? AND l.date >= ?
       ORDER BY l.date DESC`,
      [req.userId, dateStr]
    );

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET LOGS FOR SPECIFIC HABIT
app.get('/logs/habit/:id', verifyToken, async (req, res) => {
  const days = req.query.days || 7;
  
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const dateStr = startDate.toISOString().split('T')[0];

    const logs = await dbAll(
      `SELECT * FROM logs WHERE user_id = ? AND habit_id = ? AND date >= ?
       ORDER BY date DESC`,
      [req.userId, req.params.id, dateStr]
    );

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ANALYTICS ROUTES
// ============================================

// MOOD TREND (last 7 days)
app.get('/analytics/mood', verifyToken, async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const dateStr = startDate.toISOString().split('T')[0];

    const moodLogs = await dbAll(
      `SELECT date, AVG(value) as avg_mood FROM logs l
       JOIN habits h ON l.habit_id = h.id
       WHERE l.user_id = ? AND h.name = 'Mood' AND l.date >= ?
       GROUP BY l.date
       ORDER BY l.date ASC`,
      [req.userId, dateStr]
    );

    res.json(moodLogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STREAKS
app.get('/analytics/streaks', verifyToken, async (req, res) => {
  try {
    const habits = await dbAll(
      'SELECT id, name FROM habits WHERE user_id = ?',
      [req.userId]
    );

    const streaks = [];
    
    for (const habit of habits) {
      const logs = await dbAll(
        `SELECT date FROM logs WHERE user_id = ? AND habit_id = ?
         ORDER BY date DESC LIMIT 100`,
        [req.userId, habit.id]
      );

      let streak = 0;
      let currentDate = new Date();
      currentDate = new Date(currentDate.toISOString().split('T')[0]);

      for (const log of logs) {
        const logDate = new Date(log.date);
        
        if (currentDate.getTime() === logDate.getTime() || 
            currentDate.getTime() - logDate.getTime() === 86400000) {
          streak++;
          currentDate = logDate;
        } else {
          break;
        }
      }

      streaks.push({ habit: habit.name, streak });
    }

    res.json(streaks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

initDB();

app.listen(PORT, () => {
  console.log(`🚀 MindFlow API running on http://localhost:${PORT}`);
});