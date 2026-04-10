import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Target, Loader2, ArrowLeft } from 'lucide-react'
import RoadmapCard from '../../components/RoadmapCard/RoadmapCard'
import { useAuth } from '../../contexts/AuthContext'
import styles from './InProgressPage.module.css'

export default function InProgressPage() {
  const { loading: authLoading, isAuthenticated, getInProgressRoadmaps } = useAuth()
  const [roadmaps, setRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    let active = true

    const loadInProgressRoadmaps = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getInProgressRoadmaps()
        if (active) {
          setRoadmaps(data)
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load in-progress roadmaps')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadInProgressRoadmaps()

    return () => {
      active = false
    }
  }, [authLoading, isAuthenticated, getInProgressRoadmaps])

  const sortedRoadmaps = useMemo(() => {
    return [...roadmaps].sort((a, b) => {
      const aPercent = a.progress?.percent || 0
      const bPercent = b.progress?.percent || 0
      if (bPercent !== aPercent) {
        return bPercent - aPercent
      }
      return a.title.localeCompare(b.title)
    })
  }, [roadmaps])

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className={styles.page} id="in-progress-page">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <Target size={14} />
            Keep Going
          </div>
          <h1 className={styles.title}>In Progress Roadmaps</h1>
          <p className={styles.subtitle}>
            Roadmaps where your completion is between 1% and 99%, sorted from highest progress to lowest.
          </p>
          <Link to="/" className={styles.backLink} id="in-progress-back-home">
            <ArrowLeft size={16} />
            Back to all roadmaps
          </Link>
        </div>
      </section>

      <section className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spinner} />
            <span>Loading in-progress roadmaps...</span>
          </div>
        ) : error ? (
          <div className={styles.errorState}>{error}</div>
        ) : sortedRoadmaps.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>No roadmap in progress yet</h2>
            <p>Open a roadmap and mark some steps completed to see it appear here.</p>
            <Link to="/" className={styles.exploreBtn} id="in-progress-explore-btn">
              Explore Roadmaps
            </Link>
          </div>
        ) : (
          <div className={styles.roadmapGrid}>
            {sortedRoadmaps.map((roadmap, index) => (
              <RoadmapCard
                key={roadmap.roadmapId}
                roadmap={roadmap}
                index={index}
                progress={roadmap.progress}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
