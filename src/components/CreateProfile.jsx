import React, { useState } from 'react'
import { readContract, writeContract, waitTx } from '../lib/gl.js'
import { CONTRACT_ADDR, FAUCET_URL } from '../lib/config.js'

const ADJECTIVES = ['Savage','Crypto','Neon','Ghost','Iron','Silver','Void','Storm','Dark','Blaze','Turbo','Ultra']
const NOUNS      = ['Ninja','Knight','Samurai','Hunter','Fang','Mochi','Wolf','Slayer','Claw','Core','Byte','Pulse']

const randomUsername = () => {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num  = Math.floor(Math.random() * 99) + 1
  return `${adj}${noun}${num}`
}

const MOCHI_LOVE = 'https://raw.githubusercontent.com/genlayer-foundation/genlayer-mascot/main/assets/stickers/mochi-sticker-love.png'

export default function CreateProfile({ account, onCreated, onNotify }) {
  const [username, setUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState(null) // true | false | null
  const [busy, setBusy] = useState(false)

  const handleRandomize = () => {
    const name = randomUsername()
    setUsername(name)
    setAvailable(null)
  }

  const checkAvail = async (name) => {
    if (name.length < 2) { setAvailable(null); return }
    setChecking(true)
    try {
      const res = await readContract(CONTRACT_ADDR, 'check_username', [name])
      setAvailable(res === 'AVAILABLE')
    } catch { setAvailable(null) }
    finally { setChecking(false) }
  }

  const handleChange = (e) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 20)
    setUsername(val)
    setAvailable(null)
    if (val.length >= 2) {
      clearTimeout(window._unTimer)
      window._unTimer = setTimeout(() => checkAvail(val), 500)
    }
  }

  const handleSubmit = async () => {
    if (!username || username.length < 2) { onNotify('Enter a username (min 2 chars)', 'err'); return }
    if (available === false) { onNotify('Username taken — try another', 'err'); return }
    setBusy(true)
    try {
      const hash = await writeContract(CONTRACT_ADDR, account, 'create_profile', [username])
      onNotify('Creating your profile...', 'ok')
      await waitTx(hash, () => onNotify('Still finalizing...', 'ok'))
      onNotify(`Welcome to GRumble, ${username}!`, 'ok')
      onCreated(username)
    } catch(e) { onNotify(e.message, 'err') }
    finally { setBusy(false) }
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:400,
      background:'rgba(0,0,0,.85)', backdropFilter:'blur(12px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }}>
      <div style={{
        background:'var(--card2)', border:'1px solid var(--blue-border)',
        borderRadius:20, padding:32, width:'100%', maxWidth:440,
        boxShadow:'0 0 60px rgba(17,15,255,.2)', animation:'pop .3s var(--ease)',
        textAlign:'center',
      }}>
        {/* Mochi */}
        <img src={MOCHI_LOVE} alt="Mochi"
          style={{ width:80, objectFit:'contain', marginBottom:16, animation:'float 3s ease-in-out infinite' }} />

        <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'1.4rem', letterSpacing:'-.03em', marginBottom:8 }}>
          Welcome to GRumble
        </div>
        <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginBottom:24, lineHeight:1.7 }}>
          Choose a battle name before entering the arena.
        </div>

        {/* Username input */}
        <div style={{ marginBottom:8, textAlign:'left' }}>
          <label className="fl">Your Battle Name</label>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, position:'relative' }}>
              <input
                className="fi"
                value={username}
                onChange={handleChange}
                placeholder="SavageMochi99"
                maxLength={20}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ paddingRight: 32 }}
              />
              {/* Availability indicator */}
              {username.length >= 2 && (
                <span style={{
                  position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                  fontSize:14,
                }}>
                  {checking ? '…' : available === true ? '✓' : available === false ? '✗' : ''}
                </span>
              )}
            </div>
            <button
              className="btn btn-navy"
              style={{ fontSize:11, padding:'0 14px', flexShrink:0, whiteSpace:'nowrap' }}
              onClick={handleRandomize}
            >
              🎲 Random
            </button>
          </div>
          {/* Availability message */}
          {username.length >= 2 && !checking && (
            <div style={{
              fontFamily:'var(--mono)', fontSize:10, marginTop:5,
              color: available === true ? '#10B981' : available === false ? '#EF4444' : 'transparent',
            }}>
              {available === true ? '✓ Available' : available === false ? '✗ Already taken' : '.'}
            </div>
          )}
        </div>

        <button
          className="btn btn-blue"
          style={{ width:'100%', marginTop:8, marginBottom:14 }}
          disabled={busy || !username || username.length < 2 || available === false}
          onClick={handleSubmit}
        >
          {busy ? <><span className="spin-el" style={{ marginRight:8 }} /> Creating profile...</> : 'Enter the Arena ⚔'}
        </button>

        {/* Faucet link */}
        <div style={{
          fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', lineHeight:1.7,
          background:'var(--bg2)', borderRadius:8, padding:'10px 14px',
        }}>
          Need GEN to create a GRumble?{' '}
          <a href={FAUCET_URL} target="_blank" rel="noreferrer"
            style={{ color:'var(--lavender)', textDecoration:'none' }}>
            Get it from the faucet →
          </a>
        </div>
      </div>
    </div>
  )
}
