'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  visitorName: string
}

const PERSON_NAME  = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'Rawaa'
const AVATAR_IMAGE = '/avatar.png'

const FLOOR_H    = 440
const AVATAR_SIZE = 80
const HOST_SIZE   = 100

const PRESET_AVATARS = ['🦁', '🦊', '🐱', '🐸', '🦄', '🐼', '🐙', '🦋', '🌸', '⭐']
const COLORS = ['#C9A84C', '#9B7FCC', '#3BB4F4', '#E8856A', '#2ECC71', '#E91E63', '#FF9800', '#00BCD4']

interface DancerRow {
  name: string
  color: string
  avatar_emoji?: string | null
  x: number
  y: number
}

interface PresenceData extends DancerRow {
  avatarPhoto?: string
}

function nameToColor(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return COLORS[Math.abs(h) % COLORS.length]
}

function nameHash(name: string): number {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return Math.abs(h)
}

function findFreePosition(
  name: string,
  existing: { x: number; y: number }[]
): { x: number; y: number } {
  const MIN_DIST = 18 // minimum % distance between dancers to avoid overlap
  const h = nameHash(name)

  // Try up to 30 candidate positions derived from the name hash
  for (let attempt = 0; attempt < 30; attempt++) {
    const ha = (h + attempt * 2654435761) >>> 0
    const hb = (ha * 1664525 + 1013904223) >>> 0
    const x = 10 + (ha % 78)  // 10–88%
    const y = 12 + (hb % 68)  // 12–80%

    const tooClose = existing.some(p =>
      Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < MIN_DIST
    )
    if (!tooClose) return { x, y }
  }

  // Fallback: pick the candidate with max minimum distance from others
  let best = { x: 50, y: 50 }
  let bestDist = -1
  for (let i = 0; i < 60; i++) {
    const ha = (h + i * 1234567) >>> 0
    const hb = (ha * 987654321) >>> 0
    const x = 10 + (ha % 78)
    const y = 12 + (hb % 68)
    const minD = existing.length === 0
      ? 999
      : Math.min(...existing.map(p => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2)))
    if (minD > bestDist) { bestDist = minD; best = { x, y } }
  }
  return best
}

function nameToPosition(name: string): { x: number; y: number } {
  return findFreePosition(name, [])
}

function initialOf(name: string): string {
  const t = (name || '?').trim()
  return t.length > 0 ? t[0].toUpperCase() : '?'
}

type ChannelType = ReturnType<typeof supabase.channel>

