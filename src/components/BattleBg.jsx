import React, { useEffect, useRef } from 'react'

export default function BattleBg() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W, H, animId, frame = 0

    function resize() {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    resize()

    // Falling ash + embers
    const debris = Array.from({ length: 140 }, () => makeDebris(true))

    function makeDebris(scatter = false) {
      return {
        x:      Math.random() * W,
        y:      scatter ? Math.random() * H : -8,
        size:   Math.random() * 2.5 + 0.8,
        vy:     Math.random() * 0.7 + 0.25,
        vx:     (Math.random() - 0.5) * 0.4,
        alpha:  Math.random() * 0.55 + 0.2,
        sway:   Math.random() * Math.PI * 2,
        ss:     Math.random() * 0.018 + 0.005,
        ember:  Math.random() > 0.6,
      }
    }

    // Explosion rings
    const expl = []
    function addExplosion() {
      expl.push({
        x:    W * 0.1 + Math.random() * W * 0.8,
        y:    H * 0.15 + Math.random() * H * 0.5,
        r:    0,
        max:  Math.random() * 90 + 40,
        spd:  Math.random() * 0.5 + 0.25,
        a:    0.45,
      })
    }
    addExplosion(); addExplosion(); addExplosion(); addExplosion()

    function draw() {
      ctx.clearRect(0, 0, W, H)

      // Explosion rings
      for (let i = expl.length - 1; i >= 0; i--) {
        const e = expl[i]
        e.r += e.spd
        e.a  = Math.max(0, 0.45 * (1 - e.r / e.max))
        if (e.a <= 0) { expl.splice(i, 1); continue }

        ctx.beginPath()
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(160,130,255,${e.a + 0.15})`
        ctx.lineWidth   = 1.5
        ctx.stroke()

        // Inner glow
        if (e.r < e.max * 0.5) {
          const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 0.8)
          g.addColorStop(0, `rgba(200,180,255,${e.a * 0.25})`)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.beginPath()
          ctx.arc(e.x, e.y, e.r * 0.8, 0, Math.PI * 2)
          ctx.fillStyle = g
          ctx.fill()
        }
      }

      // Debris
      debris.forEach(d => {
        d.sway += d.ss
        d.x    += d.vx + Math.sin(d.sway) * 0.4
        d.y    += d.vy
        if (d.y > H + 10) Object.assign(d, makeDebris())
        if (d.x < -10)    d.x = W + 5
        if (d.x > W + 10) d.x = -5

        if (d.ember) {
          ctx.beginPath()
          ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(180,160,255,${d.alpha + 0.2})`
          ctx.fill()
          // tiny glow ring on ember
          ctx.beginPath()
          ctx.arc(d.x, d.y, d.size + 1.5, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(160,140,255,${d.alpha * 0.3})`
          ctx.lineWidth = 1
          ctx.stroke()
        } else {
          ctx.fillStyle = `rgba(200,190,240,${d.alpha * 0.7})`
          ctx.fillRect(d.x, d.y, d.size * 0.7, d.size * 2)
        }
      })

      frame++
      if (frame % 70 === 0) addExplosion()

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
        position:      'fixed',
        inset:         0,
        zIndex:        0,         // above body bg, below all content
        pointerEvents: 'none',
        opacity:       0.85,
      }}
    />
  )
}
