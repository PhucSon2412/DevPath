/**
 * Import crawled roadmap JSON files into MongoDB.
 *
 * Usage: node server/scripts/importRoadmaps.js
 *
 * - Reads _index.json for the list of roadmaps
 * - Only imports type="flow" roadmaps (with graph data)
 * - Upserts into MongoDB (safe to re-run)
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Roadmap from '../models/Roadmap.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment
dotenv.config({ path: join(__dirname, '..', '.env') })

const DATA_DIR = join(__dirname, '..', '..', 'crawldata', 'roadmaps_json')

async function importRoadmaps() {
  console.log('🔗 Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGO_URI)
  console.log('✓ Connected\n')

  // Read index
  const indexPath = join(DATA_DIR, '_index.json')
  const index = JSON.parse(readFileSync(indexPath, 'utf-8'))

  // Filter to flow-only roadmaps
  const flowRoadmaps = index.roadmaps.filter((r) => r.type === 'flow')
  console.log(`📊 Total roadmaps in index: ${index.total_roadmaps}`)
  console.log(`📊 Flow roadmaps to import: ${flowRoadmaps.length}\n`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const entry of flowRoadmaps) {
    try {
      const filePath = join(DATA_DIR, entry.file)
      const data = JSON.parse(readFileSync(filePath, 'utf-8'))

      // Skip roadmaps with very few nodes (e.g., golang has only 1 button node)
      if (!data.nodes || data.nodes.length < 5) {
        console.log(`  ⊘ ${entry.id} — too few nodes (${data.nodes?.length || 0}), skipping`)
        skipped++
        continue
      }

      await Roadmap.findOneAndUpdate(
        { roadmapId: entry.id },
        {
          roadmapId: entry.id,
          title: data.title || entry.title,
          type: 'flow',
          sourceUrl: data.source_url || entry.source_url,
          stats: {
            total_nodes: data.stats?.total_nodes || data.nodes.length,
            total_edges: data.stats?.total_edges || data.edges.length,
            nodes_with_content: data.stats?.nodes_with_content || 0,
          },
          nodes: data.nodes,
          edges: data.edges,
        },
        { upsert: true, new: true }
      )

      imported++
      const contentCount = data.stats?.nodes_with_content || 0
      console.log(
        `  ✓ ${entry.id} — ${data.nodes.length} nodes, ${data.edges.length} edges, ${contentCount} with content`
      )
    } catch (err) {
      errors++
      console.error(`  ✗ ${entry.id} — ${err.message}`)
    }
  }

  console.log(`\n════════════════════════════════`)
  console.log(`✓ Imported: ${imported}`)
  console.log(`⊘ Skipped:  ${skipped}`)
  console.log(`✗ Errors:   ${errors}`)
  console.log(`════════════════════════════════\n`)

  await mongoose.disconnect()
  console.log('🔌 Disconnected from MongoDB')
}

importRoadmaps().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
