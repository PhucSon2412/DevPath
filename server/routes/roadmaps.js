import express from 'express'
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

function getProgressEntries(progressField) {
  if (progressField instanceof Map) {
    return Array.from(progressField.entries())
  }

  if (progressField && typeof progressField === 'object') {
    return Object.entries(progressField)
  }

  return []
}

// ── GET /api/roadmaps ──
// List all roadmaps (no nodes/edges — lightweight for homepage)
router.get('/', async (req, res) => {
  try {
    const roadmaps = await Roadmap.find(
      { type: 'flow' },
      roadmapSummaryProjection
    ).sort({ title: 1 })

    res.json({ total: roadmaps.length, roadmaps })
  } catch (error) {
    console.error('List roadmaps error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/roadmaps/favorites/me ──
// Get current user's favorite roadmap summaries
router.get('/favorites/me', auth, async (req, res) => {
  try {
    const favoriteIds = req.user.favorites || []

    if (!favoriteIds.length) {
      return res.json({ total: 0, roadmaps: [] })
    }

    const favoriteRoadmaps = await Roadmap.find(
      { roadmapId: { $in: favoriteIds }, type: 'flow' },
      roadmapSummaryProjection
    )

    // Preserve user-defined favorite ordering
    const roadmapById = new Map(favoriteRoadmaps.map((roadmap) => [roadmap.roadmapId, roadmap]))
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

        return {
          roadmapId: roadmap.roadmapId,
          title: roadmap.title,
          type: roadmap.type,
          sourceUrl: roadmap.sourceUrl,
          stats: roadmap.stats,
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
        return a.title.localeCompare(b.title)
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
    const roadmap = await Roadmap.findOne(
      { roadmapId: req.params.id },
      { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
    )

    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' })
    }

    res.json(roadmap)
  } catch (error) {
    console.error('Get roadmap error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
