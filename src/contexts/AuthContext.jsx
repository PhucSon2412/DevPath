import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useLocale } from './LocaleContext'

const AuthContext = createContext(null)

const API_BASE = '/api/auth'
const ROADMAPS_API_BASE = '/api/roadmaps'
const QA_API_BASE = '/api/qa'
const DONE_STATUS = 'done'
const STEP_TYPES = new Set(['topic', 'subtopic', 'checklist', 'todo'])

const GUEST_FAVORITES_COOKIE = 'devpath_guest_favorites'
const GUEST_PROGRESS_COOKIE = 'devpath_guest_progress'
const GUEST_QA_STORAGE_KEY = 'devpath_guest_qa_recommendation'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function readCookie(name) {
  if (typeof document === 'undefined') return null

  const parts = document.cookie ? document.cookie.split(';') : []
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) {
      return rest.join('=')
    }
  }

  return null
}

function readCookieJson(name, fallbackValue) {
  const value = readCookie(name)
  if (!value) return fallbackValue

  try {
    return JSON.parse(decodeURIComponent(value))
  } catch {
    return fallbackValue
  }
}

function writeCookieJson(name, value) {
  if (typeof document === 'undefined') return

  const encodedValue = encodeURIComponent(JSON.stringify(value))
  document.cookie = `${name}=${encodedValue}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`
}

function readLocalStorageJson(key, fallbackValue) {
  if (typeof window === 'undefined') return fallbackValue

  const raw = window.localStorage.getItem(key)
  if (!raw) return fallbackValue

  try {
    return JSON.parse(raw)
  } catch {
    return fallbackValue
  }
}

function writeLocalStorageJson(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function parseGuestFavorites(value) {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string' && item.trim().length > 0)
}

function parseGuestProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const safeEntries = Object.entries(value).filter(
    ([key, status]) => typeof key === 'string' && status === DONE_STATUS
  )

  return Object.fromEntries(safeEntries)
}

function parseQaRecommendation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const recommendations = Array.isArray(value.recommendations)
    ? value.recommendations
      .map((item) => {
        if (!item || typeof item !== 'object') return null

        const roadmapId = String(item.roadmapId || '').trim()
        if (!roadmapId) return null

        const score = Number(item.score)
        const reason = item.reason && typeof item.reason === 'object' ? item.reason : {}

        return {
          roadmapId,
          score: Number.isFinite(score) ? score : 0,
          reason: {
            en: String(reason.en || '').trim(),
            ja: String(reason.ja || '').trim(),
          },
        }
      })
      .filter(Boolean)
    : []

  return {
    model: String(value.model || '').trim(),
    generatedAt: value.generatedAt ? String(value.generatedAt) : '',
    summary: String(value.summary || '').trim(),
    recommendations,
  }
}

function getProgressKey(roadmapId, nodeId) {
  return `${roadmapId}:${nodeId}`
}

function getCompletedNodeIdsFromProgressMap(progressMap, roadmapId) {
  const prefix = `${roadmapId}:`
  return Object.entries(progressMap)
    .filter(([key, status]) => key.startsWith(prefix) && status === DONE_STATUS)
    .map(([key]) => key.slice(prefix.length))
}

function updateGuestProgress(progressMap, roadmapId, nodeId, completed) {
  const nextProgress = { ...progressMap }
  const key = getProgressKey(roadmapId, nodeId)

  if (completed) {
    nextProgress[key] = DONE_STATUS
  } else {
    delete nextProgress[key]
  }

  return nextProgress
}

function clearGuestRoadmapProgress(progressMap, roadmapId) {
  const nextProgress = { ...progressMap }
  const prefix = `${roadmapId}:`

  Object.keys(nextProgress).forEach((key) => {
    if (key.startsWith(prefix)) {
      delete nextProgress[key]
    }
  })

  return nextProgress
}

