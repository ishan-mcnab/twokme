import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import useAppStore from '../../store/useAppStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { Slider } from '../../components/ui/Slider'
import { ATTRIBUTE_SECTIONS, POSITION_OPTIONS } from './onboardingConfig'
import { getVisibleAttributeQuestions } from './onboardingQuestions'
import { buildAttributesAndOVR, computeOVR } from '../../lib/attributeMapping'
import { saveOnboardingData } from '../../lib/profile'

const slide = {
  initial: { x: 48, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { x: -40, opacity: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
}

function PositionGlyph({ code }) {
  switch (code) {
    case 'PG':
      return (
        <svg viewBox="0 0 64 64" className="h-14 w-14 text-[var(--neon-blue)]" aria-hidden>
          <circle cx="32" cy="18" r="6" className="fill-none stroke-current" strokeWidth={2} />
          <path
            d="M32 26 L32 46 M22 34 L42 34"
            className="fill-none stroke-current"
            strokeWidth={2}
          />
        </svg>
      )
    case 'SG':
      return (
        <svg viewBox="0 0 64 64" className="h-14 w-14 text-[var(--neon-blue)]" aria-hidden>
          <path d="M20 44 L32 20 L44 44" className="fill-none stroke-current" strokeWidth={2} />
          <circle cx="32" cy="16" r="5" className="fill-none stroke-current" strokeWidth={2} />
        </svg>
      )
    case 'SF':
      return (
        <svg viewBox="0 0 64 64" className="h-14 w-14 text-[var(--neon-blue)]" aria-hidden>
          <rect
            x="18"
            y="18"
            width="28"
            height="28"
            rx="4"
            className="fill-none stroke-current"
            strokeWidth={2}
          />
        </svg>
      )
    case 'PF':
      return (
        <svg viewBox="0 0 64 64" className="h-14 w-14 text-[var(--neon-blue)]" aria-hidden>
          <path d="M20 44 L32 16 L44 44 Z" className="fill-none stroke-current" strokeWidth={2} />
        </svg>
      )
    case 'C':
      return (
        <svg viewBox="0 0 64 64" className="h-14 w-14 text-[var(--neon-blue)]" aria-hidden>
          <circle cx="32" cy="32" r="16" className="fill-none stroke-current" strokeWidth={2} />
        </svg>
      )
    default:
      return null
  }
}

function BasketballMark() {
  return (
    <motion.div
      className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-[var(--neon-blue)] bg-[rgba(0,212,255,0.08)] shadow-[var(--glow-blue)]"
      animate={{ scale: [1, 1.04, 1], rotate: [0, 2, -2, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" className="h-16 w-16 text-[var(--neon-blue)]">
        <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M10 32 Q32 18 54 32 M10 32 Q32 46 54 32 M32 10 Q32 32 32 54"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.85"
        />
      </svg>
    </motion.div>
  )
}

export function OnboardingFlow() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const onboardingData = useAppStore((s) => s.onboardingData)
  const setOnboardingData = useAppStore((s) => s.setOnboardingData)
  const setAttributes = useAppStore((s) => s.setAttributes)
  const setCurrentBuild = useAppStore((s) => s.setCurrentBuild)

  const [globalStage, setGlobalStage] = useState(0)
  const [basicStep, setBasicStep] = useState(0)
  const [attrPhase, setAttrPhase] = useState('intro')
  const [attrQIndex, setAttrQIndex] = useState(0)

  const [feet, setFeet] = useState(6)
  const [inches, setInches] = useState(2)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const sectionIndex = globalStage >= 3 && globalStage <= 8 ? globalStage - 3 : 0
  const answers = onboardingData.questionnaireAnswers

  const ctx = useMemo(
    () => ({
      answers,
      position: onboardingData.position,
      heightInches: onboardingData.heightInches,
    }),
    [answers, onboardingData.position, onboardingData.heightInches],
  )

  const visibleQuestions = useMemo(() => {
    if (globalStage < 3 || globalStage > 8) return []
    return getVisibleAttributeQuestions(sectionIndex, ctx)
  }, [globalStage, sectionIndex, ctx])

  const questionKey = visibleQuestions.map((q) => q.id).join('|')
  useEffect(() => {
    const max = Math.max(0, visibleQuestions.length - 1)
    queueMicrotask(() => {
      setAttrQIndex((i) => Math.min(i, max))
    })
  }, [questionKey, visibleQuestions.length])

  const mergeAnswer = useCallback(
    (id, val) => {
      const prev = useAppStore.getState().onboardingData.questionnaireAnswers
      setOnboardingData({ questionnaireAnswers: { ...prev, [id]: val } })
    },
    [setOnboardingData],
  )

  const liveHeightInches = feet * 12 + inches
  const heightDisplay =
    globalStage === 2
      ? `${Math.floor(liveHeightInches / 12)}'${liveHeightInches % 12}"`
      : onboardingData.heightInches != null
        ? `${Math.floor(onboardingData.heightInches / 12)}'${onboardingData.heightInches % 12}"`
        : `—'—"`

  useEffect(() => {
    if (globalStage !== 2) return
    const hi = onboardingData.heightInches
    if (hi == null) return
    queueMicrotask(() => {
      setFeet(Math.floor(hi / 12))
      setInches(hi % 12)
    })
  }, [globalStage, onboardingData.heightInches])

  const preview = useMemo(() => {
    if (globalStage < 10) return null
    return buildAttributesAndOVR(answers, {
      position: onboardingData.position,
      heightInches: onboardingData.heightInches,
      weightLbs: onboardingData.weightLbs,
    })
  }, [
    globalStage,
    answers,
    onboardingData.position,
    onboardingData.heightInches,
    onboardingData.weightLbs,
  ])

  const sectionCompleteTimer = useRef(null)
  useEffect(() => {
    if (attrPhase !== 'sectionComplete') return
    const gs = globalStage
    sectionCompleteTimer.current = window.setTimeout(() => {
      if (gs < 8) {
        setGlobalStage(gs + 1)
        setAttrPhase('intro')
        setAttrQIndex(0)
      } else {
        setGlobalStage(9)
        setAttrPhase('intro')
        setAttrQIndex(0)
      }
    }, 900)
    return () => {
      if (sectionCompleteTimer.current) {
        window.clearTimeout(sectionCompleteTimer.current)
        sectionCompleteTimer.current = null
      }
    }
  }, [attrPhase, globalStage])

  const goNext = useCallback(() => {
    const od = useAppStore.getState().onboardingData
    const qa = od.questionnaireAnswers || {}

    if (globalStage === 0) {
      setGlobalStage(1)
      setBasicStep(0)
      return
    }
    if (globalStage === 1) {
      if (basicStep === 0) {
        if (!od.username?.trim()) return
        setBasicStep(1)
        return
      }
      if (!od.position) return
      setGlobalStage(2)
      return
    }
    if (globalStage === 2) {
      const total = feet * 12 + inches
      const w = od.weightLbs
      if (w == null || w < 100 || w > 350) return
      setOnboardingData({ heightInches: total })
      setGlobalStage(3)
      setAttrPhase('intro')
      setAttrQIndex(0)
      return
    }
    if (globalStage >= 3 && globalStage <= 8) {
      if (attrPhase === 'intro') {
        setAttrPhase('question')
        setAttrQIndex(0)
        return
      }
      if (attrPhase === 'question') {
        const q = visibleQuestions[attrQIndex]
        if (!q) return
        if (q.type === 'slider' && qa[q.id] == null) return
        if (q.type === 'mcq' && qa[q.id] == null) return
        if (attrQIndex < visibleQuestions.length - 1) {
          setAttrQIndex((i) => i + 1)
        } else {
          setAttrPhase('sectionComplete')
        }
        return
      }
    }
    if (globalStage === 9) {
      if (
        !Array.isArray(od.trainingEnvironment) ||
        od.trainingEnvironment.length === 0 ||
        !od.sessionDuration ||
        !od.planDurationWeeks
      )
        return
      setGlobalStage(10)
      return
    }
  }, [
    globalStage,
    basicStep,
    attrPhase,
    visibleQuestions,
    attrQIndex,
    feet,
    inches,
    setOnboardingData,
  ])

  const goBack = useCallback(() => {
    if (globalStage === 0) return
    if (globalStage === 1) {
      if (basicStep === 1) setBasicStep(0)
      else setGlobalStage(0)
      return
    }
    if (globalStage === 2) {
      setGlobalStage(1)
      setBasicStep(1)
      return
    }
    if (globalStage >= 3 && globalStage <= 8) {
      const s = globalStage - 3
      if (attrPhase === 'intro') {
        if (s === 0) {
          setGlobalStage(2)
        } else {
          const prevQs = getVisibleAttributeQuestions(s - 1, ctx)
          setGlobalStage((g) => g - 1)
          setAttrPhase('question')
          setAttrQIndex(Math.max(0, prevQs.length - 1))
        }
        return
      }
      if (attrPhase === 'sectionComplete') {
        setAttrPhase('question')
        setAttrQIndex(Math.max(0, visibleQuestions.length - 1))
        return
      }
      if (attrQIndex > 0) {
        setAttrQIndex((i) => i - 1)
      } else {
        setAttrPhase('intro')
      }
      return
    }
    if (globalStage === 9) {
      const lastIdx = Math.max(
        0,
        getVisibleAttributeQuestions(5, {
          answers: ctx.answers,
          position: ctx.position,
          heightInches: ctx.heightInches,
        }).length - 1,
      )
      setGlobalStage(8)
      setAttrPhase('question')
      setAttrQIndex(lastIdx)
      return
    }
    if (globalStage === 10) {
      setGlobalStage(9)
    }
  }, [globalStage, basicStep, attrPhase, attrQIndex, visibleQuestions.length, ctx])

  const onSubmit = async () => {
    if (!user?.id) return
    setSubmitError('')
    setSubmitting(true)
    try {
      const od = useAppStore.getState().onboardingData
      const qa = od.questionnaireAnswers || {}
      const { attributes, ovr } = buildAttributesAndOVR(qa, {
        position: od.position,
        heightInches: od.heightInches,
        weightLbs: od.weightLbs,
      })
      const { buildId } = await saveOnboardingData(user.id, od, attributes, ovr)
      setAttributes(attributes)
      setCurrentBuild({ id: buildId, overall_rating: ovr })
      navigate('/onboarding/archetype-reveal', { replace: true })
    } catch (e) {
      setSubmitError(e?.message || 'Could not save your build.')
    } finally {
      setSubmitting(false)
    }
  }

  const globalProgressPct =
    globalStage >= 1 ? Math.min(100, (globalStage / 10) * 100) : 0

  const sectionProgressPct =
    globalStage >= 3 && globalStage <= 8 && attrPhase === 'question' && visibleQuestions.length
      ? ((attrQIndex + 1) / visibleQuestions.length) * 100
      : globalStage >= 3 && globalStage <= 8 && attrPhase === 'sectionComplete'
        ? 100
        : 0

  const currentSection = ATTRIBUTE_SECTIONS[sectionIndex]

  const transitionKey = `${globalStage}-${basicStep}-${attrPhase}-${attrQIndex}`

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {globalStage >= 1 ? (
        <div className="fixed left-0 right-0 top-0 z-50">
          <div className="mx-auto w-full max-w-[480px] px-4 pt-3">
            <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)] ring-1 ring-[var(--border-subtle)]">
              <motion.div
                className="h-full rounded-full bg-[var(--neon-blue)] shadow-[var(--glow-blue)]"
                initial={false}
                animate={{ width: `${globalProgressPct}%` }}
                transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              />
            </div>
            <p className="mt-2 text-center font-display text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]">
              Stage {globalStage} of 10
            </p>
            {globalStage >= 3 && globalStage <= 8 && currentSection ? (
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-card)]">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: `var(${currentSection.colorVar})`,
                  }}
                  initial={false}
                  animate={{ width: `${sectionProgressPct}%` }}
                  transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {globalStage > 0 ? (
        <button
          type="button"
          onClick={goBack}
          className="fixed left-3 top-[52px] z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] font-display text-xl text-[var(--neon-blue)] shadow-[0_0_16px_rgba(0,212,255,0.15)]"
          aria-label="Back"
        >
          ‹
        </button>
      ) : null}

      <div
        className={`mx-auto min-h-dvh w-full max-w-[480px] px-5 ${globalStage >= 1 ? 'pt-24' : 'pt-10'} pb-16`}
      >
        <AnimatePresence mode="wait">
          <motion.div key={transitionKey} {...slide} className="will-change-transform">
            {globalStage === 0 ? (
              <Welcome onBegin={goNext} />
            ) : null}

            {globalStage === 1 && basicStep === 0 ? (
              <div>
                <h2 className="font-display text-3xl font-bold uppercase leading-none tracking-tight text-[var(--text-primary)]">
                  YOUR PLAYER NAME
                </h2>
                <p className="mt-3 font-body text-sm text-[var(--text-secondary)]">
                  What do people call you on the court?
                </p>
                <div className="mt-8">
                  <Input
                    placeholder="Nickname or last name"
                    value={onboardingData.username}
                    onChange={(e) =>
                      setOnboardingData({ username: e.target.value, name: e.target.value })
                    }
                    autoComplete="nickname"
                  />
                </div>
                <div className="mt-10">
                  <Button className="w-full" onClick={goNext} variant="primary">
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {globalStage === 1 && basicStep === 1 ? (
              <div>
                <h2 className="font-display text-3xl font-bold uppercase leading-none tracking-tight">
                  YOUR POSITION
                </h2>
                <p className="mt-3 font-body text-sm text-[var(--text-secondary)]">
                  Pick the spot you play most.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {POSITION_OPTIONS.map((p) => {
                    const selected = onboardingData.position === p.code
                    return (
                      <motion.button
                        key={p.code}
                        type="button"
                        layout
                        onClick={() => setOnboardingData({ position: p.code })}
                        whileTap={{ scale: 0.98 }}
                        className={[
                          'rounded-2xl border bg-[var(--bg-card)] p-4 text-left transition-shadow',
                          selected
                            ? 'border-[var(--neon-blue)] shadow-[var(--glow-blue)]'
                            : 'border-[var(--border-subtle)]',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-3">
                          <PositionGlyph code={p.code} />
                          <div>
                            <div className="font-display text-4xl font-bold leading-none text-[var(--neon-blue)]">
                              {p.code}
                            </div>
                            <div className="mt-1 font-body text-sm text-[var(--text-secondary)]">
                              {p.name}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
                <div className="mt-10">
                  <Button className="w-full" onClick={goNext} variant="primary">
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {globalStage === 2 ? (
              <div>
                <h2 className="font-display text-3xl font-bold uppercase leading-none tracking-tight">
                  PHYSICAL PROFILE
                </h2>
                <p className="mt-3 font-body text-sm text-[var(--text-secondary)]">
                  Used to calibrate attributes like block, dunk, and rebounding potential.
                </p>

                <div className="mt-8">
                  <p className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Height
                  </p>
                  <div className="flex gap-3">
                    <select
                      className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 font-body text-[var(--text-primary)]"
                      value={feet}
                      onChange={(e) => setFeet(Number(e.target.value))}
                    >
                      {[4, 5, 6, 7].map((f) => (
                        <option key={f} value={f}>
                          {f} ft
                        </option>
                      ))}
                    </select>
                    <select
                      className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-3 font-body text-[var(--text-primary)]"
                      value={inches}
                      onChange={(e) => setInches(Number(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>
                          {i} in
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-2 font-mono text-sm text-[var(--neon-blue)]">{heightDisplay}</p>
                </div>

                <div className="mt-8">
                  <p className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Weight (lbs)
                  </p>
                  <Input
                    inputMode="numeric"
                    type="number"
                    min={100}
                    max={350}
                    placeholder="e.g. 185"
                    value={onboardingData.weightLbs ?? ''}
                    onChange={(e) =>
                      setOnboardingData({
                        weightLbs: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>

                <div className="mt-10">
                  <Button className="w-full" onClick={goNext} variant="primary">
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {globalStage >= 3 && globalStage <= 8 && attrPhase === 'intro' && currentSection ? (
              <SectionIntro
                section={currentSection}
                onStart={goNext}
              />
            ) : null}

            {globalStage >= 3 && globalStage <= 8 && attrPhase === 'question' ? (
              <QuestionCard
                question={visibleQuestions[attrQIndex]}
                answers={answers}
                mergeAnswer={mergeAnswer}
                onNext={goNext}
              />
            ) : null}

            {globalStage >= 3 && globalStage <= 8 && attrPhase === 'sectionComplete' && currentSection ? (
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[60vh] flex-col items-center justify-center text-center"
              >
                <p
                  className="font-display text-4xl font-black uppercase tracking-tight"
                  style={{ color: `var(${currentSection.colorVar})` }}
                >
                  SECTION COMPLETE
                </p>
                <p className="mt-3 font-body text-sm text-[var(--text-secondary)]">
                  Locking in {currentSection.title.toLowerCase()}…
                </p>
              </motion.div>
            ) : null}

            {globalStage === 9 ? (
              <TrainingStage
                data={onboardingData}
                setOnboardingData={setOnboardingData}
                onNext={goNext}
              />
            ) : null}

            {globalStage === 10 && preview ? (
              <ReviewStage
                onboardingData={onboardingData}
                preview={preview}
                submitting={submitting}
                submitError={submitError}
                onSubmit={onSubmit}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function Welcome({ onBegin }) {
  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col justify-center pb-10">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <motion.div
          className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(0,212,255,0.35), transparent 65%)',
          }}
          animate={{ opacity: [0.45, 0.75, 0.45], scale: [1, 1.06, 1] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.h1
        className="font-display text-[clamp(2.1rem,8vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-tight text-[var(--text-primary)] [text-shadow:0_0_40px_rgba(0,212,255,0.25)]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        TIME TO BUILD
        <br />
        YOUR PLAYER
      </motion.h1>
      <motion.p
        className="mt-5 max-w-[36ch] font-body text-base text-[var(--text-secondary)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        Answer honestly. Your archetype depends on it.
      </motion.p>
      <motion.div
        className="mt-10 flex justify-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
      >
        <BasketballMark />
      </motion.div>
      <motion.div
        className="mt-12"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
      >
        <Button className="w-full" variant="primary" onClick={onBegin}>
          BEGIN COMBINE
        </Button>
      </motion.div>
    </div>
  )
}

function SectionIntro({ section, onStart }) {
  return (
    <motion.div
      className="relative flex min-h-[calc(100dvh-8rem)] flex-col justify-center overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-5 py-12"
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="pointer-events-none absolute -right-24 top-0 h-[120%] w-[70%] opacity-30"
        style={{
          background: `radial-gradient(circle at 30% 30%, var(${section.colorVar}), transparent 58%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ duration: 0.6 }}
      />
      <p
        className="relative font-display text-[clamp(3.2rem,14vw,4.5rem)] font-black uppercase leading-[0.85] tracking-tight"
        style={{ color: `var(${section.colorVar})` }}
      >
        {section.title}
      </p>
      <p className="relative mt-6 max-w-[36ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        {section.description}
      </p>
      <motion.div
        className="relative mt-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.35 }}
      >
        <Button className="w-full" variant="primary" onClick={onStart}>
          START SECTION
        </Button>
      </motion.div>
    </motion.div>
  )
}

function QuestionCard({ question, answers, mergeAnswer, onNext }) {
  useEffect(() => {
    if (!question || question.type !== 'slider') return
    if (answers[question.id] == null) mergeAnswer(question.id, 55)
  }, [question, answers, mergeAnswer])

  if (!question) return null
  const val = answers[question.id]

  return (
    <div>
      <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-[var(--text-primary)]">
        {question.label}
      </h2>
      <div className="mt-8">
        {question.type === 'slider' ? (
          <Slider
            label=""
            value={typeof val === 'number' ? val : 55}
            onChange={(n) => mergeAnswer(question.id, n)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {question.options.map((opt) => {
              const selected = val === opt.id
              return (
                <motion.button
                  key={opt.id}
                  type="button"
                  layout
                  onClick={() => mergeAnswer(question.id, opt.id)}
                  whileTap={{ scale: 0.99 }}
                  className={[
                    'rounded-2xl border px-4 py-4 text-left font-body text-sm transition-shadow',
                    selected
                      ? 'border-[var(--neon-blue)] bg-[rgba(0,212,255,0.08)] shadow-[var(--glow-blue)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-card)]',
                  ].join(' ')}
                >
                  {opt.text}
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
      <div className="mt-10">
        <Button className="w-full" variant="primary" onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  )
}

const TRAINING_ENV_OPTIONS = [
  { value: 'court', label: 'AT THE COURT', icon: '🏀', desc: 'Full basket access' },
  { value: 'home_no_hoop', label: 'HOME — NO HOOP', icon: '🏠', desc: 'No basket available' },
  { value: 'home_with_hoop', label: 'HOME WITH HOOP', icon: '🏡', desc: 'Hoop at home' },
  { value: 'hybrid', label: 'HYBRID', icon: '🔄', desc: 'Mix of everything' },
]

function TrainingStage({ data, setOnboardingData, onNext }) {
  const env = Array.isArray(data.trainingEnvironment) ? data.trainingEnvironment : []
  const dur = data.sessionDuration
  const weeks = data.planDurationWeeks

  const toggleEnv = (value) => {
    const cur = Array.isArray(data.trainingEnvironment) ? [...data.trainingEnvironment] : []
    let next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]
    if (next.length === 0) next = [value]
    setOnboardingData({ trainingEnvironment: next })
  }

  return (
    <div>
      <h2 className="font-display text-3xl font-bold uppercase leading-none tracking-tight">
        TRAINING SETUP
      </h2>
      <p className="mt-3 font-body text-sm text-[var(--text-secondary)]">
        Dial in where you work and how much time you can protect on the calendar.
      </p>

      <div className="mt-10">
        <p className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Where can you train? (Select all that apply)
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TRAINING_ENV_OPTIONS.map((o) => {
            const selected = env.includes(o.value)
            return (
              <motion.button
                key={o.value}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleEnv(o.value)}
                className={[
                  'rounded-2xl border p-4 text-left font-body text-sm transition-shadow',
                  selected
                    ? 'border-[var(--neon-blue)] bg-[rgba(0,212,255,0.08)] shadow-[var(--glow-blue)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)]',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>
                    {o.icon}
                  </span>
                  <div>
                    <p className="font-display text-sm font-bold uppercase tracking-wide text-white">
                      {o.label}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{o.desc}</p>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="mt-10">
        <p className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Time per session
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: '20-30', t: '20–30 min' },
            { id: '30-45', t: '30–45 min' },
            { id: '45-60', t: '45–60 min' },
            { id: '60+', t: '60+ min' },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOnboardingData({ sessionDuration: o.id })}
              className={[
                'rounded-xl border px-3 py-3 font-body text-sm font-semibold',
                dur === o.id
                  ? 'border-[var(--neon-blue)] text-[var(--neon-blue)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]',
              ].join(' ')}
            >
              {o.t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <p className="mb-3 font-display text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Development plan length
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[4, 8, 12].map((w) => (
            <motion.button
              key={w}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setOnboardingData({ planDurationWeeks: w })}
              className={[
                'rounded-2xl border py-4 font-display text-lg font-bold',
                weeks === w
                  ? 'border-[var(--neon-blue)] shadow-[var(--glow-blue)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)]',
              ].join(' ')}
            >
              {w} WK
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <Button className="w-full" variant="primary" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  )
}

function ReviewStage({ onboardingData, preview, submitting, submitError, onSubmit }) {
  const { attributes } = preview
  const sorted = useMemo(() => {
    return Object.entries(attributes).sort((a, b) => b[1] - a[1])
  }, [attributes])
  const top = sorted.slice(0, 3)
  const bottom = sorted.slice(-3).reverse()

  return (
    <div>
      <h2 className="font-display text-3xl font-bold uppercase leading-none tracking-tight">
        REVIEW
      </h2>
      <p className="mt-3 font-body text-sm text-[var(--text-secondary)]">
        One last look before we generate your archetype.
      </p>

      <Card className="mt-8 p-5 glowing">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="font-display text-2xl font-bold uppercase">
              {onboardingData.username}
            </p>
            <p className="mt-1 font-mono text-sm text-[var(--text-secondary)]">
              {onboardingData.position} · OVR{' '}
              <span className="text-[var(--neon-blue)]">
                {computeOVR(attributes, onboardingData.position)}
              </span>
            </p>
          </div>
        </div>
        <p className="mt-4 font-body text-sm text-[var(--text-secondary)]">
          {`${Math.floor((onboardingData.heightInches || 0) / 12)}'${(onboardingData.heightInches || 0) % 12}"`}{' '}
          · {onboardingData.weightLbs} lbs
        </p>
        <p className="mt-2 font-body text-sm text-[var(--text-secondary)]">
          {Array.isArray(onboardingData.trainingEnvironment) &&
          onboardingData.trainingEnvironment.length
            ? onboardingData.trainingEnvironment
                .map((id) =>
                  id === 'court'
                    ? 'Court'
                    : id === 'home_no_hoop'
                      ? 'Home (no hoop)'
                      : id === 'home_with_hoop'
                        ? 'Home + hoop'
                        : id === 'hybrid'
                          ? 'Hybrid mix'
                          : id,
                )
                .join(', ')
            : '—'}{' '}
          · {onboardingData.planDurationWeeks} weeks
        </p>

        <div className="mt-8">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-[var(--neon-green)]">
            Top attributes
          </p>
          <div className="mt-3 space-y-3">
            {top.map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between font-mono text-xs text-[var(--text-secondary)]">
                  <span>{k.replaceAll('_', ' ')}</span>
                  <span>{v}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div
                    className="h-full rounded-full bg-[var(--neon-blue)]"
                    style={{ width: `${v}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Growth edges
          </p>
          <div className="mt-3 space-y-3">
            {bottom.map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between font-mono text-xs text-[var(--text-muted)]">
                  <span>{k.replaceAll('_', ' ')}</span>
                  <span>{v}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div
                    className="h-full rounded-full bg-[var(--text-muted)]"
                    style={{ width: `${v}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {submitError ? (
        <p className="mt-4 text-center text-sm text-[#ff6b86]">{submitError}</p>
      ) : null}

      <div className="mt-10">
        {submitting ? (
          <LoadingAnalyze />
        ) : (
          <>
            <Button className="w-full" variant="primary" onClick={onSubmit}>
              GENERATE MY ARCHETYPE
            </Button>
            <p className="mt-4 text-center font-body text-xs text-[var(--text-muted)]">
              This will take a moment. Get ready.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function LoadingAnalyze() {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 py-10 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'linear-gradient(110deg, transparent 40%, rgba(0,212,255,0.35) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />
      <p className="relative font-display text-xl font-bold uppercase tracking-[0.2em] text-[var(--neon-blue)] [text-shadow:var(--glow-blue)]">
        ANALYZING YOUR GAME…
      </p>
      <p className="relative mt-3 font-body text-sm text-[var(--text-secondary)]">
        Syncing profile, build, and attribute baselines.
      </p>
    </motion.div>
  )
}
