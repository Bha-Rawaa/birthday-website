'use client'

import { useState, useRef, useCallback } from 'react'

async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  confetti({
    particleCount: 200,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#F4A93C', '#F0654E', '#FFE9A8', '#FFC7A8', '#F6D486'],
  })
}

interface CandleProps {
  isBlown: boolean
  delay: number
}

function Candle({ isBlown, delay }: CandleProps) {
  return (
    <div className="flex flex-col items-center" style={{ animationDelay: `${delay}ms` }}>
      <div className={`relative transition-all duration-500 ${isBlown ? 'opacity-0 scale-0' : 'opacity-100'}`} style={{ height: '40px', width: '20px' }}>
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
            <div className="w-3 h-3 bg-gray-400/40 rounded-full" />
          </div>
        )}
      </div>
      <div className="w-6 h-20 rounded-t-sm relative overflow-hidden shadow-md"
        style={{ background: 'linear-gradient(to right, #FFE9A8, #F6D486, #FFC7A8)' }}>
        <div className="absolute top-2 left-1 w-1 h-3 bg-white/50 rounded-full" />
        <div className="absolute top-4 right-1 w-1 h-2 bg-white/40 rounded-full" />
      </div>
      <div className="w-0.5 h-3 bg-gray-700 -mt-1" />
    </div>
  )
}

export default function CandleSection() {
  const [blown, setBlown] = useState(false)
  const [micActive, setMicActive] = useState(false)
  const [micError, setMicError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)

  const blowOut = useCallback(async () => {
    if (blown) return
    setBlown(true)
    setShowSuccess(true)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    cancelAnimationFrame(rafRef.current)
    setMicActive(false)

    await fireConfetti()
  }, [blown])

  const startMic = async () => {
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
      analyserRef.current = analyser
      setMicActive(true)

      const data = new Uint8Array(analyser.frequencyBinCount)
      const checkVolume = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        if (avg > 30) {
          blowOut()
        } else {
          rafRef.current = requestAnimationFrame(checkVolume)
        }
      }
      rafRef.current = requestAnimationFrame(checkVolume)
    } catch {
      setMicError('Microphone access denied. Use the tap button below! 🎤')
    }
  }

  return (
    <section className="relative py-20 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-5xl text-accent-marigold mb-4">
          Make a Wish! 🎂
        </h2>
        <p className="text-gray-600 mb-12">Blow out the candles to make your wish come true ✨</p>

        <div className="inline-block relative">
          <div className="flex gap-6 justify-center mb-2">
            <Candle isBlown={blown} delay={0} />
            <Candle isBlown={blown} delay={100} />
            <Candle isBlown={blown} delay={200} />
          </div>

          <div className="relative">
            <div className="w-40 h-14 mx-auto rounded-t-2xl relative overflow-hidden shadow-lg"
              style={{ background: 'linear-gradient(to bottom, #FFC7A8, #FFB08A)' }}>
              <div className="absolute inset-x-0 top-0 h-4 rounded-t-2xl"
                style={{ background: '#F6D486' }} />
              <div className="absolute inset-x-0 top-4 h-1 bg-white/60" />
              {[20, 40, 60, 80, 100, 120].map(x => (
                <div key={x} className="absolute bottom-3 w-2 h-2 rounded-full bg-accent-marigold/80"
                  style={{ left: x }} />
              ))}
            </div>

            <div className="w-56 h-16 mx-auto rounded-b-2xl relative overflow-hidden shadow-xl"
              style={{ background: 'linear-gradient(to bottom, #F6D486, #FFE9A8)' }}>
              <div className="absolute inset-x-0 top-0 h-5"
                style={{ background: '#FFC7A8' }} />
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

        <div className="mt-10 space-y-4">
          {!blown && (
            <>
              {!micActive ? (
                <button
                  onClick={startMic}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-accent-marigold to-accent-coral text-white font-display text-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  🎤 Blow to extinguish!
                </button>
              ) : (
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-green-100 border-2 border-green-400 text-green-700 font-semibold">
                  <span className="animate-pulse">🎤</span> Listening... blow now!
                </div>
              )}

              <div>
                <button
                  onClick={blowOut}
                  className="px-6 py-3 rounded-2xl border-2 border-accent-marigold/50 text-accent-marigold font-semibold hover:bg-accent-marigold/10 transition-all duration-200"
                >
                  🕯️ Tap to blow instead
                </button>
              </div>

              {micError && (
                <p className="text-accent-coral text-sm">{micError}</p>
              )}
            </>
          )}

          {showSuccess && (
            <div className="animate-fade-in-up">
              <p className="font-display text-3xl md:text-4xl text-accent-marigold">
                🎉 Happy Birthday Rawaa! 🎉
              </p>
              <p className="text-gray-600 mt-2">Your wish is on its way ✨🦁</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
