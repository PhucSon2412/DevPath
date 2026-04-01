import { useEffect, useCallback } from 'react'
import { X, BookOpen, ExternalLink, FileText, Video, BookMarked } from 'lucide-react'
import styles from './DetailPanel.module.css'

const typeIcons = {
  article: FileText,
  video: Video,
  documentation: BookMarked,
}

export default function DetailPanel({ node, onClose }) {
  // Close on Escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  if (!node) return null

  return (
    <>
      {/* Backdrop */}
      <div className={styles.overlay} onClick={onClose} id="detail-overlay" />

      {/* Panel */}
      <aside className={styles.panel} id="detail-panel" role="dialog" aria-label={node.label}>
        {/* Header */}
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleRow}>
            <div className={`${styles.panelType} ${styles[node.type]}`}>
              {node.type}
            </div>
            <h2 className={styles.panelTitle}>{node.label}</h2>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close panel"
            id="detail-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.panelBody}>
          {/* Description */}
          <div className={styles.descriptionSection}>
            <div className={styles.sectionLabel}>
              <BookOpen size={14} />
              Description
            </div>
            <p className={styles.description}>{node.description}</p>
          </div>

          {/* Resources */}
          {node.resources && node.resources.length > 0 && (
            <div className={styles.resourcesSection}>
              <div className={styles.sectionLabel}>
                <FileText size={14} />
                Resources
              </div>
              <div className={styles.resourceList}>
                {node.resources.map((res, i) => {
                  const TypeIcon = typeIcons[res.type] || FileText
                  return (
                    <a
                      key={i}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.resourceItem}
                      id={`resource-${i}`}
                    >
                      <span className={`${styles.resourceBadge} ${styles[res.type]}`}>
                        {res.type}
                      </span>
                      <span className={styles.resourceTitle}>{res.title}</span>
                      <ExternalLink size={14} className={styles.resourceArrow} />
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
