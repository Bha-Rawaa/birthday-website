'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'
const PERSON_AGE = process.env.NEXT_PUBLIC_PERSON_AGE ?? ''

async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  confetti({
    particleCount: 250,
    spread: 120,
    origin: { y: 0.55 },
    colors: ['#F4A93C', '#F0654E', '#FFE9A8', '#FFC7A8', '#F6D486', '#9B7FCC'],
  })
  setTimeout(async () => {
    const c2 = (await import('canvas-confetti')).default
    c2({ particleCount: 150, spread: 90, origin: { x: 0.2, y: 0.6 }, colors: ['#F4A93C', '#F6D486'] })
    c2({ particleCount: 150, spread: 90, origin: { x: 0.8, y: 0.6 }, colors: ['#F0654E', '#FFC7A8'] })
  }, 400)
}

interface CandleProps {
  isBlown: boolean
  delay: number
}

function Candle({ isBlown, delay }: CandleProps) {
  return (
    <div className="flex flex-col items-center" style={{ transitionDelay: `${delay}ms` }}>
      <div
        className="relative transition-all duration-700"
        style={{ height: '40px', width: '20px', opacity: isBlown ? 0 : 1, transform: isBlown ? 'scale(0)' : 'scale(1)' }}
      >
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${!isBlown ? 'animate-flicker' : ''}`}>
          <svg width="20" height="35" viewBox="0 0 20 35">
            <ellipse cx="10" cy="28" rx="7" ry="7" fill="#FFE9A8" opacity="0.8" />
            <ellipse cx="10" cy="20" rx="5" ry="12" fill="#F6D486" />
            <ellipse cx="10" cy="15" rx="3.5" ry="10" fill="#F4A93C" />
            <ellipse cx="10" cy="12" rx="2" ry="7" fill="#F0654E" opacity="0.9" />
          </svg>
        </div>
        {isBlown && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 animate-smoke-puff">
            <div className="w-4 h-4 bg-gray-300/50 rounded-full" />
          </div>
        )}
      </div>
      {/* Candle body */}
      <div className="w-6 h-20 rounded-t-sm relative overflow-hidden shadow-md"
        style={{ background: 'linear-gradient(to right, #FFE9A8, #F6D486, #FFC7A8)' }}>
        <div className="absolute top-2 left-1 w-1 h-3 bg-white/50 rounded-full" />
        <div className="absolute top-4 right-1 w-1 h-2 bg-white/40 rounded-full" />
      </div>
      <div className="w-0.5 h-3 bg-gray-700 -mt-1" />
    </div>
  )
}

type Stage = 'idle' | 'countdown' | 'ready' | 'blown'
const COUNTDOWN_STEPS = ['One... 🌟', 'Two... ✨', 'Three... 🎂', 'Blowwwww! 💨']
const STEP_DURATION = 900 // ms per step

interface CandleSectionProps {
  onBlown?: () => void
}

export default function CandleSection({ onBlown }: CandleSectionProps = {}) {
  const [stage, setStage] = useState<Stage>('idle')
  const [countdownIndex, setCountdownIndex] = useState(0)
  const [micActive, setMicActive] = useState(false)
  const [micError, setMicError] = useState('')
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const blowAudioRef = useRef<HTMLAudioElement | null>(null)

  const ageLabel = PERSON_AGE ? `${PERSON_AGE}th ` : ''

  const doBlowOut = useCallback(async () => {
    if (stage === 'blown') return
    setStage('blown')

    // Stop mic
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {})
    cancelAnimationFrame(rafRef.current)

    // Play blow sound if available
    if (blowAudioRef.current) {
      blowAudioRef.current.volume = 0.5
      blowAudioRef.current.play().catch(() => {})
    }

    await fireConfetti()
    onBlown?.()
  }, [stage, onBlown])

  // Run countdown then switch to 'ready'
  const startCountdown = useCallback(() => {
    setStage('countdown')
    setCountdownIndex(0)
  }, [])

  useEffect(() => {
    if (stage !== 'countdown') return

    if (countdownIndex < COUNTDOWN_STEPS.length - 1) {
      const t = setTimeout(() => setCountdownIndex(i => i + 1), STEP_DURATION)
      return () => clearTimeout(t)
    } else {
      // Last step shown ("Blowwwww!") — after a brief pause switch to ready
      const t = setTimeout(() => setStage('ready'), STEP_DURATION + 200)
      return () => clearTimeout(t)
    }
  }, [stage, countdownIndex])

  const startMic = useCallback(async () => {
    setMicError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new AudioContext()
      audioContextRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      setMicActive(true)

      const data = new Uint8Array(analyser.frequencyBinCount)
      const checkVolume = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        if (avg > 28) {
          doBlowOut()
        } else {
          rafRef.current = requestAnimationFrame(checkVolume)
        }
      }
      rafRef.current = requestAnimationFrame(checkVolume)
    } catch {
      setMicError('Mic access denied — use the tap button below! 🎤')
    }
  }, [doBlowOut])

  // Auto-start mic when we enter 'ready' stage
  useEffect(() => {
    if (stage === 'ready' && !micActive) {
      startMic()
    }
  }, [stage, micActive, startMic])

  const isBlown = stage === 'blown'

  return (
    <section className="relative py-20 px-4">
      {/* invisible blow sound */}
      <audio ref={blowAudioRef} src="/blow-sound.mp3" preload="none" />

      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-5xl text-accent-marigold mb-3">
          🎂 Time for Cake!
        </h2>
        <p className="text-gray-600 mb-3 text-lg">
          It wouldn&apos;t be a birthday party without candles — let&apos;s make a wish together!
        </p>
        <p className="text-gray-500 mb-10 text-sm">
          Together we&apos;re celebrating {PERSON_NAME}&apos;s {ageLabel}birthday — so let&apos;s blow these candles out together!
        </p>

        {/* Cake */}
        <div className="inline-block relative">
          <div className="flex gap-6 justify-center mb-2">
            <Candle isBlown={isBlown} delay={0} />
            <Candle isBlown={isBlown} delay={120} />
            <Candle isBlown={isBlown} delay={240} />
          </div>

          <div className="relative">
            <div className="w-40 h-14 mx-auto rounded-t-2xl relative overflow-hidden shadow-lg"
              style={{ background: 'linear-gradient(to bottom, #FFC7A8, #FFB08A)' }}>
              <div className="absolute inset-x-0 top-0 h-4 rounded-t-2xl" style={{ background: '#F6D486' }} />
              <div className="absolute inset-x-0 top-4 h-1 bg-white/60" />
              {[20, 40, 60, 80, 100, 120].map(x => (
                <div key={x} className="absolute bottom-3 w-2 h-2 rounded-full bg-accent-marigold/80" style={{ left: x }} />
              ))}
            </div>

            <div className="w-56 h-16 mx-auto rounded-b-2xl relative overflow-hidden shadow-xl"
              style={{ background: 'linear-gradient(to bottom, #F6D486, #FFE9A8)' }}>
              <div className="absolute inset-x-0 top-0 h-5" style={{ background: '#FFC7A8' }} />
              <div className="absolute inset-x-0 top-5 h-1 bg-white/60" />
              {[15, 35, 55, 75, 95, 115, 135, 155, 175, 195].map(x => (
                <div key={x} className="absolute bottom-3 w-2.5 h-2.5 rounded-full"
                  style={{ left: x, background: x % 4 === 0 ? '#F0654E' : '#F4A93C' }} />
              ))}
            </div>

            <div className="w-64 h-4 mx-auto rounded-b-full shadow-lg"
              style={{ background: 'linear-gradient(to right, #e0e0e0, #f5f5f5, #e0e0e0)' }} />
          </div>
        </div>

        {/* Controls / feedback */}
        <div className="mt-10 space-y-4 min-h-32">

          {/* IDLE — start button */}
          {stage === 'idle' && (
            <div className="animate-fade-in-up space-y-4">
              <button
                onClick={startCountdown}
                className="px-10 py-4 rounded-2xl bg-gradient-to-r from-accent-marigold to-accent-coral text-white font-display text-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              >
                Ready? Let&apos;s go! 🎉
              </button>
              <p className="text-gray-400 text-sm">Close your eyes, make a wish, and get ready to blow! 💨</p>
            </div>
          )}

          {/* COUNTDOWN */}
          {stage === 'countdown' && (
            <div className="animate-fade-in-up">
              <p className="font-display text-5xl md:text-6xl text-accent-marigold drop-shadow-md transition-all duration-300">
                {COUNTDOWN_STEPS[countdownIndex]}
              </p>
            </div>
          )}

          {/* READY — mic active */}
          {stage === 'ready' && (
            <div className="animate-fade-in-up space-y-4">
              {micActive ? (
                <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-green-100 border-2 border-green-400 text-green-700 font-semibold text-lg">
                  <span className="text-2xl animate-pulse">🎤</span>
                  Listening... blow NOW! 💨
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={startMic}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-accent-marigold to-accent-coral text-white font-display text-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    🎤 Enable mic to blow!
                  </button>
                  {micError && <p className="text-accent-coral text-sm">{micError}</p>}
                </div>
              )}
              <div>
                <button
                  onClick={doBlowOut}
                  className="px-6 py-3 rounded-2xl border-2 border-accent-marigold/50 text-accent-marigold font-semibold hover:bg-accent-marigold/10 transition-all duration-200"
                >
                  🕯️ Tap to blow instead
                </button>
              </div>
            </div>
          )}

          {/* BLOWN — success */}
          {stage === 'blown' && (
            <div className="animate-fade-in-up space-y-3">
              <p className="font-display text-4xl md:text-5xl text-accent-marigold">
                🎉 Happy {ageLabel}Birthday {PERSON_NAME}! 🎉
              </p>
              <p className="text-gray-600 text-lg">
                Your wish is flying up to the universe right now ✨🦁
              </p>
              <p className="text-gray-500 text-sm mt-2">
                (And so is {PERSON_NAME}&apos;s — you two just made a little birthday magic together 💛)
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
