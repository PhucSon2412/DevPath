import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrainCircuit, Loader2, ArrowLeft, ArrowRight, RotateCcw, Sparkles } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import { apiUrl } from '../../utils/api'
import styles from './QaPage.module.css'

function flattenRoadmapsPayload(data) {
  const roleRoadmaps = data.roleBased?.roadmaps || []
  const skillRoadmaps = data.skillBased?.roadmaps || []
  const fallbackRoadmaps = data.roadmaps || []

  if (roleRoadmaps.length || skillRoadmaps.length) {
    return [...roleRoadmaps, ...skillRoadmaps]
  }

  return fallbackRoadmaps
}

function hasAnswer(question, answerValue) {
  if (!question) return false

  if (question.type === 'text') {
    return typeof answerValue === 'string' && answerValue.trim().length > 0
  }

  if (Array.isArray(answerValue)) {
    return answerValue.length > 0
  }

  return answerValue !== null && answerValue !== undefined && String(answerValue).trim().length > 0
}

export default function QaPage() {
  const { loading: authLoading, progressStorageScope, getSavedQaRecommendation, generateQaRecommendation } = useAuth()
  const { language, t } = useLocale()

  const [groups, setGroups] = useState([])
  const [roadmapById, setRoadmapById] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [stage, setStage] = useState('intro')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (authLoading) return

    let active = true

    const loadQaData = async () => {
      setLoading(true)
      setError('')

      try {
        const [questionsRes, roadmapsRes, savedRecommendation] = await Promise.all([
          fetch(apiUrl(`/api/qa/questions?lang=${language}`)),
          fetch(apiUrl(`/api/roadmaps?lang=${language}`)),
          getSavedQaRecommendation(),
        ])

        const questionsData = await questionsRes.json()
        const roadmapsData = await roadmapsRes.json()

        if (!questionsRes.ok) {
          throw new Error(questionsData.message || 'Failed to load questions')
        }

        if (!roadmapsRes.ok) {
          throw new Error(roadmapsData.message || 'Failed to load roadmaps')
        }

        if (!active) return

        const roadmaps = flattenRoadmapsPayload(roadmapsData)
        const map = new Map(roadmaps.map((roadmap) => [roadmap.roadmapId, roadmap]))

        setGroups(questionsData.groups || [])
        setRoadmapById(map)

        if (savedRecommendation?.recommendations?.length) {
          setResult(savedRecommendation)
          setStage('result')
        } else {
          setResult(null)
          setStage('intro')
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to initialize recommendation flow')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadQaData()

    return () => {
      active = false
    }
  }, [authLoading, language, getSavedQaRecommendation])

  const flatQuestions = useMemo(() => {
    return groups.flatMap((group) =>
      (group.questions || []).map((question) => ({
        ...question,
        group: group.group,
      }))
    )
  }, [groups])

  const totalQuestions = flatQuestions.length
  const currentQuestion = flatQuestions[currentIndex] || null
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null
  const canGoNext = hasAnswer(currentQuestion, currentAnswer)
  const scaleMin = currentQuestion?.scale_config?.min ?? 1
  const scaleMax = currentQuestion?.scale_config?.max ?? 5
  const scaleValues = currentQuestion?.type === 'scale'
    ? Array.from(
      { length: Math.max(scaleMax - scaleMin + 1, 1) },
      (_, index) => scaleMin + index
    )
    : []

  const topThree = (result?.recommendations || []).slice(0, 3)
  const remainingRecommendations = (result?.recommendations || []).slice(3, 10)

  const startWizard = () => {
    setStage('wizard')
    setCurrentIndex(0)
    setAnswers({})
    setError('')
  }

  const handleSelectChoice = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleTextChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleNext = () => {
    if (!canGoNext) return
    setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1))
  }

  const handleBack = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async () => {
    if (!totalQuestions) return

    const payload = flatQuestions.map((question) => ({
      questionId: question.id,
      question: question.question,
      type: question.type,
      answer: answers[question.id],
    }))

    setSubmitting(true)
    setError('')

    try {
      const recommendation = await generateQaRecommendation(payload)
      setResult(recommendation)
      setStage('result')
    } catch (err) {
      setError(err.message || 'Failed to generate recommendations')
    } finally {
      setSubmitting(false)
    }
  }

  const getReasonByLanguage = (recommendation) => {
    const reason = recommendation?.reason || {}
    if (language === 'ja') {
      return reason.ja || reason.en || ''
    }
    return reason.en || reason.ja || ''
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <Loader2 size={30} className={styles.spinner} />
          <span>{t('qa.loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page} id="qa-page">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <BrainCircuit size={14} />
            {t('qa.badge')}
          </div>

          <h1 className={styles.title}>{t('qa.title')}</h1>
          <p className={styles.subtitle}>{t('qa.subtitle')}</p>

          <div className={styles.heroActions}>
            <Link to="/" className={styles.backLink} id="qa-back-home">
              <ArrowLeft size={16} />
              {t('qa.backHome')}
            </Link>

            {stage === 'result' && (
              <button
                type="button"
                className={styles.retakeBtn}
                onClick={startWizard}
                id="qa-retake-top"
              >
                <RotateCcw size={16} />
                {t('qa.retake')}
              </button>
            )}
          </div>

          <p className={styles.scopeHint}>
            {progressStorageScope === 'account'
              ? t('qa.scopeAccount')
              : t('qa.scopeBrowser')}
          </p>
        </div>
      </section>

      <section className={styles.content}>
        {error && <div className={styles.errorState}>{error}</div>}

        {stage === 'intro' && (
          <div className={styles.introCard}>
            <h2>{t('qa.introTitle')}</h2>
            <p>{t('qa.introDescription')}</p>
            <button type="button" className={styles.startBtn} onClick={startWizard} id="qa-start-btn">
              <Sparkles size={16} />
              {t('qa.start')}
            </button>
          </div>
        )}

        {stage === 'wizard' && currentQuestion && (
          <div className={styles.wizardCard}>
            <div className={styles.progressBarWrap}>
              <div className={styles.progressLabel}>
                {t('qa.questionProgressLabel')} {currentIndex + 1}/{totalQuestions}
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            <p className={styles.questionGroup}>{currentQuestion.group}</p>
            <h2 className={styles.questionText}>{currentQuestion.question}</h2>

            {currentQuestion.type === 'multiple_choice' && (
              <div className={styles.optionList}>
                {(currentQuestion.options || []).map((option) => {
                  const selected = currentAnswer === option
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`${styles.optionBtn} ${selected ? styles.optionSelected : ''}`}
                      onClick={() => handleSelectChoice(currentQuestion.id, option)}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            )}

            {currentQuestion.type === 'scale' && (
              <div className={styles.scaleWrap}>
                <div className={styles.scaleLabels}>
                  <span>{currentQuestion.scale_config?.min_label || t('qa.scaleLow')}</span>
                  <span>{currentQuestion.scale_config?.max_label || t('qa.scaleHigh')}</span>
                </div>
                <div
                  className={styles.scaleButtons}
                  style={{ gridTemplateColumns: `repeat(${scaleValues.length}, minmax(0, 1fr))` }}
                >
                  {scaleValues.map((value) => {
                    const selected = Number(currentAnswer) === value
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.scaleBtn} ${selected ? styles.scaleSelected : ''}`}
                        onClick={() => handleSelectChoice(currentQuestion.id, value)}
                        aria-pressed={selected}
                      >
                        {value}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {currentQuestion.type === 'text' && (
              <textarea
                className={styles.textInput}
                value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                onChange={(event) => handleTextChange(currentQuestion.id, event.target.value)}
                placeholder={t('qa.textPlaceholder')}
                rows={5}
              />
            )}

            <div className={styles.wizardActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleBack}
                disabled={currentIndex === 0 || submitting}
              >
                <ArrowLeft size={16} />
                {t('qa.back')}
              </button>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={handleNext}
                  disabled={!canGoNext || submitting}
                >
                  <span className={styles.primaryBtnLabel}>{t('qa.next')}</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={handleSubmit}
                  disabled={!canGoNext || submitting}
                  id="qa-submit"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      <span className={styles.primaryBtnLabel}>{t('qa.generating')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span className={styles.primaryBtnLabel}>{t('qa.submit')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {stage === 'result' && result && (
          <div className={styles.resultsWrap}>
            <div className={styles.resultsHeader}>
              <h2>{t('qa.resultTitle')}</h2>
              <p>{t('qa.resultSubtitle')}</p>
            </div>

            {topThree.length > 0 && (
              <div className={styles.topGrid}>
                {topThree.map((recommendation, index) => {
                  const roadmap = roadmapById.get(recommendation.roadmapId)
                  return (
                    <div
                      key={recommendation.roadmapId}
                      className={`${styles.topCard} ${index === 0 ? styles.topCardPrimary : ''}`}
                    >
                      <div className={styles.rankBadge}>#{index + 1}</div>
                      <h3 className={styles.resultRoadmapTitle}>
                        {roadmap?.title || recommendation.roadmapId}
                      </h3>
                      <div className={styles.scorePill}>
                        {t('qa.score')}: {recommendation.score}
                      </div>
                      <p className={styles.reasonText}>{getReasonByLanguage(recommendation)}</p>
                      <Link
                        to={`/roadmap/${recommendation.roadmapId}`}
                        className={styles.openRoadmap}
                      >
                        {t('qa.openRoadmap')}
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}

            {remainingRecommendations.length > 0 && (
              <div className={styles.listWrap}>
                <h3>{t('qa.moreMatches')}</h3>
                <div className={styles.verticalList}>
                  {remainingRecommendations.map((recommendation, index) => {
                    const roadmap = roadmapById.get(recommendation.roadmapId)
                    return (
                      <Link
                        key={recommendation.roadmapId}
                        to={`/roadmap/${recommendation.roadmapId}`}
                        className={styles.listItem}
                      >
                        <span className={styles.listRank}>#{index + 4}</span>
                        <span className={styles.listTitle}>{roadmap?.title || recommendation.roadmapId}</span>
                        <span className={styles.listScore}>{t('qa.score')}: {recommendation.score}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            <div className={styles.bottomActions}>
              <button
                type="button"
                className={styles.retakeBtn}
                onClick={startWizard}
                id="qa-retake-bottom"
              >
                <RotateCcw size={16} />
                {t('qa.retake')}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
