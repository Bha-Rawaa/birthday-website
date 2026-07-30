const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'
const PERSON_AGE = process.env.NEXT_PUBLIC_PERSON_AGE ?? ''

export default function AboutSection() {
  const ageLabel = PERSON_AGE ? `${PERSON_AGE}th ` : ''

  return (
    <section className="relative py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-xl border-2 border-day-peach/40 text-center">
          <div className="text-8xl mb-6">♌</div>

          <h2 className="font-display text-3xl md:text-4xl text-accent-marigold mb-6">
            Leo Season Vibes 🌟
          </h2>

          <div className="space-y-4 text-gray-700 text-lg leading-relaxed">
            <p>
              Leo season (July 23 – August 22) is when the sun shines its absolute brightest — bold, warm, and full of life.
              It&apos;s the time of year when joy feels louder, laughter feels bigger, and every moment deserves to be celebrated! 🦁
            </p>
            <p>
              Leos are the royalty of the zodiac — generous hearts wrapped in golden confidence, with enough warmth to light up every room they walk into.
              If you&apos;ve been graced by a Leo in your life, you already know: they don&apos;t just celebrate birthdays. They throw <em>events</em>. ✨
            </p>
            <p>
              So here we are — gathered together, near and far, to honor {PERSON_NAME} on their {ageLabel}birthday and all the sunshine they bring into our world.
              Let&apos;s make this one legendary! 🎉🌞
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            {['Loyal 💛', 'Bold 🦁', 'Generous 🌟', 'Radiant ☀️', 'Joyful 🎉', 'Magnetic ✨'].map(trait => (
              <span key={trait} className="px-4 py-2 rounded-full bg-gradient-to-r from-day-gold to-day-peach text-accent-coral font-semibold text-sm shadow-md">
                {trait}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
