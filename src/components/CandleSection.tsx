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
      {/* Candle body — striped, warm, visible against dark bg */}
      <div className="w-6 h-20 rounded-t-sm relative overflow-hidden shadow-lg"
        style={{ background: 'repeating-linear-gradient(180deg, #9B7FCC 0px, #9B7FCC 8px, #C4B5F4 8px, #C4B5F4 16px)', boxShadow: '0 0 12px rgba(155,127,204,0.5)' }}>
        {/* Wax drip */}
        <div className="absolute top-0 left-2 w-2 h-4 rounded-b-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
        {/* Highlight */}
        <div className="absolute top-2 left-1 w-1 h-6 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
      </div>
      {/* Wick */}
      <div className="w-0.5 h-3 -mt-1" style={{ background: '#4a3060' }} />
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
  const hbdAudioRef = useRef<HTMLAudioElement | null>(null)

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
    // Play Happy Birthday song
    if (hbdAudioRef.current) {
      hbdAudioRef.current.volume = 0.7
      hbdAudioRef.current.play().catch(() => {})
    }
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
    <section className="relative py-20 px-4" style={{ background: 'transparent' }}>
      {/* invisible blow sound */}
      <audio ref={blowAudioRef} src="/blow-sound.mp3" preload="none" />
      <audio ref={hbdAudioRef} src="/hbdcrowde.wav" preload="none" />

      <div className="max-w-2xl mx-auto text-center">
        <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: 12 }}>
          ✦ &nbsp; make a wish &nbsp; ✦
        </p>
        <h2 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em', marginBottom: 10 }}>
          Time for Candles
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginBottom: 10 }}>
          It wouldn&apos;t be a birthday party without candles — let&apos;s make a wish together!
        </p>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: 40 }}>
          Celebrating {PERSON_NAME}&apos;s {ageLabel}birthday — blow these candles out!
        </p>

        {/* Floating emoji decorations */}
        <div className="relative inline-block" style={{ minWidth: 320 }}>
          {[
            { e: '🎈', x: -50, y: 20, delay: '0s',   dur: '4s'  },
            { e: '🎉', x: 290, y: 10, delay: '0.8s',  dur: '3.5s'},
            { e: '⭐', x: -30, y: 90, delay: '1.2s',  dur: '5s'  },
            { e: '✨', x: 300, y: 80, delay: '0.4s',  dur: '4.5s'},
            { e: '🦁', x: 120, y: -30, delay: '1.6s', dur: '6s'  },
          ].map((d, i) => (
            <span key={i} style={{
              position: 'absolute', left: d.x, top: d.y, fontSize: 22,
              animation: `csDrift ${d.dur} ease-in-out ${d.delay} infinite`,
              pointerEvents: 'none',
            }}>{d.e}</span>
          ))}

          {/* Candles row */}
          <div className="flex gap-6 justify-center mb-2">
            <Candle isBlown={isBlown} delay={0} />
            <Candle isBlown={isBlown} delay={120} />
            <Candle isBlown={isBlown} delay={240} />
          </div>

          {/* Cake body — warm colors distinct from background */}
          <div style={{ position: 'relative' }}>

            {/* Top tier — frosting */}
            <div style={{
              width: 160, margin: '0 auto',
              height: 48, borderRadius: '12px 12px 0 0',
              background: 'linear-gradient(180deg, #9B7FCC 0%, #7B5FAC 100%)',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(155,127,204,0.4)',
            }}>
              {/* Frosting drips */}
              {[12, 32, 52, 72, 92, 112, 132].map(x => (
                <div key={x} style={{
                  position: 'absolute', top: 0, left: x,
                  width: 12, height: 14 + (x % 3) * 4,
                  background: '#C4B5F4',
                  borderRadius: '0 0 8px 8px',
                }} />
              ))}
              {/* Sprinkles */}
              {[20, 50, 80, 110, 35, 65, 95].map((x, i) => (
                <div key={x} style={{
                  position: 'absolute',
                  left: x, top: 18 + (i % 3) * 8,
                  width: 6, height: 3, borderRadius: 2,
                  background: i % 3 === 0 ? '#C9A84C' : i % 3 === 1 ? '#E8D5A3' : '#fff',
                  transform: `rotate(${i * 37}deg)`,
                }} />
              ))}
            </div>

            {/* Middle tier */}
            <div style={{
              width: 210, margin: '0 auto',
              height: 52,
              background: 'linear-gradient(180deg, #C9A84C 0%, #A07832 100%)',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(201,168,76,0.35)',
            }}>
              {/* Frosting top stripe */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#E8D5A3', opacity: 0.7 }} />
              {/* Sprinkles */}
              {[18, 42, 66, 90, 114, 138, 162, 186].map((x, i) => (
                <div key={x} style={{
                  position: 'absolute',
                  left: x, top: 14 + (i % 4) * 8,
                  width: i % 2 === 0 ? 8 : 6,
                  height: i % 2 === 0 ? 8 : 6,
                  borderRadius: '50%',
                  background: i % 3 === 0 ? '#9B7FCC' : i % 3 === 1 ? '#fff' : '#E8856A',
                }} />
              ))}
              {/* ♌ text on middle tier */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 20, opacity: 0.4, userSelect: 'none',
              }}>♌</div>
            </div>

            {/* Bottom tier */}
            <div style={{
              width: 260, margin: '0 auto',
              height: 60, borderRadius: '0 0 12px 12px',
              background: 'linear-gradient(180deg, #E8856A 0%, #C96050 100%)',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 8px 28px rgba(232,133,106,0.35)',
            }}>
              {/* Frosting top stripe */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: '#FFC7A8', opacity: 0.8 }} />
              {/* Sprinkles */}
              {[20, 45, 70, 95, 120, 145, 170, 195, 220].map((x, i) => (
                <div key={x} style={{
                  position: 'absolute',
                  left: x, top: 18 + (i % 3) * 10,
                  width: i % 2 === 0 ? 9 : 7,
                  height: i % 2 === 0 ? 9 : 7,
                  borderRadius: '50%',
                  background: i % 4 === 0 ? '#C9A84C' : i % 4 === 1 ? '#E8D5A3' : i % 4 === 2 ? '#9B7FCC' : '#fff',
                }} />
              ))}
            </div>

            {/* Plate / base */}
            <div style={{
              width: 280, height: 10, margin: '0 auto',
              background: 'linear-gradient(to right, rgba(201,168,76,0.3), rgba(232,213,163,0.5), rgba(201,168,76,0.3))',
              borderRadius: '0 0 40px 40px',
              boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
            }} />
          </div>
        </div>

        <style>{`
          @keyframes csDrift {
            0%, 100% { transform: translateY(0) rotate(-5deg); }
            50%       { transform: translateY(-14px) rotate(5deg); }
          }
        `}</style>

        {/* Controls / feedback */}
        <div className="mt-10 space-y-4 min-h-32">

          {/* IDLE — start button */}
          {stage === 'idle' && (
            <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <button onClick={startCountdown} style={{
                padding: '14px 40px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #C9A84C 0%, #E8D5A3 50%, #C9A84C 100%)',
                color: '#0d0820', fontWeight: 700, fontSize: 18, cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(201,168,76,0.3)',
              }}>
                Ready? Let&apos;s go →
              </button>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Close your eyes, make a wish, and get ready to blow!</p>
            </div>
          )}

          {stage === 'countdown' && (
            <div className="animate-fade-in-up">
              <p style={{ fontSize: 'clamp(40px,8vw,64px)', fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em' }}>
                {COUNTDOWN_STEPS[countdownIndex]}
              </p>
            </div>
          )}

          {stage === 'ready' && (
            <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {micActive ? (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 12,
                  padding: '14px 28px', borderRadius: 12,
                  background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)',
                  color: '#E8D5A3', fontWeight: 600, fontSize: 16,
                }}>
                  <span style={{ fontSize: 22, animation: 'pulse 1s ease-in-out infinite' }}>🎤</span>
                  Listening... blow NOW!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <button onClick={startMic} style={{
                    padding: '13px 32px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #C9A84C, #E8D5A3)',
                    color: '#0d0820', fontWeight: 700, fontSize: 16, cursor: 'pointer',
                  }}>Enable mic to blow 🎤</button>
                  {micError && <p style={{ color: '#E8856A', fontSize: 13 }}>{micError}</p>}
                </div>
              )}
              <button onClick={doBlowOut} style={{
                padding: '10px 24px', borderRadius: 10,
                border: '1px solid rgba(201,168,76,0.25)', background: 'transparent',
                color: 'rgba(201,168,76,0.7)', fontSize: 14, cursor: 'pointer',
              }}>
                Tap to blow instead 🕯️
              </button>
            </div>
          )}

          {stage === 'blown' && (
            <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <p style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em' }}>
                Happy {ageLabel}Birthday {PERSON_NAME}! 🎉
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>
                Your wish is flying up to the universe right now ✨
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
