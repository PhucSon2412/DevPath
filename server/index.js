import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import connectDB from './config/db.js'
import authRoutes from './routes/auth.js'
import roadmapRoutes from './routes/roadmaps.js'

// Load env from server/.env
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env') })

const app = express()
const PORT = process.env.PORT || 5000

// Connect to MongoDB
await connectDB()

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/roadmaps', roadmapRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`)
  console.log(`  → API: http://localhost:${PORT}/api`)
})
