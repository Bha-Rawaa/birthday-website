'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  visitorName: string
}

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'Rawaa'
const AVATAR_IMAGE = '/avatar.png'

const FLOOR_H = 420
const AVATAR_SIZE = 72
const HOST_SIZE = 92

const PRESET_AVATARS = ['🦁', '🦊', '🐱', '🐸', '🦄', '🐼', '🐙', '🦋', '🌸', '⭐']
const COLORS = ['#F4A93C', '#F0654E', '#9B7FCC', '#3BB4F4', '#2ECC71', '#E91E63', '#FF9800', '#00BCD4']

interface PresenceData {
  name: string
  x: number
  y: number
  color: string
  avatarEmoji?: string
  avatarPhoto?: string // base64 data URL
}

function nameToColor(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return COLORS[Math.abs(h) % COLORS.length]
}

function initialOf(name: string): string {
  const t = (name || '?').trim()
  return t.length > 0 ? t[0].toUpperCase() : '?'
}

type ChannelType = ReturnType<typeof supabase.channel>

// ── Avatar Picker Modal ─────────────────────────────────────────────────────
function AvatarPickerModal({
  visitorName,
  defaultColor,
  onConfirm,
}: {
  visitorName: string
  defaultColor: string
  onConfirm: (data: { color: string; emoji?: string; photo?: string }) => void
}) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState(defaultColor)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [tab, setTab] = useState<'emoji' | 'photo'>('emoji')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      // Resize to tiny so it fits in Supabase presence payload (<1KB)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 80
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, size, size)
        setPhotoPreview(canvas.toDataURL('image/jpeg', 0.6))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleConfirm = () => {
    if (tab === 'photo' && photoPreview) {
      onConfirm({ color: selectedColor, photo: photoPreview })
    } else {
      onConfirm({ color: selectedColor, emoji: selectedEmoji ?? undefined })
    }
  }

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 20,
        background: 'rgba(20,12,50,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #2D1B69 0%, #3d2580 100%)',
          border: '2px solid rgba(255,255,255,0.15)',
          borderRadius: 20, padding: 28, width: 340, maxWidth: '92vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <p style={{ color: '#FFE066', fontWeight: 'bold', fontSize: 18, marginBottom: 4, textAlign: 'center' }}>
          Pick your avatar, {visitorName}!
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 18, textAlign: 'center' }}>
          You&apos;ll appear on the dance floor
        </p>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {(['emoji', 'photo'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 13,
              background: tab === t ? '#F4A93C' : 'rgba(255,255,255,0.1)',
              color: tab === t ? '#1a0a2e' : 'rgba(255,255,255,0.7)',
              transition: 'all 0.2s',
            }}>
              {t === 'emoji' ? '🎭 Choose avatar' : '📷 Upload photo'}
            </button>
          ))}
        </div>

        {tab === 'emoji' && (
          <>
            {/* Preset emoji avatars */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
              {PRESET_AVATARS.map(e => (
                <button key={e} onClick={() => setSelectedEmoji(selectedEmoji === e ? null : e)}
                  style={{
                    width: 44, height: 44, borderRadius: '50%', border: `2px solid ${selectedEmoji === e ? '#FFE066' : 'rgba(255,255,255,0.2)'}`,
                    background: selectedEmoji === e ? 'rgba(255,224,102,0.15)' : 'rgba(255,255,255,0.08)',
                    fontSize: 22, cursor: 'pointer', transition: 'all 0.15s',
                    transform: selectedEmoji === e ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
            {/* Color swatches */}
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 8, textAlign: 'center' }}>Dress colour</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setSelectedColor(c)} style={{
                  width: 24, height: 24, borderRadius: '50%', background: c, border: `3px solid ${selectedColor === c ? 'white' : 'transparent'}`,
                  cursor: 'pointer', transform: selectedColor === c ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.15s',
                }} />
              ))}
            </div>
          </>
        )}

        {tab === 'photo' && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            {photoPreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="preview"
                  style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid #F4A93C', objectFit: 'cover' }} />
                <button onClick={() => setPhotoPreview(null)}
                  style={{ position: 'absolute', top: -6, right: -6, background: '#F0654E', border: 'none', borderRadius: '50%', width: 22, height: 22, color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}>
                  x
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} style={{
                padding: '12px 24px', borderRadius: 12, border: '2px dashed rgba(255,255,255,0.3)',
                background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13,
              }}>
                Click to choose a photo
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 8 }}>
              Photo is resized to 80×80px and only shared live — not stored.
            </p>
          </div>
        )}

        <button
          onClick={handleConfirm}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #F4A93C, #F0654E)', color: 'white', fontWeight: 'bold', fontSize: 15,
            boxShadow: '0 4px 16px rgba(244,169,60,0.4)', transition: 'all 0.2s',
          }}
        >
          Join the dance floor! 💃
        </button>
      </div>
    </div>
  )
}

