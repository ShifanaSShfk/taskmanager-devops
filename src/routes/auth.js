// src/routes/auth.js
// Placeholder auth routes. We'll implement JWT auth properly in Phase 4.

const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

// In-memory users (temporary — Phase 4 moves this to PostgreSQL)
let users  = [];
let userId = 1;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'name, email, and password are required',
      });
    }

    if (users.find(u => u.email === email)) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // bcrypt hashes the password with a salt (10 rounds = ~100ms)
    // We NEVER store plain text passwords
    const passwordHash = await bcrypt.hash(password, 10);

    const user = {
      id:           userId++,
      name,
      email,
      passwordHash,
      createdAt:    new Date().toISOString(),
    };
    users.push(user);

    res.status(201).json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Sign a JWT token — expires in 7 days
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev-secret-change-in-production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;