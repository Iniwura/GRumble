import React, { useState, useEffect } from 'react'
import { readContract, writeContract, waitTx } from '../lib/gl.js'
import { CONTRACT_ADDR, FAUCET_URL, sh } from '../lib/config.js'

const MOCHI_IDEA = 'https://raw.githubusercontent.com/genlayer-foundation/genlayer-mascot/main/assets/stickers/mochi-sticker-idea.png'

export default function Profile({ account, onClose, onNotify }) {
  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [newName,  setNewName]  = useState('')
  const [avail,    setAvail]    = useState(null)
  const [checking, setChecking] = useState(false)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { loadProfile() }, [account])

  async function loadProfile() {
    setLoading(true)
    try {
      const raw = await readContract(CONTRACT_ADDR, 'get_profile', [account])
      if (raw && raw !== 'NOT_FOUND') {
        const p = JSON.parse(raw)
        setProfile(p)
        setNewName(p.username || '')
      }
    } catch(e) { onNotify(e.message, 'err') }
    finally { setLoading(false) }
  }

  const checkAvail = async (name) => {
    if (!name || name.length < 2) { setAvail(null); return }
    if (name === profile?.username) { setAvail(true); return }
    setChecking(true)
    try {
      const res = await readContract(CONTRACT_ADDR, 'check_username', [name])
      setAvail(res === 'AVAILABLE')
    } catch { setAvail(null) }
    finally { setChecking(false) }
  }

  const handleNameChange = (e) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 20)
    setNewName(val)
    setAvail(null)
    clearTimeout(window._pnTimer)
    window._pnTimer = setTimeout(() => checkAvail(val), 500)
  }

  async function saveUsername() {
    if (!newName || newName.length < 2) { onNotify('Min 2 characters', 'err'); return }
    if (avail === false) { onNotify('Username taken', 'err'); return }
    setSaving(true)
    try {
      const hash = await writeContract(CONTRACT_ADDR, account, 'set_username', [newName])
      onNotify('Saving username...', 'ok')
      await waitTx(hash, () => onNotify('Still finalizing...', 'ok'))
      onNotify('Username updated!', 'ok')
      await loadProfile()
    } catch(e) { onNotify(e.message, 'err') }
    finally { setSaving(false) }
  }

  const nameChanged = profile && newName !== profile.username

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:300,
      background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:'var(--card2)', border:'1px solid var(--border2)',
        borderRadius:16, padding:28, width:'100%', maxWidth:400,
        position:'relative', animation:'pop .25s var(--ease) both',
        boxShadow:'0 24px 80px rgba(0,0,0,.5)',
      }}>
        <button onClick={onClose} style={{
          position:'absolute', top:16, right:16,
          background:'var(--bg)', border:'1px solid var(--border)',
          color:'var(--muted)', fontSize:18, width:28, height:28,
          cursor:'pointer', borderRadius:'50%', display:'flex',
          alignItems:'center', justifyContent:'center',
        }}>×</button>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <img src={MOCHI_IDEA} alt="Mochi" style={{ width:44, objectFit:'contain' }} />
          <div>
            <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'1.1rem' }}>
              {loading ? '...' : profile?.username || sh(account)}
            </div>
            <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>
              {sh(account)}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display:'grid', gridTemplateColumns:'1fr 1fr',
          gap:10, marginBottom:20,
        }}>
          {[
            { v: loading ? '...' : (profile?.wins || 0), l:'Rumbles Won', c:'var(--gold)' },
            { v: loading ? '...' : (profile?.games || 0), l:'Games Played', c:'var(--lavender)' },
          ].map(({ v, l, c }) => (
            <div key={l} style={{
              background:'var(--bg2)', border:'1px solid var(--border)',
              borderRadius:'var(--r)', padding:'14px 16px', textAlign:'center',
            }}>
              <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'1.5rem', color:c, letterSpacing:'-.03em', lineHeight:1 }}>{v}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', letterSpacing:'.1em', textTransform:'uppercase', marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Username editor */}
        <div className="ff">
          <label className="fl">
            Battle Name
            {profile?.username && (
              <span style={{ color:'var(--lavender)', marginLeft:8, textTransform:'none', letterSpacing:0 }}>
                @{profile.username}
              </span>
            )}
          </label>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, position:'relative' }}>
              <input
                className="fi"
                value={newName}
                onChange={handleNameChange}
                placeholder="YourBattleName"
                maxLength={20}
              />
              {newName.length >= 2 && (
                <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:13 }}>
                  {checking ? '…' : avail === true ? '✓' : avail === false ? '✗' : ''}
                </span>
              )}
            </div>
            {nameChanged && (
              <button className="btn btn-blue" style={{ fontSize:11, padding:'0 14px', flexShrink:0 }}
                disabled={saving || avail === false} onClick={saveUsername}>
                {saving ? '⟳' : 'Save'}
              </button>
            )}
          </div>
          {newName.length >= 2 && !checking && avail !== null && (
            <div style={{ fontFamily:'var(--mono)', fontSize:10, marginTop:4,
              color: avail ? '#10B981' : '#EF4444' }}>
              {avail ? '✓ Available' : '✗ Already taken'}
            </div>
          )}
        </div>

        {/* Faucet */}
        <div style={{
          fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)',
          background:'var(--bg2)', borderRadius:8, padding:'10px 14px',
          lineHeight:1.7, marginTop:4,
        }}>
          Need GEN to create a GRumble?{' '}
          <a href={FAUCET_URL} target="_blank" rel="noreferrer"
            style={{ color:'var(--lavender)', textDecoration:'none' }}>
            Get testnet GEN →
          </a>
        </div>
      </div>
    </div>
  )
}
