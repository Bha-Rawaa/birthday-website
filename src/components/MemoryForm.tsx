'use client'

import { useState, useRef, FormEvent, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import type { EmojiClickData } from 'emoji-picker-react'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })
const GifPicker = dynamic(() => import('./GifPicker'), { ssr: false })

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'

// Delimiter used to embed a GIF URL inside the message field (no DB change needed)
const GIF_DELIMITER = '\n__GIF__:'

interface Props {
  visitorName: string
  onMemorySubmitted: () => void
}

async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#F4A93C', '#F0654E', '#FFE9A8', '#FFC7A8'] })
}

function playSendSound() {
  try {
    const audio = new Audio('/finale-song.mp3')
    audio.volume = 0.55
    audio.play().catch(() => {})
    // auto-stop after 8 s so it doesn't play the whole song
    setTimeout(() => { audio.pause(); audio.src = '' }, 8000)
  } catch {
    // ignore if file is missing
  }
}

export default function MemoryForm({ visitorName, onMemorySubmitted }: Props) {
  const [name, setName] = useState(visitorName)
  const [message, setMessage] = useState('')
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(true)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [friendCount, setFriendCount] = useState(0)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }
    setError('')
    setPhotoFile(file)
  }

  const onEmojiClick = useCallback((emojiData: EmojiClickData) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setMessage(prev => prev + emojiData.emoji)
      return
    }
    const start = textarea.selectionStart ?? message.length
    const end = textarea.selectionEnd ?? message.length
    const next = message.slice(0, start) + emojiData.emoji + message.slice(end)
    if (next.length <= 300) {
      setMessage(next)
      // restore cursor after state update
      requestAnimationFrame(() => {
        textarea.selectionStart = start + emojiData.emoji.length
        textarea.selectionEnd = start + emojiData.emoji.length
        textarea.focus()
      })
    }
  }, [message])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!message.trim() && !gifUrl) { setError('Please write a message or add a GIF'); return }
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

      // Embed GIF URL in message using the delimiter so no DB schema change is needed
      const finalMessage = gifUrl
        ? `${message.trim()}${GIF_DELIMITER}${gifUrl}`
        : message.trim()

      const { error: insertError } = await supabase.from('memories').insert({
        name: name.trim(),
        message: finalMessage,
        photo_path,
        is_public: isPublic,
        is_visible: true,
      })
      if (insertError) throw insertError

      const { count } = await supabase.from('memories').select('*', { count: 'exact', head: true })
      setFriendCount(count ?? 0)
      setSubmitted(true)

      playSendSound()
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
                <p className="text-gray-600 mt-2">{PERSON_NAME} will cherish this forever 💛</p>
              </div>
            ) : (
              <div>
                <p className="font-display text-2xl" style={{ color: '#4B3B6B' }}>Your secret is safe 🔒</p>
                <p className="text-gray-600 mt-2">Only {PERSON_NAME} will see your heartfelt message 💌</p>
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative py-20 px-4">
      {/* Emoji picker portal */}
      {showEmoji && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowEmoji(false) }}>
          <div onClick={e => e.stopPropagation()}>
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              autoFocusSearch={false}
              lazyLoadEmojis
            />
          </div>
        </div>
      )}

      {/* GIF picker */}
      {showGif && (
        <GifPicker
          onSelect={url => { setGifUrl(url); setShowGif(false) }}
          onClose={() => setShowGif(false)}
        />
      )}

      <div className="max-w-xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border-2 border-day-peach/40">
          <h2 className="font-display text-3xl md:text-4xl text-accent-marigold text-center mb-2">
            🎊 Bring the Memories!
          </h2>
          <p className="text-center text-gray-600 mb-8 text-sm">
            Every great party needs great stories — share a memory of us, a wish, or just drop a vibe 🫶
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-2 border-day-gold/50 focus:border-accent-marigold focus:outline-none bg-day-cream/50"
              />
            </div>

            {/* Message + emoji/gif toolbar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-gray-700">
                  Your Message or Memory
                  <span className="ml-2 font-normal text-gray-400">({message.length}/300)</span>
                </label>
                {/* Toolbar */}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => { setShowEmoji(v => !v); setShowGif(false) }}
                    title="Add emoji"
                    className={`px-2.5 py-1.5 rounded-xl text-sm font-semibold transition-all border-2 ${showEmoji ? 'border-accent-marigold bg-accent-marigold/10 text-accent-marigold' : 'border-day-gold/40 text-gray-500 hover:border-accent-marigold/50 hover:text-accent-marigold'}`}
                  >
                    😄 Emoji
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowGif(true); setShowEmoji(false) }}
                    title="Add GIF"
                    className={`px-2.5 py-1.5 rounded-xl text-sm font-semibold transition-all border-2 ${gifUrl ? 'border-accent-marigold bg-accent-marigold/10 text-accent-marigold' : 'border-day-gold/40 text-gray-500 hover:border-accent-marigold/50 hover:text-accent-marigold'}`}
                  >
                    🎬 GIF
                  </button>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={300}
                rows={4}
                placeholder="Write something heartfelt... 💌"
                className="w-full px-4 py-3 rounded-2xl border-2 border-day-gold/50 focus:border-accent-marigold focus:outline-none bg-day-cream/50 resize-none"
              />
            </div>

            {/* GIF preview */}
            {gifUrl && (
              <div className="relative rounded-2xl overflow-hidden border-2 border-accent-marigold/30 bg-day-cream/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gifUrl} alt="Selected GIF" className="w-full max-h-52 object-contain" />
                <button
                  type="button"
                  onClick={() => setGifUrl(null)}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 text-white text-sm hover:bg-black/70 transition-colors"
                >
                  ✕
                </button>
                <div className="absolute bottom-2 left-2">
                  <button
                    type="button"
                    onClick={() => setShowGif(true)}
                    className="px-3 py-1 rounded-xl bg-black/50 text-white text-xs hover:bg-black/70 transition-colors"
                  >
                    🔄 Change GIF
                  </button>
                </div>
              </div>
            )}

            {/* Photo upload */}
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
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>

            {/* Privacy */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Privacy</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setIsPublic(true)}
                  title="Everyone at the party can see it"
                  className={`p-3 rounded-2xl border-2 text-sm font-semibold transition-all ${isPublic ? 'border-accent-marigold bg-accent-marigold/10 text-accent-marigold' : 'border-gray-200 text-gray-500 hover:border-accent-marigold/50'}`}>
                  🎉 Show it off at the party!
                </button>
                <button type="button" onClick={() => setIsPublic(false)}
                  title={`Won't show on the party wall — just for ${PERSON_NAME}'s eyes only 👀`}
                  className={`p-3 rounded-2xl border-2 text-sm font-semibold transition-all ${!isPublic ? 'border-[#4B3B6B] bg-[#4B3B6B]/10 text-[#4B3B6B]' : 'border-gray-200 text-gray-500 hover:border-[#4B3B6B]/30'}`}>
                  🤫 Just between us
                </button>
              </div>
              {!isPublic && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Won&apos;t show on the party wall — just for {PERSON_NAME}&apos;s eyes only 👀
                </p>
              )}
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
