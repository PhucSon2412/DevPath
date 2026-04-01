import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const API_BASE = '/api/auth'

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

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
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
