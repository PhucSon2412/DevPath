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

// ── Orthogonal edge routing with obstacle avoidance and rounded corners ──

// Minimum visual clearance width around the path (px)
const ROUTE_CLEAR_W = 16

// Check if a rectangle [x1..x2] × [y1..y2] overlaps any node's padded bounding box.
// `halfW` adds a lateral margin beyond the rect boundary (for visual clearance).
function isCorridorClear(x1, y1, x2, y2, nodes, excludeIds) {
  const left = Math.min(x1, x2) - ROUTE_CLEAR_W / 2
  const right = Math.max(x1, x2) + ROUTE_CLEAR_W / 2
  const top = Math.min(y1, y2)
  const bottom = Math.max(y1, y2)
  for (const n of nodes) {
    if (excludeIds.has(n.id)) continue
    if (CONNECTOR_TYPES.has(n.type)) continue  // connectors are not obstacles
    const nx = n.position?.x ?? 0
    const ny = n.position?.y ?? 0
    const nw = n.size?.width ?? 0
    const nh = n.size?.height ?? 0
    if (left < nx + nw && right > nx && top < ny + nh && bottom > ny) return false
  }
  return true
}

// Build an SVG path string with rounded corners for an orthogonal (rectilinear) polyline.
// `pts` is an array of {x, y} waypoints. `r` is the corner radius.
function buildRoundedPolyline(pts, r = 10) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const next = pts[i + 1]
    const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y
    const dx2 = next.x - curr.x, dy2 = next.y - curr.y
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    if (len1 === 0 || len2 === 0) { d += ` L ${curr.x} ${curr.y}`; continue }
    const safeR = Math.min(r, len1 / 2, len2 / 2)
    const bx = curr.x - (dx1 / len1) * safeR
    const by = curr.y - (dy1 / len1) * safeR
    const ax = curr.x + (dx2 / len2) * safeR
    const ay = curr.y + (dy2 / len2) * safeR
    d += ` L ${bx} ${by} Q ${curr.x} ${curr.y} ${ax} ${ay}`
  }
  const last = pts[pts.length - 1]
  d += ` L ${last.x} ${last.y}`
  return d
}

// Scan outward from `start` in steps, alternating +/−, and find the first value
// where isCorridorClear returns true for the segment described by xOrY='x'|'y'.
function findClearLine(axis, start, rangeMin, rangeMax, fixedMin, fixedMax, nodes, excludeIds, step = 20, maxTries = 60) {
  for (let attempt = 0; attempt <= maxTries; attempt++) {
    const offsets = attempt === 0 ? [0] : [attempt * step, -attempt * step]
    for (const off of offsets) {
      const candidate = start + off
      const clear =
        axis === 'x'
          ? isCorridorClear(candidate, fixedMin, candidate, fixedMax, nodes, excludeIds)
          : isCorridorClear(fixedMin, candidate, fixedMax, candidate, nodes, excludeIds)
      if (clear) return candidate
    }
  }
  return start  // fallback: give up, use default
}

