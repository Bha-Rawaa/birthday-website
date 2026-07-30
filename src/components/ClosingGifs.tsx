'use client'

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'

export default function ClosingGifs() {
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${(i * 131 + 17) % 100}%`,
    top: `${(i * 73 + 11) % 100}%`,
    size: (i % 2) + 1,
    opacity: 0.2 + (i % 4) * 0.1,
    delay: `${(i % 5) * 0.4}s`,
  }))

  return (
    <section
      className="relative py-20 px-4 flex flex-col items-center gap-8 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #241E3D 0%, #1a1530 100%)' }}
    >
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute rounded-full animate-pulse pointer-events-none"
          style={{
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: 'white',
            opacity: s.opacity,
            animationDelay: s.delay,
          }}
        />
      ))}

      <div className="text-8xl md:text-9xl relative z-10 drop-shadow-2xl">
        🦁💛
      </div>

      <p className="font-display text-2xl md:text-4xl text-day-yellow text-center relative z-10 px-4">
        Thank you for partying with us! 🎉
      </p>

      <p className="font-display text-xl text-day-peach/70 text-center relative z-10">
        Happy Birthday {PERSON_NAME} 🎂✨
      </p>
    </section>
  )
}
