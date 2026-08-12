'use client'

import { useState } from 'react'

async function fireSliceConfetti() {
  const confetti = (await import('canvas-confetti')).default
  const colors = ['#C9A84C', '#E8D5A3', '#ffffff', '#9B7FCC']
  confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors, gravity: 0.8 })
  setTimeout(() => {
    confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0 }, colors })
    confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1 }, colors })
  }, 300)
}

const SLICE_CONFIGS = [
  { id: 0, label: 'Rose Vanilla', frosting: '#E8C9A3', layer1: '#C9A84C', layer2: '#E8D5A3', decoration: '🌹', angle: -90 },
  { id: 1, label: 'Gold Lemon',   frosting: '#E8D5A3', layer1: '#C9A84C', layer2: '#F0E68C', decoration: '🍋', angle: -30 },
  { id: 2, label: 'Violet Berry', frosting: '#C4B5F4', layer1: '#9B7FCC', layer2: '#D4C1F7', decoration: '🫐', angle:  30 },
  { id: 3, label: 'Champagne',    frosting: '#F7E7CE', layer1: '#E8D5A3', layer2: '#F7F0E0', decoration: '✨', angle:  90 },
  { id: 4, label: 'Midnight',     frosting: '#9B7FCC', layer1: '#6B4FC8', layer2: '#C4B5F4', decoration: '🌙', angle: 150 },
  { id: 5, label: 'Leo Caramel',  frosting: '#C9A84C', layer1: '#A07832', layer2: '#E8C87A', decoration: '♌', angle: 210 },
]

