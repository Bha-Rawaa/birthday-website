'use client'

import { useState, useEffect, useCallback } from 'react'

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'Rawaa'

interface QuizQuestion {
  id: number
  question: string
  answers: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  display_order: number
}

interface QuizResult {
  score: number
  correctAnswers: number
  wrongAnswers: number
  maxScore: number
  totalQuestions: number
  totalParticipants: number
  rank: number
  qualified: boolean
  isWinner: boolean
}

interface Props {
  visitorName: string
}

type Phase = 'intro' | 'loading' | 'quiz' | 'submitting' | 'results' | 'winner'

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#C9A84C',
  medium: '#9B7FCC',
  hard: '#E8856A',
}

// Decorative SVG stars
function StarField() {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    left: `${(i * 137.5) % 100}%`,
    top: `${(i * 97.3) % 100}%`,
    size: 1 + (i % 3),
    opacity: 0.06 + (i % 5) * 0.05,
    duration: 2 + (i % 4),
    delay: (i % 7) * 0.5,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: s.left, top: s.top,
          width: s.size, height: s.size,
          borderRadius: '50%',
          background: 'white',
          opacity: s.opacity,
          animation: `qzTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  )
}

// Decorative SVG flower
function FlowerSVG({ x, y, size = 28, color = '#C9A84C' }: { x: number | string; y: number | string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ position: 'absolute', left: x, top: y, opacity: 0.35, pointerEvents: 'none' }}>
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <ellipse key={i} cx="20" cy="12" rx="5" ry="9" fill={i % 2 === 0 ? color : '#9B7FCC'}
          transform={`rotate(${deg}, 20, 20)`} opacity="0.7" />
      ))}
      <circle cx="20" cy="20" r="6" fill={color} />
    </svg>
  )
}

// Progress bar
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? (current / total) * 100 : 0
  return (
    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: 'linear-gradient(90deg, #C9A84C, #E8D5A3)',
        borderRadius: 4,
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

export default function QuizSection({ visitorName }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [attemptId, setAttemptId] = useState<string>('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answersGiven, setAnswersGiven] = useState<{ questionId: number; selectedAnswer: string }[]>([])
  const [result, setResult] = useState<QuizResult | null>(null)
  const [fadeKey, setFadeKey] = useState(0)

  const launchWinnerConfetti = useCallback(async () => {
    const confetti = (await import('canvas-confetti')).default
    const colors = ['#C9A84C', '#E8D5A3', '#ffffff', '#9B7FCC', '#E8856A']
    confetti({ particleCount: 120, spread: 120, origin: { x: 0.5, y: 0.5 }, colors, gravity: 0.7, scalar: 1.2 })
    setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 80, origin: { x: 0 }, colors })
      confetti({ particleCount: 60, angle: 120, spread: 80, origin: { x: 1 }, colors })
    }, 400)
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 140, origin: { x: 0.5, y: 0.3 }, colors, gravity: 0.5 })
    }, 900)
  }, [])

  const startQuiz = async () => {
    setPhase('loading')
    try {
      const [qRes, startRes] = await Promise.all([
        fetch('/api/quiz/questions'),
        fetch('/api/quiz/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestName: visitorName }),
        }),
      ])
      const qData = await qRes.json()
      const startData = await startRes.json()

      if (!qData.questions?.length) {
        setPhase('intro')
        return
      }

      setQuestions(qData.questions)
      setAttemptId(startData.attemptId)
      setCurrentIndex(0)
      setAnswersGiven([])
      setFadeKey(k => k + 1)
      setPhase('quiz')
    } catch {
      setPhase('intro')
    }
  }

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(answer)

    setTimeout(() => {
      const currentQ = questions[currentIndex]
      const newAnswers = [...answersGiven, { questionId: currentQ.id, selectedAnswer: answer }]
      setAnswersGiven(newAnswers)
      setSelectedAnswer(null)

      if (currentIndex + 1 < questions.length) {
        setFadeKey(k => k + 1)
        setCurrentIndex(i => i + 1)
      } else {
        submitQuiz(newAnswers)
      }
    }, 400)
  }

  const submitQuiz = async (answers: { questionId: number; selectedAnswer: string }[]) => {
    setPhase('submitting')
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, answers }),
      })
      const data = await res.json()
      setResult(data)
      if (data.isWinner) {
        setPhase('winner')
        setTimeout(() => launchWinnerConfetti(), 300)
      } else {
        setPhase('results')
      }
    } catch {
      setPhase('results')
    }
  }

  useEffect(() => {
    // Reset on name change
    setPhase('intro')
    setQuestions([])
    setAnswersGiven([])
    setResult(null)
  }, [visitorName])

  const currentQ = questions[currentIndex]

  return (
    <section style={{
      position: 'relative',
      padding: '80px 16px',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #080614 0%, #130d30 50%, #080614 100%)',
    }}>
      <StarField />

      {/* Decorative flowers near header */}
      <FlowerSVG x={20} y={30} size={32} color="#C9A84C" />
      <FlowerSVG x={-10} y={120} size={24} color="#9B7FCC" />
      <FlowerSVG x="calc(100% - 40px)" y={40} size={28} color="#E8856A" />
      <FlowerSVG x="calc(100% - 20px)" y={100} size={20} color="#C9A84C" />

      <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: 12 }}>
            ✦ &nbsp; test your knowledge &nbsp; ✦
          </p>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 44px)', fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em', marginBottom: 10 }}>
            How Well Do You Know Her?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>
            10 questions · earn up to 18 points · one winner gets the gift 🎁
          </p>
        </div>

        {/* ── INTRO ── */}
        {phase === 'intro' && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: 20,
            padding: '40px 32px',
            textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            animation: 'qzFadeUp 0.5s ease-out',
          }}>
            <img src="/question.gif" alt="" style={{ width: 180, height: 180, objectFit: 'contain', marginBottom: 20 , margin: '0 auto 32px'  }} />
            <h3 style={{ color: '#E8D5A3', fontWeight: 700, fontSize: 22, marginBottom: 12 }}>
              Careful I am watching you 👀 
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.6, marginBottom: 32, maxWidth: 440, margin: '0 auto 32px' }}>
              10 questions about her. Answer at least 9 correctly to qualify for the winner title.
              The one with the highest score wins the special gift — no pressure 😉
            </p>
            <button
              onClick={startQuiz}
              style={{
                padding: '14px 36px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #C9A84C 0%, #E8D5A3 50%, #C9A84C 100%)',
                color: '#0d0820',
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(201,168,76,0.3)',
                transition: 'all 0.2s',
              }}
            >
              Take the quiz →
            </button>
          </div>
        )}

        {/* ── LOADING ── */}
        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 40, animation: 'qzPulse 1.2s ease-in-out infinite' }}>✨</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 16, fontSize: 14 }}>Loading questions…</p>
          </div>
        )}

        {/* ── QUIZ ── */}
        {phase === 'quiz' && currentQ && (
          <div key={fadeKey} style={{ animation: 'qzFadeUp 0.35s ease-out' }}>
            {/* Progress */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: '0.1em' }}>
                  Question {currentIndex + 1} / {questions.length}
                </span>
                <span style={{
                  padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: `${DIFFICULTY_COLORS[currentQ.difficulty]}22`,
                  color: DIFFICULTY_COLORS[currentQ.difficulty],
                  border: `1px solid ${DIFFICULTY_COLORS[currentQ.difficulty]}44`,
                }}>
                  {currentQ.difficulty} · {currentQ.points}pt{currentQ.points > 1 ? 's' : ''}
                </span>
              </div>
              <ProgressBar current={currentIndex} total={questions.length} />
            </div>

            {/* Question card */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: 20,
              padding: '32px 28px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            }}>
              <p style={{ color: '#E8D5A3', fontWeight: 700, fontSize: 'clamp(16px, 3vw, 20px)', lineHeight: 1.4, marginBottom: 28, textAlign: 'center' }}>
                {currentQ.question}
              </p>

              {/* Tiny star divider */}
              <div style={{ textAlign: 'center', marginBottom: 24, opacity: 0.3 }}>
                <svg width="80" height="10" viewBox="0 0 80 10">
                  {[10, 25, 40, 55, 70].map((x, i) => (
                    <circle key={i} cx={x} cy="5" r={i === 2 ? 3 : 2} fill="#C9A84C" />
                  ))}
                </svg>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentQ.answers.map((answer, idx) => {
                  const isSelected = selectedAnswer === answer
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(answer)}
                      disabled={selectedAnswer !== null}
                      style={{
                        padding: '14px 20px',
                        borderRadius: 12,
                        border: `1px solid ${isSelected ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`,
                        background: isSelected ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                        color: isSelected ? '#E8D5A3' : 'rgba(255,255,255,0.75)',
                        fontSize: 14,
                        textAlign: 'left',
                        cursor: selectedAnswer !== null ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: isSelected ? '0 0 0 1px rgba(201,168,76,0.4), 0 4px 16px rgba(201,168,76,0.1)' : 'none',
                        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                      }}
                      onMouseEnter={e => {
                        if (selectedAnswer === null) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.4)'
                          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,0.08)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (selectedAnswer === null && !isSelected) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.15)'
                          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'
                        }
                      }}
                    >
                      <span style={{ color: 'rgba(201,168,76,0.5)', marginRight: 10, fontWeight: 700, fontSize: 12 }}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {answer}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── SUBMITTING ── */}
        {phase === 'submitting' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 40, animation: 'qzSpin 1s linear infinite' }}>⭐</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 16, fontSize: 14 }}>Calculating your score…</p>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === 'results' && result && (
          <div style={{ animation: 'qzFadeUp 0.5s ease-out' }}>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: 20,
              padding: '40px 32px',
              textAlign: 'center',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>{result.qualified ? '🌟' : '💫'}</div>

              {/* Score */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 'clamp(36px, 7vw, 56px)', fontWeight: 700, color: '#E8D5A3', lineHeight: 1 }}>
                  {result.score} <span style={{ color: 'rgba(201,168,76,0.5)', fontSize: '0.5em' }}>/ {result.maxScore}</span>
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 4 }}>points</p>
              </div>

              {/* Stat pills */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
                <div style={{
                  padding: '8px 20px', borderRadius: 20,
                  background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)',
                }}>
                  <span style={{ color: '#C9A84C', fontWeight: 700, fontSize: 16 }}>{result.correctAnswers}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}> / {result.totalQuestions} correct</span>
                </div>
                <div style={{
                  padding: '8px 20px', borderRadius: 20,
                  background: 'rgba(155,127,204,0.1)', border: '1px solid rgba(155,127,204,0.25)',
                }}>
                  <span style={{ color: '#9B7FCC', fontWeight: 700, fontSize: 16 }}>#{result.rank}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}> out of {result.totalParticipants}</span>
                </div>
              </div>

              {/* Message */}
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
                {result.qualified
                  ? `Impressive! You got ${result.correctAnswers}/${result.totalQuestions} correct. You're currently #${result.rank} — keep checking if you've claimed the top spot!`
                  : `Not bad… but someone knows ${PERSON_NAME} better 👀 You got ${result.correctAnswers} out of ${result.totalQuestions} — close, but the gift eludes you this time.`
                }
              </p>

              <button
                onClick={() => setPhase('intro')}
                style={{
                  padding: '12px 28px',
                  borderRadius: 12,
                  border: '1px solid rgba(201,168,76,0.3)',
                  background: 'transparent',
                  color: '#E8D5A3',
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  letterSpacing: '0.03em',
                }}
              >
                Continue celebrating →
              </button>
            </div>
          </div>
        )}

        {/* ── WINNER ── */}
        {phase === 'winner' && result && (
          <div style={{ animation: 'qzFadeUp 0.5s ease-out' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(232,133,106,0.06) 100%)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(201,168,76,0.35)',
              borderRadius: 20,
              padding: '48px 32px',
              textAlign: 'center',
              boxShadow: '0 24px 80px rgba(201,168,76,0.15), 0 0 0 1px rgba(201,168,76,0.1)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Inner glow */}
              <div style={{
                position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)',
                width: 300, height: 300,
                background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              {/* Decorative small flowers */}
              <FlowerSVG x={16} y={16} size={24} color="#C9A84C" />
              <FlowerSVG x="calc(100% - 40px)" y={16} size={24} color="#E8856A" />
              <FlowerSVG x={8} y="calc(100% - 48px)" size={20} color="#9B7FCC" />
              <FlowerSVG x="calc(100% - 32px)" y="calc(100% - 48px)" size={20} color="#C9A84C" />

              <div style={{ fontSize: 64, marginBottom: 8, animation: 'qzPulse 1.4s ease-in-out infinite' }}>🏆</div>

              <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase', marginBottom: 16 }}>
                ✦ &nbsp; you did it &nbsp; ✦
              </p>

              <h3 style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em', marginBottom: 8 }}>
                YOU DID IT!
              </h3>

              <p style={{ color: '#C9A84C', fontSize: 17, fontWeight: 600, marginBottom: 24 }}>
                You&apos;re the ultimate {PERSON_NAME} expert.
              </p>

              {/* Score */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 24px', borderRadius: 20, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}>
                  <span style={{ color: '#E8D5A3', fontWeight: 700, fontSize: 20 }}>{result.score}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}> / {result.maxScore} pts</span>
                </div>
                <div style={{ padding: '10px 24px', borderRadius: 20, background: 'rgba(232,133,106,0.1)', border: '1px solid rgba(232,133,106,0.3)' }}>
                  <span style={{ color: '#E8856A', fontWeight: 700, fontSize: 20 }}>{result.correctAnswers}/{result.totalQuestions}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}> correct</span>
                </div>
              </div>

              <div style={{
                display: 'inline-block', padding: '14px 32px', borderRadius: 14,
                background: 'linear-gradient(135deg, #C9A84C, #E8D5A3)',
                marginBottom: 32,
              }}>
                <span style={{ color: '#0d0820', fontWeight: 700, fontSize: 16 }}>
                  You won the special gift! 🎁
                </span>
              </div>

              <br />

              <button
                onClick={() => setPhase('intro')}
                style={{
                  padding: '12px 28px',
                  borderRadius: 12,
                  border: '1px solid rgba(201,168,76,0.3)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Continue celebrating →
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes qzTwinkle {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.35; }
        }
        @keyframes qzFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes qzPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes qzSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  )
}
