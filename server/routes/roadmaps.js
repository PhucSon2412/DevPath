import express from 'express'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Roadmap from '../models/Roadmap.js'
import User from '../models/User.js'
import auth from '../middleware/auth.js'

const router = express.Router()

const roadmapSummaryProjection = {
  roadmapId: 1,
  title: 1,
  type: 1,
  sourceUrl: 1,
  stats: 1,
  _id: 0,
}

const DONE_STATUS = 'done'
const STEP_TYPES = new Set(['topic', 'subtopic', 'checklist', 'todo'])
const SUPPORTED_LANGUAGES = new Set(['en', 'vi'])

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const CLASSIFICATION_PATH = join(__dirname, '..', '..', 'crawldata', 'roadmap_classification.json')
const VI_ROADMAPS_DIR = join(__dirname, '..', '..', 'crawldata', 'roadmaps_json_vi')
const VI_ROADMAP_INDEX_PATH = join(VI_ROADMAPS_DIR, '_index.json')

let roleBasedRoadmapIds = []
let skillBasedRoadmapIds = []
let vietnameseRoadmapSummaryById = new Map()
let vietnameseRoadmapDetailById = new Map()

try {
  const classification = JSON.parse(readFileSync(CLASSIFICATION_PATH, 'utf-8'))
  roleBasedRoadmapIds = (classification.role_based_roadmaps || []).map((item) => item.id)
  skillBasedRoadmapIds = (classification.skill_based_roadmaps || []).map((item) => item.id)
} catch (error) {
  console.warn('Failed to load roadmap classification file:', error.message)
}

try {
  const viIndex = JSON.parse(readFileSync(VI_ROADMAP_INDEX_PATH, 'utf-8'))

  for (const item of viIndex.roadmaps || []) {
    if (!item?.id) continue

    vietnameseRoadmapSummaryById.set(item.id, {
      title: item.title,
      type: item.type,
      sourceUrl: item.source_url,
    })

    const fileName = item.file || `${item.id}.json`
    const filePath = join(VI_ROADMAPS_DIR, fileName)

    try {
      const detail = JSON.parse(readFileSync(filePath, 'utf-8'))
      vietnameseRoadmapDetailById.set(item.id, detail)
    } catch (fileError) {
      console.warn(`Failed to load Vietnamese roadmap file ${fileName}:`, fileError.message)
    }
  }
} catch (error) {
  console.warn('Failed to load Vietnamese roadmap index:', error.message)
}

function getProgressEntries(progressField) {
  if (progressField instanceof Map) {
    return Array.from(progressField.entries())
  }

  if (progressField && typeof progressField === 'object') {
    return Object.entries(progressField)
  }

  return []
}

function pickClassifiedRoadmaps(ids, roadmapById, seenRoadmapIds) {
  const selected = []

  for (const roadmapId of ids) {
    if (seenRoadmapIds.has(roadmapId)) {
      continue
    }

    const roadmap = roadmapById.get(roadmapId)
    if (!roadmap) {
      continue
    }

    selected.push(roadmap)
    seenRoadmapIds.add(roadmapId)
  }

  return selected
}

function getRequestLanguage(req) {
  const requestedLang = String(req.query.lang || '').toLowerCase()
  if (SUPPORTED_LANGUAGES.has(requestedLang)) {
    return requestedLang
  }
  return 'vi'
}

function toPlainRoadmap(roadmap) {
  if (!roadmap) return roadmap
  return typeof roadmap.toObject === 'function' ? roadmap.toObject() : { ...roadmap }
}

function localizeRoadmapSummary(roadmap, language) {
  const plainRoadmap = toPlainRoadmap(roadmap)
  if (language !== 'vi') {
    return plainRoadmap
  }

  const viSummary = vietnameseRoadmapSummaryById.get(plainRoadmap.roadmapId)
  if (!viSummary) {
    return plainRoadmap
  }

  return {
    ...plainRoadmap,
    title: viSummary.title || plainRoadmap.title,
    type: viSummary.type || plainRoadmap.type,
    sourceUrl: viSummary.sourceUrl || plainRoadmap.sourceUrl,
  }
}

function localizeRoadmapDetail(roadmap, language) {
  const plainRoadmap = toPlainRoadmap(roadmap)
  if (language !== 'vi') {
    return plainRoadmap
  }

  const viRoadmap = vietnameseRoadmapDetailById.get(plainRoadmap.roadmapId)
  if (!viRoadmap) {
    return plainRoadmap
  }

  return {
    ...plainRoadmap,
    title: viRoadmap.title || plainRoadmap.title,
    type: viRoadmap.type || plainRoadmap.type,
    sourceUrl: viRoadmap.source_url || plainRoadmap.sourceUrl,
    stats: viRoadmap.stats || plainRoadmap.stats,
    node_types: viRoadmap.node_types || plainRoadmap.node_types,
    edge_styles: viRoadmap.edge_styles || plainRoadmap.edge_styles,
    edge_line_types: viRoadmap.edge_line_types || plainRoadmap.edge_line_types,
    node_type_description: viRoadmap.node_type_description || plainRoadmap.node_type_description,
    edge_style_description: viRoadmap.edge_style_description || plainRoadmap.edge_style_description,
    nodes: Array.isArray(viRoadmap.nodes) ? viRoadmap.nodes : plainRoadmap.nodes,
    edges: Array.isArray(viRoadmap.edges) ? viRoadmap.edges : plainRoadmap.edges,
  }
}

