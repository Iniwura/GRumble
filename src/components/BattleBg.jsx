import React, { useEffect, useRef } from 'react'

export default function BattleBg() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let W, H, particles = [], rings = [], frame = 0
    let animId

    function resize() {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    resize()

    // Spawn a shockwave ring from centre
    function spawnRing() {
      rings.push({
        x: W / 2 + (Math.random() - .5) * W * .3,
        y: H / 2 + (Math.random() - .5) * H * .3,
        r: 0,
        maxR: Math.random() * 280 + 120,
        speed: Math.random() * .8 + .4,
        alpha: .5,
        color: Math.random() > .5
          ? `17,15,255`    // GenLayer blue
          : `188,162,255`, // lavender
        width: Math.random() * 1.5 + .5,
      })
    }

    // Spawn ember / debris particle
    function spawnParticle() {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * .6 + .1
      particles.push({
        x: W / 2 + (Math.random() - .5) * W * .5,
        y: H / 2 + (Math.random() - .5) * H * .5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 1.8 + .4,
        alpha: Math.random() * .5 + .2,
        fade: Math.random() * .003 + .001,
        color: Math.random() > .6
          ? `17,15,255`
          : Math.random() > .5 ? `188,162,255` : `255,255,255`,
      })
    }

    // Seed initial particles
    for (let i = 0; i < 60; i++) spawnParticle()
    spawnRing()

    function draw() {
      ctx.clearRect(0, 0, W, H)

      // Draw rings
      rings = rings.filter(ring => ring.alpha > 0)
      for (const ring of rings) {
        ring.r     += ring.speed
        ring.alpha  = Math.max(0, .5 * (1 - ring.r / ring.maxR))
        ctx.beginPath()
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${ring.color}, ${ring.alpha})`
        ctx.lineWidth   = ring.width
        ctx.stroke()
      }

      // Draw particles
      particles = particles.filter(p => p.alpha > 0)
      for (const p of particles) {
        p.x     += p.vx
        p.y     += p.vy
        p.alpha -= p.fade
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`
        ctx.fill()
      }

      // Spawn new elements on interval
      frame++
      if (frame % 90 === 0)  spawnRing()
      if (frame % 12 === 0)  spawnParticle()
      if (particles.length < 30) for (let i = 0; i < 5; i++) spawnParticle()

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: .55,
      }}
    />
  )
}
