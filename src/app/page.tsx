'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import NameGateModal from '@/components/NameGateModal'
import ThankYouSection from '@/components/ThankYouSection'
import HeroSection from '@/components/HeroSection'
import MemoryForm from '@/components/MemoryForm'
import CandleSection from '@/components/CandleSection'
import CakeCuttingSection from '@/components/CakeCuttingSection'
import DanceSection from '@/components/DanceSection'
import ScatteredGifs from '@/components/ScatteredGifs'
import MemoryWall from '@/components/MemoryWall'
import WordCloud from '@/components/WordCloud'
import AboutSection from '@/components/AboutSection'
import FireworksFinale from '@/components/FireworksFinale'
import ClosingGifs from '@/components/ClosingGifs'
import MusicControl from '@/components/MusicControl'
import CursorSparkle from '@/components/CursorSparkle'

const ParticlesBackground = dynamic(() => import('@/components/ParticlesBackground'), { ssr: false })

function interpolateColor(hex1: string, hex2: string, t: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16)
  const g1 = parseInt(hex1.slice(3, 5), 16)
  const b1 = parseInt(hex1.slice(5, 7), 16)
  const r2 = parseInt(hex2.slice(1, 3), 16)
  const g2 = parseInt(hex2.slice(3, 5), 16)
  const b2 = parseInt(hex2.slice(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r}, ${g}, ${b})`
}

export default function Home() {
  const [visitorName, setVisitorName] = useState('')
  const [showModal, setShowModal] = useState(true)
  const [bgStyle, setBgStyle] = useState<React.CSSProperties>({})
  const [memoryRefreshTrigger, setMemoryRefreshTrigger] = useState(0)
  const [candlesBlown, setCandlesBlown] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const startMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.4
      audioRef.current.loop = true
      audioRef.current.play().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const maxScroll = document.body.scrollHeight - window.innerHeight
      const t = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0

      const c1 = interpolateColor('#FFF9EF', '#241E3D', t)
      const c2 = interpolateColor('#FFE9A8', '#241E3D', t)
      const c3 = interpolateColor('#FFC7A8', '#4B3B6B', t)

      setBgStyle({
        background: `linear-gradient(180deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`,
        transition: 'background 0.1s ease-out',
      })
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleModalSubmit = (name: string) => {
    setVisitorName(name)
    setShowModal(false)
    startMusic()
  }

  return (
    <main className="min-h-screen relative" style={bgStyle}>
      <ParticlesBackground />
      <CursorSparkle />

      <audio ref={audioRef} src="/background-music.mp3" preload="none" />
      <MusicControl audioRef={audioRef} />

      {showModal && <NameGateModal onSubmit={handleModalSubmit} />}

      {!showModal && (
        <>
          {/* 1. Welcome / Thank You */}
          <ThankYouSection visitorName={visitorName} />

          <ScatteredGifs slot={1} />

          {/* 2. Leave a Memory form */}
          <MemoryForm
            visitorName={visitorName}
            onMemorySubmitted={() => setMemoryRefreshTrigger(prev => prev + 1)}
          />

          <ScatteredGifs slot={2} />

          {/* 3. Blow the candles */}
          <CandleSection onBlown={() => setCandlesBlown(true)} />

          {/* 4. Cake cutting (after candles blown) */}
          {candlesBlown && <CakeCuttingSection />}

          {/* 5. Dance floor */}
          <DanceSection visitorName={visitorName} />

          <ScatteredGifs slot={3} />

          {/* 6. Memory Wall */}
          <MemoryWall refreshTrigger={memoryRefreshTrigger} />

          {/* Compact countdown transition */}
          <HeroSection visitorName={visitorName} />

          {/* 7. Remaining sections */}
          <WordCloud />
          <AboutSection />
          <FireworksFinale />
          <ClosingGifs />
        </>
      )}
    </main>
  )
}
