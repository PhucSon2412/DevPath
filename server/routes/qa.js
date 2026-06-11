import express from 'express'
import jwt from 'jsonwebtoken'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { GoogleGenAI } from '@google/genai'
import Roadmap from '../models/Roadmap.js'
import User from '../models/User.js'
import auth from '../middleware/auth.js'

const router = express.Router()

const GEMINI_MODEL = 'gemini-2.5-flash'
const SUPPORTED_LANGUAGES = new Set(['en', 'vi'])

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const QA_EN_PATH = join(__dirname, '..', '..', 'Question', 'QA_en.json')
const QA_VI_PATH = join(__dirname, '..', '..', 'Question', 'QA_vi.json')
const CLASSIFICATION_PATH = join(__dirname, '..', '..', 'crawldata', 'roadmap_classification.json')

let roleBasedRoadmapIds = []
let skillBasedRoadmapIds = []

try {
  const classification = JSON.parse(readFileSync(CLASSIFICATION_PATH, 'utf-8'))
  roleBasedRoadmapIds = (classification.role_based_roadmaps || []).map((item) => item.id)
  skillBasedRoadmapIds = (classification.skill_based_roadmaps || []).map((item) => item.id)
} catch (error) {
  console.warn('Failed to load roadmap classification file for QA route:', error.message)
}

function getRequestLanguage(req) {
  const raw = String(req.query.lang || '').toLowerCase()
  return SUPPORTED_LANGUAGES.has(raw) ? raw : 'vi'
}

function loadQaTemplate(language) {
  const filePath = language === 'vi' ? QA_VI_PATH : QA_EN_PATH
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (error) {
    console.error('Failed to load QA template:', error)
    return []
  }
}

function normalizeQaTemplate(groups) {
  return (groups || []).map((group, groupIndex) => ({
    id: `group-${groupIndex + 1}`,
    group: group.group,
    questions: (group.questions || []).map((question, questionIndex) => ({
      id: `q-${groupIndex + 1}-${questionIndex + 1}`,
      question: question.question,
      type: question.type,
      options: question.options || [],
      scale_config: question.scale_config || null,
    })),
  }))
}

async function getCurrentWebRoadmaps() {
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
  )

  if (!roleBasedRoadmapIds.length && !skillBasedRoadmapIds.length) {
    return [...roadmaps].sort((a, b) => a.title.localeCompare(b.title))
  }

  const roadmapById = new Map(roadmaps.map((roadmap) => [roadmap.roadmapId, roadmap]))
  const seen = new Set()

  const pick = (ids) => {
    const list = []
    for (const roadmapId of ids) {
      if (seen.has(roadmapId)) continue
      const roadmap = roadmapById.get(roadmapId)
      if (!roadmap) continue
      list.push(roadmap)
      seen.add(roadmapId)
    }
    return list
  }

  return [...pick(roleBasedRoadmapIds), ...pick(skillBasedRoadmapIds)]
}

async function getResponseText(response) {
  if (!response) return ''
  if (typeof response.text === 'function') {
    const value = response.text()
    if (typeof value === 'string') return value
    return await value
  }
  if (typeof response.text === 'string') return response.text
  return ''
}

function tryParseJsonBlock(text) {
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

function getGeminiApiKey() {
  return String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
}

function isLikelyGeminiApiKey(value) {
  // Gemini Developer API keys from AI Studio commonly start with "AIza".
  return /^AIza[0-9A-Za-z_-]{20,}$/.test(value)
}

function isApiKeyInvalidError(error) {
  const message = String(error?.message || '')
  return message.includes('API_KEY_INVALID') || message.includes('API key not valid')
}

function sanitizeRecommendations(rawRecommendations, allowedRoadmapIds) {
  const seen = new Set()
  const normalized = []

  for (const item of rawRecommendations || []) {
    if (!item || typeof item !== 'object') continue

    const roadmapId = String(item.roadmapId || '').trim()
    if (!roadmapId || !allowedRoadmapIds.has(roadmapId) || seen.has(roadmapId)) {
      continue
    }

    const scoreNumber = Number(item.score)
    const score = Number.isFinite(scoreNumber)
      ? Math.max(0, Math.min(100, Math.round(scoreNumber)))
      : 0

    const reason = item.reason && typeof item.reason === 'object' ? item.reason : {}
    const reasonEn = String(reason.en || '').trim()
    const reasonVi = String(reason.vi || '').trim()

    normalized.push({
      roadmapId,
      score,
      reason: {
        en: reasonEn,
        vi: reasonVi,
      },
    })

    seen.add(roadmapId)
    if (normalized.length >= 10) break
  }

  return normalized
}

async function getOptionalUser(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]
  if (!token) return null

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId)
    return user || null
  } catch {
    return null
  }
}

