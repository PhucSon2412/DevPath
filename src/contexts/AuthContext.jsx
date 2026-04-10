import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const API_BASE = '/api/auth'
const ROADMAPS_API_BASE = '/api/roadmaps'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('devpath_token'))
  const [loading, setLoading] = useState(true)

  // Fetch current user profile on mount if token exists
  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        // Token invalid or expired
        localStorage.removeItem('devpath_token')
        setToken(null)
        setUser(null)
      }
    } catch (err) {
      console.error('Failed to fetch user:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Register
  const register = async (username, email, password) => {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Registration failed')
    }

    localStorage.setItem('devpath_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  // Login (identifier = username or email)
  const login = async (identifier, password) => {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Login failed')
    }

    localStorage.setItem('devpath_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  // Logout
  const logout = () => {
    localStorage.removeItem('devpath_token')
    setToken(null)
    setUser(null)
  }

  const isFavorite = useCallback((roadmapId) => {
    return !!user?.favorites?.includes(roadmapId)
  }, [user])

  const toggleFavorite = useCallback(async (roadmapId) => {
    if (!token) {
      throw new Error('Please sign in to save favorites')
    }

    const currentlyFavorited = !!user?.favorites?.includes(roadmapId)
    const method = currentlyFavorited ? 'DELETE' : 'POST'

    const res = await fetch(`${ROADMAPS_API_BASE}/${roadmapId}/favorite`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update favorites')
    }

    setUser((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        favorites: data.favorites || [],
      }
    })

    return data
  }, [token, user])

  const getFavoriteRoadmaps = useCallback(async () => {
    if (!token) {
      throw new Error('Please sign in to view favorites')
    }

    const res = await fetch(`${ROADMAPS_API_BASE}/favorites/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load favorites')
    }

    return data.roadmaps || []
  }, [token])

  const getInProgressRoadmaps = useCallback(async () => {
    if (!token) {
      throw new Error('Please sign in to view in-progress roadmaps')
    }

    const res = await fetch(`${ROADMAPS_API_BASE}/in-progress/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load in-progress roadmaps')
    }

    return data.roadmaps || []
  }, [token])

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    isFavorite,
    toggleFavorite,
    getFavoriteRoadmaps,
    getInProgressRoadmaps,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
