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
