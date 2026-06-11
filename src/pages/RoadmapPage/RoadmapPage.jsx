import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, MousePointer2, Hash, Loader2, CheckCircle2, RotateCcw as ResetIcon, HelpCircle, Sparkles } from 'lucide-react'
import DetailPanel from '../../components/DetailPanel/DetailPanel'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import { apiUrl } from '../../utils/api'
import styles from './RoadmapPage.module.css'

const CLICKABLE_TYPES = new Set(['topic', 'subtopic', 'checklist', 'todo', 'milestone'])
const BG_TYPES = new Set(['section'])
const CONNECTOR_TYPES = new Set(['vertical', 'horizontal'])

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

  // Smart routing bias:
  // If the target is a main 'topic' and is located below, force vertical down routing, but only if they are not far apart horizontally.
  let isVertical = Math.abs(dy) >= Math.abs(dx)
  if (tgtNode.type === 'topic' && Math.abs(dy) > 20 && Math.abs(dx) < Math.abs(dy) * 1.5) {
    isVertical = true
  }

  if (isVertical) {
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
  const [showGuide, setShowGuide] = useState(() => {
    const saved = localStorage.getItem('devpath_show_guide')
    return saved !== 'false'
  })
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

  const startNode = useMemo(() => {
    if (!roadmap?.nodes?.length) return null
    const clickableNodes = roadmap.nodes.filter((n) => CLICKABLE_TYPES.has(n.type))
    if (!clickableNodes.length) return null
    return clickableNodes.reduce(
      (min, n) => ((n.position?.y ?? 0) < (min.position?.y ?? 0) ? n : min),
      clickableNodes[0]
    )
  }, [roadmap])

  const uniqueEdgeColors = useMemo(() => {
    if (!roadmap?.edges?.length) return ['#2b78e4']
    const colors = new Set()
    roadmap.edges.forEach((edge) => {
      const strokeColor = edge.style?.stroke || '#2b78e4'
      colors.add(strokeColor)
    })
    return Array.from(colors)
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

  const isDanglingConnector = useCallback((node) => {
    if (node.type !== 'vertical' && node.type !== 'horizontal') return false
    if (!node.style?.strokeDasharray) return false

    const x = node.position?.x ?? 0
    const y = node.position?.y ?? 0
    const w = node.size?.width ?? 0
    const h = node.size?.height ?? 0

    let ep1, ep2
    if (node.type === 'vertical') {
      const cx = x + w / 2
      ep1 = { x: cx, y: y }
      ep2 = { x: cx, y: y + h }
    } else {
      const cy = y + h / 2
      ep1 = { x: x, y: cy }
      ep2 = { x: x + w, y: cy }
    }

    const threshold = 20

    const isPointConnected = (p) => {
      if (!roadmap?.nodes) return false
      return roadmap.nodes.some((other) => {
        if (other.id === node.id) return false
        if (other.type === 'vertical' || other.type === 'horizontal') return false

        const ox = other.position?.x ?? 0
        const oy = other.position?.y ?? 0
        const ow = other.size?.width ?? 0
        const oh = other.size?.height ?? 0

        const closestX = Math.max(ox, Math.min(p.x, ox + ow))
        const closestY = Math.max(oy, Math.min(p.y, oy + oh))
        const dist = Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2)
        return dist <= threshold
      })
    }

    return !isPointConnected(ep1) || !isPointConnected(ep2)
  }, [roadmap])

  // Fetch roadmap
  useEffect(() => {
    setLoading(true)
    setError(null)
    hasInitPanned.current = false
    fetch(apiUrl(`/api/roadmaps/${id}?lang=${language}`))
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
    const strokeColor = edge.style?.stroke || '#2b78e4'
    const cleanId = strokeColor.replace('#', '')

    return (
      <path
        key={edge.id || `edge-${i}`}
        d={d}
        className={`${styles.edge} ${isDashed ? styles.edgeDashed : ''}`}
        style={{
          stroke: strokeColor,
          strokeWidth: edge.style?.stroke_width || 2,
        }}
        markerEnd={`url(#arrow-${cleanId})`}
      />
    )
  }

  // ── Render node ──
  const renderNode = (node) => {
    const x = node.position?.x ?? 0, y = node.position?.y ?? 0
    const w = node.size?.width ?? 160, h = node.size?.height ?? 40
    const label = node.label || ''

    if (isBoundaryConnector(node) || node.type === 'legend') {
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
    const isStart = startNode && node.id === startNode.id && completedNodeIds.size === 0

    return (
      <g key={node.id}
        className={`${styles.nodeGroup} ${typeClass} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''} ${isClickable ? styles.clickable : ''} ${isStart ? styles.startNode : ''}`}
        onClick={isClickable ? () => setSelectedNode(node) : undefined}
      >
        <rect x={x} y={y} width={w} height={h}
          rx={node.type === 'title' ? 8 : 5}
          style={{ fill: 'var(--bg-primary)' }}
        />
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
        {isStart && (
          <g className={styles.startBadge}>
            <rect
              x={x + w / 2 - 50}
              y={y - 25}
              width={100}
              height={18}
              rx={4}
              className={styles.startBadgeBg}
            />
            <path
              d={`M ${x + w / 2 - 5} ${y - 7} L ${x + w / 2} ${y - 2} L ${x + w / 2 + 5} ${y - 7} Z`}
              className={styles.startBadgeArrow}
            />
            <text
              x={x + w / 2}
              y={y - 16}
              textAnchor="middle"
              className={styles.startBadgeText}
            >
              {t('roadmap.startHere', 'Bắt đầu tại đây')}
            </text>
          </g>
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
  const visibleNodes = sortedNodes.filter(
    (node) => !isBoundaryConnector(node) && !isDanglingConnector(node)
  )
  const sectionNodes = visibleNodes.filter((node) => BG_TYPES.has(node.type))
  const connectorNodes = visibleNodes.filter((node) => CONNECTOR_TYPES.has(node.type))
  const contentNodes = visibleNodes.filter(
    (node) => !BG_TYPES.has(node.type) && !CONNECTOR_TYPES.has(node.type)
  )
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
              <button
                className={`${styles.toolbarBtn} ${showGuide ? styles.activeToolbarBtn : ''}`}
                onClick={() => setShowGuide((prev) => {
                  const next = !prev
                  localStorage.setItem('devpath_show_guide', String(next))
                  return next
                })}
                title={t('roadmap.guideTitle', 'Hướng dẫn')}
                id="toggle-guide-btn"
              >
                <HelpCircle size={16} />
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
        {/* Onboarding Guide Banner */}
        {showGuide && (
          <div className={styles.guideBanner} id="roadmap-guide-banner">
            <div className={styles.guideHeader}>
              <span className={styles.guideTitle}>
                <Sparkles size={14} className={styles.guideIcon} />
                {t('roadmap.guideTitle', 'Hướng dẫn học tập')}
              </span>
              <button
                className={styles.guideClose}
                onClick={() => {
                  setShowGuide(false)
                  localStorage.setItem('devpath_show_guide', 'false')
                }}
                title="Đóng hướng dẫn"
              >
                ✕
              </button>
            </div>
            <p className={styles.guideText}>
              {t('roadmap.guideText')}
            </p>
          </div>
        )}

        {/* Detailed Legend */}
        <div className={styles.legend}>
          <div className={styles.legendGuideTitle}>{t('roadmap.legendGuideTitle', 'Ý nghĩa ký hiệu')}</div>
          
          <div className={styles.legendGroup}>
            <div className={styles.legendGroupTitle}>{t('roadmap.legendTopicType', 'Loại chủ đề')}</div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.legendDotMilestone}`} />
              <span>{t('roadmap.legendMilestone', 'Mốc quan trọng')}</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.legendDotTopic}`} />
              <span>{t('roadmap.legendTopic', 'Chủ đề chính')}</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.legendDotSubtopic}`} />
              <span>{t('roadmap.legendSubtopic', 'Chủ đề phụ')}</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.legendDotCheckpoint}`} />
              <span>{t('roadmap.legendCheckpoint', 'Điểm kiểm tra')}</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.legendDotCompleted}`} />
              <span>{t('roadmap.legendCompleted', 'Đã hoàn thành')}</span>
            </div>
          </div>

          <div className={styles.legendGroup}>
            <div className={styles.legendGroupTitle}>{t('roadmap.legendLines', 'Đường kết nối')}</div>
            <div className={styles.legendItem}>
              <svg className={styles.legendLineSvg} width="24" height="12">
                <line x1="2" y1="6" x2="16" y2="6" stroke="#2b78e4" strokeWidth="2.5" />
                <polygon points="14,3 20,6 14,9" fill="#2b78e4" />
              </svg>
              <span className={styles.legendLineText}>{t('roadmap.legendSolidLine', 'Lộ trình khuyến nghị')}</span>
            </div>
            <div className={styles.legendItem}>
              <svg className={styles.legendLineSvg} width="24" height="12">
                <line x1="2" y1="6" x2="16" y2="6" stroke="#8b949e" strokeWidth="2" strokeDasharray="3,3" />
                <polygon points="14,3 20,6 14,9" fill="#8b949e" />
              </svg>
              <span className={styles.legendLineText}>{t('roadmap.legendDashedLine', 'Kiến thức tự chọn')}</span>
            </div>
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
            {uniqueEdgeColors.map((color) => {
              const cleanId = color.replace('#', '')
              return (
                <marker
                  key={`arrow-${cleanId}`}
                  id={`arrow-${cleanId}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 Z" fill={color} />
                </marker>
              )
            })}
          </defs>
          {sectionNodes.map((node) => renderNode(node))}
          <g>
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
