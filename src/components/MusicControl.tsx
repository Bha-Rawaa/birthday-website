'use client'

import { RefObject, useState } from 'react'

interface Props {
  audioRef: RefObject<HTMLAudioElement | null>
}

export default function MusicControl({ audioRef }: Props) {
  const [muted, setMuted] = useState(false)

  const toggle = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted
      setMuted(!muted)
    }
  }

  return (
    <button
      onClick={toggle}
      title={muted ? 'Unmute music' : 'Mute music'}
      className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-lg border-2 border-accent-marigold/30 flex items-center justify-center text-xl hover:scale-110 transition-transform duration-200"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