router.get('/questions', async (req, res) => {
  try {
    const language = getRequestLanguage(req)
    const normalizedGroups = normalizeQaTemplate(loadQaTemplate(language))
    const totalQuestions = normalizedGroups.reduce(
      (count, group) => count + group.questions.length,
      0
    )

    res.json({
      language,
      groups: normalizedGroups,
      totalQuestions,
    })
  } catch (error) {
    console.error('Get QA questions error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/recommendations/me', auth, async (req, res) => {
  try {
    res.json({
      recommendation: req.user.qaRecommendation || null,
    })
  } catch (error) {
    console.error('Get saved QA recommendation error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/recommendations/generate', async (req, res) => {
  try {
    const answers = Array.isArray(req.body.answers) ? req.body.answers : []
    if (!answers.length) {
      return res.status(400).json({ message: 'answers is required' })
    }

    const hasInvalidAnswer = answers.some((answer) => {
      if (!answer || typeof answer !== 'object') return true
      if (!String(answer.question || '').trim()) return true

      const value = answer.answer
      if (Array.isArray(value)) return value.length === 0
      return value === null || value === undefined || String(value).trim().length === 0
    })

    if (hasInvalidAnswer) {
      return res.status(400).json({ message: 'All questions must be answered' })
    }

    const apiKey = getGeminiApiKey()
    if (!apiKey) {
      return res.status(503).json({
        message: 'Gemini is not configured. Set GEMINI_API_KEY (or GOOGLE_API_KEY) in server/.env or the same shell that starts the server.',
      })
    }

    if (!isLikelyGeminiApiKey(apiKey)) {
      return res.status(400).json({
        message: 'Gemini API key format looks invalid. Use a real API key from AI Studio/Gemini API (usually starts with "AIza"), not a client id.',
      })
    }

    const currentRoadmaps = await getCurrentWebRoadmaps()
    const roadmapPayload = currentRoadmaps.map((roadmap) => ({
      roadmapId: roadmap.roadmapId,
      title: roadmap.title,
      sourceUrl: roadmap.sourceUrl,
      nodesWithContent: roadmap.stats?.nodes_with_content || 0,
      totalNodes: roadmap.stats?.total_nodes || 0,
    }))

    const answersPayload = answers.map((answer, index) => ({
      order: index + 1,
      question: answer.question,
      type: answer.type,
      answer: answer.answer,
    }))

    // const prompt = [
    //   'You are an IT career recommendation assistant.',
    //   'Use ONLY roadmap IDs from the provided roadmap catalog.',
    //   'Do not invent roadmap IDs.',
    //   'Analyze the user answers and produce the top 10 most suitable roadmaps.',
    //   'Each recommendation must include:',
    //   '- roadmapId (string, must exist in roadmap catalog)',
    //   '- score (integer from 0 to 100)',
    //   '- reason.en (concise English reason)',
    //   '- reason.ja (concise Japanese reason)',
    //   'Return STRICT JSON only in this exact shape:',
    //   '{"summary":"string","recommendations":[{"roadmapId":"string","score":0,"reason":{"en":"string","ja":"string"}}]}',
    //   'Sort recommendations by descending score.',
    //   'Roadmap Catalog (English titles):',
    //   JSON.stringify(roadmapPayload),
    //   'User Answers:',
    //   JSON.stringify(answersPayload),
    // ].join('\n')

    const prompt = [
      'You are an IT career recommendation assistant.',
      'Use ONLY roadmap IDs from the provided roadmap catalog.',
      'Do not invent roadmap IDs.',
      'Analyze the user answers deeply and produce the top 10 most suitable roadmaps.',
      'Recommendations must be personalized based on the user answers, interests, preferences, strengths, goals, and working style.',
      'For each recommendation, explain SPECIFICALLY WHY the roadmap matches the user.',
      'Do NOT give vague generic reasons.',
      'Instead, connect the recommendation directly to concrete user answers, behaviors, preferences, or goals.',
      'Each recommendation must include:',
      '- roadmapId (string, must exist in roadmap catalog)',
      '- score (integer from 0 to 100)',
      '- reason.en (specific concise English reason tied to user answers)',
      '- reason.vi (specific concise Vietnamese reason tied to user answers)',
      'The reasons should:',
      '- mention concrete user preferences, goals, technologies, or behaviors when possible',
      '- explain why the roadmap fits better than others',
      '- be concise but informative',
      '- avoid repeating the exact same template across recommendations',
      'Return STRICT JSON only in this exact shape:',
      '{"summary":"string","recommendations":[{"roadmapId":"string","score":0,"reason":{"en":"string","vi":"string"}}]}',
      'Sort recommendations by descending score.',
      'Roadmap Catalog (English titles):',
      JSON.stringify(roadmapPayload),
      'User Answers:',
      JSON.stringify(answersPayload),
    ].join('\\n')


    const ai = new GoogleGenAI({ apiKey })
    const geminiResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    })

    const responseText = await getResponseText(geminiResponse)
    const parsed = tryParseJsonBlock(responseText)

    if (!parsed || typeof parsed !== 'object') {
      return res.status(502).json({ message: 'Gemini returned invalid JSON' })
    }

    const allowedRoadmapIds = new Set(roadmapPayload.map((roadmap) => roadmap.roadmapId))
    const recommendations = sanitizeRecommendations(parsed.recommendations, allowedRoadmapIds)

    if (!recommendations.length) {
      return res.status(502).json({ message: 'Gemini returned no valid roadmap recommendations' })
    }

    const result = {
      model: GEMINI_MODEL,
      generatedAt: new Date().toISOString(),
      summary: String(parsed.summary || '').trim(),
      recommendations,
    }

    const user = await getOptionalUser(req)
    if (user) {
      user.qaRecommendation = {
        ...result,
        generatedAt: new Date(result.generatedAt),
      }
      await user.save()
    }

    res.json({
      result,
      savedTo: user ? 'account' : 'browser',
    })
  } catch (error) {
    if (isApiKeyInvalidError(error)) {
      return res.status(401).json({
        message: 'Gemini API key is invalid or revoked. Generate a new API key in AI Studio and set GEMINI_API_KEY before restarting the server.',
      })
    }

    console.error('Generate QA recommendations error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
