import { useState } from 'react'
import { ArrowDown, GitFork, Sparkles } from 'lucide-react'
import { roadmaps } from '../../data/roadmaps'
import RoadmapCard from '../../components/RoadmapCard/RoadmapCard'
import styles from './HomePage.module.css'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'role', label: 'Role-based' },
  { key: 'skill', label: 'Skill-based' },
]

export default function HomePage() {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all'
    ? roadmaps
    : roadmaps.filter(r => r.category === filter)

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

        <div className={styles.filterTabs} id="filter-tabs">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`${styles.filterTab} ${filter === f.key ? styles.active : ''}`}
              onClick={() => setFilter(f.key)}
              id={`filter-${f.key}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className={styles.roadmapGrid}>
          {filtered.map((roadmap, index) => (
            <RoadmapCard key={roadmap.id} roadmap={roadmap} index={index} />
          ))}
        </div>
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
            <div className={styles.statNumber}>6</div>
            <div className={styles.statLabel}>Roadmaps</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>80+</div>
            <div className={styles.statLabel}>Topics</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>200+</div>
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
