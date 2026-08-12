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
      className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-white/85 backdrop-blur-sm shadow-lg border border-accent-marigold/30 flex items-center justify-center hover:scale-110 transition-transform duration-200"
    >
      {muted ? (
        /* Muted — music note with a line through */
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9B7FCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5l-5 1v5" />
          <path d="M9 17H5a2 2 0 0 1 0-4h4" />
        </svg>
      ) : (
        /* Playing — musical note */
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F4A93C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      )}
    </button>
  )
}
