'use client'

import { useEffect, useRef, useState } from 'react'

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'

async function launchFireworks() {
  const confetti = (await import('canvas-confetti')).default
  const duration = 5000
  const end = Date.now() + duration

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#F4A93C', '#F0654E', '#FFE9A8', '#FFC7A8', '#9B7FCC'],
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#F4A93C', '#F0654E', '#FFE9A8', '#FFC7A8', '#9B7FCC'],
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

export default function FireworksFinale() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [triggered, setTriggered] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const currentSection = sectionRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !triggered) {
          setTriggered(true)
          launchFireworks()
          setTimeout(() => setShowMessage(true), 1500)
          if (audioRef.current) {
            audioRef.current.volume = 0.6
            audioRef.current.play().catch(() => {})
          }
        }
      },
      { threshold: 0.3 }
    )
    if (currentSection) observer.observe(currentSection)
    return () => observer.disconnect()
  }, [triggered])

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted
      setMuted(!muted)
    }
  }

  const replay = () => {
    setShowMessage(false)
    launchFireworks()
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
    setTimeout(() => setShowMessage(true), 1500)
  }

  const stars = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: `${(i * 127 + 31) % 100}%`,
    top: `${(i * 79 + 17) % 100}%`,
    size: (i % 3) + 1,
    opacity: 0.3 + (i % 5) * 0.12,
    delay: `${(i % 7) * 0.5}s`,
  }))

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #4B3B6B 0%, #241E3D 100%)' }}>

      <audio ref={audioRef} src="/finale-song.mp3" preload="none" />

      {stars.map(star => (
        <div key={star.id} className="absolute rounded-full animate-pulse"
          style={{
            left: star.left, top: star.top,
            width: `${star.size}px`, height: `${star.size}px`,
            background: 'white', opacity: star.opacity, animationDelay: star.delay,
          }} />
      ))}

      <div className={`absolute inset-0 bg-black/20 transition-opacity duration-1000 ${triggered ? 'opacity-100' : 'opacity-0'}`} />

      <div className={`relative z-10 text-center px-4 transition-all duration-1000 ${showMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-6xl mb-6">🦁</div>
        <p className="font-display text-3xl md:text-5xl lg:text-6xl text-day-yellow leading-tight max-w-3xl mx-auto"
          style={{ textShadow: '0 0 30px rgba(244, 169, 60, 0.5)' }}>
          Thank you for being part of my life 🦁💛
        </p>
        <p className="mt-6 text-day-peach/80 text-lg">— with love, {PERSON_NAME} ♌</p>
      </div>

      <div className="absolute bottom-8 right-8 flex gap-3">
        <button onClick={replay}
          className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors border border-white/20">
          🔁 Replay
        </button>
        <button onClick={toggleMute}
          className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors border border-white/20">
          {muted ? '🔇 Unmute' : '🔊 Mute'}
        </button>
      </div>
    </section>
  )
}
