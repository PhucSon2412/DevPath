import { useEffect, useCallback } from 'react'
import { X, BookOpen, ExternalLink, FileText, Video, BookMarked, Link2, Podcast, Wrench, GraduationCap, BookOpenCheck, CheckCircle2 } from 'lucide-react'
import { useLocale } from '../../contexts/LocaleContext'
import styles from './DetailPanel.module.css'

const typeIcons = {
  article: FileText,
  video: Video,
  documentation: BookMarked,
  course: GraduationCap,
  roadmap: Link2,
  feed: BookOpenCheck,
  podcast: Podcast,
  tool: Wrench,
  book: BookOpen,
  official: BookMarked,
}

export default function DetailPanel({
  node,
  onClose,
  progressEnabled = false,
  progressAvailable = false,
  progressStorageScope = 'account',
  completed = false,
  progressBusy = false,
  onToggleCompleted,
}) {
  const { t } = useLocale()

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

  // Use content.description (crawled) or fall back to legacy fields
  const description = node.content?.description || node.description || null
  // Use content.links (crawled) or fall back to legacy resources
  const links = node.content?.links || node.resources || []

  return (
    <>
      {/* Backdrop */}
      <div className={styles.overlay} onClick={onClose} id="detail-overlay" />

      {/* Panel */}
      <aside className={styles.panel} id="detail-panel" role="dialog" aria-label={node.label}>
        {/* Header */}
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleRow}>
            <div className={`${styles.panelType} ${styles[node.type] || ''}`}>
              {node.type}
            </div>
            <h2 className={styles.panelTitle}>{node.label}</h2>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={t('detail.closePanel')}
            id="detail-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.panelBody}>
          {progressEnabled && (
            <div className={styles.progressSection}>
              <div className={styles.sectionLabel}>
                <CheckCircle2 size={14} />
                {t('detail.learningProgress')}
              </div>

              {progressAvailable ? (
                <>
                  <button
                    type="button"
                    className={`${styles.progressToggleBtn} ${completed ? styles.progressDone : ''}`}
                    onClick={onToggleCompleted}
                    disabled={progressBusy}
                    id="detail-progress-toggle"
                  >
                    <CheckCircle2 size={16} />
                    {progressBusy
                      ? t('detail.saving')
                      : completed
                        ? t('detail.completedToggle')
                        : t('detail.markCompleted')}
                  </button>
                  <p className={styles.progressStorageHint}>
                    {progressStorageScope === 'account'
                      ? t('detail.progressSynced')
                      : t('detail.progressBrowserOnly')}
                  </p>
                </>
              ) : (
                <p className={styles.progressLoginHint}>
                    {t('detail.signInHint')}
                </p>
              )}
            </div>
          )}

          {/* Description */}
          {description && (
            <div className={styles.descriptionSection}>
              <div className={styles.sectionLabel}>
                <BookOpen size={14} />
                {t('detail.description')}
              </div>
              <p className={styles.description}>{description}</p>
            </div>
          )}

          {/* Resources / Links */}
          {links.length > 0 && (
            <div className={styles.resourcesSection}>
              <div className={styles.sectionLabel}>
                <FileText size={14} />
                {t('detail.resources')} ({links.length})
              </div>
              <div className={styles.resourceList}>
                {links.map((res, i) => {
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
                      <span className={`${styles.resourceBadge} ${styles[res.type] || ''}`}>
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

          {/* No content state */}
          {!description && links.length === 0 && (
            <div className={styles.emptyState}>
              <p>{t('detail.noContent')}</p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
