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
  hasMemory?: boolean
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

export default function MemoryForm({ visitorName, hasMemory = false, onMemorySubmitted }: Props) {
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
  const [hoverSecret, setHoverSecret] = useState(false)
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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(255,255,255,0.04)',
    color: '#E8D5A3', fontSize: 15, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  if (hasMemory && !submitted) {
    return (
      <section style={{ position: 'relative', padding: '80px 16px', background: 'transparent' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: 20,
            padding: '40px 32px',
            backdropFilter: 'blur(16px)',
          }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>💌</div>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: 12 }}>
              already on the wall
            </p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em', marginBottom: 8 }}>
              You already left a memory!
            </p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              {PERSON_NAME} already has your words — scroll down to see the memory wall ✨
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (submitted) {
    return (
      <section style={{ position: 'relative', padding: '80px 16px', background: 'transparent' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ animation: 'mfBadgePop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: 20,
              padding: '40px 32px',
              backdropFilter: 'blur(16px)',
            }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>♌</div>
              <p style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: 12 }}>
                {isPublic ? 'memory added to the wall' : 'message delivered'}
              </p>
              <p style={{ fontSize: 34, fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em', marginBottom: 4 }}>
                {name}
              </p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                {PERSON_NAME} will cherish this forever
              </p>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes mfBadgePop {
            from { opacity: 0; transform: scale(0.9) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </section>
    )
  }

  return (
    <section style={{ position: 'relative', padding: '80px 16px', background: 'transparent' }}>
      {showEmoji && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowEmoji(false) }}>
          <div onClick={e => e.stopPropagation()}>
            <EmojiPicker onEmojiClick={onEmojiClick} autoFocusSearch={false} lazyLoadEmojis />
          </div>
        </div>
      )}
      {showGif && (
        <GifPicker onSelect={url => { setGifUrl(url); setShowGif(false) }} onClose={() => setShowGif(false)} />
      )}

      <style>{`
        @keyframes tooltipFade {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(201,168,76,0.12)',
          borderRadius: 18,
          padding: '2rem 2.5rem',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.25em', color: 'rgba(201,168,76,0.55)', textTransform: 'uppercase', marginBottom: 10 }}>
              ✦ &nbsp; leave a memory &nbsp; ✦
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em', marginBottom: 6 }}>
              Share a Memory
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
              A wish, a story, or just good vibes
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(201,168,76,0.55)', textTransform: 'uppercase', marginBottom: 8 }}>
                Your name
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(201,168,76,0.55)', textTransform: 'uppercase' }}>
                  Message &nbsp;<span style={{ opacity: 0.5, fontWeight: 400 }}>({message.length}/300)</span>
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => { setShowEmoji(v => !v); setShowGif(false) }} style={{
                    padding: '4px 10px', borderRadius: 8,
                    border: `1px solid ${showEmoji ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    background: showEmoji ? 'rgba(201,168,76,0.1)' : 'transparent',
                    color: showEmoji ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer',
                  }}>Emoji</button>
                  <button type="button" onClick={() => { setShowGif(true); setShowEmoji(false) }} style={{
                    padding: '4px 10px', borderRadius: 8,
                    border: `1px solid ${gifUrl ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    background: gifUrl ? 'rgba(201,168,76,0.1)' : 'transparent',
                    color: gifUrl ? '#C9A84C' : 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer',
                  }}>GIF</button>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={300}
                rows={4}
                placeholder="Write something heartfelt..."
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>

            {gifUrl && (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(201,168,76,0.2)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gifUrl} alt="Selected GIF" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }} />
                <button type="button" onClick={() => setGifUrl(null)} style={{
                  position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', fontSize: 12, cursor: 'pointer',
                }}>✕</button>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(201,168,76,0.55)', textTransform: 'uppercase', marginBottom: 8 }}>
                Photo (optional)
              </label>
              <div onClick={() => fileRef.current?.click()} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 10,
                border: '1px dashed rgba(201,168,76,0.2)',
                background: 'transparent', cursor: 'pointer',
                color: 'rgba(255,255,255,0.35)', fontSize: 13, transition: 'border-color 0.2s',
              }}>
                <span>📷</span>
                <span>{photoFile ? photoFile.name : 'Click to upload — max 5MB'}</span>
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(201,168,76,0.55)', textTransform: 'uppercase', marginBottom: 8 }}>
                Visibility
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button type="button" onClick={() => setIsPublic(true)} style={{
                  padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  border: `1px solid ${isPublic ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  background: isPublic ? 'rgba(201,168,76,0.1)' : 'transparent',
                  color: isPublic ? '#C9A84C' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.2s',
                }}>Public — on the wall</button>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    onMouseEnter={() => setHoverSecret(true)}
                    onMouseLeave={() => setHoverSecret(false)}
                    style={{
                      width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      border: `1px solid ${!isPublic ? 'rgba(155,127,204,0.7)' : 'rgba(155,127,204,0.35)'}`,
                      background: !isPublic
                        ? 'rgba(155,127,204,0.2)'
                        : 'linear-gradient(135deg, rgba(155,127,204,0.12) 0%, rgba(155,127,204,0.06) 100%)',
                      color: !isPublic ? '#b89fe0' : '#9B7FCC',
                      boxShadow: !isPublic ? '0 0 14px rgba(155,127,204,0.25)' : '0 0 8px rgba(155,127,204,0.1)',
                      transition: 'all 0.2s',
                    }}
                  >🤫 Just for {PERSON_NAME}</button>

                  {hoverSecret && (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(20,12,48,0.97)',
                      border: '1px solid rgba(155,127,204,0.35)',
                      borderRadius: 10, padding: '10px 16px',
                      fontSize: 12, lineHeight: 1.6,
                      color: 'rgba(232,213,163,0.9)',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      zIndex: 10,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      animation: 'tooltipFade 0.15s ease-out',
                    }}>
                      In case you want to keep it just between us —<br />
                      it&apos;s not going to be shared on the wall 🤍
                      <div style={{
                        position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                        width: 0, height: 0,
                        borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                        borderTop: '6px solid rgba(155,127,204,0.35)',
                      }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && <p style={{ color: '#E8856A', fontSize: 13, textAlign: 'center' }}>{error}</p>}

            <button type="submit" disabled={loading} style={{
              marginTop: 8, padding: '14px 0', borderRadius: 10, border: 'none',
              background: loading ? 'rgba(201,168,76,0.2)' : 'linear-gradient(135deg, #C9A84C 0%, #E8D5A3 50%, #C9A84C 100%)',
              color: '#0d0820', fontWeight: 700, fontSize: 15, letterSpacing: '0.04em',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(201,168,76,0.2)',
              transition: 'all 0.2s',
            }}>
              {loading ? 'Sending...' : 'Send with love →'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
