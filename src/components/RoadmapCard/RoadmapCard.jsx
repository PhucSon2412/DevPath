import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import styles from './RoadmapCard.module.css'

export default function RoadmapCard({ roadmap, index = 0 }) {
  return (
    <Link
      to={`/roadmap/${roadmap.roadmapId}`}
      className={styles.cardLink}
      id={`roadmap-card-${roadmap.roadmapId}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className={styles.card}>
        <h3 className={styles.title}>{roadmap.title}</h3>

        <div className={styles.cardFooter}>
          <span className={styles.nodeCount}>
            {roadmap.stats?.nodes_with_content || 0} topics with content
          </span>
          <ArrowRight size={16} className={styles.arrow} />
        </div>
      </div>
    </Link>
  )
}
