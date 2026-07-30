'use client'

import { useEffect } from 'react'

export default function CursorSparkle() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return

    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9999;'
    document.body.appendChild(container)

    let sparkleCount = 0
    const MAX_SPARKLES = 20

    const handleMouseMove = (e: MouseEvent) => {
      if (sparkleCount >= MAX_SPARKLES) return
      sparkleCount++

      const sparkle = document.createElement('div')
      const chars = ['✦', '★', '✸', '✺', '✻']
      const char = chars[Math.floor(Math.random() * chars.length)]
      const colors = ['#F4A93C', '#F0654E', '#FFE9A8', '#FFC7A8', '#9B7FCC']
      const color = colors[Math.floor(Math.random() * colors.length)]
      const size = 12 + Math.floor(Math.random() * 12)

      sparkle.textContent = char
      sparkle.style.cssText = `
        position: absolute;
        left: ${e.clientX - size / 2}px;
        top: ${e.clientY - size / 2}px;
        font-size: ${size}px;
        color: ${color};
        pointer-events: none;
        animation: sparkleAnim 0.6s ease-out forwards;
        line-height: 1;
      `
      container.appendChild(sparkle)

      setTimeout(() => {
        if (sparkle.parentNode === container) container.removeChild(sparkle)
        sparkleCount--
      }, 600)
    }

    const style = document.createElement('style')
    style.textContent = `
      @keyframes sparkleAnim {
        0% { opacity: 1; transform: scale(0) rotate(0deg); }
        50% { opacity: 1; transform: scale(1) rotate(180deg); }
        100% { opacity: 0; transform: scale(0.5) rotate(360deg) translateY(-10px); }
      }
    `
    document.head.appendChild(style)
    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (container.parentNode) document.body.removeChild(container)
      if (style.parentNode) document.head.removeChild(style)
    }
  }, [])

  return null
}
