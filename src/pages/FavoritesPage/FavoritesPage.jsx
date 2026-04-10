import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Heart, Loader2, ArrowLeft } from 'lucide-react'
import RoadmapCard from '../../components/RoadmapCard/RoadmapCard'
import { useAuth } from '../../contexts/AuthContext'
import styles from './FavoritesPage.module.css'

export default function FavoritesPage() {
  const {
    loading: authLoading,
    isAuthenticated,
    isFavorite,
    toggleFavorite,
    getFavoriteRoadmaps,
  } = useAuth()

  const [roadmaps, setRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [favoriteBusyMap, setFavoriteBusyMap] = useState({})

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    let active = true

    const loadFavorites = async () => {
      setLoading(true)
      setError('')
      try {
        const favoriteRoadmaps = await getFavoriteRoadmaps()
        if (active) {
          setRoadmaps(favoriteRoadmaps)
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load favorite roadmaps')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadFavorites()

    return () => {
      active = false
    }
  }, [authLoading, isAuthenticated, getFavoriteRoadmaps])

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const handleToggleFavorite = async (roadmapId) => {
    setFavoriteBusyMap((prev) => ({ ...prev, [roadmapId]: true }))
    try {
      const data = await toggleFavorite(roadmapId)
      if (!data.favorited) {
        setRoadmaps((prev) => prev.filter((roadmap) => roadmap.roadmapId !== roadmapId))
      }
    } catch (err) {
      console.error('Failed to update favorite roadmap:', err)
    } finally {
      setFavoriteBusyMap((prev) => ({ ...prev, [roadmapId]: false }))
    }
  }

  return (
    <div className={styles.page} id="favorites-page">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <Heart size={14} />
            Personalized List
          </div>
          <h1 className={styles.title}>Your Favorite Roadmaps</h1>
          <p className={styles.subtitle}>
            Roadmaps you starred are saved to your account and available across browsers.
          </p>
          <Link to="/" className={styles.backLink} id="favorites-back-home">
            <ArrowLeft size={16} />
            Back to all roadmaps
          </Link>
        </div>
      </section>

      <section className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spinner} />
            <span>Loading favorite roadmaps...</span>
          </div>
        ) : error ? (
          <div className={styles.errorState}>{error}</div>
        ) : roadmaps.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>No favorites yet</h2>
            <p>Tap the heart icon on any roadmap from the home page to save it here.</p>
            <Link to="/" className={styles.exploreBtn} id="favorites-explore-btn">
              Explore Roadmaps
            </Link>
          </div>
        ) : (
          <div className={styles.roadmapGrid}>
            {roadmaps.map((roadmap, index) => (
              <RoadmapCard
                key={roadmap.roadmapId}
                roadmap={roadmap}
                index={index}
                showFavorite
                isFavorited={isFavorite(roadmap.roadmapId)}
                favoriteBusy={!!favoriteBusyMap[roadmap.roadmapId]}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