// Build a complete orthogonal routed path between two nodes.
function buildOrthogonalPath(srcNode, tgtNode, allNodes) {
  const sx = srcNode.position?.x ?? 0, sy = srcNode.position?.y ?? 0
  const sw = srcNode.size?.width ?? 160, sh = srcNode.size?.height ?? 40
  const tx = tgtNode.position?.x ?? 0, ty = tgtNode.position?.y ?? 0
  const tw = tgtNode.size?.width ?? 160, th = tgtNode.size?.height ?? 40

  const cdx = (tx + tw / 2) - (sx + sw / 2)
  const cdy = (ty + th / 2) - (sy + sh / 2)

  // Determine exit / entry port directions (same heuristic as before)
  let isVertical = Math.abs(cdy) >= Math.abs(cdx)
  if (tgtNode.type === 'topic' && Math.abs(cdy) > 20 && Math.abs(cdx) < Math.abs(cdy) * 1.5) {
    isVertical = true
  }

  let src, tgt
  if (isVertical) {
    if (cdy >= 0) {
      src = { px: sx + sw / 2, py: sy + sh, dx: 0, dy: 1 }
      tgt = { px: tx + tw / 2, py: ty,      dx: 0, dy: -1 }
    } else {
      src = { px: sx + sw / 2, py: sy,      dx: 0, dy: -1 }
      tgt = { px: tx + tw / 2, py: ty + th, dx: 0, dy: 1 }
    }
  } else {
    if (cdx >= 0) {
      src = { px: sx + sw,    py: sy + sh / 2, dx: 1,  dy: 0 }
      tgt = { px: tx,         py: ty + th / 2, dx: -1, dy: 0 }
    } else {
      src = { px: sx,         py: sy + sh / 2, dx: -1, dy: 0 }
      tgt = { px: tx + tw,    py: ty + th / 2, dx: 1,  dy: 0 }
    }
  }

  const excludeIds = new Set([srcNode.id, tgtNode.id])
  const STUB    = 18   // stub distance before first turn
  const CORNER_R = 10  // rounded corner radius

  // Stub endpoints (just outside the source / target bounding box)
  const s = { x: src.px + src.dx * STUB, y: src.py + src.dy * STUB }
  const e = { x: tgt.px + tgt.dx * STUB, y: tgt.py + tgt.dy * STUB }

  // ── Both horizontal exits → need a vertical bridge at midX ──
  if (src.dx !== 0 && tgt.dx !== 0) {
    const topY   = Math.min(s.y, e.y)
    const botY   = Math.max(s.y, e.y)
    const midX   = findClearLine('x', (s.x + e.x) / 2, null, null, topY, botY, allNodes, excludeIds)
    return buildRoundedPolyline(
      [{ x: src.px, y: src.py }, s, { x: midX, y: s.y }, { x: midX, y: e.y }, e, { x: tgt.px, y: tgt.py }],
      CORNER_R
    )
  }

  // ── Both vertical exits ──
  if (src.dy !== 0 && tgt.dy !== 0) {
    const topY   = Math.min(s.y, e.y)
    const botY   = Math.max(s.y, e.y)
    const sameCol = Math.abs(s.x - e.x) < ROUTE_CLEAR_W * 2

    if (!sameCol) {
      // Different columns: try a horizontal H-bridge at midY where BOTH arms are clear
      // Arm 1: vertical from s.y to midY at s.x
      // Arm 2: vertical from e.y to midY at e.x
      // Bridge: horizontal from s.x to e.x at midY
      const defaultMidY = (s.y + e.y) / 2
      let bestMidY = null
      const step = 20, maxT = 60
      for (let attempt = 0; attempt <= maxT && bestMidY === null; attempt++) {
        const offsets = attempt === 0 ? [0] : [attempt * step, -attempt * step]
        for (const off of offsets) {
          const candidate = defaultMidY + off
          if (candidate < topY || candidate > botY) continue
          const arm1Clear = isCorridorClear(s.x, Math.min(s.y, candidate), s.x, Math.max(s.y, candidate), allNodes, excludeIds)
          const arm2Clear = isCorridorClear(e.x, Math.min(e.y, candidate), e.x, Math.max(e.y, candidate), allNodes, excludeIds)
          const bridgeClear = isCorridorClear(Math.min(s.x, e.x), candidate, Math.max(s.x, e.x), candidate, allNodes, excludeIds)
          if (arm1Clear && arm2Clear && bridgeClear) { bestMidY = candidate; break }
        }
      }
      if (bestMidY !== null) {
        return buildRoundedPolyline(
          [{ x: src.px, y: src.py }, s, { x: s.x, y: bestMidY }, { x: e.x, y: bestMidY }, e, { x: tgt.px, y: tgt.py }],
          CORNER_R
        )
      }
    }

    // Same column OR no clear H-bridge found:
    // Strategy — find a clear VERTICAL escape corridor off to the side, then route:
    //   src → stub → horizontal to escX → vertical through clear corridor → horizontal back → stub → tgt
    const escX = findClearLine('x', s.x, null, null, topY, botY, allNodes, excludeIds)
    // Build U-shape: src → s → turn to escX → vertical → turn back to e.x → e → tgt
    return buildRoundedPolyline(
      [
        { x: src.px, y: src.py }, s,
        { x: escX, y: s.y },
        { x: escX, y: e.y },
        e, { x: tgt.px, y: tgt.py },
      ],
      CORNER_R
    )
  }

  // ── L-shape (perpendicular exits) ──
  // One exits horizontally, the other vertically → single right-angle bend
  const cornerX = src.dx !== 0 ? e.x : s.x
  const cornerY = src.dx !== 0 ? s.y : e.y
  // Check if the L corner itself is clear; if not, adjust the corner towards a clearer spot
  return buildRoundedPolyline(
    [{ x: src.px, y: src.py }, s, { x: cornerX, y: cornerY }, e, { x: tgt.px, y: tgt.py }],
    CORNER_R
  )
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

  const healedEdges = useMemo(() => {
    if (!roadmap?.nodes?.length) return []
    const originalEdges = roadmap.edges || []

    const topicNodes = roadmap.nodes.filter((n) => n.type === 'topic')
    if (!topicNodes.length) return originalEdges

    // Find title node or fallback to start node
    const titleNode = roadmap.nodes.find((n) => n.type === 'title') || topicNodes[0]

    // Helper to get reachable nodes from the titleNode using BFS
    const getReachableSet = (edgesList, startId) => {
      const adj = {}
      edgesList.forEach((e) => {
        if (!adj[e.source]) adj[e.source] = []
        adj[e.source].push(e.target)
      })

      const visited = new Set()
      const queue = [startId]
      visited.add(startId)

      while (queue.length > 0) {
        const u = queue.shift()
        const neighbors = adj[u] || []
        neighbors.forEach((v) => {
          if (!visited.has(v)) {
            visited.add(v)
            queue.push(v)
          }
        })
      }
      return visited
    }

    // ── Build implicit edges from solid connector nodes ──
    // A solid vertical/horizontal connector that touches two content nodes acts as a
    // real connection. Adding bidirectional implicit edges for these ensures the BFS
    // reachability check marks connector-bridged nodes as reachable, preventing
    // healedEdges from creating a redundant duplicate bezier on top of the connector.
    const CONNECTOR_THRESHOLD = 25
    const nonConnectorNodes = roadmap.nodes.filter((n) => !CONNECTOR_TYPES.has(n.type))

    const findNearestNode = (p) => {
      let closest = null
      let closestDist = Infinity
      nonConnectorNodes.forEach((other) => {
        const ox = other.position?.x ?? 0
        const oy = other.position?.y ?? 0
        const ow = other.size?.width ?? 0
        const oh = other.size?.height ?? 0
        const nearX = Math.max(ox, Math.min(p.x, ox + ow))
        const nearY = Math.max(oy, Math.min(p.y, oy + oh))
        const dist = Math.sqrt((p.x - nearX) ** 2 + (p.y - nearY) ** 2)
        if (dist <= CONNECTOR_THRESHOLD && dist < closestDist) {
          closest = other
          closestDist = dist
        }
      })
      return closest
    }

    const connectorImplicitEdges = []
    roadmap.nodes.forEach((node) => {
      if (!CONNECTOR_TYPES.has(node.type)) return
      // Only solid connectors (no dash, or dash='0'/'0 0')
      const dash = node.style?.strokeDasharray
      const trimmedDash = dash ? String(dash).trim() : ''
      if (trimmedDash !== '' && trimmedDash !== '0' && trimmedDash !== '0 0') return

      const x = node.position?.x ?? 0
      const y = node.position?.y ?? 0
      const w = node.size?.width ?? 0
      const h = node.size?.height ?? 0

      let ep1, ep2
      if (node.type === 'vertical') {
        const cx = x + w / 2
        ep1 = { x: cx, y }
        ep2 = { x: cx, y: y + h }
      } else {
        const cy = y + h / 2
        ep1 = { x, y: cy }
        ep2 = { x: x + w, y: cy }
      }

      const srcNode = findNearestNode(ep1)
      const tgtNode = findNearestNode(ep2)
      if (!srcNode || !tgtNode || srcNode.id === tgtNode.id) return

      // Bidirectional so BFS can traverse from either direction
      connectorImplicitEdges.push({ id: `ci-${srcNode.id}-${tgtNode.id}`, source: srcNode.id, target: tgtNode.id })
      connectorImplicitEdges.push({ id: `ci-${tgtNode.id}-${srcNode.id}`, source: tgtNode.id, target: srcNode.id })
    })

    const currentEdges = [...originalEdges, ...connectorImplicitEdges]
    const virtualEdges = []

    let changed = true
    let limit = 0
    // Prevent infinite loop
    while (changed && limit < 100) {
      changed = false
      limit++

      const reachable = getReachableSet(currentEdges, titleNode.id)

      // Unreachable topic nodes
      const unreachableTopics = topicNodes.filter((n) => !reachable.has(n.id))

      const candidates = []
      unreachableTopics.forEach((target) => {
        const reachableTopicsAbove = topicNodes.filter(
          (n) => reachable.has(n.id) && (n.position?.y ?? 0) < (target.position?.y ?? 0)
        )

        const targetCandidates = reachableTopicsAbove
          .map((source) => {
            const dy = (target.position?.y ?? 0) - ((source.position?.y ?? 0) + (source.size?.height ?? 40))
            const dx = Math.abs((target.position?.x ?? 0) - (source.position?.x ?? 0))
            return { source, target, dy, dx }
          })
          .filter((c) => c.dy > 0 && c.dy <= 400 && c.dx < 60)

        targetCandidates.sort((a, b) => a.dy - b.dy)
        if (targetCandidates.length > 0) {
          candidates.push(targetCandidates[0])
        }
      })

      if (candidates.length > 0) {
        candidates.sort((a, b) => a.dy - b.dy)
        const best = candidates[0]

        const newEdge = {
          id: `healed-edge-${best.source.id}-${best.target.id}`,
          source: best.source.id,
          target: best.target.id,
          edge_style: 'solid',
          line_type: 'default',
          style: {
            stroke: '#2b78e4',
            stroke_width: 3.5,
          },
        }

        currentEdges.push(newEdge)
        virtualEdges.push(newEdge)
        changed = true
      }
    }

    return [...originalEdges, ...virtualEdges]
  }, [roadmap])

  // ── Convert dashed connector nodes into proper directed dashed edges ──
  // Dashed vertical/horizontal connector nodes (strokeDasharray e.g. "0.8 8") are
  // decorative layout lines from the source data. We resolve which two content nodes
  // each connector bridges spatially, then synthesise a real dashed edge with an
  // arrowhead so the direction is clear. Direction follows geometry: for vertical
  // connectors the top endpoint is the source; for horizontal, the left endpoint.
  const syntheticEdgesFromDashedConnectors = useMemo(() => {
    if (!roadmap?.nodes) return []

    const THRESHOLD = 20
    const nonConnectors = roadmap.nodes.filter((n) => !CONNECTOR_TYPES.has(n.type))

    // Find the closest content node touching a given point (within THRESHOLD px)
    const findConnectedNode = (p) => {
      let closest = null
      let closestDist = Infinity
      nonConnectors.forEach((other) => {
        const ox = other.position?.x ?? 0
        const oy = other.position?.y ?? 0
        const ow = other.size?.width ?? 0
        const oh = other.size?.height ?? 0
        const nearX = Math.max(ox, Math.min(p.x, ox + ow))
        const nearY = Math.max(oy, Math.min(p.y, oy + oh))
        const dist = Math.sqrt((p.x - nearX) ** 2 + (p.y - nearY) ** 2)
        if (dist <= THRESHOLD && dist < closestDist) {
          closest = other
          closestDist = dist
        }
      })
      return closest
    }

    // Build a Set of existing edge pairs to avoid duplicates
    const existingPairs = new Set(
      (roadmap.edges || []).map((e) => `${e.source}|${e.target}`)
    )

    const synthetic = []
    const seenPairs = new Set()

    roadmap.nodes.forEach((node) => {
      if (!CONNECTOR_TYPES.has(node.type)) return
      const dash = node.style?.strokeDasharray
      if (!dash) return
      const trimmed = String(dash).trim()
      if (trimmed === '' || trimmed === '0' || trimmed === '0 0') return

      const x = node.position?.x ?? 0
      const y = node.position?.y ?? 0
      const w = node.size?.width ?? 0
      const h = node.size?.height ?? 0

      // ep1 = start (top for vertical, left for horizontal)
      // ep2 = end   (bottom for vertical, right for horizontal)
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

      const srcNode = findConnectedNode(ep1)
      const tgtNode = findConnectedNode(ep2)

      if (!srcNode || !tgtNode || srcNode.id === tgtNode.id) return

      const pairKey = `${srcNode.id}|${tgtNode.id}`
      if (existingPairs.has(pairKey) || seenPairs.has(pairKey)) return
      seenPairs.add(pairKey)

      synthetic.push({
        id: `synthetic-dashed-${srcNode.id}-${tgtNode.id}`,
        source: srcNode.id,
        target: tgtNode.id,
        edge_style: 'dashed',
        line_type: 'default',
        style: {
          stroke: node.style?.stroke || '#2b78e4',
          stroke_width: node.style?.strokeWidth || 2,
        },
        // Preserve the connector node's exact straight-line geometry so renderEdge
        // doesn't route it through the smart bezier algorithm (which can produce
        // ugly curves crossing over other nodes).
        _directPath: node.type === 'vertical'
          ? `M ${x + w / 2} ${y} L ${x + w / 2} ${y + h}`
          : `M ${x} ${y + h / 2} L ${x + w} ${y + h / 2}`,
      })
    })

    return synthetic
  }, [roadmap])

  const allEdges = useMemo(
    () => [...healedEdges, ...syntheticEdgesFromDashedConnectors],
    [healedEdges, syntheticEdgesFromDashedConnectors]
  )

  // ── Deduplicate and spread parallel edges ──
  // When multiple edges share the same source+target pair (or reversed), they'd
  // overlap exactly. We spread them apart by a small perpendicular offset so both
  // remain visible. Also drop true duplicates (identical id or same src/tgt/style).
  const allEdgesDeduped = useMemo(() => {
    const seen = new Set()
    const pairCount = {}
    const pairIndex = {}
    const result = []
    for (const edge of allEdges) {
      const pairKey = [edge.source, edge.target].sort().join('|')
      const exactKey = `${edge.source}→${edge.target}:${edge.edge_style}`
      if (seen.has(exactKey)) continue
      seen.add(exactKey)
      pairCount[pairKey] = (pairCount[pairKey] || 0) + 1
      result.push({ ...edge, _pairKey: pairKey })
    }
    // Assign spread offsets for pairs with >1 edge
    const pairOffsets = {}
    return result.map((edge) => {
      const count = pairCount[edge._pairKey]
      if (count <= 1) return edge
      pairIndex[edge._pairKey] = (pairIndex[edge._pairKey] ?? -1) + 1
      const idx = pairIndex[edge._pairKey]
      // Spread: 0 → 0, 1 → -6, 2 → +6, 3 → -12, ... px perpendicular offset
      const spread = idx % 2 === 0 ? -(idx / 2) * 7 : Math.ceil(idx / 2) * 7
      return { ...edge, _spreadOffset: spread }
    })
  }, [allEdges])

  const uniqueEdgeColors = useMemo(() => {
    if (!allEdgesDeduped?.length) return ['#2b78e4']
    const colors = new Set()
    allEdgesDeduped.forEach((edge) => {
      const strokeColor = edge.style?.stroke || '#2b78e4'
      colors.add(strokeColor)
    })
    return Array.from(colors)
  }, [allEdgesDeduped])

  // ── Auto-detect orphaned paragraph-header groups ──
  // Some roadmaps have a `paragraph` node used as a group title with subtopics
  // stacked directly below it at the same x/width, but are missing the `section`
  // container node that should visually wrap them. We detect these groups and
  // synthesise a virtual section rect so they render correctly.
  const virtualSectionRects = useMemo(() => {
    if (!roadmap?.nodes) return []

    const ALIGN_TOL = 20   // px — x-position / width tolerance for "same column"
    const GAP_TOL   = 20   // px — max vertical gap between stacked nodes
    const PAD       = 12   // px — padding around the synthesised box

    const paragraphNodes = roadmap.nodes.filter((n) => n.type === 'paragraph')
    const sectionNodes   = roadmap.nodes.filter((n) => n.type === 'section')
    const candidateTypes = new Set(['subtopic', 'topic', 'checklist', 'todo', 'milestone'])

    const rects = []

    paragraphNodes.forEach((para) => {
      const px = para.position?.x ?? 0
      const py = para.position?.y ?? 0
      const pw = para.size?.width  ?? 160
      const ph = para.size?.height ?? 40

      // Collect subtopics/topics in the same column, ordered top-to-bottom
      const columnNodes = roadmap.nodes
        .filter((n) => {
          if (n.id === para.id) return false
          if (!candidateTypes.has(n.type)) return false
          const nx = n.position?.x ?? 0
          const nw = n.size?.width  ?? 0
          // Same column: x-aligned and similar width
          return Math.abs(nx - px) <= ALIGN_TOL && Math.abs(nw - pw) <= ALIGN_TOL
        })
        .sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0))

      // Walk downward from paragraph bottom, collecting only contiguous nodes
      const groupNodes = [para]
      let currentBottom = py + ph

      for (const node of columnNodes) {
        const ny = node.position?.y ?? 0
        if (ny < py + ph - ALIGN_TOL) continue  // must be below the header
        if (ny > currentBottom + GAP_TOL) break  // gap too large → stop
        groupNodes.push(node)
        currentBottom = ny + (node.size?.height ?? 40)
      }

      if (groupNodes.length <= 1) return  // header only — nothing to wrap

      // Bounding box of the group
      const minX = Math.min(...groupNodes.map((n) => n.position?.x ?? 0)) - PAD
      const minY = Math.min(...groupNodes.map((n) => n.position?.y ?? 0)) - PAD
      const maxX = Math.max(...groupNodes.map((n) => (n.position?.x ?? 0) + (n.size?.width  ?? 160))) + PAD
      const maxY = Math.max(...groupNodes.map((n) => (n.position?.y ?? 0) + (n.size?.height ?? 40))) + PAD

      // Skip if an existing section already covers the centre of this group
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const alreadyCovered = sectionNodes.some((sec) => {
        const sx = sec.position?.x ?? 0
        const sy = sec.position?.y ?? 0
        const sw = sec.size?.width  ?? 0
        const sh = sec.size?.height ?? 0
        return cx >= sx && cx <= sx + sw && cy >= sy && cy <= sy + sh
      })
      if (alreadyCovered) return

      rects.push({ id: `vsr-${para.id}`, x: minX, y: minY, width: maxX - minX, height: maxY - minY })
    })

    return rects
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

  // Hides connector nodes that have a visible dash/dot pattern (e.g. strokeDasharray "0.8 8").
  // These are decorative layout lines from the source data — the same "optional path"
  // semantics are already expressed by dashed *edges* with arrowheads, so showing
  // these connector nodes as well is redundant and confusing.
  const isDashedConnector = useCallback((node) => {
    if (!CONNECTOR_TYPES.has(node.type)) return false
    const dash = node.style?.strokeDasharray
    if (!dash) return false
    // "0" or "0 0" means solid — keep those; anything else is a real dash/dot pattern
    const trimmed = String(dash).trim()
    return trimmed !== '' && trimmed !== '0' && trimmed !== '0 0'
  }, [])

  const isDanglingConnector = useCallback((node) => {
    if (node.type !== 'vertical' && node.type !== 'horizontal') return false
    // NOTE: Previously this skipped solid connectors (no strokeDasharray).
    // Solid connectors can also have dangling endpoints, so we check all of them.
    // Dashed connectors are already removed by isDashedConnector; this guard is
    // therefore redundant and was causing solid orphan lines to slip through.

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

    // Use 25px (up from 20) so solid connectors whose endpoints sit slightly
    // off-centre from a neighbouring node are still treated as connected.
    const threshold = 25

    const isPointConnected = (p) => {
      if (!roadmap?.nodes) return false
      return roadmap.nodes.some((other) => {
        if (other.id === node.id) return false

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
    let d

    if (edge._directPath) {
      // Synthetic edge built from a connector node: use the pre-computed straight
      // line path so it renders exactly where the connector was, without curving.
      d = edge._directPath
    } else {
      const from = nodeMapRef.current[edge.source]
      const to = nodeMapRef.current[edge.target]
      if (!from || !to) return null

      d = buildOrthogonalPath(from, to, roadmap?.nodes ?? [])
    }

    const isDashed = edge.edge_style === 'dashed'
    const strokeColor = edge.style?.stroke || '#2b78e4'
    const cleanId = strokeColor.replace('#', '')

    // Apply perpendicular spread offset so parallel edges don't overlap.
    // We use an SVG transform rather than recalculating the path, which keeps
    // the arrow markers correct and avoids additional routing complexity.
    const spread = edge._spreadOffset ?? 0
    const spreadTransform = spread !== 0 ? `translate(${spread}, ${spread})` : undefined

    return (
      <path
        key={edge.id || `edge-${i}`}
        d={d}
        className={`${styles.edge} ${isDashed ? styles.edgeDashed : ''}`}
        style={{
          stroke: strokeColor,
          strokeWidth: edge.style?.stroke_width || 2,
        }}
        transform={spreadTransform}
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
    (node) => !isBoundaryConnector(node) && !isDashedConnector(node) && !isDanglingConnector(node)
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
                <line x1="2" y1="6" x2="16" y2="6" stroke="#2b78e4" strokeWidth="2" strokeDasharray="3,3" />
                <polygon points="14,3 20,6 14,9" fill="#2b78e4" />
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
          {/* Virtual section boxes for paragraph-header groups missing a section node */}
          {virtualSectionRects.map((rect) => (
            <rect
              key={rect.id}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              className={styles.sectionRect}
              style={{
                fill: 'rgba(99, 102, 241, 0.03)',
                stroke: 'rgba(255,255,255,0.05)',
              }}
              rx={8}
            />
          ))}
          {sectionNodes.map((node) => renderNode(node))}
          <g>
            {allEdges.map((edge, i) => renderEdge(edge, i))}
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
