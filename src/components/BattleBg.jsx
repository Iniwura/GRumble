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

    // Falling debris particles — ash and embers from battle
    const debris = Array.from({ length: 55 }, () => spawnDebris(true))

    function spawnDebris(random = false) {
      return {
        x:     Math.random() * W,
        y:     random ? Math.random() * H : -10,
        size:  Math.random() * 2.2 + 0.5,
        speedY: Math.random() * 0.6 + 0.2,
        speedX: (Math.random() - 0.5) * 0.3,
        alpha:  Math.random() * 0.4 + 0.1,
        sway:   Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.015 + 0.005,
        ember:  Math.random() > 0.75, // glowing ember vs ash
      }
    }

    // Distant explosions — slow, large, very faint
    const explosions = []
    function spawnExplosion() {
      explosions.push({
        x:      Math.random() * W,
        y:      H * 0.3 + Math.random() * H * 0.4,
        r:      0,
        maxR:   Math.random() * 60 + 30,
        speed:  Math.random() * 0.4 + 0.2,
        alpha:  0.25,
        rings:  Math.floor(Math.random() * 2) + 1,
      })
    }
    spawnExplosion()

    // Scan lines — subtle horizontal light streaks
    const scanLines = Array.from({ length: 3 }, () => ({
      y:     Math.random() * H,
      speed: Math.random() * 0.3 + 0.1,
      alpha: Math.random() * 0.04 + 0.01,
      width: Math.random() * 200 + 100,
    }))

    function draw() {
      ctx.clearRect(0, 0, W, H)

      // ── Distant explosions ────────────────────────────────
      for (let i = explosions.length - 1; i >= 0; i--) {
        const e = explosions[i]
        e.r    += e.speed
        e.alpha = Math.max(0, 0.25 * (1 - e.r / e.maxR))
        if (e.alpha <= 0) { explosions.splice(i, 1); continue }

        for (let ring = 0; ring < e.rings; ring++) {
          const rr = e.r * (1 - ring * 0.3)
          ctx.beginPath()
          ctx.arc(e.x, e.y, rr, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(110,100,255,${e.alpha * (1 - ring * 0.4)})`
          ctx.lineWidth   = 1
          ctx.stroke()
        }

        // Soft glow at centre
        if (e.r < e.maxR * 0.4) {
          const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r)
          g.addColorStop(0, `rgba(180,160,255,${e.alpha * 0.3})`)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.beginPath()
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
          ctx.fillStyle = g
          ctx.fill()
        }
      }

      // ── Falling debris ────────────────────────────────────
      debris.forEach(d => {
        d.sway   += d.swaySpeed
        d.x      += d.speedX + Math.sin(d.sway) * 0.3
        d.y      += d.speedY

        if (d.y > H + 10) Object.assign(d, spawnDebris())

        if (d.ember) {
          // Glowing ember — warm blue/violet dot
          ctx.beginPath()
          ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(150,130,255,${d.alpha})`
          ctx.fill()
        } else {
          // Ash flake — tiny rectangle
          ctx.fillStyle = `rgba(180,180,220,${d.alpha * 0.6})`
          ctx.fillRect(d.x, d.y, d.size * 0.8, d.size * 1.5)
        }
      })

      // ── Subtle scan lines ─────────────────────────────────
      scanLines.forEach(sl => {
        sl.y += sl.speed
        if (sl.y > H) sl.y = -20
        const g = ctx.createLinearGradient(0, sl.y, sl.width, sl.y)
        g.addColorStop(0, 'rgba(0,0,0,0)')
        g.addColorStop(0.5, `rgba(180,160,255,${sl.alpha})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, sl.y, sl.width, 1)
      })

      frame++
      if (frame % 150 === 0) spawnExplosion()

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas ref={ref} style={{
      position: 'fixed', inset: 0, zIndex: -1,
      pointerEvents: 'none', opacity: 0.6,
    }} />
  )
}
