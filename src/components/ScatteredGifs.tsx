'use client'

import { useState } from 'react'

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'

// Stable Giphy CDN media URLs — direct access, no API key needed.
// Shows animated emoji fallback automatically if a URL fails to load.
const GIFS = [
  { src: '/birthday-gif-1.gif', emoji: '🎂', color: '#F4A93C', local: true },
  { src: '/birthday-gif-2.gif', emoji: '🥳', color: '#F0654E', local: true },
  { src: 'https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif', emoji: '🎊', color: '#F4A93C', local: false },
  { src: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',   emoji: '🎂', color: '#F0654E', local: false },
  { src: 'https://media.giphy.com/media/yoJC2GnSClbPOkV0eA/giphy.gif', emoji: '🥳', color: '#9B7FCC', local: false },
  { src: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',       emoji: '💃', color: '#FFB08A', local: false },
  { src: 'https://media.giphy.com/media/26gs9kSsti3AL59tm/giphy.gif',   emoji: '✨', color: '#F6D486', local: false },
  { src: 'https://media.giphy.com/media/g5R9dok94mrIvplmZd/giphy.gif', emoji: '🎉', color: '#FFC7A8', local: false },
]

const CAPTIONS = [
  `${PERSON_NAME} showing up to her own party 💅`,
  'POV: me waiting for cake 🎂',
  'The vibes tonight 🔥',
  'Us right now 🥳',
  'No one can stop us 🌟',
  'Main character energy 👑',
]

interface CardConfig {
  gifIdx: number
  captionIdx: number
  rotate: number
  scale: number
}

const SLOTS: Record<number, CardConfig[]> = {
  1: [
    { gifIdx: 2, captionIdx: 0, rotate: -7,  scale: 1.0  },
    { gifIdx: 3, captionIdx: 1, rotate:  4,  scale: 1.1  },
    { gifIdx: 4, captionIdx: 2, rotate: -3,  scale: 0.95 },
  ],
  2: [
    { gifIdx: 0, captionIdx: 3, rotate:  6,  scale: 1.05 },
    { gifIdx: 5, captionIdx: 4, rotate: -5,  scale: 1.0  },
  ],
  3: [
    { gifIdx: 1, captionIdx: 5, rotate: -8,  scale: 1.0  },
    { gifIdx: 6, captionIdx: 0, rotate:  5,  scale: 1.1  },
    { gifIdx: 7, captionIdx: 2, rotate: -2,  scale: 0.95 },
  ],
}

function PolaroidCard({ cfg }: { cfg: CardConfig }) {
  const [failed, setFailed] = useState(false)
  const gif = GIFS[cfg.gifIdx]
  const caption = CAPTIONS[cfg.captionIdx]

  return (
    <div
      className="bg-white shadow-2xl transition-all duration-300 hover:scale-110 hover:z-10 relative"
      style={{
        transform: `rotate(${cfg.rotate}deg) scale(${cfg.scale})`,
        padding: '10px 10px 40px 10px',
        borderRadius: '4px',
        width: 200,
      }}
    >
      {/* Photo area */}
      <div className="w-full overflow-hidden" style={{ height: 155, background: gif.color + '22' }}>
        {failed ? (
          <div className="w-full h-full flex items-center justify-center text-6xl animate-bounce"
            style={{ background: gif.color + '33' }}>
            {gif.emoji}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gif.src}
            alt={caption}
            className="w-full h-full object-cover"
            {...(gif.local ? {} : { referrerPolicy: 'no-referrer' as const })}
            onError={() => setFailed(true)}
            loading="lazy"
          />
        )}
      </div>

      {/* Caption strip */}
      <p className="mt-3 text-center font-display text-xs text-gray-700 leading-tight px-1">
        {caption}
      </p>

      {/* Sticker */}
      <span className="absolute -top-4 -right-3 text-2xl drop-shadow">{gif.emoji}</span>
    </div>
  )
}

interface Props { slot: 1 | 2 | 3 }

export default function ScatteredGifs({ slot }: Props) {
  const cards = SLOTS[slot] ?? SLOTS[1]

  return (
    <div className="py-12 px-4 overflow-visible">
      <div className="max-w-3xl mx-auto flex flex-wrap justify-center items-end gap-8 py-4">
        {cards.map((cfg, i) => (
          <PolaroidCard key={i} cfg={cfg} />
        ))}
      </div>
    </div>
  )
}
