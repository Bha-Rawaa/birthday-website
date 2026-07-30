'use client'

import { useState, useRef, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  visitorName: string
  onMemorySubmitted: () => void
}

async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#F4A93C', '#F0654E', '#FFE9A8', '#FFC7A8'] })
}

export default function MemoryForm({ visitorName, onMemorySubmitted }: Props) {
  const [name, setName] = useState(visitorName)
  const [message, setMessage] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [friendCount, setFriendCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }
    setError('')
    setPhotoFile(file)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!message.trim()) { setError('Please write a message'); return }
    if (message.length > 300) { setError('Message must be under 300 characters'); return }

    setLoading(true)
    setError('')

    try {
      let photo_path: string | null = null

      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(path, photoFile, { upsert: false })
        if (uploadError) throw uploadError
        photo_path = path
      }

      const { error: insertError } = await supabase.from('memories').insert({
        name: name.trim(),
        message: message.trim(),
        photo_path,
        is_public: isPublic,
        is_visible: true,
      })
      if (insertError) throw insertError

      const { count } = await supabase.from('memories').select('*', { count: 'exact', head: true })
      setFriendCount(count ?? 0)
      setSubmitted(true)

      await fireConfetti()
      if (isPublic) onMemorySubmitted()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <section className="relative py-20 px-4">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-block relative animate-badge-pop">
            <svg className="absolute inset-0 w-full h-full animate-sunburst opacity-30" viewBox="0 0 200 200">
              {Array.from({ length: 24 }, (_, i) => (
                <line key={i} x1="100" y1="5" x2="100" y2="0"
                  transform={`rotate(${i * 15}, 100, 100)`}
                  stroke="#F4A93C" strokeWidth="2" />
              ))}
            </svg>
            <div className="relative bg-gradient-to-br from-accent-marigold to-accent-coral text-white rounded-3xl p-8 shadow-2xl border-4 border-day-gold m-8">
              <div className="text-6xl mb-3">🦁</div>
              <p className="font-display text-2xl mb-1">You&apos;re Friend</p>
              <p className="font-display text-6xl text-day-yellow">#{friendCount}</p>
              <p className="font-display text-xl mt-2">{name} ✨</p>
            </div>
          </div>

          <div className="mt-6 animate-fade-in-up">
            {isPublic ? (
              <div>
                <p className="font-display text-2xl text-accent-marigold">Your memory is on the wall! 🎉</p>
                <p className="text-gray-600 mt-2">[YOUR NAME] will cherish this forever 💛</p>
              </div>
            ) : (
              <div>
                <p className="font-display text-2xl text-night-purple">Your secret is safe 🔒</p>
                <p className="text-gray-600 mt-2">Only [YOUR NAME] will see your heartfelt message 💌</p>
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative py-20 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border-2 border-day-peach/40">
          <h2 className="font-display text-3xl md:text-4xl text-accent-marigold text-center mb-2">
            Leave a Memory 💛
          </h2>
          <p className="text-center text-gray-600 mb-8 text-sm">Share a moment, a wish, or a memory with [YOUR NAME]</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-day-gold/50 focus:border-accent-marigold focus:outline-none bg-day-cream/50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Your Message or Memory
                <span className="ml-2 font-normal text-gray-400">({message.length}/300)</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={300}
                rows={4}
                placeholder="Write something heartfelt... 💌"
                className="w-full px-4 py-3 rounded-2xl border-2 border-day-gold/50 focus:border-accent-marigold focus:outline-none bg-day-cream/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Add a Photo (optional, max 5MB)</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-day-gold/50 hover:border-accent-marigold cursor-pointer transition-colors bg-day-cream/30"
              >
                <span className="text-2xl">📷</span>
                <span className="text-gray-600 text-sm">
                  {photoFile ? photoFile.name : 'Click to upload a photo'}
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Privacy</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`p-3 rounded-2xl border-2 text-sm font-semibold transition-all ${isPublic ? 'border-accent-marigold bg-accent-marigold/10 text-accent-marigold' : 'border-gray-200 text-gray-500 hover:border-accent-marigold/50'}`}
                >
                  🎉 Share on Memory Wall
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`p-3 rounded-2xl border-2 text-sm font-semibold transition-all ${!isPublic ? 'border-night-purple bg-night-purple/10 text-night-purple' : 'border-gray-200 text-gray-500 hover:border-night-purple/30'}`}
                >
                  🔒 Keep it private
                </button>
              </div>
            </div>

            {error && <p className="text-accent-coral text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent-marigold to-accent-coral text-white font-display text-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending... ✨' : 'Send with Love 💛'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
