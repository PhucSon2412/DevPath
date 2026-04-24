import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, MousePointer2, Hash, Loader2, CheckCircle2, RotateCcw as ResetIcon } from 'lucide-react'
import DetailPanel from '../../components/DetailPanel/DetailPanel'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import styles from './RoadmapPage.module.css'

const CLICKABLE_TYPES = new Set(['topic', 'subtopic', 'checklist', 'todo'])
const BG_TYPES = new Set(['section'])
const CONNECTOR_TYPES = new Set(['vertical', 'horizontal'])
const LINE_MASK_EXCLUDE_TYPES = new Set(['label'])

// ── Fix bright colors for dark theme ──
function fixBgColor(color) {
  if (!color) return null
  const c = color.toString().trim().toLowerCase()
  if (c === 'transparent') return 'transparent'
  if (c === 'white' || c === '#fff' || c === '#ffffff' || c === '#fffff' ||
      c === 'rgb(255,255,255)' || c === 'rgb(255, 255, 255)') {
    return 'rgba(255, 255, 255, 0.03)'
  }
  if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
    let r, g, b
    if (c.length === 7) {
      r = parseInt(c.slice(1, 3), 16)
      g = parseInt(c.slice(3, 5), 16)
      b = parseInt(c.slice(5, 7), 16)
    } else {
      r = parseInt(c[1] + c[1], 16)
      g = parseInt(c[2] + c[2], 16)
      b = parseInt(c[3] + c[3], 16)
    }
    if ((r * 299 + g * 587 + b * 114) / 1000 > 200) {
      return `rgba(${r}, ${g}, ${b}, 0.05)`
    }
  }
  return color
}

function fixBorderColor(color) {
  if (!color) return null
  const c = color.toString().trim().toLowerCase()
  if (c === 'transparent') return 'transparent'
  if (c === 'black' || c === '#000' || c === '#000000') return 'rgba(255, 255, 255, 0.06)'
  return color
}

// ── Smart edge routing ──
function getSmartEdgePoints(srcNode, tgtNode) {
  const sx = srcNode.position?.x ?? 0, sy = srcNode.position?.y ?? 0
  const sw = srcNode.size?.width ?? 160, sh = srcNode.size?.height ?? 40
  const tx = tgtNode.position?.x ?? 0, ty = tgtNode.position?.y ?? 0
  const tw = tgtNode.size?.width ?? 160, th = tgtNode.size?.height ?? 40

  const dx = (tx + tw / 2) - (sx + sw / 2)
  const dy = (ty + th / 2) - (sy + sh / 2)

  if (Math.abs(dy) >= Math.abs(dx)) {
    if (dy >= 0) {
      return {
        src: { px: sx + sw / 2, py: sy + sh, dx: 0, dy: 1 },
        tgt: { px: tx + tw / 2, py: ty, dx: 0, dy: -1 },
      }
    } else {
      return {
        src: { px: sx + sw / 2, py: sy, dx: 0, dy: -1 },
        tgt: { px: tx + tw / 2, py: ty + th, dx: 0, dy: 1 },
      }
    }
  } else {
    if (dx >= 0) {
      return {
        src: { px: sx + sw, py: sy + sh / 2, dx: 1, dy: 0 },
        tgt: { px: tx, py: ty + th / 2, dx: -1, dy: 0 },
      }
    } else {
      return {
        src: { px: sx, py: sy + sh / 2, dx: -1, dy: 0 },
        tgt: { px: tx + tw, py: ty + th / 2, dx: 1, dy: 0 },
      }
    }
  }
}

