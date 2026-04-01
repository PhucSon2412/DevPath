import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },

    // ── Future-ready fields ──
    // Saved/favorite roadmaps
    favorites: {
      type: [String],
      default: [],
    },
    // Node progress: { "roadmapId:nodeId": "done" | "learning" | "skipped" }
    progress: {
      type: Map,
      of: String,
      default: new Map(),
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
)

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare candidate password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Return user object without sensitive fields
userSchema.methods.toProfile = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    favorites: this.favorites,
    createdAt: this.createdAt,
  }
}

const User = mongoose.model('User', userSchema)

export default User
