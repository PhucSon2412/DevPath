import { Link } from 'react-router-dom'
import { ArrowRight, Heart } from 'lucide-react'
import styles from './RoadmapCard.module.css'

export default function RoadmapCard({
  roadmap,
  index = 0,
  showFavorite = false,
  isFavorited = false,
  favoriteBusy = false,
  onToggleFavorite,
  progress,
}) {
  return (
    <div
      className={styles.cardWrapper}
      id={`roadmap-card-${roadmap.roadmapId}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {showFavorite && (
        <button
          type="button"
          className={`${styles.favoriteBtn} ${isFavorited ? styles.favoriteActive : ''}`}
          onClick={() => onToggleFavorite?.(roadmap.roadmapId)}
          disabled={favoriteBusy}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          id={`favorite-btn-${roadmap.roadmapId}`}
        >
          <Heart size={16} />
        </button>
      )}

      <Link
        to={`/roadmap/${roadmap.roadmapId}`}
        className={styles.cardLink}
      >
        <div className={`${styles.card} ${showFavorite ? styles.cardWithFavorite : ''}`}>
          <h3 className={styles.title}>{roadmap.title}</h3>

          <div className={styles.cardFooter}>
              {progress ? (
                <div className={styles.progressMeta}>
                  <span className={styles.progressText}>
                    {progress.completedSteps}/{progress.totalSteps} steps • {progress.percent}%
                  </span>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${progress.percent}%` }} />
                  </div>
                </div>
              ) : (
                <span className={styles.nodeCount}>
                  {roadmap.stats?.nodes_with_content || 0} topics with content
                </span>
              )}
            <ArrowRight size={16} className={styles.arrow} />
          </div>
        </div>
      </Link>
    </div>
  )
}
