import { useState, useEffect } from 'react'
import { GitFork, Sparkles, Loader2 } from 'lucide-react'
import RoadmapCard from '../../components/RoadmapCard/RoadmapCard'
import styles from './HomePage.module.css'

export default function HomePage() {
  const [roadmaps, setRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/roadmaps')
      .then((res) => res.json())
      .then((data) => {
        setRoadmaps(data.roadmaps || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch roadmaps:', err)
        setLoading(false)
      })
  }, [])

  const filtered = search
    ? roadmaps.filter((r) =>
        r.title.toLowerCase().includes(search.toLowerCase())
      )
    : roadmaps

  return (
    <div className={styles.page} id="home-page">
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Community Driven Roadmaps
          </div>

          <h1 className={styles.heroTitle}>
            Step-by-step{' '}
            <span className={styles.heroTitleGradient}>learning paths</span>
            {' '}for modern developers
          </h1>

          <p className={styles.heroSubtitle}>
            Community-driven roadmaps, guides, and resources to help you
            pick your path and grow in your career as a developer.
          </p>

          <div className={styles.heroActions}>
            <a href="#roadmaps" className={styles.btnPrimary} id="cta-explore">
              <Sparkles size={18} />
              Explore Roadmaps
            </a>
            <a
              href="https://github.com/kamranahmedse/developer-roadmap"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
              id="cta-github"
            >
              <GitFork size={18} />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ── Roadmaps Grid ── */}
      <section className={styles.section} id="roadmaps">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Developer Roadmaps</h2>
          <p className={styles.sectionDesc}>
            Step by step guides and paths to learn different tools or technologies
          </p>
        </div>

        {/* Search */}
        <div className={styles.filterTabs} id="filter-tabs">
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search roadmaps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="search-roadmaps"
          />
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={32} className={styles.spinner} />
            <span>Loading roadmaps...</span>
          </div>
        ) : (
          <div className={styles.roadmapGrid}>
            {filtered.map((roadmap, index) => (
              <RoadmapCard key={roadmap.roadmapId} roadmap={roadmap} index={index} />
            ))}
            {filtered.length === 0 && (
              <p className={styles.noResults}>No roadmaps match your search.</p>
            )}
          </div>
        )}
      </section>

      {/* ── Stats ── */}
      <section className={styles.stats}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Open Source & Community</h2>
          <p className={styles.sectionDesc}>
            Built by the community, for the community
          </p>
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{roadmaps.length}</div>
            <div className={styles.statLabel}>Roadmaps</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {roadmaps.reduce((sum, r) => sum + (r.stats?.total_nodes || 0), 0).toLocaleString()}
            </div>
            <div className={styles.statLabel}>Topics</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {roadmaps.reduce((sum, r) => sum + (r.stats?.nodes_with_content || 0), 0).toLocaleString()}
            </div>
            <div className={styles.statLabel}>Resources</div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer} id="footer">
        <div className={styles.footerInner}>
          <span className={styles.footerText}>
            © 2026 DevPath. Community-driven developer roadmaps.
          </span>
          <div className={styles.footerLinks}>
            <a href="https://github.com/kamranahmedse/developer-roadmap" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>GitHub</a>
            <a href="#roadmaps" className={styles.footerLink}>Roadmaps</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