export function AuthProvider({ children }) {
  const { language } = useLocale()
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('devpath_token'))
  const [loading, setLoading] = useState(true)
  const [guestFavorites, setGuestFavorites] = useState(() => {
    return parseGuestFavorites(readCookieJson(GUEST_FAVORITES_COOKIE, []))
  })
  const [guestProgress, setGuestProgress] = useState(() => {
    return parseGuestProgress(readCookieJson(GUEST_PROGRESS_COOKIE, {}))
  })
  const [guestQaRecommendation, setGuestQaRecommendation] = useState(() => {
    return parseQaRecommendation(readLocalStorageJson(GUEST_QA_STORAGE_KEY, null))
  })

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

  const withLanguage = useCallback((path) => {
    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}lang=${language}`
  }, [language])

  const isFavorite = useCallback((roadmapId) => {
    if (user) {
      return !!user.favorites?.includes(roadmapId)
    }

    return guestFavorites.includes(roadmapId)
  }, [user, guestFavorites])

  const toggleFavorite = useCallback(async (roadmapId) => {
    if (user && token) {
      const currentlyFavorited = !!user.favorites?.includes(roadmapId)
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
    }

    const currentlyFavorited = guestFavorites.includes(roadmapId)
    const nextFavorites = currentlyFavorited
      ? guestFavorites.filter((id) => id !== roadmapId)
      : [...guestFavorites, roadmapId]

    setGuestFavorites(nextFavorites)
    writeCookieJson(GUEST_FAVORITES_COOKIE, nextFavorites)

    return {
      favorited: !currentlyFavorited,
      favorites: nextFavorites,
    }
  }, [token, user, guestFavorites])

  const getFavoriteRoadmaps = useCallback(async () => {
    if (user && token) {
      const res = await fetch(withLanguage(`${ROADMAPS_API_BASE}/favorites/me`), {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load favorites')
      }

      return data.roadmaps || []
    }

    if (!guestFavorites.length) {
      return []
    }

    const res = await fetch(withLanguage(`${ROADMAPS_API_BASE}`))
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load roadmaps')
    }

    const roadmapById = new Map((data.roadmaps || []).map((roadmap) => [roadmap.roadmapId, roadmap]))
    return guestFavorites
      .map((roadmapId) => roadmapById.get(roadmapId))
      .filter(Boolean)
  }, [token, user, guestFavorites, withLanguage])

  const getRoadmapProgress = useCallback(async (roadmapId) => {
    if (user && token) {
      const res = await fetch(`${ROADMAPS_API_BASE}/${roadmapId}/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load progress')
      }

      return data.completedNodeIds || []
    }

    return getCompletedNodeIdsFromProgressMap(guestProgress, roadmapId)
  }, [token, user, guestProgress])

  const saveRoadmapNodeProgress = useCallback(async (roadmapId, nodeId, completed) => {
    if (user && token) {
      const res = await fetch(`${ROADMAPS_API_BASE}/${roadmapId}/progress/${nodeId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save progress')
      }

      return data.completedNodeIds || []
    }

    const nextProgress = updateGuestProgress(guestProgress, roadmapId, nodeId, completed)
    setGuestProgress(nextProgress)
    writeCookieJson(GUEST_PROGRESS_COOKIE, nextProgress)

    return getCompletedNodeIdsFromProgressMap(nextProgress, roadmapId)
  }, [token, user, guestProgress])

  const resetRoadmapProgress = useCallback(async (roadmapId) => {
    if (user && token) {
      const res = await fetch(`${ROADMAPS_API_BASE}/${roadmapId}/progress`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset progress')
      }

      return data.completedNodeIds || []
    }

    const nextProgress = clearGuestRoadmapProgress(guestProgress, roadmapId)
    setGuestProgress(nextProgress)
    writeCookieJson(GUEST_PROGRESS_COOKIE, nextProgress)
    return []
  }, [token, user, guestProgress])

  const getInProgressRoadmaps = useCallback(async () => {
    if (user && token) {
      const res = await fetch(withLanguage(`${ROADMAPS_API_BASE}/in-progress/me`), {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load in-progress roadmaps')
      }

      return data.roadmaps || []
    }

    const progressEntries = Object.entries(guestProgress)
    if (!progressEntries.length) {
      return []
    }

    const completedByRoadmapId = new Map()
    progressEntries.forEach(([key, status]) => {
      if (status !== DONE_STATUS) return

      const separatorIndex = key.indexOf(':')
      if (separatorIndex < 0) return

      const roadmapId = key.slice(0, separatorIndex)
      const nodeId = key.slice(separatorIndex + 1)

      if (!roadmapId || !nodeId) return

      if (!completedByRoadmapId.has(roadmapId)) {
        completedByRoadmapId.set(roadmapId, new Set())
      }

      completedByRoadmapId.get(roadmapId).add(nodeId)
    })

    if (!completedByRoadmapId.size) {
      return []
    }

    const summaryRes = await fetch(withLanguage(`${ROADMAPS_API_BASE}`))
    const summaryData = await summaryRes.json()
    if (!summaryRes.ok) {
      throw new Error(summaryData.message || 'Failed to load roadmaps')
    }

    const summaryById = new Map((summaryData.roadmaps || []).map((roadmap) => [roadmap.roadmapId, roadmap]))
    const roadmapIds = Array.from(completedByRoadmapId.keys())

    const roadmapItems = await Promise.all(
      roadmapIds.map(async (roadmapId) => {
        const detailRes = await fetch(withLanguage(`${ROADMAPS_API_BASE}/${roadmapId}`))
        if (!detailRes.ok) return null

        const detail = await detailRes.json()
        const stepNodeIds = (detail.nodes || [])
          .filter((node) => STEP_TYPES.has(node.type))
          .map((node) => node.id)

        const totalSteps = stepNodeIds.length
        if (!totalSteps) return null

        const completedSet = completedByRoadmapId.get(roadmapId) || new Set()
        const completedSteps = stepNodeIds.reduce(
          (count, nodeId) => count + (completedSet.has(nodeId) ? 1 : 0),
          0
        )
        const percent = Math.round((completedSteps / totalSteps) * 100)

        if (percent <= 0 || percent >= 100) {
          return null
        }

        const summaryRoadmap = summaryById.get(roadmapId)
        if (!summaryRoadmap) return null

        return {
          ...summaryRoadmap,
          progress: {
            completedSteps,
            totalSteps,
            percent,
          },
        }
      })
    )

    return roadmapItems
      .filter(Boolean)
      .sort((a, b) => {
        if (b.progress.percent !== a.progress.percent) {
          return b.progress.percent - a.progress.percent
        }
        return a.title.localeCompare(b.title)
      })
  }, [token, user, guestProgress, withLanguage])

  const getSavedQaRecommendation = useCallback(async () => {
    if (user && token) {
      const res = await fetch(`${QA_API_BASE}/recommendations/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load saved recommendation')
      }

      return parseQaRecommendation(data.recommendation)
    }

    return guestQaRecommendation
  }, [token, user, guestQaRecommendation])

  const generateQaRecommendation = useCallback(async (answers) => {
    const headers = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(`${QA_API_BASE}/recommendations/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answers }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Failed to generate recommendation')
    }

    const recommendation = parseQaRecommendation(data.result)
    if (!recommendation || !recommendation.recommendations.length) {
      throw new Error('Recommendation result is empty')
    }

    if (user && token) {
      setUser((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          qaRecommendation: recommendation,
        }
      })
    } else {
      setGuestQaRecommendation(recommendation)
      writeLocalStorageJson(GUEST_QA_STORAGE_KEY, recommendation)
    }

    return recommendation
  }, [token, user])

  const progressStorageScope = user ? 'account' : 'browser'

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
    getRoadmapProgress,
    saveRoadmapNodeProgress,
    resetRoadmapProgress,
    getInProgressRoadmaps,
    getSavedQaRecommendation,
    generateQaRecommendation,
    progressStorageScope,
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
