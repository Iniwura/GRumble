import React from 'react'
import { sh } from '../lib/config.js'

// Official Mochi stickers (CC0) from GenLayer mascot repo
const MOCHI = {
  alive:    'https://raw.githubusercontent.com/genlayer-foundation/genlayer-mascot/main/assets/stickers/mochi-sticker-stonks-up.png',
  dead:     'https://raw.githubusercontent.com/genlayer-foundation/genlayer-mascot/main/assets/stickers/mochi-sticker-stonks-down.png',
  love:     'https://raw.githubusercontent.com/genlayer-foundation/genlayer-mascot/main/assets/stickers/mochi-sticker-love.png',
  idea:     'https://raw.githubusercontent.com/genlayer-foundation/genlayer-mascot/main/assets/stickers/mochi-sticker-idea.png',
  cookie:   'https://raw.githubusercontent.com/genlayer-foundation/genlayer-mascot/main/assets/stickers/mochi-sticker-cookie.png',
}

export default function PlayerCard({ address, data, isMe, rank }) {
  const { hp = 100, alive = true, kills = 0 } = data
  const hpPct   = Math.max(0, Math.min(100, hp))
  const hpColor = hpPct > 60 ? '#10B981' : hpPct > 30 ? '#F59E0B' : '#EF4444'
  const mochiSrc = !alive ? MOCHI.dead : kills >= 3 ? MOCHI.love : hpPct < 30 ? MOCHI.idea : MOCHI.alive

  return (
    <div style={{
      background: alive ? 'var(--card)' : 'rgba(4,4,15,.8)',
      border: `1px solid ${alive ? (isMe ? 'rgba(17,15,255,.5)' : 'var(--border)') : 'rgba(17,15,255,.04)'}`,
      borderRadius: 'var(--r)', padding: '14px 16px',
      opacity: alive ? 1 : 0.4,
      position: 'relative', overflow: 'hidden',
      transition: 'all 300ms var(--ease)',
      animation: 'fin .3s var(--ease) both',
    }}>
      {/* Blue glow for the me card */}
      {isMe && alive && (
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 0%, rgba(17,15,255,.08), transparent 70%)', pointerEvents:'none' }} />
      )}

      {/* Eliminated overlay */}
      {!alive && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:2, backdropFilter:'blur(2px)' }}>
          <span style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'1rem', color:'var(--muted)', letterSpacing:'.12em' }}>☠ ELIMINATED</span>
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10, position:'relative', zIndex:1 }}>
        {/* Mochi avatar */}
        <img src={mochiSrc} alt="Mochi" style={{ width:40, height:40, objectFit:'contain', flexShrink:0, animation: alive ? 'float 3s ease-in-out infinite' : 'none', filter: alive ? 'none' : 'grayscale(1) opacity(.4)' }} />

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
            <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:12, color: isMe ? 'var(--lavender)' : 'var(--text)' }}>
              {sh(address)}
            </span>
            {isMe && (
              <span style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.1em', color:'var(--blue)', background:'var(--blue-dim)', border:'1px solid var(--blue-border)', padding:'1px 7px', borderRadius:100 }}>YOU</span>
            )}
            {rank === 1 && alive && (
              <span style={{ fontSize:12 }}>👑</span>
            )}
          </div>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)' }}>{kills} kill{kills!==1?'s':''}</span>
        </div>

        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize: alive ? '1.3rem' : '.9rem', color: alive ? hpColor : 'var(--muted)', letterSpacing:'-.03em', lineHeight:1 }}>
            {alive ? hp : 0}
          </div>
          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--muted)', letterSpacing:'.1em' }}>HP</div>
        </div>
      </div>

      {/* HP bar */}
      <div style={{ position:'relative', zIndex:1 }}>
        <div className="hp-bar-wrap">
          <div className="hp-bar-fill" style={{ width:`${hpPct}%`, background:hpColor }} />
        </div>
      </div>
    </div>
  )
}