// ── GET /api/roadmaps ──
// List all roadmaps (no nodes/edges — lightweight for homepage)
router.get('/', async (req, res) => {
  try {
    const language = getRequestLanguage(req)
    const roadmaps = await Roadmap.find(
      { type: 'flow' },
      roadmapSummaryProjection
    )

    const localizedRoadmaps = roadmaps.map((roadmap) => localizeRoadmapSummary(roadmap, language))

    if (!roleBasedRoadmapIds.length && !skillBasedRoadmapIds.length) {
      const fallbackRoadmaps = [...localizedRoadmaps].sort(
        (a, b) => a.title.localeCompare(b.title, language)
      )
      return res.json({
        total: fallbackRoadmaps.length,
        roadmaps: fallbackRoadmaps,
        roleBased: { total: 0, roadmaps: [] },
        skillBased: { total: 0, roadmaps: [] },
      })
    }

    const roadmapById = new Map(localizedRoadmaps.map((roadmap) => [roadmap.roadmapId, roadmap]))
    const seenRoadmapIds = new Set()

    const roleBasedRoadmaps = pickClassifiedRoadmaps(
      roleBasedRoadmapIds,
      roadmapById,
      seenRoadmapIds
    )

    const skillBasedRoadmaps = pickClassifiedRoadmaps(
      skillBasedRoadmapIds,
      roadmapById,
      seenRoadmapIds
    )

    const classifiedRoadmaps = [...roleBasedRoadmaps, ...skillBasedRoadmaps]

    res.json({
      total: classifiedRoadmaps.length,
      roadmaps: classifiedRoadmaps,
      roleBased: {
        total: roleBasedRoadmaps.length,
        roadmaps: roleBasedRoadmaps,
      },
      skillBased: {
        total: skillBasedRoadmaps.length,
        roadmaps: skillBasedRoadmaps,
      },
    })
  } catch (error) {
    console.error('List roadmaps error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/roadmaps/favorites/me ──
// Get current user's favorite roadmap summaries
router.get('/favorites/me', auth, async (req, res) => {
  try {
    const language = getRequestLanguage(req)
    const favoriteIds = req.user.favorites || []

    if (!favoriteIds.length) {
      return res.json({ total: 0, roadmaps: [] })
    }

    const favoriteRoadmaps = await Roadmap.find(
      { roadmapId: { $in: favoriteIds }, type: 'flow' },
      roadmapSummaryProjection
    )

    const localizedFavorites = favoriteRoadmaps.map((roadmap) =>
      localizeRoadmapSummary(roadmap, language)
    )

    // Preserve user-defined favorite ordering
    const roadmapById = new Map(localizedFavorites.map((roadmap) => [roadmap.roadmapId, roadmap]))
    const orderedRoadmaps = favoriteIds
      .map((roadmapId) => roadmapById.get(roadmapId))
      .filter(Boolean)

    res.json({ total: orderedRoadmaps.length, roadmaps: orderedRoadmaps })
  } catch (error) {
    console.error('List favorite roadmaps error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/roadmaps/:id/favorite ──
// Add roadmap to current user's favorites
router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const roadmapId = req.params.id

    const roadmapExists = await Roadmap.exists({ roadmapId, type: 'flow' })
    if (!roadmapExists) {
      return res.status(404).json({ message: 'Roadmap not found' })
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { favorites: roadmapId } },
      { new: true }
    )

    res.json({
      message: 'Roadmap added to favorites',
      favorited: true,
      favorites: updatedUser?.favorites || [],
    })
  } catch (error) {
    console.error('Add favorite roadmap error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── DELETE /api/roadmaps/:id/favorite ──
// Remove roadmap from current user's favorites
router.delete('/:id/favorite', auth, async (req, res) => {
  try {
    const roadmapId = req.params.id

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { favorites: roadmapId } },
      { new: true }
    )

    res.json({
      message: 'Roadmap removed from favorites',
      favorited: false,
      favorites: updatedUser?.favorites || [],
    })
  } catch (error) {
    console.error('Remove favorite roadmap error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/roadmaps/:id/progress ──
// Get current user's completed step IDs for a roadmap
router.get('/:id/progress', auth, async (req, res) => {
  try {
    const roadmapId = req.params.id
    const progressPrefix = `${roadmapId}:`

    const completedNodeIds = getProgressEntries(req.user.progress)
      .filter(([key, status]) => key.startsWith(progressPrefix) && status === DONE_STATUS)
      .map(([key]) => key.slice(progressPrefix.length))

    res.json({
      roadmapId,
      completedNodeIds,
    })
  } catch (error) {
    console.error('Get roadmap progress error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUT /api/roadmaps/:id/progress/:nodeId ──
// Mark/unmark a roadmap step as completed
router.put('/:id/progress/:nodeId', auth, async (req, res) => {
  try {
    const roadmapId = req.params.id
    const { nodeId } = req.params
    const { completed } = req.body

    if (typeof completed !== 'boolean') {
      return res.status(400).json({ message: 'completed must be a boolean' })
    }

    const roadmapExists = await Roadmap.exists({ roadmapId, type: 'flow' })
    if (!roadmapExists) {
      return res.status(404).json({ message: 'Roadmap not found' })
    }

    if (!(req.user.progress instanceof Map)) {
      req.user.progress = new Map(getProgressEntries(req.user.progress))
    }

    const progressKey = `${roadmapId}:${nodeId}`
    if (completed) {
      req.user.progress.set(progressKey, DONE_STATUS)
    } else {
      req.user.progress.delete(progressKey)
    }

    await req.user.save()

    const progressPrefix = `${roadmapId}:`
    const completedNodeIds = getProgressEntries(req.user.progress)
      .filter(([key, status]) => key.startsWith(progressPrefix) && status === DONE_STATUS)
      .map(([key]) => key.slice(progressPrefix.length))

    res.json({
      roadmapId,
      nodeId,
      completed,
      completedNodeIds,
    })
  } catch (error) {
    console.error('Update roadmap progress error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── DELETE /api/roadmaps/:id/progress ──
// Reset all saved progress for current roadmap
router.delete('/:id/progress', auth, async (req, res) => {
  try {
    const roadmapId = req.params.id
    const progressPrefix = `${roadmapId}:`

    if (!(req.user.progress instanceof Map)) {
      req.user.progress = new Map(getProgressEntries(req.user.progress))
    }

    for (const key of req.user.progress.keys()) {
      if (key.startsWith(progressPrefix)) {
        req.user.progress.delete(key)
      }
    }

    await req.user.save()

    res.json({
      roadmapId,
      completedNodeIds: [],
    })
  } catch (error) {
    console.error('Reset roadmap progress error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/roadmaps/in-progress/me ──
// Get roadmaps where progress is between 0% and 100%
router.get('/in-progress/me', auth, async (req, res) => {
  try {
    const language = getRequestLanguage(req)
    const completedCountByRoadmap = new Map()

    getProgressEntries(req.user.progress).forEach(([key, status]) => {
      if (status !== DONE_STATUS) return

      const separatorIndex = key.indexOf(':')
      if (separatorIndex <= 0) return

      const roadmapId = key.slice(0, separatorIndex)
      completedCountByRoadmap.set(
        roadmapId,
        (completedCountByRoadmap.get(roadmapId) || 0) + 1
      )
    })

    if (!completedCountByRoadmap.size) {
      return res.json({ total: 0, roadmaps: [] })
    }

    const candidateRoadmaps = await Roadmap.find(
      {
        roadmapId: { $in: Array.from(completedCountByRoadmap.keys()) },
        type: 'flow',
      },
      {
        ...roadmapSummaryProjection,
        nodes: 1,
      }
    )

    const inProgressRoadmaps = candidateRoadmaps
      .map((roadmap) => {
        const totalSteps = (roadmap.nodes || []).reduce(
          (count, node) => count + (STEP_TYPES.has(node?.type) ? 1 : 0),
          0
        )

        if (totalSteps <= 0) {
          return null
        }

        const rawCompleted = completedCountByRoadmap.get(roadmap.roadmapId) || 0
        const completedSteps = Math.min(rawCompleted, totalSteps)
        const progressPercent = Math.round((completedSteps / totalSteps) * 100)

        if (progressPercent <= 0 || progressPercent >= 100) {
          return null
        }

        const localizedSummary = localizeRoadmapSummary({
          roadmapId: roadmap.roadmapId,
          title: roadmap.title,
          type: roadmap.type,
          sourceUrl: roadmap.sourceUrl,
          stats: roadmap.stats,
        }, language)

        return {
          ...localizedSummary,
          progress: {
            completedSteps,
            totalSteps,
            percent: progressPercent,
          },
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.progress.percent !== a.progress.percent) {
          return b.progress.percent - a.progress.percent
        }
        if (b.progress.completedSteps !== a.progress.completedSteps) {
          return b.progress.completedSteps - a.progress.completedSteps
        }
        return a.title.localeCompare(b.title, language)
      })

    res.json({
      total: inProgressRoadmaps.length,
      roadmaps: inProgressRoadmaps,
    })
  } catch (error) {
    console.error('List in-progress roadmaps error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/roadmaps/:id ──
// Get full roadmap with nodes and edges
router.get('/:id', async (req, res) => {
  try {
    const language = getRequestLanguage(req)
    const roadmap = await Roadmap.findOne(
      { roadmapId: req.params.id },
      { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
    )

    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' })
    }

    res.json(localizeRoadmapDetail(roadmap, language))
  } catch (error) {
    console.error('Get roadmap error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
