import express from 'express'
import Roadmap from '../models/Roadmap.js'

const router = express.Router()

// ── GET /api/roadmaps ──
// List all roadmaps (no nodes/edges — lightweight for homepage)
router.get('/', async (req, res) => {
  try {
    const roadmaps = await Roadmap.find(
      { type: 'flow' },
      {
        roadmapId: 1,
        title: 1,
        type: 1,
        sourceUrl: 1,
        stats: 1,
        _id: 0,
      }
    ).sort({ title: 1 })

    res.json({ total: roadmaps.length, roadmaps })
  } catch (error) {
    console.error('List roadmaps error:', error)
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
