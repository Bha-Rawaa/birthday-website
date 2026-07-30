'use client'

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'
const PERSON_AGE = process.env.NEXT_PUBLIC_PERSON_AGE ?? ''

interface Props {
  visitorName: string
}

export default function ThankYouSection({ visitorName }: Props) {
  const ageLabel = PERSON_AGE ? `${PERSON_AGE}th ` : ''

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 py-20 overflow-hidden">
      {/* Sunburst background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width="900" height="900" className="animate-sunburst opacity-10" viewBox="0 0 400 400">
          {Array.from({ length: 36 }, (_, i) => (
            <line key={i} x1="200" y1="10" x2="200" y2="0"
              transform={`rotate(${i * 10}, 200, 200)`}
              stroke="#F4A93C" strokeWidth="3" strokeLinecap="round" />
          ))}
        </svg>
      </div>

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #FFE9A8 0%, transparent 70%)' }} />

      <div className="relative z-10 animate-fade-in-up max-w-3xl mx-auto">
        {/* Leo glyph */}
        <div className="text-8xl mb-6 drop-shadow-lg">♌</div>

        {/* Main heading */}
        <h1 className="font-display text-4xl md:text-6xl text-accent-marigold mb-4 leading-tight drop-shadow-md">
          🎉 Welcome to {PERSON_NAME}&apos;s Virtual Birthday Party!
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-2xl text-gray-700 font-display mb-6">
          You&apos;re officially on the guest list — grab a virtual drink and let&apos;s get this party started! 🥂
        </p>

        {/* Party badge */}
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-accent-marigold to-accent-coral text-white px-6 py-3 rounded-full shadow-xl mb-8 font-display text-lg md:text-xl">
          🦁 Leo Season Party • August 18th
        </div>

        {/* Host note card */}
        <div className="bg-white/75 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-2xl border-2 border-accent-marigold/20 text-left space-y-5">
          <p className="text-2xl md:text-3xl font-display text-accent-marigold text-center mb-2">
            A little note from me 💛
          </p>

          <p className="text-gray-700 text-lg leading-relaxed">
            HEYYY {visitorName}!! 👋✨ Omg you made it — welcome to the party! Coats go over there, snacks are that way, and yes, the DJ (me) takes requests. 🎧
          </p>

          <p className="text-gray-700 text-lg leading-relaxed">
            I&apos;m {PERSON_NAME}, your host for the evening — proud Leo ♌, professional candle-blower, and firm believer that birthdays are basically a personality trait. This is my {ageLabel}trip around the sun and I&apos;m SO happy you&apos;re here to celebrate. 🦁✨
          </p>

          <p className="text-gray-700 text-lg leading-relaxed">
            Consider this your official invitation to stay a while: leave a memory on the wall, blow the candles with me, cut a slice of cake, and hit the dance floor. No dress code, no bedtime, no rules — just vibes. 🎉
          </p>

          <p className="text-right font-display text-xl text-accent-coral mt-4">
            — your host, {PERSON_NAME} 🌞
          </p>
        </div>

        {/* Leo season blurb */}
        <div className="mt-8 bg-gradient-to-r from-accent-marigold/10 to-accent-coral/10 rounded-2xl px-6 py-4 border border-accent-marigold/20">
          <p className="text-gray-600 text-base">
            ☀️ <strong>Leo Season</strong> (July 23 – Aug 22) — when the boldest, warmest, most ridiculously lovable people on earth throw the best parties. No notes.
          </p>
        </div>

        {/* Scroll hint */}
        <div className="mt-12 animate-bounce text-accent-marigold text-3xl">↓</div>
      </div>
    </section>
  )
}
