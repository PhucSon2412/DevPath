import { useState, useEffect } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import RoadmapCard from '../../components/RoadmapCard/RoadmapCard'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import styles from './HomePage.module.css'

export default function HomePage() {
  const [roleRoadmaps, setRoleRoadmaps] = useState([])
  const [skillRoadmaps, setSkillRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [favoriteBusyMap, setFavoriteBusyMap] = useState({})
  const { loading: authLoading, isFavorite, toggleFavorite } = useAuth()
  const { language, t } = useLocale()

  useEffect(() => {
    fetch(`/api/roadmaps?lang=${language}`)
      .then((res) => res.json())
      .then((data) => {
        const groupedRoleRoadmaps = data.roleBased?.roadmaps || []
        const groupedSkillRoadmaps = data.skillBased?.roadmaps || []
        const fallbackRoadmaps = data.roadmaps || []

        if (groupedRoleRoadmaps.length || groupedSkillRoadmaps.length) {
          setRoleRoadmaps(groupedRoleRoadmaps)
          setSkillRoadmaps(groupedSkillRoadmaps)
        } else {
          setRoleRoadmaps([])
          setSkillRoadmaps(fallbackRoadmaps)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch roadmaps:', err)
        setLoading(false)
      })
  }, [language])

  const normalizedSearch = search.trim().toLowerCase()

  const filteredRoleRoadmaps = normalizedSearch
    ? roleRoadmaps.filter((roadmap) => roadmap.title.toLowerCase().includes(normalizedSearch))
    : roleRoadmaps

  const filteredSkillRoadmaps = normalizedSearch
    ? skillRoadmaps.filter((roadmap) => roadmap.title.toLowerCase().includes(normalizedSearch))
    : skillRoadmaps

  const visibleRoadmaps = [...roleRoadmaps, ...skillRoadmaps]
  const hasAnyFilteredRoadmap = filteredRoleRoadmaps.length > 0 || filteredSkillRoadmaps.length > 0

  const handleToggleFavorite = async (roadmapId) => {
    if (authLoading) return

    setFavoriteBusyMap((prev) => ({ ...prev, [roadmapId]: true }))
    try {
      await toggleFavorite(roadmapId)
    } catch (err) {
      console.error('Failed to update favorite roadmap:', err)
    } finally {
      setFavoriteBusyMap((prev) => ({ ...prev, [roadmapId]: false }))
    }
  }

  return (
    <div className={styles.page} id="home-page">
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            {t('home.heroBadge')}
          </div>

          <h1 className={styles.heroTitle}>
            {t('home.heroTitlePrefix')}{' '}
            <span className={styles.heroTitleGradient}>{t('home.heroTitleHighlight')}</span>
            {' '}{t('home.heroTitleSuffix')}
          </h1>

          <p className={styles.heroSubtitle}>
            {t('home.heroSubtitle')}
          </p>

          <div className={styles.heroActions}>
            <a href="#roadmaps" className={styles.btnPrimary} id="cta-explore">
              <Sparkles size={18} />
              {t('home.exploreButton')}
            </a>
          </div>
        </div>
      </section>

      {/* ── Roadmaps Grid ── */}
      <section className={styles.section} id="roadmaps">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('home.sectionTitle')}</h2>
          <p className={styles.sectionDesc}>
            {t('home.sectionDescription')}
          </p>
        </div>

        {/* Search */}
        <div className={styles.filterTabs} id="filter-tabs">
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('home.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="search-roadmaps"
          />
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spinner} />
            <span>{t('home.loadingRoadmaps')}</span>
          </div>
        ) : (
          <div className={styles.groupStack}>
            <div className={styles.groupSection} id="role-based-group">
              <div className={styles.groupHeader}>
                <h3 className={styles.groupTitle}>{t('home.roleBasedTitle')}</h3>
                <span className={styles.groupCount}>{filteredRoleRoadmaps.length}</span>
              </div>

              {filteredRoleRoadmaps.length > 0 ? (
                <div className={styles.roadmapGrid}>
                  {filteredRoleRoadmaps.map((roadmap, index) => (
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
              ) : (
                <p className={styles.groupEmpty}>{t('home.noRoleMatch')}</p>
              )}
            </div>

            <div className={styles.groupSection} id="skill-based-group">
              <div className={styles.groupHeader}>
                <h3 className={styles.groupTitle}>{t('home.skillBasedTitle')}</h3>
                <span className={styles.groupCount}>{filteredSkillRoadmaps.length}</span>
              </div>

              {filteredSkillRoadmaps.length > 0 ? (
                <div className={styles.roadmapGrid}>
                  {filteredSkillRoadmaps.map((roadmap, index) => (
                    <RoadmapCard
                      key={roadmap.roadmapId}
                      roadmap={roadmap}
                      index={filteredRoleRoadmaps.length + index}
                      showFavorite
                      isFavorited={isFavorite(roadmap.roadmapId)}
                      favoriteBusy={!!favoriteBusyMap[roadmap.roadmapId]}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <p className={styles.groupEmpty}>{t('home.noSkillMatch')}</p>
              )}
            </div>

            {!hasAnyFilteredRoadmap && (
              <p className={styles.noResults}>{t('home.noSearchMatch')}</p>
            )}
          </div>
        )}
      </section>

      {/* ── Stats ── */}
      <section className={styles.stats}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('home.statsTitle')}</h2>
          <p className={styles.sectionDesc}>
            {t('home.statsDescription')}
          </p>
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{visibleRoadmaps.length}</div>
            <div className={styles.statLabel}>{t('home.statRoadmaps')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {visibleRoadmaps.reduce((sum, r) => sum + (r.stats?.total_nodes || 0), 0).toLocaleString()}
            </div>
            <div className={styles.statLabel}>{t('home.statTopics')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {visibleRoadmaps.reduce((sum, r) => sum + (r.stats?.nodes_with_content || 0), 0).toLocaleString()}
            </div>
            <div className={styles.statLabel}>{t('home.statResources')}</div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer} id="footer">
        <div className={styles.footerInner}>
          <span className={styles.footerText}>
            {t('home.footerCopyright')}
          </span>
          <div className={styles.footerLinks}>
            <a href="#roadmaps" className={styles.footerLink}>{t('home.footerRoadmaps')}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
