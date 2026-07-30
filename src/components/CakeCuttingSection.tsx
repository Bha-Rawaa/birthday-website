'use client'

import { useEffect, useState } from 'react'

async function fireSliceConfetti() {
  const confetti = (await import('canvas-confetti')).default
  confetti({
    particleCount: 180,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#F4A93C', '#F0654E', '#FFE9A8', '#FFC7A8', '#F6D486'],
  })
}

type Phase = 'intro' | 'cutting' | 'split' | 'served'

export default function CakeCuttingSection() {
  const [phase, setPhase] = useState<Phase>('intro')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('cutting'), 400)
    const t2 = setTimeout(() => setPhase('split'), 400 + 1500)
    const t3 = setTimeout(() => {
      setPhase('served')
      fireSliceConfetti()
    }, 400 + 1500 + 900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  const knifeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-40px',
    left: 0,
    fontSize: '48px',
    transform:
      phase === 'intro'
        ? 'translateX(-60px) rotate(-15deg)'
        : phase === 'cutting'
          ? 'translateX(340px) rotate(-15deg)'
          : 'translateX(400px) rotate(-15deg)',
    transition: 'transform 1.5s ease-in-out',
    zIndex: 20,
  }

  const sliceBase: React.CSSProperties = {
    display: 'inline-block',
    transition: 'transform 0.9s cubic-bezier(.34,1.56,.64,1)',
  }

  return (
    <section
      className="relative py-20 px-4 overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #FFF9EF 0%, #FFE9A8 60%, #FFC7A8 100%)',
      }}
    >
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-5xl text-accent-marigold mb-3">
          🎂 Now let&apos;s cut the cake!
        </h2>
        <p className="text-gray-600 mb-10 text-lg">
          Everyone gather &apos;round — the slicing ceremony is about to begin! ✨
        </p>

        {/* Cake stage */}
        <div className="relative inline-block mx-auto" style={{ width: 320, height: 160 }}>
          {/* Knife */}
          <span style={knifeStyle} aria-hidden>🔪</span>

          {/* Three slices */}
          <div className="absolute inset-0 flex items-end justify-center">
            {[0, 1, 2].map(i => {
              const dx = phase === 'split' || phase === 'served' ? (i - 1) * 22 : 0
              const isMiddle = i === 1
              const middleFly =
                isMiddle && phase === 'served'
                  ? 'translate(0, 30px) scale(1.35)'
                  : ''
              const transform = middleFly || `translateX(${dx}px)`
              return (
                <div key={i} style={{ ...sliceBase, transform }} className="mx-[1px]">
                  <CakeSlice highlight={isMiddle && phase === 'served'} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Served card */}
        {phase === 'served' && (
          <div className="mt-10 animate-fade-in-up">
            <div className="inline-block bg-white/80 backdrop-blur-sm rounded-3xl px-8 py-6 shadow-xl border-2 border-accent-marigold/30">
              <div className="text-5xl mb-2">🍽️🍰</div>
              <p className="font-display text-2xl md:text-3xl text-accent-marigold">
                🍰 Here&apos;s your slice! It&apos;s virtually delicious 😋
              </p>
              <p className="text-gray-600 mt-2 text-sm">
                (Zero calories — that&apos;s the beauty of a virtual party 💫)
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function CakeSlice({ highlight }: { highlight: boolean }) {
  return (
    <div
      className="relative"
      style={{
        width: 90,
        height: 120,
        filter: highlight ? 'drop-shadow(0 8px 12px rgba(240,101,78,0.4))' : 'none',
      }}
    >
      {/* Top frosting */}
      <div
        className="absolute left-0 right-0 rounded-t-md shadow"
        style={{ top: 0, height: 24, background: 'linear-gradient(to bottom, #FFC7A8, #FFB08A)' }}
      >
        <div className="absolute inset-x-0 top-1 h-1 bg-white/60" />
      </div>
      {/* Middle layer */}
      <div
        className="absolute left-0 right-0"
        style={{ top: 24, height: 46, background: 'linear-gradient(to bottom, #F6D486, #FFE9A8)' }}
      >
        <div className="absolute inset-x-0 top-1 h-1 bg-white/50" />
      </div>
      {/* Bottom layer */}
      <div
        className="absolute left-0 right-0 rounded-b-md"
        style={{ top: 70, height: 46, background: 'linear-gradient(to bottom, #FFE9A8, #F6D486)' }}
      >
        <div className="absolute inset-x-0 top-1 h-1 bg-white/50" />
      </div>
      {/* Sprinkles */}
      <div
        className="absolute rounded-full"
        style={{ top: 6, left: 20, width: 6, height: 6, background: '#F0654E' }}
      />
      <div
        className="absolute rounded-full"
        style={{ top: 10, left: 55, width: 5, height: 5, background: '#F4A93C' }}
      />
      <div
        className="absolute rounded-full"
        style={{ top: 40, left: 30, width: 4, height: 4, background: '#F0654E' }}
      />
      <div
        className="absolute rounded-full"
        style={{ top: 85, left: 60, width: 5, height: 5, background: '#F4A93C' }}
      />
    </div>
  )
}