export default function RoadmapPage() {
  const { id } = useParams()
  const {
    loading: authLoading,
    progressStorageScope,
    getRoadmapProgress,
    saveRoadmapNodeProgress,
    resetRoadmapProgress,
  } = useAuth()
  const { language, t } = useLocale()
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [completedNodeIds, setCompletedNodeIds] = useState(new Set())
  const [progressBusyMap, setProgressBusyMap] = useState({})
  const [resettingProgress, setResettingProgress] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)
  const nodeMapRef = useRef({})
  const dragStartRef = useRef({ x: 0, y: 0 })
  const hasInitPanned = useRef(false)
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])

  useEffect(() => { window.scrollTo(0, 0) }, [id])

  useEffect(() => {
    if (authLoading) return

    let cancelled = false
    setProgressLoading(true)

    getRoadmapProgress(id)
      .then((completedNodeIdsList) => {
        if (!cancelled) {
          setCompletedNodeIds(new Set(completedNodeIdsList || []))
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load roadmap progress:', err)
          setCompletedNodeIds(new Set())
        }
      })
      .finally(() => {
        if (!cancelled) {
          setProgressLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, getRoadmapProgress, id])

  const contentYBounds = useMemo(() => {
    if (!roadmap?.nodes?.length) {
      return { minY: -Infinity, maxY: Infinity }
    }

    const nonConnectorNodes = roadmap.nodes.filter((n) => !CONNECTOR_TYPES.has(n.type))
    if (!nonConnectorNodes.length) {
      return { minY: -Infinity, maxY: Infinity }
    }

    let minY = Infinity
    let maxY = -Infinity

    nonConnectorNodes.forEach((n) => {
      const y = n.position?.y ?? 0
      const h = n.size?.height ?? 40
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y + h)
    })

    return { minY, maxY }
  }, [roadmap])

  const isBoundaryConnector = useCallback((node) => {
    if (!CONNECTOR_TYPES.has(node.type)) return false

    const y = node.position?.y ?? 0
    const h = node.size?.height ?? 0
    const nodeTop = y
    const nodeBottom = y + h
    const epsilon = 0.5

    return (
      nodeBottom <= contentYBounds.minY + epsilon ||
      nodeTop >= contentYBounds.maxY - epsilon
    )
  }, [contentYBounds])

  // Fetch roadmap
  useEffect(() => {
    setLoading(true)
    setError(null)
    hasInitPanned.current = false
    fetch(`/api/roadmaps/${id}?lang=${language}`)
      .then((res) => {
        if (!res.ok) throw new Error(t('roadmap.notFoundTitle'))
        return res.json()
      })
      .then((data) => {
        const map = {}
        data.nodes?.forEach((n) => { map[n.id] = n })
        nodeMapRef.current = map
        setRoadmap(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [id, language, t])

  // Compute bounds — include ALL nodes
  const computeBounds = useCallback(() => {
    if (!roadmap?.nodes?.length) return { minX: 0, minY: 0, width: 800, height: 600 }
    const pad = 60
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    roadmap.nodes.forEach((n) => {
      const x = n.position?.x ?? 0, y = n.position?.y ?? 0
      const w = n.size?.width ?? 160, h = n.size?.height ?? 40
      minX = Math.min(minX, x); minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h)
    })
    if (!isFinite(minX)) return { minX: 0, minY: 0, width: 800, height: 600 }
    return { minX: minX - pad, minY: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 }
  }, [roadmap])

  const bounds = computeBounds()

  // Initial pan: center horizontally, show top
  useEffect(() => {
    if (!roadmap || !containerRef.current || hasInitPanned.current) return
    const c = containerRef.current
    requestAnimationFrame(() => {
      if (!c) return
      const initPan = { x: (c.clientWidth - bounds.width) / 2, y: 20 }
      setPan(initPan)
      panRef.current = initPan
      hasInitPanned.current = true
    })
  }, [roadmap, bounds])

  // ── Scroll wheel = zoom toward cursor ──
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const el = containerRef.current
    if (!el) return
    const step = e.deltaY > 0 ? -0.08 : 0.08
    const oldZ = zoomRef.current
    const newZ = Math.min(Math.max(oldZ + step, 0.3), 3)
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const ratio = newZ / oldZ
    const p = panRef.current
    const newPan = { x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio }
    zoomRef.current = newZ
    panRef.current = newPan
    setZoom(newZ)
    setPan(newPan)
  }, [])

  // FIX: re-attach wheel listener after loading completes and container DOM exists
  useEffect(() => {
    if (loading) return
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel, loading])

  // ── Drag = pan ──
  const handleMouseDown = (e) => {
    if (e.target.closest(`.${styles.nodeGroup}`) || e.target.closest('button')) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const newPan = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y }
    panRef.current = newPan
    setPan(newPan)
  }

  const handleMouseUp = () => setIsDragging(false)

  // Touch
  const handleTouchStart = (e) => {
    if (e.target.closest(`.${styles.nodeGroup}`)) return
    if (e.touches.length === 1) {
      setIsDragging(true)
      dragStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      }
    }
  }

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return
    e.preventDefault()
    const newPan = {
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y,
    }
    panRef.current = newPan
    setPan(newPan)
  }

  // Zoom buttons
  const zoomToCenter = (newZ) => {
    const c = containerRef.current
    if (!c) return
    const cx = c.clientWidth / 2, cy = c.clientHeight / 2
    const ratio = newZ / zoom
    setPan((p) => {
      const np = { x: cx - (cx - p.x) * ratio, y: cy - (cy - p.y) * ratio }
      panRef.current = np
      return np
    })
    setZoom(newZ)
    zoomRef.current = newZ
  }

  const zoomIn = () => zoomToCenter(Math.min(zoom + 0.15, 3))
  const zoomOut = () => zoomToCenter(Math.max(zoom - 0.15, 0.3))
  const resetView = () => {
    setZoom(1); zoomRef.current = 1
    const c = containerRef.current
    if (!c) return
    const np = { x: (c.clientWidth - bounds.width) / 2, y: 20 }
    setPan(np); panRef.current = np
  }

  const toggleStepCompleted = async (node) => {
    if (!node || authLoading) return

    const nodeId = node.id
    const prevCompleted = new Set(completedNodeIds)
    const nextCompleted = !prevCompleted.has(nodeId)

    setProgressBusyMap((prev) => ({ ...prev, [nodeId]: true }))
    setCompletedNodeIds((prev) => {
      const next = new Set(prev)
      if (nextCompleted) {
        next.add(nodeId)
      } else {
        next.delete(nodeId)
      }
      return next
    })

    try {
      const completedNodeIdsList = await saveRoadmapNodeProgress(id, nodeId, nextCompleted)
      setCompletedNodeIds(new Set(completedNodeIdsList || []))
    } catch (err) {
      console.error('Failed to save step progress:', err)
      setCompletedNodeIds(prevCompleted)
    } finally {
      setProgressBusyMap((prev) => ({ ...prev, [nodeId]: false }))
    }
  }

  const handleResetRoadmapProgress = async () => {
    if (authLoading) return

    const confirmed = window.confirm(t('roadmap.confirmResetProgress'))
    if (!confirmed) return

    setResettingProgress(true)
    try {
      const completedNodeIdsList = await resetRoadmapProgress(id)
      setCompletedNodeIds(new Set(completedNodeIdsList || []))
    } catch (err) {
      console.error('Failed to reset roadmap progress:', err)
    } finally {
      setResettingProgress(false)
    }
  }

  // ── Render edge ──
  const renderEdge = (edge, i) => {
    const from = nodeMapRef.current[edge.source]
    const to = nodeMapRef.current[edge.target]
    if (!from || !to) return null

    const { src, tgt } = getSmartEdgePoints(from, to)
    const dist = Math.sqrt((tgt.px - src.px) ** 2 + (tgt.py - src.py) ** 2)
    const offset = Math.min(dist * 0.35, 100)

    const cx1 = src.px + src.dx * offset
    const cy1 = src.py + src.dy * offset
    const cx2 = tgt.px + tgt.dx * offset
    const cy2 = tgt.py + tgt.dy * offset

    const d = `M ${src.px} ${src.py} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tgt.px} ${tgt.py}`
    const isDashed = edge.edge_style === 'dashed'

    return (
      <path
        key={edge.id || `edge-${i}`}
        d={d}
        className={`${styles.edge} ${isDashed ? styles.edgeDashed : ''}`}
        style={{
          stroke: edge.style?.stroke || '#2b78e4',
          strokeWidth: edge.style?.stroke_width || 2,
        }}
      />
    )
  }

  // ── Render node ──
  const renderNode = (node) => {
    const x = node.position?.x ?? 0, y = node.position?.y ?? 0
    const w = node.size?.width ?? 160, h = node.size?.height ?? 40
    const label = node.label || ''

    if (isBoundaryConnector(node)) {
      return null
    }

    // ── Connector lines (vertical/horizontal segments) ──
    if (node.type === 'vertical') {
      const cx = x + w / 2
      return (
        <line key={node.id}
          x1={cx} y1={y} x2={cx} y2={y + h}
          stroke={node.style?.stroke || '#2b78e4'}
          strokeWidth={node.style?.strokeWidth || 3.5}
          strokeDasharray={node.style?.strokeDasharray || undefined}
          strokeLinecap={node.style?.strokeLinecap || 'round'}
          className={styles.connectorLine}
        />
      )
    }

    if (node.type === 'horizontal') {
      const cy = y + h / 2
      return (
        <line key={node.id}
          x1={x} y1={cy} x2={x + w} y2={cy}
          stroke={node.style?.stroke || '#2b78e4'}
          strokeWidth={node.style?.strokeWidth || 3.5}
          strokeDasharray={node.style?.strokeDasharray || undefined}
          strokeLinecap={node.style?.strokeLinecap || 'round'}
          className={styles.connectorLine}
        />
      )
    }

    // ── Section background ──
    if (BG_TYPES.has(node.type)) {
      return (
        <rect key={node.id} x={x} y={y} width={w} height={h}
          className={styles.sectionRect}
          style={{
            fill: fixBgColor(node.style?.backgroundColor) || 'rgba(99, 102, 241, 0.03)',
            stroke: fixBorderColor(node.style?.borderColor) || 'rgba(255,255,255,0.05)',
          }}
          rx={8}
        />
      )
    }

    // ── Label nodes (section headers like "Tools / Actions") ──
    if (node.type === 'label') {
      const fontSize = node.style?.fontSize || 17
      return (
        <text key={node.id}
          className={styles.labelText}
          x={x + w / 2} y={y + h / 2}
          fontSize={fontSize}
          dominantBaseline="central"
          textAnchor="middle"
        >
          {label}
        </text>
      )
    }

    // ── Paragraph nodes (multi-line content, use foreignObject for wrapping) ──
    if (node.type === 'paragraph') {
      const fontSize = node.style?.fontSize || 15
      const textAlign = node.style?.textAlign || 'center'
      const bgColor = fixBgColor(node.style?.backgroundColor)
      const borderColor = fixBorderColor(node.style?.borderColor)
      const showBox = bgColor && bgColor !== 'transparent'

      return (
        <g key={node.id} className={styles.nodeGroup}>
          {showBox && (
            <rect x={x} y={y} width={w} height={h} rx={5}
              className={styles.nodeRect}
              style={{
                fill: bgColor,
                stroke: borderColor || 'rgba(255,255,255,0.06)',
              }}
            />
          )}
          <foreignObject x={x} y={y} width={w} height={h}>
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              className={styles.paragraphContent}
              style={{
                fontSize: `${fontSize}px`,
                textAlign: textAlign,
                justifyContent: node.style?.justifyContent || 'center',
                padding: node.style?.padding ? `${node.style.padding}px` : '8px 12px',
              }}
            >
              {label}
            </div>
          </foreignObject>
        </g>
      )
    }

    // ── Regular nodes (topic, subtopic, button, title, etc.) ──
    const isClickable = CLICKABLE_TYPES.has(node.type)
    const isActive = selectedNode?.id === node.id
    const isCompleted = isClickable && completedNodeIds.has(node.id)
    const typeClass = styles[`nodeType_${node.type}`] || ''
    const fontSize = node.style?.fontSize || (node.type === 'title' ? 18 : 13)
    const maxChars = Math.floor(w / (fontSize * 0.55))
    const displayLabel = label.length > maxChars ? label.substring(0, maxChars - 1) + '…' : label

    return (
      <g key={node.id}
        className={`${styles.nodeGroup} ${typeClass} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''} ${isClickable ? styles.clickable : ''}`}
        onClick={isClickable ? () => setSelectedNode(node) : undefined}
      >
        <rect className={styles.nodeRect} x={x} y={y} width={w} height={h}
          rx={node.type === 'title' ? 8 : 5}
          style={{
            fill: fixBgColor(node.style?.backgroundColor) || undefined,
            stroke: fixBorderColor(node.style?.borderColor) || undefined,
          }}
        />
        {label && (
          <text className={styles.nodeText} x={x + w / 2} y={y + h / 2}
            fontSize={fontSize} dominantBaseline="central"
          >
            {displayLabel}
          </text>
        )}
        {isCompleted && (
          <circle
            className={styles.completedMark}
            cx={x + w - 10}
            cy={y + 10}
            r={5}
          />
        )}
      </g>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={32} className={styles.spinner} />
        <span>{t('roadmap.loadingRoadmap')}</span>
      </div>
    )
  }

  // Not found
  if (error || !roadmap) {
    return (
      <div className={styles.notFound} id="roadmap-not-found">
        <h2 className={styles.notFoundTitle}>{t('roadmap.notFoundTitle')}</h2>
        <p className={styles.notFoundText}>{t('roadmap.notFoundText')}</p>
        <Link to="/" className={styles.notFoundBtn}>
          <ArrowLeft size={16} /> {t('roadmap.backAllRoadmaps')}
        </Link>
      </div>
    )
  }

  const sortedNodes = [...roadmap.nodes].sort((a, b) => (a.z_index || 0) - (b.z_index || 0))
  const visibleNodes = sortedNodes.filter((node) => !isBoundaryConnector(node))
  const sectionNodes = visibleNodes.filter((node) => BG_TYPES.has(node.type))
  const connectorNodes = visibleNodes.filter((node) => CONNECTOR_TYPES.has(node.type))
  const contentNodes = visibleNodes.filter(
    (node) => !BG_TYPES.has(node.type) && !CONNECTOR_TYPES.has(node.type)
  )
  const lineMaskNodes = contentNodes.filter((node) => !LINE_MASK_EXCLUDE_TYPES.has(node.type))
  const lineMaskId = `graph-line-mask-${id || 'roadmap'}`
  const stepNodes = roadmap.nodes.filter((n) => CLICKABLE_TYPES.has(n.type))
  const topicCount = stepNodes.length
  const completedSteps = stepNodes.reduce(
    (count, node) => count + (completedNodeIds.has(node.id) ? 1 : 0),
    0
  )
  const progressPercent = topicCount > 0
    ? Math.round((completedSteps / topicCount) * 100)
    : 0
  const progressSummary = progressLoading
      ? t('roadmap.syncingProgress')
      : `${completedSteps}/${topicCount} ${t('roadmap.steps')} • ${progressPercent}%`
  const progressScopeHint = progressStorageScope === 'account'
    ? t('roadmap.syncedAccount')
    : t('roadmap.savedBrowserOnly')

  return (
    <div className={styles.page} id="roadmap-page">
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarInner}>
          <div className={styles.toolbarTopRow}>
            <Link to="/" className={styles.backLink} id="back-link">
              <ArrowLeft size={16} /> {t('roadmap.backAllRoadmaps')}
            </Link>
            <div className={styles.toolbarCenter}>
              <h1 className={styles.toolbarTitle}>{roadmap.title}</h1>
            </div>
            <div className={styles.toolbarActions}>
              <span className={styles.nodeCountBadge}>
                <Hash size={12} /> {topicCount} {t('roadmap.topics')}
              </span>
              <button className={styles.toolbarBtn} onClick={zoomOut} title={t('roadmap.zoomOut')} id="zoom-out-btn">
                <ZoomOut size={16} />
              </button>
              <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
              <button className={styles.toolbarBtn} onClick={zoomIn} title={t('roadmap.zoomIn')} id="zoom-in-btn">
                <ZoomIn size={16} />
              </button>
              <button className={styles.toolbarBtn} onClick={resetView} title={t('roadmap.resetView')} id="reset-view-btn">
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          <div className={styles.progressRow}>
            <div className={styles.progressInfo}>
              <div className={styles.progressLabel}>
                <CheckCircle2 size={14} /> {t('roadmap.learningProgress')}
              </div>
              <div className={styles.progressSummary}>{progressSummary}</div>
              <div className={styles.progressStorageHint}>{progressScopeHint}</div>
            </div>

            <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <button
              className={styles.progressResetBtn}
              onClick={handleResetRoadmapProgress}
              id="reset-progress-btn"
              disabled={progressLoading || resettingProgress || completedSteps === 0}
              title={t('roadmap.resetLearningProgress')}
            >
              <ResetIcon size={14} />
              {resettingProgress ? t('roadmap.resetting') : t('roadmap.resetProgress')}
            </button>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div
        ref={containerRef}
        className={`${styles.graphContainer} ${isDragging ? styles.dragging : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        id="graph-container"
      >
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendDot} ${styles.legendDotTopic}`} /> {t('roadmap.legendTopic')}
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendDot} ${styles.legendDotSubtopic}`} /> {t('roadmap.legendSubtopic')}
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendDot} ${styles.legendDotCompleted}`} /> {t('roadmap.legendCompleted')}
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendDot} ${styles.legendDotDashed}`} /> {t('roadmap.legendOptional')}
          </div>
        </div>

        <svg
          className={styles.graphSvg}
          width={bounds.width}
          height={bounds.height}
          viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <defs>
            <mask id={lineMaskId} maskUnits="userSpaceOnUse">
              <rect
                x={bounds.minX}
                y={bounds.minY}
                width={bounds.width}
                height={bounds.height}
                fill="white"
              />
              {lineMaskNodes.map((node) => {
                const x = node.position?.x ?? 0
                const y = node.position?.y ?? 0
                const w = node.size?.width ?? 160
                const h = node.size?.height ?? 40
                const rx = node.type === 'title' ? 8 : 5

                return (
                  <rect
                    key={`mask-${node.id}`}
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={rx}
                    fill="black"
                  />
                )
              })}
            </mask>
          </defs>

          {sectionNodes.map((node) => renderNode(node))}
          <g mask={`url(#${lineMaskId})`}>
            {roadmap.edges.map((edge, i) => renderEdge(edge, i))}
            {connectorNodes.map((node) => renderNode(node))}
          </g>
          {contentNodes.map((node) => renderNode(node))}
        </svg>

        <div className={styles.graphHint}>
          <MousePointer2 size={14} />
          {t('roadmap.graphHint')}
        </div>
      </div>

      {selectedNode && (
        <DetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          progressEnabled={CLICKABLE_TYPES.has(selectedNode.type)}
          progressAvailable
          progressStorageScope={progressStorageScope}
          completed={completedNodeIds.has(selectedNode.id)}
          progressBusy={!!progressBusyMap[selectedNode.id]}
          onToggleCompleted={() => toggleStepCompleted(selectedNode)}
        />
      )}
    </div>
  )
}