// ── Dancing SVG Character ─────────────────────────────────────────────────
function DancingCharacter({
  name, color, size, isHost = false, emoji, photo, animationVariant = 0,
}: {
  name: string; color: string; size: number; isHost?: boolean;
  emoji?: string; photo?: string; animationVariant?: number;
}) {
  const scale = size / 100
  const animName = isHost ? 'danceHost' : `danceGuest${animationVariant % 4}`
  const faceColor = isHost ? '#F0654E' : color

  const faceContent = photo
    ? null
    : emoji
    ? <text x="50" y="26" textAnchor="middle" fontSize="20" dominantBaseline="middle" style={{ userSelect: 'none' }}>{emoji}</text>
    : <text x="50" y="26" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white" dominantBaseline="middle" style={{ userSelect: 'none' }}>{initialOf(name)}</text>

  return (
    <div style={{ width: size, position: 'relative', pointerEvents: 'none' }}>
      {isHost && (
        <svg width={size * 0.7} height={size * 0.22} viewBox="0 0 60 18"
          style={{ display: 'block', margin: '0 auto -4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
          <defs>
            <linearGradient id={`crownGrad-${name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFE8A3" />
              <stop offset="100%" stopColor="#C9A84C" />
            </linearGradient>
          </defs>
          <path d="M3 16 L8 4 L18 12 L30 2 L42 12 L52 4 L57 16 Z" fill={`url(#crownGrad-${name})`} stroke="#8a6a00" strokeWidth="0.5" />
          <circle cx="30" cy="3" r="2" fill="#E8856A" />
          <circle cx="8" cy="5" r="1.5" fill="#3BB4F4" />
          <circle cx="52" cy="5" r="1.5" fill="#3BB4F4" />
        </svg>
      )}

      {/* SVG person */}
      <svg
        width={size} height={size * 1.35}
        viewBox="0 0 100 135"
        style={{
          display: 'block',
          filter: `drop-shadow(0 4px 10px rgba(0,0,0,0.4))`,
          animation: `${animName} ${isHost ? 1.4 : 1.8 + (animationVariant * 0.15)}s ease-in-out infinite`,
          transformOrigin: 'center bottom',
          transformBox: 'fill-box',
        }}
      >
        <defs>
          {photo && (
            <pattern id={`photo-${name}`} patternUnits="objectBoundingBox" width="1" height="1">
              <image href={photo} x="0" y="0" width="36" height="36" preserveAspectRatio="xMidYMid slice" />
            </pattern>
          )}
        </defs>

        {/* Left leg */}
        <g style={{ animation: `legLeft${animationVariant % 2} ${isHost ? 0.7 : 0.9}s ease-in-out infinite`, transformOrigin: '38px 80px' }}>
          <rect x="33" y="80" width="10" height="28" rx="5" fill={faceColor} opacity="0.9" />
          <rect x="30" y="104" width="16" height="8" rx="4" fill={color} opacity="0.85" />
        </g>

        {/* Right leg */}
        <g style={{ animation: `legRight${animationVariant % 2} ${isHost ? 0.7 : 0.9}s ease-in-out infinite`, transformOrigin: '62px 80px' }}>
          <rect x="57" y="80" width="10" height="28" rx="5" fill={faceColor} opacity="0.9" />
          <rect x="54" y="104" width="16" height="8" rx="4" fill={color} opacity="0.85" />
        </g>

        {/* Torso */}
        <rect x="32" y="42" width="36" height="42" rx="8" fill={faceColor} />
        {/* Dress/shirt detail */}
        <rect x="32" y="60" width="36" height="24" rx="6" fill={faceColor} opacity="0.7" />

        {/* Left arm */}
        <g style={{ animation: `armLeft${animationVariant % 2} ${isHost ? 0.7 : 0.9}s ease-in-out infinite`, transformOrigin: '34px 50px' }}>
          <rect x="18" y="45" width="18" height="9" rx="4.5" fill={faceColor} opacity="0.9" />
          <circle cx="16" cy="49" r="6" fill={color} opacity="0.85" />
        </g>

        {/* Right arm */}
        <g style={{ animation: `armRight${animationVariant % 2} ${isHost ? 0.7 : 0.9}s ease-in-out infinite`, transformOrigin: '66px 50px' }}>
          <rect x="64" y="45" width="18" height="9" rx="4.5" fill={faceColor} opacity="0.9" />
          <circle cx="84" cy="49" r="6" fill={color} opacity="0.85" />
        </g>

        {/* Head */}
        <circle cx="50" cy="24" r="18" fill={photo ? `url(#photo-${name})` : isHost && AVATAR_IMAGE ? 'none' : faceColor}
          stroke={isHost ? '#C9A84C' : 'rgba(255,255,255,0.3)'} strokeWidth={isHost ? 2.5 : 1.5} />
        {isHost && AVATAR_IMAGE && (
          <image href={AVATAR_IMAGE} x="32" y="6" width="36" height="36" clipPath="circle(18px at 18px 18px)" preserveAspectRatio="xMidYMid slice" />
        )}
        {!photo && !isHost && faceContent}
        {isHost && !AVATAR_IMAGE && (
          <text x="50" y="24" textAnchor="middle" fontSize="20" dominantBaseline="middle" style={{ userSelect: 'none' }}>👸</text>
        )}

        {/* Shine on head */}
        <ellipse cx="43" cy="17" rx="5" ry="3.5" fill="rgba(255,255,255,0.22)" />
      </svg>

      {/* Name tag */}
      <div style={{
        marginTop: 2,
        textAlign: 'center',
        fontSize: Math.max(10, size * 0.13),
        fontWeight: 600,
        color: 'white',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        borderRadius: 20,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
        maxWidth: size + 40,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        letterSpacing: '0.02em',
      }}>
        {isHost ? `${PERSON_NAME} 👑` : name}
      </div>

      <style>{`
        @keyframes danceHost {
          0%   { transform: translateY(0) rotate(-3deg); }
          25%  { transform: translateY(-10px) rotate(3deg) scaleX(1.05); }
          50%  { transform: translateY(-5px) rotate(-2deg); }
          75%  { transform: translateY(-12px) rotate(4deg) scaleX(0.96); }
          100% { transform: translateY(0) rotate(-3deg); }
        }
        @keyframes danceGuest0 {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50%       { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes danceGuest1 {
          0%, 100% { transform: translateY(0) scaleX(1); }
          33%       { transform: translateY(-6px) scaleX(1.04); }
          66%       { transform: translateY(-10px) scaleX(0.97); }
        }
        @keyframes danceGuest2 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25%       { transform: translateY(-5px) rotate(-3deg); }
          75%       { transform: translateY(-9px) rotate(3deg); }
        }
        @keyframes danceGuest3 {
          0%, 100% { transform: translateY(0) rotate(1deg); }
          50%       { transform: translateY(-11px) rotate(-1deg); }
        }
        @keyframes armLeft0 {
          0%, 100% { transform: rotate(-15deg); }
          50%       { transform: rotate(25deg); }
        }
        @keyframes armRight0 {
          0%, 100% { transform: rotate(15deg); }
          50%       { transform: rotate(-25deg); }
        }
        @keyframes armLeft1 {
          0%, 100% { transform: rotate(-30deg); }
          50%       { transform: rotate(10deg); }
        }
        @keyframes armRight1 {
          0%, 100% { transform: rotate(30deg); }
          50%       { transform: rotate(-10deg); }
        }
        @keyframes legLeft0 {
          0%, 100% { transform: rotate(-8deg); }
          50%       { transform: rotate(12deg); }
        }
        @keyframes legRight0 {
          0%, 100% { transform: rotate(8deg); }
          50%       { transform: rotate(-12deg); }
        }
        @keyframes legLeft1 {
          0%, 100% { transform: rotate(-15deg); }
          50%       { transform: rotate(5deg); }
        }
        @keyframes legRight1 {
          0%, 100% { transform: rotate(15deg); }
          50%       { transform: rotate(-5deg); }
        }
      `}</style>
    </div>
  )
}

// ── Avatar picker ─────────────────────────────────────────────────────────
function AvatarPickerModal({
  visitorName, defaultColor, onConfirm,
}: {
  visitorName: string
  defaultColor: string
  onConfirm: (data: { color: string; emoji?: string; photo?: string }) => void
}) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState(defaultColor)
  const [photoPreview, setPhotoPreview]   = useState<string | null>(null)
  const [tab, setTab]                     = useState<'emoji' | 'photo'>('emoji')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 80; canvas.width = size; canvas.height = size
        canvas.getContext('2d')!.drawImage(img, 0, 0, size, size)
        setPhotoPreview(canvas.toDataURL('image/jpeg', 0.6))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: 'rgba(8,6,20,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 18, padding: 28, width: 340, maxWidth: '92vw',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        backdropFilter: 'blur(24px)',
      }}>
        <p style={{ color: '#E8D5A3', fontWeight: 700, fontSize: 17, marginBottom: 4, textAlign: 'center' }}>
          Choose your look, {visitorName}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 20, textAlign: 'center' }}>
          You&apos;ll appear on the dance floor for everyone
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {(['emoji', 'photo'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 12, letterSpacing: '0.05em',
              background: tab === t ? 'linear-gradient(135deg, #C9A84C, #E8D5A3)' : 'rgba(255,255,255,0.06)',
              color: tab === t ? '#0d0820' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s',
            }}>
              {t === 'emoji' ? 'Avatar' : 'Photo'}
            </button>
          ))}
        </div>

        {tab === 'emoji' && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
              {PRESET_AVATARS.map(e => (
                <button key={e} onClick={() => setSelectedEmoji(selectedEmoji === e ? null : e)} style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: `2px solid ${selectedEmoji === e ? '#C9A84C' : 'rgba(255,255,255,0.12)'}`,
                  background: selectedEmoji === e ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                  fontSize: 22, cursor: 'pointer', transition: 'all 0.15s',
                  transform: selectedEmoji === e ? 'scale(1.15)' : 'scale(1)',
                }}>{e}</button>
              ))}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>
              Accent color
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setSelectedColor(c)} style={{
                  width: 22, height: 22, borderRadius: '50%', background: c,
                  border: `2.5px solid ${selectedColor === c ? 'white' : 'transparent'}`,
                  cursor: 'pointer', transform: selectedColor === c ? 'scale(1.25)' : 'scale(1)',
                  transition: 'all 0.15s',
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
                  style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid #C9A84C', objectFit: 'cover' }} />
                <button onClick={() => setPhotoPreview(null)}
                  style={{ position: 'absolute', top: -6, right: -6, background: '#E8856A', border: 'none', borderRadius: '50%', width: 20, height: 20, color: 'white', fontSize: 11, cursor: 'pointer', fontWeight: 'bold' }}>
                  ×
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} style={{
                padding: '12px 24px', borderRadius: 10,
                border: '1px dashed rgba(201,168,76,0.3)',
                background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13,
              }}>
                Click to choose a photo
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 10 }}>
              Photo stays live only — not saved to the server.
            </p>
          </div>
        )}

        <button
          onClick={() => onConfirm({
            color: selectedColor,
            emoji: tab === 'emoji' ? (selectedEmoji ?? undefined) : undefined,
            photo: tab === 'photo' ? (photoPreview ?? undefined) : undefined,
          })}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #C9A84C 0%, #E8D5A3 50%, #C9A84C 100%)',
            color: '#0d0820', fontWeight: 700, fontSize: 14, letterSpacing: '0.04em',
            boxShadow: '0 4px 20px rgba(201,168,76,0.25)', transition: 'all 0.2s',
          }}
        >
          Join the dance floor →
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function DanceSection({ visitorName }: Props) {
  const floorRef    = useRef<HTMLDivElement>(null)
  const sectionRef  = useRef<HTMLElement>(null)
  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const channelRef  = useRef<ChannelType | null>(null)
  const lastTrack   = useRef<number>(0)
  const idleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasShownPicker = useRef(false)

  const [showPicker, setShowPicker] = useState(false)
  const [myAvatar, setMyAvatar]     = useState<{ color: string; emoji?: string; photo?: string } | null>(null)
  const [joined, setJoined]         = useState(false)
  const [pos, setPos]               = useState(() => nameToPosition(visitorName || 'guest'))
  const [dbDancers, setDbDancers]   = useState<DancerRow[]>([])
  const [livePositions, setLivePositions] = useState<Map<string, PresenceData>>(new Map())
  const [muted, setMuted]           = useState(false)

  const myColor = myAvatar?.color ?? nameToColor(visitorName || 'guest')

  useEffect(() => {
    supabase.from('dancers').select('name, color, avatar_emoji, x, y').then(({ data }) => {
      if (data) setDbDancers(data as DancerRow[])
    })
  }, [])

  useEffect(() => {
    if (!visitorName) return
    try {
      const saved = localStorage.getItem(`dance-avatar-${visitorName}`)
      if (saved) setMyAvatar(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [visitorName])

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

  useEffect(() => {
    if (!visitorName) return
    const channel = supabase.channel('dance-floor', {
      config: { presence: { key: visitorName } },
    })
    channelRef.current = channel
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, PresenceData[]>
      const map = new Map<string, PresenceData>()
      for (const arr of Object.values(state)) {
        for (const p of arr) {
          if (p?.name) map.set(p.name, p)
        }
      }
      setLivePositions(map)
    })
    channel.subscribe()
    return () => { supabase.removeChannel(channel); channelRef.current = null }
  }, [visitorName])

  const upsertToDB = useCallback(async (
    name: string, color: string, emoji: string | undefined, x: number, y: number
  ) => {
    await supabase.from('dancers').upsert(
      { name, color, avatar_emoji: emoji ?? null, x, y, updated_at: new Date().toISOString() },
      { onConflict: 'name' }
    ).then(() => {})
  }, [])

  const trackPosition = useCallback((xPct: number, yPct: number) => {
    const ch = channelRef.current
    if (!ch) return
    const now = Date.now()
    if (now - lastTrack.current < 200) return
    lastTrack.current = now
    ch.track({ name: visitorName, x: xPct, y: yPct, color: myColor, avatar_emoji: myAvatar?.emoji, avatarPhoto: myAvatar?.photo } as PresenceData).catch(() => {})
  }, [visitorName, myColor, myAvatar])

  const updateFromPoint = useCallback((clientX: number, clientY: number) => {
    const el = floorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const xPct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100))
    const yPct = Math.max(5, Math.min(90, ((clientY - rect.top) / rect.height) * 100))
    setPos({ x: xPct, y: yPct })
    setJoined(true)
    if (idleTimeout.current) clearTimeout(idleTimeout.current)
    idleTimeout.current = setTimeout(() => {}, 200)
    trackPosition(xPct, yPct)
  }, [trackPosition])

  const handleAvatarConfirm = useCallback((data: { color: string; emoji?: string; photo?: string }) => {
    // Gather all current positions to avoid overlap
    const occupied = [
      ...dbDancers.map(d => ({ x: d.x, y: d.y })),
      ...Array.from(livePositions.values()).map(p => ({ x: p.x, y: p.y })),
      { x: 22, y: 48 }, // host position
    ]
    const initPos = findFreePosition(visitorName, occupied)
    setMyAvatar(data)
    setShowPicker(false)
    setJoined(true)
    setPos(initPos)
    try { localStorage.setItem(`dance-avatar-${visitorName}`, JSON.stringify(data)) } catch { /* ignore */ }

    const ch = channelRef.current
    if (ch) {
      ch.track({ name: visitorName, x: initPos.x, y: initPos.y, color: data.color, avatar_emoji: data.emoji, avatarPhoto: data.photo } as PresenceData).catch(() => {})
    }
    upsertToDB(visitorName, data.color, data.emoji, initPos.x, initPos.y)
  }, [visitorName, upsertToDB])

  useEffect(() => {
    if (!joined || !myAvatar) return
    const ch = channelRef.current
    if (!ch) return
    ch.track({ name: visitorName, x: pos.x, y: pos.y, color: myAvatar.color, avatar_emoji: myAvatar.emoji, avatarPhoto: myAvatar.photo } as PresenceData).catch(() => {})
    upsertToDB(visitorName, myAvatar.color, myAvatar.emoji, pos.x, pos.y)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myAvatar])

  // Dance music
  useEffect(() => {
    const audio = new Audio('/dance-music.mp3')
    audio.volume = 0.4
    audio.loop = true
    audioRef.current = audio

    const sec = sectionRef.current
    if (!sec) return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          audio.play().catch(() => {})
        } else {
          audio.pause()
        }
      }
    }, { threshold: [0, 0.4, 0.8] })
    observer.observe(sec)
    return () => { observer.disconnect(); audio.pause() }
  }, [])

  useEffect(() => { if (audioRef.current) audioRef.current.muted = muted }, [muted])

  const handleMouseMove  = (e: React.MouseEvent<HTMLDivElement>)  => updateFromPoint(e.clientX, e.clientY)
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>)  => updateFromPoint(e.clientX, e.clientY)
  const handleTouchMove  = (e: React.TouchEvent<HTMLDivElement>)  => { const t = e.touches[0]; if (t) updateFromPoint(t.clientX, t.clientY) }
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>)  => { const t = e.touches[0]; if (t) updateFromPoint(t.clientX, t.clientY) }
  useEffect(() => () => { if (idleTimeout.current) clearTimeout(idleTimeout.current) }, [])

  const allOtherDancers: PresenceData[] = (() => {
    const map = new Map<string, PresenceData>()
    for (const d of dbDancers) {
      if (d.name !== visitorName && d.name !== PERSON_NAME) {
        map.set(d.name, { name: d.name, color: d.color, avatar_emoji: d.avatar_emoji ?? undefined, x: d.x, y: d.y })
      }
    }
    for (const [name, p] of livePositions) {
      if (name !== visitorName && name !== PERSON_NAME) map.set(name, p)
    }
    return Array.from(map.values())
  })()

  const totalOnFloor = (joined ? 1 : 0) + allOtherDancers.length + 1

  return (
    <section
      ref={sectionRef}
      className="relative py-20 px-4 overflow-hidden"
      style={{ background: 'transparent' }}
    >
      <div className="relative max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: 12 }}>
            ✦ &nbsp; the floor is open &nbsp; ✦
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em', marginBottom: 10 }}>
            Dance Floor
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>
            Move your cursor — join {PERSON_NAME} on the floor
          </p>
        </div>

        {/* Dance floor */}
        <div
          ref={floorRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          style={{
            position: 'relative', width: '100%', maxWidth: 720, height: FLOOR_H,
            margin: '0 auto',
            touchAction: 'none', cursor: joined ? 'none' : 'default',
            background: 'linear-gradient(180deg, #0a0618 0%, #130d30 60%, #0a0618 100%)',
            borderRadius: 20,
            border: '1px solid rgba(201,168,76,0.12)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,168,76,0.08)',
            overflow: 'hidden',
          }}
        >
          {showPicker && (
            <AvatarPickerModal visitorName={visitorName} defaultColor={myColor} onConfirm={handleAvatarConfirm} />
          )}

          {/* Guest counter */}
          <div style={{
            position: 'absolute', top: 12, right: 14, zIndex: 10,
            background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: 20, padding: '5px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 6px #C9A84C', display: 'block' }} />
            <span style={{ color: '#E8D5A3', fontSize: 12, fontWeight: 600 }}>{totalOnFloor} on the floor</span>
          </div>

          {/* Floating particles */}
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${(i * 137.5 + 10) % 90}%`,
              top: `${(i * 79 + 5) % 80}%`,
              width: 2 + (i % 2), height: 2 + (i % 2),
              borderRadius: '50%',
              background: i % 3 === 0 ? '#C9A84C' : i % 3 === 1 ? '#9B7FCC' : 'white',
              opacity: 0.3 + (i % 4) * 0.1,
              animation: `dsFloat ${4 + (i % 3)}s ease-in-out ${(i % 5) * 0.7}s infinite`,
              pointerEvents: 'none',
            }} />
          ))}

          {/* Disco ball with sparkles */}
          <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', pointerEvents: 'none' }}>
            <div style={{ width: 1, height: 24, background: 'rgba(201,168,76,0.3)', margin: '0 auto' }} />
            <div style={{ position: 'relative', width: 60, height: 60 }}>
              {/* Sparkle rays */}
              {[0,45,90,135,180,225,270,315].map((deg, i) => (
                <div key={deg} style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 2, height: 18,
                  background: `linear-gradient(to top, transparent, ${i % 2 === 0 ? '#C9A84C' : '#ffffff'})`,
                  transformOrigin: '50% 100%',
                  transform: `rotate(${deg}deg) translateX(-50%)`,
                  animation: `dsSparkleRay 2s ease-in-out ${i * 0.25}s infinite`,
                  opacity: 0.7,
                }} />
              ))}
              {/* Orbiting sparkle dots */}
              {[0,60,120,180,240,300].map((deg, i) => (
                <div key={`dot${deg}`} style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 4, height: 4, borderRadius: '50%',
                  background: i % 2 === 0 ? '#C9A84C' : '#E8D5A3',
                  boxShadow: `0 0 4px ${i % 2 === 0 ? '#C9A84C' : '#fff'}`,
                  animation: `dsOrbit 3s linear ${i * 0.5}s infinite`,
                  transformOrigin: '50% 50%',
                  // offset from center via CSS custom property
                }} />
              ))}
              <svg width="60" height="60" viewBox="0 0 80 80"
                style={{ animation: 'dsDiscoRotate 10s linear infinite', display: 'block', filter: 'drop-shadow(0 0 12px rgba(201,168,76,0.5))' }}>
                <defs>
                  <radialGradient id="ballGrad" cx="30%" cy="30%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="40%" stopColor="#E8D5A3" />
                    <stop offset="100%" stopColor="#2D1B69" />
                  </radialGradient>
                </defs>
                <circle cx="40" cy="40" r="32" fill="url(#ballGrad)" />
                {[14,22,30,38,46,54,62].map(x => <line key={`v${x}`} x1={x} y1="12" x2={x} y2="68" stroke="rgba(255,255,255,0.2)" strokeWidth="0.7" />)}
                {[18,26,36,46,56,64].map(y => <line key={`h${y}`} x1="12" y1={y} x2="68" y2={y} stroke="rgba(255,255,255,0.2)" strokeWidth="0.7" />)}
                <circle cx="26" cy="24" r="5" fill="rgba(255,255,255,0.75)" />
                <circle cx="52" cy="38" r="3" fill="rgba(201,168,76,0.8)" />
                <circle cx="36" cy="52" r="2.5" fill="rgba(255,255,255,0.6)" />
              </svg>
            </div>
          </div>

          {/* Birthday gifts — bottom left */}
          <div style={{ position: 'absolute', left: 14, bottom: 14, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
              {[
                { w: 24, h: 24, bg: '#9B7FCC', ribbon: '#E8D5A3' },
                { w: 28, h: 32, bg: '#C9A84C', ribbon: '#0d0820' },
                { w: 20, h: 20, bg: '#3BB4F4', ribbon: '#E8D5A3' },
              ].map((g, i) => (
                <div key={i} style={{ position: 'relative', width: g.w, height: g.h, background: g.bg, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                  {/* Ribbon vertical */}
                  <div style={{ position: 'absolute', top: 0, left: '50%', width: 2, height: '100%', background: g.ribbon, transform: 'translateX(-50%)' }} />
                  {/* Ribbon horizontal */}
                  <div style={{ position: 'absolute', top: '42%', left: 0, width: '100%', height: 2, background: g.ribbon }} />
                  {/* Bow */}
                  <div style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', fontSize: 8 }}>🎀</div>
                </div>
              ))}
            </div>
            {/* Table surface */}
            <div style={{ width: 90, height: 4, background: 'rgba(201,168,76,0.2)', borderRadius: 2, marginTop: 2 }} />
          </div>

          {/* Birthday cake — bottom right */}
          <div style={{ position: 'absolute', right: 14, bottom: 14, pointerEvents: 'none' }}>
            {/* Candle */}
            <div style={{ width: 4, height: 10, background: '#E8D5A3', margin: '0 auto', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: -7, left: -3, width: 10, height: 10,
                background: 'radial-gradient(circle, #fff 0%, #C9A84C 50%, transparent 80%)',
                borderRadius: '50%', animation: 'dsFlame 0.7s ease-in-out infinite',
              }} />
            </div>
            <div style={{ width: 32, height: 12, background: 'linear-gradient(to bottom, #9B7FCC, #7B5FAC)', margin: '0 auto', borderRadius: '4px 4px 0 0' }} />
            <div style={{ width: 44, height: 14, background: 'linear-gradient(to bottom, #C9A84C, #A07832)', margin: '0 auto' }} />
            <div style={{ width: 54, height: 16, background: 'linear-gradient(to bottom, #E8D5A3, #C9A84C)', margin: '0 auto', borderRadius: '0 0 5px 5px', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }} />
          </div>

          {/* Floor */}
          <div style={{
            position: 'absolute', inset: 0, bottom: 0, height: '22%',
            top: 'auto',
            background: 'repeating-conic-gradient(rgba(201,168,76,0.07) 0% 25%, rgba(155,127,204,0.05) 0% 50%, rgba(201,168,76,0.04) 0% 75%, rgba(255,255,255,0.03) 0% 100%)',
            backgroundSize: '28px 28px',
            borderTop: '1px solid rgba(201,168,76,0.1)',
            animation: 'dsTileGlow 4s ease-in-out infinite',
            pointerEvents: 'none',
          }} />

          {/* Ambient light spots */}
          <div style={{
            position: 'absolute', top: '30%', left: '20%', width: 120, height: 120,
            background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
            borderRadius: '50%', animation: 'dsAmbient 6s ease-in-out infinite', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '20%', right: '20%', width: 100, height: 100,
            background: 'radial-gradient(circle, rgba(155,127,204,0.06) 0%, transparent 70%)',
            borderRadius: '50%', animation: 'dsAmbient 6s ease-in-out 3s infinite', pointerEvents: 'none',
          }} />

          {/* Host */}
          <div style={{
            position: 'absolute', left: '22%', top: '48%',
            transform: 'translate(-50%, -50%)', width: HOST_SIZE, zIndex: 3,
          }}>
            <DancingCharacter name={PERSON_NAME} color="#C9A84C" size={HOST_SIZE} isHost animationVariant={0} />
          </div>

          {/* Other dancers */}
          {allOtherDancers.map((g, idx) => {
            const variant = Math.abs(g.name.charCodeAt(0) + (g.name.charCodeAt(1) || 0)) % 4
            return (
              <div key={g.name} style={{
                position: 'absolute', left: `${g.x}%`, top: `${g.y}%`,
                transform: 'translate(-50%, -50%)', width: AVATAR_SIZE,
                transition: 'left 0.2s linear, top 0.2s linear', zIndex: 2,
              }}>
                <DancingCharacter
                  name={g.name}
                  color={g.color || nameToColor(g.name)}
                  size={AVATAR_SIZE}
                  emoji={g.avatar_emoji || undefined}
                  photo={(g as PresenceData).avatarPhoto}
                  animationVariant={(idx + variant) % 4}
                />
              </div>
            )
          })}

          {/* Current visitor */}
          {joined && myAvatar && (
            <div style={{
              position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)', width: AVATAR_SIZE,
              transition: 'left 0.08s linear, top 0.08s linear', zIndex: 4,
            }}>
              <DancingCharacter
                name={visitorName}
                color={myAvatar.color}
                size={AVATAR_SIZE}
                emoji={myAvatar.emoji}
                photo={myAvatar.photo}
                animationVariant={1}
              />
            </div>
          )}

          {!joined && !showPicker && (
            <div style={{
              position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: 20, padding: '8px 20px',
              color: 'rgba(255,255,255,0.6)', fontSize: 13, whiteSpace: 'nowrap', zIndex: 5,
            }}>
              Move your cursor to step onto the floor
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {(joined || allOtherDancers.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 680 }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginRight: 4, alignSelf: 'center' }}>On the floor:</span>
              <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, color: '#0d0820', background: '#C9A84C', fontWeight: 600 }}>
                {PERSON_NAME} 👑
              </span>
              {joined && (
                <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, color: 'white', background: myColor + 'cc', fontWeight: 600 }}>
                  {visitorName} (you)
                </span>
              )}
              {allOtherDancers.map(n => (
                <span key={n.name} style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, color: 'white', background: nameToColor(n.name) + 'cc', fontWeight: 600 }}>
                  {n.name}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setMuted(m => !m)} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: 20, padding: '8px 16px', color: 'rgba(255,255,255,0.6)',
              fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
              letterSpacing: '0.05em',
            }}>
              {muted ? '○ Unmute' : '● Mute'}
            </button>
            {joined && (
              <button onClick={() => setShowPicker(true)} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: 20, padding: '8px 16px', color: 'rgba(255,255,255,0.6)',
                fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                letterSpacing: '0.05em',
              }}>
                Change avatar
              </button>
            )}
            <span style={{ color: 'rgba(201,168,76,0.5)', fontSize: 12, letterSpacing: '0.1em' }}>♪ Alors on danse</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dsDiscoRotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes dsFloat {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50%       { transform: translateY(-16px); opacity: 0.7; }
        }
        @keyframes dsTileGlow {
          0%, 100% { filter: brightness(1); }
          50%       { filter: brightness(1.4); }
        }
        @keyframes dsAmbient {
          0%, 100% { transform: translate(0, 0); opacity: 1; }
          50%       { transform: translate(20px, -15px); opacity: 0.6; }
        }
        @keyframes dsSparkleRay {
          0%, 100% { opacity: 0.4; transform: rotate(var(--deg)) translateX(-50%) scaleY(1); }
          50%       { opacity: 1;   transform: rotate(var(--deg)) translateX(-50%) scaleY(1.4); }
        }
        @keyframes dsOrbit {
          0%   { transform: translate(-50%, -50%) rotate(0deg) translateX(36px); }
          100% { transform: translate(-50%, -50%) rotate(360deg) translateX(36px); }
        }
        @keyframes dsFlame {
          0%, 100% { transform: scale(1) rotate(-3deg); }
          50%       { transform: scale(1.2) rotate(3deg); }
        }
      `}</style>
    </section>
  )
}
