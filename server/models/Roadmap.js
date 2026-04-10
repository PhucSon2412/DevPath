import mongoose from 'mongoose'

const roadmapSchema = new mongoose.Schema(
  {
    roadmapId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['flow', 'content-only'],
      default: 'flow',
    },
    sourceUrl: String,
    stats: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Store nodes and edges as Mixed for maximum flexibility
    // The crawled data has many optional/variant fields
    nodes: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    edges: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: false, // Allow extra fields from crawled data
  }
)

const Roadmap = mongoose.model('Roadmap', roadmapSchema)

export default Roadmap
