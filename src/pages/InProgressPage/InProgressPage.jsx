import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Target, Loader2, ArrowLeft } from 'lucide-react'
import RoadmapCard from '../../components/RoadmapCard/RoadmapCard'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import styles from './InProgressPage.module.css'

export default function InProgressPage() {
  const { loading: authLoading, progressStorageScope, getInProgressRoadmaps } = useAuth()
  const { language, t } = useLocale()
  const [roadmaps, setRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return

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
  }, [authLoading, getInProgressRoadmaps])

  const sortedRoadmaps = useMemo(() => {
    return [...roadmaps].sort((a, b) => {
      const aPercent = a.progress?.percent || 0
      const bPercent = b.progress?.percent || 0
      if (bPercent !== aPercent) {
        return bPercent - aPercent
      }
      return a.title.localeCompare(b.title, language)
    })
  }, [roadmaps, language])

  return (
    <div className={styles.page} id="in-progress-page">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <Target size={14} />
            {t('inProgress.badge')}
          </div>
          <h1 className={styles.title}>{t('inProgress.title')}</h1>
          <p className={styles.subtitle}>
            {progressStorageScope === 'account'
              ? t('inProgress.subtitleAccount')
              : t('inProgress.subtitleBrowser')}
          </p>
          <Link to="/" className={styles.backLink} id="in-progress-back-home">
            <ArrowLeft size={16} />
            {t('inProgress.backToAll')}
          </Link>
        </div>
      </section>

      <section className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spinner} />
            <span>{t('inProgress.loading')}</span>
          </div>
        ) : error ? (
          <div className={styles.errorState}>{error}</div>
        ) : sortedRoadmaps.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>{t('inProgress.emptyTitle')}</h2>
            <p>{t('inProgress.emptyDescription')}</p>
            <Link to="/" className={styles.exploreBtn} id="in-progress-explore-btn">
              {t('inProgress.exploreButton')}
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
