'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import NameGateModal from '@/components/NameGateModal'
import HeroSection from '@/components/HeroSection'
import WordCloud from '@/components/WordCloud'
import AboutSection from '@/components/AboutSection'
import CandleSection from '@/components/CandleSection'
import MemoryForm from '@/components/MemoryForm'
import MemoryWall from '@/components/MemoryWall'
import FireworksFinale from '@/components/FireworksFinale'
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

      const dayColors = ['#FFF9EF', '#FFE9A8', '#FFC7A8']
      const nightColors = ['#241E3D', '#241E3D', '#4B3B6B']

      const c1 = interpolateColor(dayColors[0], nightColors[0], t)
      const c2 = interpolateColor(dayColors[1], nightColors[1], t)
      const c3 = interpolateColor(dayColors[2], nightColors[2], t)

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
          <HeroSection visitorName={visitorName} />
          <WordCloud />
          <AboutSection />
          <CandleSection />
          <MemoryForm
            visitorName={visitorName}
            onMemorySubmitted={() => setMemoryRefreshTrigger(prev => prev + 1)}
          />
          <MemoryWall refreshTrigger={memoryRefreshTrigger} />
          <FireworksFinale />
        </>
      )}
    </main>
  )
}
