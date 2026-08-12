'use client'

import { useState } from 'react'

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'

const GIFS = [
  { src: '/birthday-gif-1.gif',                                                                    emoji: '🎂', color: '#C9A84C', local: true  },
  { src: '/birthday-gif-2.gif',                                                                    emoji: '🥳', color: '#E8856A', local: true  },
  { src: 'https://media.giphy.com/media/3oz8xIsloV7zOmt81G/giphy.gif',                            emoji: '🎊', color: '#C9A84C', local: false },
  { src: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',                             emoji: '🎂', color: '#9B7FCC', local: false },
  { src: 'https://media.giphy.com/media/yoJC2GnSClbPOkV0eA/giphy.gif',                            emoji: '🥳', color: '#9B7FCC', local: false },
  { src: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',                                 emoji: '💃', color: '#E8856A', local: false },
  { src: 'https://media.giphy.com/media/26gs9kSsti3AL59tm/giphy.gif',                             emoji: '✨', color: '#C9A84C', local: false },
  { src: 'https://media.giphy.com/media/g5R9dok94mrIvplmZd/giphy.gif',                            emoji: '🎉', color: '#C9A84C', local: false },
  { src: 'https://media.giphy.com/media/xUA7aTG7L1iGWZCBr2/giphy.gif',                            emoji: '🎉', color: '#9B7FCC', local: false },
  // Birthday / celebration memes
  { src: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',                            emoji: '🦁', color: '#C9A84C', local: false },
  { src: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif',                             emoji: '👑', color: '#C9A84C', local: false },
  { src: 'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif',                             emoji: '🎈', color: '#9B7FCC', local: false },
  { src: 'https://media.giphy.com/media/S3Ot3hZ5bcy8o/giphy.gif',                                 emoji: '🥂', color: '#C9A84C', local: false },
  { src: 'https://media.giphy.com/media/26BRzozg4TCBXv6QU/giphy.gif',                             emoji: '🎆', color: '#E8856A', local: false },
  { src: 'https://media.giphy.com/media/ely3apij36BJhoZ234/giphy.gif',                            emoji: '🌟', color: '#9B7FCC', local: false },
]

const CAPTIONS = [
  `${PERSON_NAME} walking into her own party 💅`,
  'POV: waiting for the cake 🎂',
  'The vibes tonight 🔥',
  'Us right now 🥳',
  'No one can stop us 🌟',
  'Main character energy 👑',
  `${PERSON_NAME} when someone sings happy birthday 🫣`,
  'When the dance floor opens 💃',
  'Leo season in full effect ♌',
  `${PERSON_NAME} accepting compliments like 🦁`,
  'The group chat right now 📱',
  'Zero calories, maximum joy 🍰',
  'Sending love across the internet 💌',
  'We showed up and we showed OUT ✨',
  `Cheers to ${PERSON_NAME} 🥂`,
]

interface CardConfig {
  gifIdx: number
  captionIdx: number
  rotate: number
  scale: number
}

const SLOTS: Record<number, CardConfig[]> = {
  1: [
    { gifIdx: 2,  captionIdx: 0,  rotate: -7,  scale: 1.0  },
    { gifIdx: 9,  captionIdx: 6,  rotate:  4,  scale: 1.1  },
    { gifIdx: 4,  captionIdx: 8,  rotate: -3,  scale: 0.95 },
    { gifIdx: 10, captionIdx: 5,  rotate:  8,  scale: 1.0  },
  ],
  2: [
    { gifIdx: 0,  captionIdx: 3,  rotate:  6,  scale: 1.05 },
    { gifIdx: 12, captionIdx: 14, rotate: -5,  scale: 1.0  },
    { gifIdx: 11, captionIdx: 7,  rotate:  3,  scale: 1.05 },
  ],
  3: [
    { gifIdx: 1,  captionIdx: 9,  rotate: -8,  scale: 1.0  },
    { gifIdx: 13, captionIdx: 13, rotate:  5,  scale: 1.1  },
    { gifIdx: 14, captionIdx: 11, rotate: -2,  scale: 0.95 },
    { gifIdx: 6,  captionIdx: 12, rotate:  7,  scale: 1.0  },
  ],
}

function PolaroidCard({ cfg }: { cfg: CardConfig }) {
  const [failed, setFailed] = useState(false)
  const gif = GIFS[cfg.gifIdx]
  const caption = CAPTIONS[cfg.captionIdx]

  return (
    <div
      className="transition-all duration-300 hover:scale-110 hover:z-10 relative"
      style={{
        transform: `rotate(${cfg.rotate}deg) scale(${cfg.scale})`,
        padding: '10px 10px 40px 10px',
        borderRadius: 4,
        width: 200,
        background: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Photo area */}
      <div className="w-full overflow-hidden" style={{ height: 155, background: gif.color + '22' }}>
        {failed ? (
          <div className="w-full h-full flex items-center justify-center text-6xl"
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

      {/* Corner sticker */}
      <span className="absolute -top-4 -right-3 text-2xl drop-shadow">{gif.emoji}</span>
    </div>
  )
}

interface Props { slot: 1 | 2 | 3 }

export default function ScatteredGifs({ slot }: Props) {
  const cards = SLOTS[slot] ?? SLOTS[1]

  return (
    <div className="py-12 px-4 overflow-visible">
      <div className="max-w-4xl mx-auto flex flex-wrap justify-center items-end gap-8 py-4">
        {cards.map((cfg, i) => (
          <PolaroidCard key={i} cfg={cfg} />
        ))}
      </div>
    </div>
  )
}
