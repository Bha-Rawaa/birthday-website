'use client'

import { useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import NameGateModal from '@/components/NameGateModal'
import ThankYouSection from '@/components/ThankYouSection'
import MemoryForm from '@/components/MemoryForm'
import CandleSection from '@/components/CandleSection'
import CakeCuttingSection from '@/components/CakeCuttingSection'
import DanceSection from '@/components/DanceSection'
import ScatteredGifs from '@/components/ScatteredGifs'
import MemoryWall from '@/components/MemoryWall'
import WordCloud from '@/components/WordCloud'
import FireworksFinale from '@/components/FireworksFinale'
import ClosingGifs from '@/components/ClosingGifs'
import MusicControl from '@/components/MusicControl'
import CursorSparkle from '@/components/CursorSparkle'

const ParticlesBackground = dynamic(() => import('@/components/ParticlesBackground'), { ssr: false })

export default function Home() {
  const [visitorName, setVisitorName] = useState('')
  const [showModal, setShowModal] = useState(true)
  const [memoryRefreshTrigger, setMemoryRefreshTrigger] = useState(0)
  const [candlesBlown, setCandlesBlown] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const startMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.35
      audioRef.current.loop = true
      audioRef.current.play().catch(() => {})
    }
  }, [])

  const handleModalSubmit = (name: string) => {
    setVisitorName(name)
    setShowModal(false)
    startMusic()
  }

  return (
    <main className="min-h-screen relative" style={{ background: 'linear-gradient(180deg, #0d0820 0%, #1a1040 50%, #0d0820 100%)' }}>
      <ParticlesBackground />
      <CursorSparkle />

      <audio ref={audioRef} src="/background-music.mp3" preload="none" />
      <MusicControl audioRef={audioRef} />

      {showModal && <NameGateModal onSubmit={handleModalSubmit} />}

      {!showModal && (
        <>
          <ThankYouSection visitorName={visitorName} />
          <ScatteredGifs slot={1} />
          <MemoryForm
            visitorName={visitorName}
            onMemorySubmitted={() => setMemoryRefreshTrigger(prev => prev + 1)}
          />
          <ScatteredGifs slot={2} />
          <CandleSection onBlown={() => setCandlesBlown(true)} />
          {/* CakeCuttingSection temporarily commented out */}
          {/* {candlesBlown && <CakeCuttingSection />} */}
          <DanceSection visitorName={visitorName} />
          <ScatteredGifs slot={3} />
          <MemoryWall refreshTrigger={memoryRefreshTrigger} />
          <WordCloud />
          <FireworksFinale />
          {/* <ClosingGifs /> */}
        </>
      )}
    </main>
  )
}