// SVG pie-slice path for a 6-slice cake, centered at (120,120), r=110
function slicePath(sliceIndex: number, totalSlices: number, r: number, cx: number, cy: number) {
  const angleStep = (2 * Math.PI) / totalSlices
  const startAngle = sliceIndex * angleStep - Math.PI / 2
  const endAngle = startAngle + angleStep
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`
}

function labelPos(sliceIndex: number, totalSlices: number, r: number, cx: number, cy: number) {
  const angleStep = (2 * Math.PI) / totalSlices
  const midAngle = sliceIndex * angleStep - Math.PI / 2 + angleStep / 2
  return {
    x: cx + r * 0.62 * Math.cos(midAngle),
    y: cy + r * 0.62 * Math.sin(midAngle),
  }
}

export default function CakeCuttingSection() {
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null)
  const [chosenSlice, setChosenSlice] = useState<number | null>(null)
  const [served, setServed] = useState(false)

  const handleChoose = (id: number) => {
    if (served) return
    setChosenSlice(id)
    setServed(true)
    fireSliceConfetti()
  }

  const CX = 120, CY = 120, R = 108

  return (
    <section style={{
      position: 'relative',
      padding: '80px 16px',
      background: 'transparent',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
        {/* Header */}
        <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: 12 }}>
          ✦ &nbsp; the moment we've been waiting for &nbsp; ✦
        </p>
        <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em', marginBottom: 10 }}>
          Let&apos;s Slice the Cake
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, marginBottom: 40 }}>
          {served ? 'Enjoy your slice — virtually delicious! 🍽️' : 'Choose your slice — hover and click to claim it'}
        </p>

        {!served ? (
          /* Interactive cake */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <div style={{ position: 'relative', width: 240, height: 240 }}>
              <svg width="240" height="240" viewBox="0 0 240 240" style={{ overflow: 'visible' }}>
                <defs>
                  {SLICE_CONFIGS.map(s => (
                    <radialGradient key={s.id} id={`sliceGrad${s.id}`} cx="30%" cy="30%">
                      <stop offset="0%" stopColor={s.frosting} />
                      <stop offset="100%" stopColor={s.layer1} />
                    </radialGradient>
                  ))}
                  <filter id="cakeGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Outer ring / plate */}
                <circle cx={CX} cy={CY} r={R + 6} fill="rgba(255,255,255,0.04)" stroke="rgba(201,168,76,0.15)" strokeWidth="1" />

                {SLICE_CONFIGS.map(s => {
                  const isHovered = hoveredSlice === s.id
                  const path = slicePath(s.id, 6, R, CX, CY)
                  const lp = labelPos(s.id, 6, R, CX, CY)
                  const scale = isHovered ? 1.06 : 1

                  return (
                    <g key={s.id}
                      style={{ cursor: 'pointer', transition: 'transform 0.2s ease', transformOrigin: `${CX}px ${CY}px`, transform: `scale(${scale})` }}
                      onMouseEnter={() => setHoveredSlice(s.id)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      onClick={() => handleChoose(s.id)}
                    >
                      <path
                        d={path}
                        fill={`url(#sliceGrad${s.id})`}
                        stroke={isHovered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'}
                        strokeWidth={isHovered ? 2 : 1}
                        style={{ filter: isHovered ? 'brightness(1.2) drop-shadow(0 0 8px rgba(201,168,76,0.4))' : 'none' }}
                      />
                      {/* Decoration emoji */}
                      <text
                        x={lp.x} y={lp.y}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={isHovered ? 22 : 18}
                        style={{ transition: 'font-size 0.2s', userSelect: 'none', pointerEvents: 'none' }}
                      >
                        {s.decoration}
                      </text>
                    </g>
                  )
                })}

                {/* Center cap */}
                <circle cx={CX} cy={CY} r={14} fill="rgba(8,6,20,0.8)" stroke="rgba(201,168,76,0.2)" strokeWidth="1" />
                <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize={14} style={{ userSelect: 'none' }}>🎂</text>

                {/* Divider lines */}
                {SLICE_CONFIGS.map(s => {
                  const angle = s.id * (Math.PI * 2 / 6) - Math.PI / 2
                  return (
                    <line key={s.id}
                      x1={CX} y1={CY}
                      x2={CX + R * Math.cos(angle)} y2={CY + R * Math.sin(angle)}
                      stroke="rgba(255,255,255,0.15)" strokeWidth="1"
                    />
                  )
                })}
              </svg>

              {/* Hover label */}
              {hoveredSlice !== null && (
                <div style={{
                  position: 'absolute', bottom: -36, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(8,6,20,0.9)', border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: 20, padding: '5px 16px', whiteSpace: 'nowrap',
                  color: '#E8D5A3', fontSize: 13, fontWeight: 600,
                  backdropFilter: 'blur(8px)',
                }}>
                  {SLICE_CONFIGS[hoveredSlice].label}
                </div>
              )}
            </div>

            {/* Slice labels below */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              {SLICE_CONFIGS.map(s => (
                <button key={s.id}
                  onMouseEnter={() => setHoveredSlice(s.id)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() => handleChoose(s.id)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                    border: `1px solid ${hoveredSlice === s.id ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    background: hoveredSlice === s.id ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.03)',
                    color: hoveredSlice === s.id ? '#E8D5A3' : 'rgba(255,255,255,0.4)',
                    fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                  }}
                >
                  {s.decoration} {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Served state */
          <div style={{ animation: 'ccFadeUp 0.6s ease-out' }}>
            {chosenSlice !== null && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                {/* Big slice */}
                <div style={{
                  background: `linear-gradient(135deg, ${SLICE_CONFIGS[chosenSlice].frosting}, ${SLICE_CONFIGS[chosenSlice].layer1})`,
                  borderRadius: 16, padding: '32px 48px',
                  border: '1px solid rgba(201,168,76,0.2)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  animation: 'ccSlicePop 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  <div style={{ fontSize: 64, marginBottom: 8 }}>{SLICE_CONFIGS[chosenSlice].decoration}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0d0820' }}>
                    {SLICE_CONFIGS[chosenSlice].label}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(201,168,76,0.12)',
                  borderRadius: 16, padding: '20px 32px',
                  backdropFilter: 'blur(12px)',
                }}>
                  <p style={{ color: '#E8D5A3', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                    Your slice is served! 🍽️
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                    Zero calories — the beauty of a virtual party ✨
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes ccFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ccSlicePop {
          from { transform: scale(0.7) rotate(-10deg); opacity: 0; }
          to { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </section>
  )
}
