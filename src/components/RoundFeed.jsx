import React from 'react'

const MOCHI_IDEA = 'https://raw.githubusercontent.com/genlayer-foundation/genlayer-mascot/main/assets/stickers/mochi-sticker-idea.png'

export default function RoundFeed({ rounds }) {
  if (!rounds?.length) return (
    <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--muted)', border:'1px solid var(--border)', borderRadius:'var(--r)', background:'var(--card)' }}>
      <img src={MOCHI_IDEA} alt="Mochi" style={{ width:64, height:64, objectFit:'contain', marginBottom:12, opacity:.6 }} />
      <div style={{ fontFamily:'var(--font)', fontWeight:700, fontSize:'.85rem', color:'var(--text2)', marginBottom:6 }}>No rounds yet</div>
      <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>Hit Play Round to start the battle</div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {[...rounds].reverse().map((r, i) => (
        <div key={r.round} style={{
          background:'var(--card)', border:'1px solid var(--border)',
          borderRadius:'var(--r)', overflow:'hidden',
          animation:`fin .4s var(--ease) ${i * .05}s both`,
        }}>
          {/* Round header */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 16px',
            background:'linear-gradient(90deg, rgba(17,15,255,.08), transparent)',
            borderBottom:'1px solid var(--border)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--blue)', animation:'pulse 2s infinite' }} />
              <span style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:12, color:'var(--lavender)', letterSpacing:'.06em' }}>
                ROUND {r.round}
              </span>
            </div>
            {r.eliminated?.length > 0 && (
              <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--gold)', background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.2)', padding:'2px 10px', borderRadius:100 }}>
                ☠ {r.eliminated.length} eliminated
              </span>
            )}
          </div>

          {/* AI Narrative */}
          <div style={{ padding:'14px 16px' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--muted)', marginBottom:8 }}>
              AI Announcer
            </div>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.75, fontStyle:'italic' }}>
              "{r.narrative}"
            </p>
          </div>

          {/* HP snapshot */}
          {r.hp_snapshot && Object.keys(r.hp_snapshot).length > 0 && (
            <div style={{ padding:'0 16px 12px', display:'flex', gap:6, flexWrap:'wrap' }}>
              {Object.entries(r.hp_snapshot).map(([addr, hp]) => (
                <span key={addr} style={{
                  fontFamily:'var(--mono)', fontSize:9,
                  padding:'3px 10px', borderRadius:100,
                  background: hp > 0 ? 'var(--blue-dim)' : 'rgba(4,4,15,.6)',
                  border: `1px solid ${hp > 0 ? 'var(--blue-border)' : 'rgba(17,15,255,.04)'}`,
                  color: hp > 60 ? '#10B981' : hp > 30 ? '#F59E0B' : hp > 0 ? '#EF4444' : 'var(--muted)',
                }}>
                  {addr.slice(-4)} {hp > 0 ? `${hp}hp` : '☠'}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
