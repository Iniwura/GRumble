import { sh, weiToGen } from '../lib/config.js'
import React from 'react'

// Official GenLayer logo mark from brand page
const GL_MARK = 'https://cdn.prod.website-files.com/68108d68d0fc0cfa0c26dbc9/691359b88e6b1fd0260a9fea_GenLayer_Mark_White.svg'

const STATUS = {
  WAITING:  { color:'#F59E0B', bg:'rgba(245,158,11,.1)', border:'rgba(245,158,11,.25)', label:'Waiting' },
  ACTIVE:   { color:'var(--lavender)', bg:'var(--blue-dim)', border:'var(--blue-border)', label:'Live ⚔' },
  FINISHED: { color:'#10B981', bg:'rgba(16,185,129,.1)', border:'rgba(16,185,129,.2)', label:'Finished' },
}

export default function GameCard({ game, onJoin, onView, account }) {
  const sc       = STATUS[game.status] || STATUS.WAITING
  const isWinner = game.winner && game.winner === account

  return (
    <div style={{
      background:'var(--card)', border:'1px solid var(--border)',
      borderRadius:'var(--r)', padding:'18px 20px', cursor:'pointer',
      transition:'all 200ms var(--ease)', animation:'fin .3s var(--ease) both',
      position:'relative', overflow:'hidden',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor='var(--blue-border)'; e.currentTarget.style.boxShadow='0 4px 24px rgba(17,15,255,.1)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(17,15,255,.12)'; e.currentTarget.style.boxShadow='none' }}
    onClick={() => onView(game.id)}
    >
      {/* Top blue accent */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, var(--blue), var(--lavender))', opacity: game.status==='ACTIVE' ? 1 : 0.3 }} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <img src={GL_MARK} alt="GL" style={{ width:16, height:16, opacity:.6 }} />
            <span style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:15, letterSpacing:'-.02em' }}>
              {game.name || `GRumble #${game.id}`}
            </span>
          </div>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)' }}>
            by {sh(game.creator)}
          </div>
        </div>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.1em', textTransform:'uppercase', padding:'3px 10px', borderRadius:100, color:sc.color, background:sc.bg, border:`1px solid ${sc.border}`, flexShrink:0, marginTop:2 }}>
          {sc.label}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display:'flex', gap:0, marginBottom:14, borderRadius:8, overflow:'hidden', border:'1px solid var(--border)' }}>
        {[
          { v:`${game.player_count}`, l:'Players' },
          { v:`${game.alive_count}`,  l:'Alive' },
          { v:`${game.round||0}`,     l:'Round' },
          { v:`${weiToGen(game.reward_wei_wei)} GEN`, l:'Prize' },
        ].map(({v,l},i,arr) => (
          <div key={l} style={{ flex:1, padding:'10px 0', textAlign:'center', borderRight:i<arr.length-1?'1px solid var(--border)':'none', background:'var(--bg2)' }}>
            <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'1.1rem', color:'var(--blue)', letterSpacing:'-.02em', lineHeight:1 }}>{v}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--muted)', letterSpacing:'.08em', textTransform:'uppercase', marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>

      {isWinner && (
        <div style={{ fontFamily:'var(--mono)', fontSize:10, padding:'6px 12px', borderRadius:6, background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)', color:'var(--gold)', marginBottom:12 }}>
          👑 You won this Rumble!
        </div>
      )}

      <div style={{ display:'flex', gap:8 }} onClick={e => e.stopPropagation()}>
        {game.status === 'WAITING' && (
          <button className="btn btn-blue" style={{ fontSize:11, padding:'7px 16px' }} onClick={() => onJoin(game.id)}>
            Join — 50 pts
          </button>
        )}
        <button className="btn btn-outline" style={{ fontSize:11, padding:'7px 14px' }} onClick={() => onView(game.id)}>
          {game.status === 'ACTIVE' ? '⚔ Watch / Fight' : 'View'}
        </button>
      </div>
    </div>
  )
}