// ── Single avatar renderer ──────────────────────────────────────────────────
function GuestAvatar({
  name, color, size, isHost = false, emoji, photo,
}: {
  name: string; color: string; size: number; isHost?: boolean; emoji?: string; photo?: string
}) {
  const faceSize = Math.round(size * 0.55)

  const faceContent = () => {
    if (isHost) return null  // shows bg image or 👸
    if (photo) return null    // shows bg image
    if (emoji) return <span style={{ fontSize: Math.round(faceSize * 0.65), lineHeight: 1 }}>{emoji}</span>
    return <span style={{ fontSize: Math.round(faceSize * 0.5), fontWeight: 'bold', color: 'white' }}>{initialOf(name)}</span>
  }

  const faceBg = () => {
    if (isHost) return AVATAR_IMAGE ? `center/cover url(${AVATAR_IMAGE})` : color
    if (photo) return `center/cover url(${photo})`
    return color
  }

  return (
    <div style={{ width: size, position: 'relative', pointerEvents: 'none' }}>
      {isHost && (
        <svg width={faceSize + 10} height={20} viewBox="0 0 60 20" style={{ display: 'block', margin: '0 auto -4px' }}>
          <defs>
            <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFE066" />
              <stop offset="100%" stopColor="#D4A017" />
            </linearGradient>
          </defs>
          <path d="M5 18 L10 4 L20 14 L30 2 L40 14 L50 4 L55 18 Z" fill="url(#crownGrad)" stroke="#8a6a00" strokeWidth="1" />
          <circle cx="30" cy="4" r="2" fill="#F0654E" />
          <circle cx="10" cy="4" r="1.5" fill="#3BB4F4" />
          <circle cx="50" cy="4" r="1.5" fill="#3BB4F4" />
        </svg>
      )}
      <div style={{
        width: faceSize, height: faceSize, margin: '0 auto', borderRadius: '50%',
        background: faceBg(),
        border: `3px solid ${isHost ? '#FFE066' : 'white'}`,
        boxShadow: `0 4px 12px rgba(0,0,0,0.35)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {faceContent()}
        {isHost && !AVATAR_IMAGE && <span style={{ fontSize: Math.round(faceSize * 0.6) }}>👸</span>}
      </div>
      <div style={{
        width: Math.round(size * 0.65), height: Math.round(size * 0.35),
        margin: '2px auto 0',
        background: isHost ? '#F0654E' : color,
        clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0% 100%)',
      }} />
      <div style={{
        marginTop: 3, textAlign: 'center', fontSize: 11, fontWeight: 'bold',
        color: 'white', background: 'rgba(0,0,0,0.55)', borderRadius: 8,
        padding: '2px 6px', whiteSpace: 'nowrap', maxWidth: size + 40,
        overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {isHost ? `${PERSON_NAME} ♌ 👑` : name}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function DanceSection({ visitorName }: Props) {
  const floorRef    = useRef<HTMLDivElement>(null)
  const sectionRef  = useRef<HTMLElement>(null)
  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const channelRef  = useRef<ChannelType | null>(null)
  const lastTrack   = useRef<number>(0)
  const idleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [showPicker, setShowPicker] = useState(false)
  const [myAvatar, setMyAvatar] = useState<{ color: string; emoji?: string; photo?: string } | null>(null)
  const [joined, setJoined] = useState(false)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [others, setOthers] = useState<PresenceData[]>([])
  const [muted, setMuted] = useState(false)

  const myColor = myAvatar?.color ?? nameToColor(visitorName || 'guest')

  // Restore saved avatar from localStorage
  useEffect(() => {
    if (!visitorName) return
    try {
      const saved = localStorage.getItem(`dance-avatar-${visitorName}`)
      if (saved) setMyAvatar(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [visitorName])

  // Show avatar picker when user first scrolls to floor (not already picked)
  const hasShownPicker = useRef(false)
  useEffect(() => {
    if (!visitorName || myAvatar) return
    const sec = sectionRef.current
    if (!sec) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasShownPicker.current) {
        hasShownPicker.current = true
        setShowPicker(true)
      }
    }, { threshold: 0.5 })
    obs.observe(sec)
    return () => obs.disconnect()
  }, [visitorName, myAvatar])

  // Supabase presence channel
  useEffect(() => {
    if (!visitorName) return
    const channel = supabase.channel('dance-floor', {
      config: { presence: { key: visitorName } },
    })
    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, PresenceData[]>
      const list: PresenceData[] = []
      for (const arr of Object.values(state)) {
        for (const p of arr) {
          if (p?.name && p.name !== visitorName) list.push(p)
        }
      }
      setOthers(list)
    })

    channel.subscribe()
    return () => { supabase.removeChannel(channel); channelRef.current = null }
  }, [visitorName])

  const trackPosition = useCallback(
    (xPct: number, yPct: number) => {
      const ch = channelRef.current
      if (!ch) return
      const now = Date.now()
      if (now - lastTrack.current < 200) return
      lastTrack.current = now
      ch.track({
        name: visitorName,
        x: xPct, y: yPct,
        color: myColor,
        avatarEmoji: myAvatar?.emoji,
        avatarPhoto: myAvatar?.photo,
      } as PresenceData).catch(() => {})
    },
    [visitorName, myColor, myAvatar]
  )

  const updateFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = floorRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const xPct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100))
      const yPct = Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100))
      setPos({ x: xPct, y: yPct })
      setJoined(true)
      if (idleTimeout.current) clearTimeout(idleTimeout.current)
      idleTimeout.current = setTimeout(() => {}, 200)
      trackPosition(xPct, yPct)
    },
    [trackPosition]
  )

  // When avatar is confirmed — join immediately at center
  const handleAvatarConfirm = useCallback(
    (data: { color: string; emoji?: string; photo?: string }) => {
      setMyAvatar(data)
      setShowPicker(false)
      setJoined(true)
      setPos({ x: 60, y: 55 })
      try { localStorage.setItem(`dance-avatar-${visitorName}`, JSON.stringify(data)) } catch { /* ignore */ }
      // Broadcast join position
      const ch = channelRef.current
      if (ch) {
        ch.track({
          name: visitorName, x: 60, y: 55,
          color: data.color,
          avatarEmoji: data.emoji,
          avatarPhoto: data.photo,
        } as PresenceData).catch(() => {})
      }
    },
    [visitorName]
  )

  // Re-track when avatar changes
  useEffect(() => {
    if (!joined || !myAvatar) return
    const ch = channelRef.current
    if (!ch) return
    ch.track({
      name: visitorName, x: pos.x, y: pos.y,
      color: myAvatar.color,
      avatarEmoji: myAvatar.emoji,
      avatarPhoto: myAvatar.photo,
    } as PresenceData).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myAvatar])

  const handleMouseMove  = (e: React.MouseEvent<HTMLDivElement>)  => updateFromPoint(e.clientX, e.clientY)
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>)  => updateFromPoint(e.clientX, e.clientY)
  const handleTouchMove  = (e: React.TouchEvent<HTMLDivElement>)  => { const t = e.touches[0]; if (t) updateFromPoint(t.clientX, t.clientY) }
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>)  => { const t = e.touches[0]; if (t) updateFromPoint(t.clientX, t.clientY) }

  useEffect(() => { return () => { if (idleTimeout.current) clearTimeout(idleTimeout.current) } }, [])

  // Autoplay dance music
  useEffect(() => {
    const sec = sectionRef.current
    if (!sec) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const audio = audioRef.current
          if (!audio) continue
          if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
            audio.volume = 0.5; audio.loop = true; audio.play().catch(() => {})
          } else {
            audio.pause()
          }
        }
      },
      { threshold: [0, 0.4, 0.8] }
    )
    observer.observe(sec)
    return () => observer.disconnect()
  }, [])

  useEffect(() => { if (audioRef.current) audioRef.current.muted = muted }, [muted])

  const totalOnFloor = (joined ? 1 : 0) + others.length + 1 // +1 for host

  return (
    <section
      ref={sectionRef}
      className="relative py-16 px-4 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #2D1B69 0%, #4B3B6B 50%, #2D1B69 100%)' }}
    >
      <audio ref={audioRef} src="/dance-music.mp3" preload="none" />

      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-5xl text-white mb-3 drop-shadow-lg">
          🕺 Dance Floor&apos;s Open! 💃
        </h2>
        <p className="text-white/80 mb-6 text-lg">
          Come join {PERSON_NAME} on the dance floor — find your name and bust a move! 🎵
        </p>

        {/* Dance floor */}
        <div
          ref={floorRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          className="relative mx-auto rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl"
          style={{
            width: '100%', maxWidth: 720, height: FLOOR_H,
            touchAction: 'none', cursor: joined ? 'none' : 'default',
            background: 'linear-gradient(180deg, #1a0a2e 0%, #2D1B69 60%, #1a0a2e 100%)',
          }}
        >
          {/* Avatar picker overlay */}
          {showPicker && (
            <AvatarPickerModal
              visitorName={visitorName}
              defaultColor={myColor}
              onConfirm={handleAvatarConfirm}
            />
          )}

          {/* Dancer counter — top right */}
          <div style={{
            position: 'absolute', top: 10, right: 12, zIndex: 10,
            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 20, padding: '4px 12px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>💃</span>
            <span style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>
              {totalOnFloor}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
              on the floor
            </span>
          </div>

          {/* Floating decorations */}
          {[
            { e: '🎈', left: '8%',  top: '15%', delay: '0s'   },
            { e: '🎊', left: '85%', top: '20%', delay: '1.2s' },
            { e: '🎉', left: '15%', top: '55%', delay: '0.6s' },
            { e: '🎈', left: '78%', top: '48%', delay: '2s'   },
            { e: '🎊', left: '45%', top: '10%', delay: '1.6s' },
          ].map((d, i) => (
            <div key={i} className="absolute text-2xl pointer-events-none opacity-70"
              style={{ left: d.left, top: d.top, animation: `floatDeco 5s ease-in-out ${d.delay} infinite` }}>
              {d.e}
            </div>
          ))}

          {/* Disco ball */}
          <div className="absolute pointer-events-none" style={{ left: '50%', top: 0, transform: 'translateX(-50%)' }}>
            <div style={{ width: 1, height: 20, background: '#aaa', margin: '0 auto' }} />
            <svg width="64" height="64" viewBox="0 0 80 80"
              style={{ animation: 'discoRotate 8s linear infinite', display: 'block' }}>
              <defs>
                <radialGradient id="ballGradFloor" cx="30%" cy="30%">
                  <stop offset="0%"   stopColor="#ffffff" />
                  <stop offset="40%"  stopColor="#c9b8f0" />
                  <stop offset="100%" stopColor="#2D1B69" />
                </radialGradient>
              </defs>
              <circle cx="40" cy="40" r="32" fill="url(#ballGradFloor)" />
              {[12,22,32,42,52,62].map(x => (
                <line key={`v${x}`} x1={x} y1="12" x2={x} y2="68" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
              ))}
              {[18,28,40,52,62].map(y => (
                <line key={`h${y}`} x1="12" y1={y} x2="68" y2={y} stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
              ))}
              <circle cx="28" cy="28" r="5" fill="rgba(255,255,255,0.7)" />
            </svg>
          </div>

          {/* Floor tiles */}
          <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{
            height: '25%',
            background: 'repeating-conic-gradient(#F4A93C44 0% 25%, #F0654E44 0% 50%, #9B7FCC44 0% 75%, rgba(255,255,255,0.08) 0% 100%)',
            backgroundSize: '30px 30px',
            borderTop: '2px solid rgba(255,255,255,0.15)',
            animation: 'tileGlow 3s ease-in-out infinite',
          }} />

          {/* Birthday cake — bottom right */}
          <div className="absolute pointer-events-none" style={{ right: 16, bottom: 16, width: 60, height: 70 }}>
            <div style={{ width: 4, height: 12, background: '#fff', margin: '0 auto', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -8, left: -2, width: 8, height: 10, background: 'radial-gradient(circle, #FFE066 0%, #F4A93C 60%, transparent 80%)', borderRadius: '50%', animation: 'flameFlicker 0.6s ease-in-out infinite' }} />
            </div>
            <div style={{ width: 30, height: 12, background: '#FFC7A8', margin: '0 auto', borderRadius: '4px 4px 0 0' }} />
            <div style={{ width: 45, height: 14, background: '#F4A93C', margin: '0 auto' }} />
            <div style={{ width: 60, height: 18, background: '#FFE066', margin: '0 auto', borderRadius: '0 0 6px 6px' }} />
          </div>

          {/* Gift table — bottom left */}
          <div className="absolute pointer-events-none" style={{ left: 16, bottom: 16, width: 80, height: 60 }}>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'flex-end', height: 40 }}>
              {[
                { w: 22, h: 22, bg: '#F0654E', ribbon: '#FFE066' },
                { w: 26, h: 30, bg: '#9B7FCC', ribbon: '#F4A93C' },
                { w: 18, h: 18, bg: '#3BB4F4', ribbon: '#fff'    },
              ].map((g, i) => (
                <div key={i} style={{ position: 'relative', width: g.w, height: g.h, background: g.bg, borderRadius: 2 }}>
                  <div style={{ position: 'absolute', top: 0, left: '45%', width: 2, height: '100%', background: g.ribbon }} />
                  <div style={{ position: 'absolute', top: '45%', left: 0, width: '100%', height: 2, background: g.ribbon }} />
                </div>
              ))}
            </div>
            <div style={{ width: '100%', height: 4, background: '#6B4423', borderRadius: 2 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '80%', margin: '0 auto' }}>
              <div style={{ width: 3, height: 14, background: '#6B4423' }} />
              <div style={{ width: 3, height: 14, background: '#6B4423' }} />
            </div>
          </div>

          {/* Host (Rawaa) — always present */}
          <div style={{
            position: 'absolute', left: '28%', top: '45%',
            transform: 'translate(-50%, -50%)', width: HOST_SIZE,
            animation: 'hostDance 2s ease-in-out infinite', zIndex: 3,
          }}>
            <GuestAvatar name={PERSON_NAME} color="#F0654E" size={HOST_SIZE} isHost />
          </div>

          {/* Other visitors from Supabase presence */}
          {others.map(g => (
            <div key={g.name} style={{
              position: 'absolute', left: `${g.x}%`, top: `${g.y}%`,
              transform: 'translate(-50%, -50%)', width: AVATAR_SIZE,
              animation: 'danceSlow 2s ease-in-out infinite',
              transition: 'left 0.2s linear, top 0.2s linear', zIndex: 2,
            }}>
              <GuestAvatar
                name={g.name}
                color={g.color || nameToColor(g.name)}
                size={AVATAR_SIZE}
                emoji={g.avatarEmoji}
                photo={g.avatarPhoto}
              />
            </div>
          ))}

          {/* Current visitor avatar */}
          {joined && myAvatar && (
            <div style={{
              position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)', width: AVATAR_SIZE,
              animation: 'danceSlow 1.2s ease-in-out infinite',
              transition: 'left 0.08s linear, top 0.08s linear', zIndex: 4,
            }}>
              <GuestAvatar
                name={visitorName}
                color={myAvatar.color}
                size={AVATAR_SIZE}
                emoji={myAvatar.emoji}
                photo={myAvatar.photo}
              />
            </div>
          )}

          {/* Prompt to join if not yet */}
          {!joined && !showPicker && (
            <div style={{
              position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: '8px 20px',
              color: 'rgba(255,255,255,0.8)', fontSize: 13, whiteSpace: 'nowrap', zIndex: 5,
            }}>
              Move your mouse to join the party ✨
            </div>
          )}
        </div>

        {/* Controls below floor */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {/* Dancer chips */}
          {(joined || others.length > 0) && (
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              <span className="text-white/70 text-sm mr-1">On the floor:</span>
              <span className="text-xs px-2 py-1 rounded-full text-white" style={{ background: '#F0654E' + 'cc' }}>
                {PERSON_NAME} 👑
              </span>
              {joined && (
                <span className="text-xs px-2 py-1 rounded-full text-white" style={{ background: myColor + 'cc' }}>
                  {visitorName} (you)
                </span>
              )}
              {others.map(n => (
                <span key={n.name} className="text-xs px-2 py-1 rounded-full text-white"
                  style={{ background: nameToColor(n.name) + 'cc' }}>
                  {n.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => setMuted(m => !m)}
              className="bg-white/10 hover:bg-white/20 border border-white/30 rounded-full px-4 py-2 text-white text-sm transition">
              {muted ? '🔇 Unmute' : '🔊 Mute'}
            </button>
            {joined && (
              <button onClick={() => setShowPicker(true)}
                className="bg-white/10 hover:bg-white/20 border border-white/30 rounded-full px-4 py-2 text-white text-sm transition">
                🎭 Change avatar
              </button>
            )}
            <span className="text-white/80 font-display text-sm">🎵 Alors on danse...</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes discoRotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes danceSlow {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50%       { transform: translate(-50%, -50%) translateY(-6px); }
        }
        @keyframes hostDance {
          0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(-2deg); }
          25%       { transform: translate(-50%, -50%) translateY(-8px) rotate(2deg); }
          50%       { transform: translate(-50%, -50%) translateY(-4px) rotate(-1deg); }
          75%       { transform: translate(-50%, -50%) translateY(-10px) rotate(3deg); }
        }
        @keyframes floatDeco {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50%       { transform: translateY(-14px) rotate(5deg); }
        }
        @keyframes flameFlicker {
          0%, 100% { transform: scale(1);    opacity: 1;    }
          50%       { transform: scale(1.15); opacity: 0.85; }
        }
        @keyframes tileGlow {
          0%, 100% { filter: brightness(1);   }
          50%       { filter: brightness(1.3); }
        }
      `}</style>
    </section>
  )
}
