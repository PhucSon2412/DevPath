import { Link } from 'react-router-dom'
import { ArrowRight, Monitor, Server, GitBranch, Atom, Code2, Layers } from 'lucide-react'
import styles from './RoadmapCard.module.css'

const iconMap = {
  Monitor, Server, GitBranch, Atom, Code2, Layers,
}

export default function RoadmapCard({ roadmap, index = 0 }) {
  const Icon = iconMap[roadmap.icon] || Monitor
  const nodeCount = roadmap.nodes.length

  return (
    <Link
      to={`/roadmap/${roadmap.id}`}
      className={styles.cardLink}
      id={`roadmap-card-${roadmap.id}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className={styles.card}
        style={{ '--card-color': roadmap.color }}
      >
        <div className={styles.cardHeader}>
          <div className={styles.iconWrapper}>
            <Icon size={24} />
          </div>
          <span className={styles.badge}>
            {roadmap.category === 'role' ? 'Role' : 'Skill'}
          </span>
        </div>

        <h3 className={styles.title}>{roadmap.title}</h3>
        <p className={styles.description}>{roadmap.description}</p>

        <div className={styles.cardFooter}>
          <span className={styles.nodeCount}>{nodeCount} topics</span>
          <ArrowRight size={16} className={styles.arrow} />
        </div>
      </div>
    </Link>
  )
}
