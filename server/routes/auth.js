import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import auth from '../middleware/auth.js'

const router = express.Router()

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    })

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ message: 'Email already registered' })
      }
      return res.status(400).json({ message: 'Username already taken' })
    }

    // Create user
    const user = await User.create({ username, email, password })

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      token,
      user: user.toProfile(),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email already exists' })
    }
    console.error('Register error:', error)
    res.status(500).json({ message: 'Server error during registration' })
  }
})

// ── POST /api/auth/login ──
// Login with username OR email + password
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/email and password are required' })
    }

    // Find by username or email
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier },
      ],
    }).select('+password') // Include password field for comparison

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Generate token
    const token = generateToken(user._id)

    res.json({
      token,
      user: user.toProfile(),
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Server error during login' })
  }
})

// ── GET /api/auth/me ──
// Get current user profile (requires auth)
router.get('/me', auth, async (req, res) => {
  try {
    res.json({ user: req.user.toProfile() })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
