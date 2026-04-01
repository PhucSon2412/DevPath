import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, MousePointer2, Hash } from 'lucide-react'
import { getRoadmapById, NODE_TYPES } from '../../data/roadmaps'
import DetailPanel from '../../components/DetailPanel/DetailPanel'
import styles from './RoadmapPage.module.css'

// Node dimensions
const NODE_W = 180
const NODE_H = 44
const NODE_W_MILESTONE = 200
const NODE_H_MILESTONE = 48

function getNodeDims(type) {
  if (type === NODE_TYPES.MILESTONE || type === NODE_TYPES.CHECKPOINT) {
    return { w: NODE_W_MILESTONE, h: NODE_H_MILESTONE }
  }
  return { w: NODE_W, h: NODE_H }
}

// Type-to-CSS class mapping
const typeClassMap = {
  [NODE_TYPES.MILESTONE]: styles.nodeTypeMilestone,
  [NODE_TYPES.TOPIC]: styles.nodeTypeTopic,
  [NODE_TYPES.SUBTOPIC]: styles.nodeTypeSubtopic,
  [NODE_TYPES.CHECKPOINT]: styles.nodeTypeCheckpoint,
}

export default function RoadmapPage() {
  const { id } = useParams()
  const roadmap = getRoadmapById(id)

  const [selectedNode, setSelectedNode] = useState(null)
  const [zoom, setZoom] = useState(2)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  // Calculate SVG viewBox based on nodes
  const computeViewBox = useCallback(() => {
    if (!roadmap) return { minX: 0, minY: 0, width: 800, height: 600 }
    const padding = 80
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    roadmap.nodes.forEach(n => {
      const { w, h } = getNodeDims(n.type)
      minX = Math.min(minX, n.x - w / 2)
      minY = Math.min(minY, n.y - h / 2)
      maxX = Math.max(maxX, n.x + w / 2)
      maxY = Math.max(maxY, n.y + h / 2)
    })
    return {
      minX: minX - padding,
      minY: minY - padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2,
    }
  }, [roadmap])

  const viewBox = computeViewBox()

  // Pan handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest(`.${styles.nodeGroup}`)) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch support
  const handleTouchStart = useCallback((e) => {
    if (e.target.closest(`.${styles.nodeGroup}`)) return
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      })
    }
  }, [pan])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || e.touches.length !== 1) return
    e.preventDefault()
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    })
  }, [isDragging, dragStart])

  // Zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.min(Math.max(z + delta, 0.3), 2.5))
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const zoomIn = () => setZoom(z => Math.min(z + 0.15, 2.5))
  const zoomOut = () => setZoom(z => Math.max(z - 0.15, 0.3))
  const resetView = () => { setZoom(2); setPan({ x: 0, y: 0 }) }

  // Render edge paths as smooth curves
  const renderEdge = (edge, i) => {
    const from = roadmap.nodes.find(n => n.id === edge.from)
    const to = roadmap.nodes.find(n => n.id === edge.to)
    if (!from || !to) return null

    const { h: fromH } = getNodeDims(from.type)
    const { h: toH } = getNodeDims(to.type)

    const x1 = from.x
    const y1 = from.y + fromH / 2
    const x2 = to.x
    const y2 = to.y - toH / 2

    const midY = (y1 + y2) / 2
    const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`

    return (
      <path
        key={`edge-${i}`}
        d={d}
        className={styles.edge}
      />
    )
  }

  // Render nodes with stagger animation
  const renderNode = (node, index) => {
    const { w, h } = getNodeDims(node.type)
    const isActive = selectedNode?.id === node.id
    const typeClass = typeClassMap[node.type] || ''

    return (
      <g
        key={node.id}
        className={`${styles.nodeGroup} ${typeClass} ${isActive ? styles.active : ''}`}
        onClick={() => setSelectedNode(node)}
        id={`node-${node.id}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedNode(node) }}
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <rect
          className={styles.nodeRect}
          x={node.x - w / 2}
          y={node.y - h / 2}
          width={w}
          height={h}
        />
        <text
          className={styles.nodeText}
          x={node.x}
          y={node.y}
          fontSize={node.type === NODE_TYPES.MILESTONE || node.type === NODE_TYPES.CHECKPOINT ? 14 : 12}
        >
          {node.label.length > 22 ? node.label.substring(0, 20) + '…' : node.label}
        </text>
      </g>
    )
  }

  // Not found state
  if (!roadmap) {
    return (
      <div className={styles.notFound} id="roadmap-not-found">
        <h2 className={styles.notFoundTitle}>Roadmap Not Found</h2>
        <p className={styles.notFoundText}>The roadmap you're looking for doesn't exist.</p>
        <Link to="/" className={styles.notFoundBtn}>
          <ArrowLeft size={16} />
          Back to Roadmaps
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.page} id="roadmap-page">
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarInner}>
          <Link to="/" className={styles.backLink} id="back-link">
            <ArrowLeft size={16} />
            All Roadmaps
          </Link>

          <div className={styles.toolbarCenter}>
            <h1 className={styles.toolbarTitle}>{roadmap.title}</h1>
            <p className={styles.toolbarDesc}>{roadmap.description}</p>
          </div>

          <div className={styles.toolbarActions}>
            <span className={styles.nodeCountBadge}>
              <Hash size={12} />
              {roadmap.nodes.length} topics
            </span>
            <button className={styles.toolbarBtn} onClick={zoomOut} title="Zoom Out" id="zoom-out-btn">
              <ZoomOut size={16} />
            </button>
            <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
            <button className={styles.toolbarBtn} onClick={zoomIn} title="Zoom In" id="zoom-in-btn">
              <ZoomIn size={16} />
            </button>
            <button className={styles.toolbarBtn} onClick={resetView} title="Reset View" id="reset-view-btn">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Info */}
      <div className={styles.mobileInfo}>
        <div className={styles.mobileInfoTitle}>{roadmap.title}</div>
        <div className={styles.mobileInfoText}>{roadmap.description}</div>
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
        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendDot} ${styles.legendDotMilestone}`} />
            Milestone
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendDot} ${styles.legendDotTopic}`} />
            Topic
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendDot} ${styles.legendDotSubtopic}`} />
            Optional / Subtopic
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendDot} ${styles.legendDotCheckpoint}`} />
            Checkpoint
          </div>
        </div>

        <svg
          className={styles.graphSvg}
          viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="xMidYMin meet"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center top',
          }}
        >
          {/* Edges */}
          {roadmap.edges.map((edge, i) => renderEdge(edge, i))}

          {/* Nodes */}
          {roadmap.nodes.map((node, i) => renderNode(node, i))}
        </svg>

        {/* Hint */}
        <div className={styles.graphHint}>
          <MousePointer2 size={14} />
          Click on any topic to see details • Scroll to zoom • Drag to pan
        </div>
      </div>

      {/* Detail Panel */}
      {selectedNode && (
        <DetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}
