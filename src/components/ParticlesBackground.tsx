'use client'

import Particles, { ParticlesProvider } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import type { Engine, ISourceOptions } from '@tsparticles/engine'

const options: ISourceOptions = {
  fullScreen: { enable: true, zIndex: 1 },
  interactivity: { events: {} },
  particles: {
    color: { value: ['#FFE9A8', '#F6D486', '#FFC7A8', '#F4A93C', '#9B7FCC', '#ffffff'] },
    move: {
      direction: 'top',
      enable: true,
      outModes: { default: 'out' },
      random: true,
      speed: 0.6,
      straight: false,
    },
    number: { density: { enable: true }, value: 60 },
    opacity: { value: { min: 0.1, max: 0.4 } },
    shape: { type: ['circle', 'star'] },
    size: { value: { min: 1, max: 3 } },
  },
  detectRetina: true,
}

async function init(engine: Engine) {
  await loadSlim(engine)
}

export default function ParticlesBackground() {
  return (
    <ParticlesProvider init={init}>
      <Particles
        id="tsparticles"
        options={options}
        style={{ pointerEvents: 'none' }}
      />
    </ParticlesProvider>
  )
}
