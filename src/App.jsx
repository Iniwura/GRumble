import React, { useState, useEffect, useCallback } from 'react'
import PlayerCard    from './components/PlayerCard.jsx'
import RoundFeed    from './components/RoundFeed.jsx'
import GameCard     from './components/GameCard.jsx'
import CreateProfile from './components/CreateProfile.jsx'
import Profile      from './components/Profile.jsx'
import BattleBg from './components/BattleBg.jsx'
import { readContract, writeContract, waitTx, CHAIN_ID, NET } from './lib/gl.js'
import { CONTRACT_ADDR, FAUCET_URL, sh, weiToGen, genToWei } from './lib/config.js'

const MOCHI_MAIN   = 'https://raw.githubusercontent.com/genlayer-foundation/genlayer-mascot/main/assets/renders/mochi-main.png'
const MOCHI_COOKIE = 'https://raw.githubusercontent.com/genlayer-foundation/genlayer-mascot/main/assets/stickers/mochi-sticker-cookie.png'
const GL_MARK_W    = 'https://cdn.prod.website-files.com/68108d68d0fc0cfa0c26dbc9/691359b88e6b1fd0260a9fea_GenLayer_Mark_White.svg'
const GL_LOGO_W    = 'https://cdn.prod.website-files.com/68108d68d0fc0cfa0c26dbc9/691359baf22648f4efd074b2_GenLayer_Logo_White_Cropped.svg'

function Toast({ msg, type, onClear }) {
  useEffect(() => { if (!msg) return; const t = setTimeout(onClear, 5000); return () => clearTimeout(t) }, [msg])
  if (!msg) return null
  return (
    <div style={{
      position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
      background:'var(--card2)', border:`1px solid ${type==='err'?'rgba(239,68,68,.35)':'var(--blue-border)'}`,
      color:type==='err'?'#F87171':'var(--lavender)',
      padding:'10px 22px', borderRadius:100, fontFamily:'var(--mono)', fontSize:11,
      zIndex:999, boxShadow:'0 8px 32px rgba(0,0,0,.5)', animation:'fin .3s var(--ease)',
    }}>{msg}</div>
  )
}

function Modal({ title, sub, children, onClose }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.75)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--card2)',border:'1px solid var(--border2)',borderRadius:16,padding:28,width:'100%',maxWidth:460,maxHeight:'90vh',overflowY:'auto',position:'relative',animation:'pop .25s var(--ease) both',boxShadow:'0 24px 80px rgba(0,0,0,.6)' }}>
        <button onClick={onClose} style={{ position:'absolute',top:16,right:16,background:'var(--bg)',border:'1px solid var(--border)',color:'var(--muted)',fontSize:18,width:28,height:28,cursor:'pointer',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center' }}>×</button>
        {title && <div style={{ fontFamily:'var(--font)',fontWeight:800,fontSize:'1.1rem',letterSpacing:'-.02em',marginBottom:6 }}>{title}</div>}
        {sub   && <div style={{ fontSize:11,color:'var(--muted)',marginBottom:20,lineHeight:1.7 }}>{sub}</div>}
        {children}
      </div>
    </div>
  )
}

export default function App() {
  const [games,        setGames]        = useState([])
  const [activeGame,   setActiveGame]   = useState(null)
  const [account,      setAccount]      = useState('')
  const [username,     setUsername]     = useState('')
  const [connected,    setConnected]    = useState(false)
  const [hasProfile,   setHasProfile]   = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [txBusy,       setTxBusy]       = useState(false)
  const [toast,        setToast]        = useState({ msg:'', type:'ok' })
  const [createOpen,   setCreateOpen]   = useState(false)
  const [showCreate,   setShowCreate]   = useState(false)   // first-connect profile popup
  const [showProfile,  setShowProfile]  = useState(false)
  const [gameName,     setGameName]     = useState('')
  const [rewardGen,    setRewardGen]    = useState('2')
  const [leaderboard,  setLeaderboard]  = useState([])
  const [view,         setView]         = useState('lobby')

  const notify = (msg, type='ok') => setToast({ msg, type })

  const loadGames = useCallback(async () => {
    if (!CONTRACT_ADDR) { setLoading(false); return }
    try {
      const raw = await readContract(CONTRACT_ADDR, 'get_all_games', [], true)
      setGames(raw && raw !== '[]' ? JSON.parse(raw).reverse() : [])
    } catch(e) { notify(e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  const loadGame = async (id) => {
    try {
      const raw = await readContract(CONTRACT_ADDR, 'get_game', [id])
      if (raw && raw !== 'NOT_FOUND') setActiveGame(JSON.parse(raw))
    } catch(e) { notify(e.message, 'err') }
  }

  const loadLeaderboard = async () => {
    try {
      const raw = await readContract(CONTRACT_ADDR, 'get_leaderboard', [], true)
      if (raw && raw !== '[]') setLeaderboard(JSON.parse(raw))
    } catch(e) {}
  }

  const checkProfile = async (addr) => {
    try {
      const raw = await readContract(CONTRACT_ADDR, 'get_profile', [addr])
      if (raw && raw !== 'NOT_FOUND') {
        const p = JSON.parse(raw)
        setHasProfile(true)
        setUsername(p.username || '')
        return true
      }
    } catch {}
    setHasProfile(false)
    return false
  }

  useEffect(() => { loadGames() }, [loadGames])

  useEffect(() => {
    if (!window.ethereum) return
    window.ethereum.request({ method:'eth_accounts' }).then(async a => {
      if (a?.[0]) {
        setAccount(a[0]); setConnected(true); window._glAccount = a[0]
        await checkProfile(a[0])
      }
    }).catch(()=>{})
  }, [])

  const connect = async () => {
    if (!window.ethereum) { notify('Install MetaMask', 'err'); return }
    try {
      const accs  = await window.ethereum.request({ method:'eth_requestAccounts' })
      const chain = await window.ethereum.request({ method:'eth_chainId' })
      if (chain !== CHAIN_ID) {
        try { await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{chainId:CHAIN_ID}] }) }
        catch(e) { if(e.code===4902||e.code===-32603) await window.ethereum.request({ method:'wallet_addEthereumChain', params:[NET] }) }
      }
      setAccount(accs[0]); setConnected(true); window._glAccount = accs[0]
      notify('Connected!', 'ok')
      const had = await checkProfile(accs[0])
      if (!had) setShowCreate(true) // auto-popup if no profile
      window.ethereum.on('accountsChanged', a => { if (!a.length) { setAccount(''); setConnected(false); setHasProfile(false); setUsername('') } })
      window.ethereum.on('chainChanged', () => window.location.reload())
    } catch(e) { notify(e.message || 'Failed', 'err') }
  }

  const tx = async (label, fn) => {
    setTxBusy(true)
    try { await fn() }
    catch(e) { notify(e.message, 'err') }
    finally { setTxBusy(false) }
  }

  const handleCreate = () => tx('create', async () => {
    if (!gameName.trim()) { notify('Enter a game name', 'err'); return }
    const reward = parseFloat(rewardGen)
    if (!reward || reward <= 0) { notify('Enter a valid GEN reward', 'err'); return }
    const valueWei = genToWei(rewardGen)
    const hash = await writeContract(CONTRACT_ADDR, account, 'create_game', [gameName], valueWei)
    notify(`Creating GRumble with ${rewardGen} GEN reward...`, 'ok')
    await waitTx(hash, () => notify('Still finalizing...', 'ok'))
    notify('GRumble created!', 'ok')
    setCreateOpen(false); setGameName(''); setRewardGen('2')
    await loadGames()
  })

  const handleJoin = (id) => tx('join', async () => {
    const hash = await writeContract(CONTRACT_ADDR, account, 'join_game', [id])
    notify('Joining GRumble — free entry!', 'ok')
    await waitTx(hash, () => notify('Still finalizing...', 'ok'))
    notify('Joined!', 'ok')
    await loadGames()
    if (activeGame?.id === id) await loadGame(id)
  })

  const handleStart = (id) => tx('start', async () => {
    const hash = await writeContract(CONTRACT_ADDR, account, 'start_game', [id])
    notify('Starting the GRumble...', 'ok')
    await waitTx(hash, () => notify('Still finalizing...', 'ok'))
    notify('GRUMBLE HAS BEGUN! ⚔', 'ok')
    await loadGame(id)
  })

  const handlePlayRound = (id) => tx('round', async () => {
    notify('AI generating round... (1-3 min on Bradbury)', 'ok')
    const hash = await writeContract(CONTRACT_ADDR, account, 'play_round', [id])
    await waitTx(hash, () => notify('AI narrating the carnage...', 'ok'), 40)
    notify('Round complete!', 'ok')
    await loadGame(id)
  })

  const handleCancel = (id) => tx('cancel', async () => {
    if (!window.confirm('Cancel this GRumble and recover your GEN?')) return
    const hash = await writeContract(CONTRACT_ADDR, account, 'cancel_game', [id])
    notify('Cancelling GRumble...', 'ok')
    await waitTx(hash, () => notify('Finalising...', 'ok'))
    notify('GRumble cancelled — GEN refunded.', 'ok')
    await loadGames()
    setView('lobby')
  })

  const handleClaim = (id) => tx('claim', async () => {
    const hash = await writeContract(CONTRACT_ADDR, account, 'claim_prize', [id])
    notify('Claiming GEN prize...', 'ok')
    await waitTx(hash, () => notify('Finalizing...', 'ok'))
    notify('GEN prize claimed! You are the champion! 👑', 'ok')
    await loadGame(id)
  })

  const viewGame = async (id) => { await loadGame(id); setView('game') }

  const isCreator  = activeGame?.creator === account
  const isWinner   = activeGame?.winner === account
  const isInGame   = activeGame && account in (activeGame?.players || {})
  const aliveCount = activeGame ? Object.values(activeGame?.players || {}).filter(p => p.alive).length : 0
  const rewardDisplay = activeGame ? weiToGen(activeGame.reward_wei) : '0'

  const sortedPlayers = activeGame
    ? Object.entries(activeGame.players || {}).sort(([,a],[,b]) =>
        a.alive !== b.alive ? (a.alive ? -1 : 1) : (b.hp||0)-(a.hp||0))
    : []

  return (
    <>
      <BattleBg />
      <div style={{ position:'relative', zIndex:2, minHeight:'100vh' }}>
      {/* HEADER */}
      <header style={{ position:'sticky',top:0,zIndex:100,height:58,display:'flex',alignItems:'center',gap:14,padding:'0 clamp(1rem,4vw,2.5rem)',background:'rgba(4,4,15,.92)',backdropFilter:'blur(24px)',borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,cursor:'pointer' }} onClick={() => setView('lobby')}>
          <img src={GL_MARK_W} alt="GL" style={{ width:28,height:28 }} />
          <span style={{ fontFamily:'var(--font)',fontWeight:800,fontSize:15,letterSpacing:'-.02em' }}>GRumble</span>
          <span style={{ fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.12em',background:'var(--blue-dim)',border:'1px solid var(--blue-border)',color:'var(--lavender)',padding:'2px 9px',borderRadius:100 }}>BATTLE ROYALE</span>
        </div>
        <div style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:10 }}>
          {['lobby','leaderboard'].map(v => (
            <button key={v} onClick={() => { setView(v); if(v==='leaderboard') loadLeaderboard() }}
              style={{ fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.08em',textTransform:'uppercase',background:'transparent',border:'none',color:view===v?'var(--lavender)':'var(--muted)',cursor:'pointer',padding:'4px 8px',transition:'color 150ms' }}>
              {v==='lobby'?'⚔ Lobby':'🏆 Champions'}
            </button>
          ))}
          {connected
            ? <div style={{ fontFamily:'var(--mono)',fontSize:11,color:'var(--lavender)',background:'var(--blue-dim)',border:'1px solid var(--blue-border)',padding:'5px 14px',borderRadius:100,display:'flex',alignItems:'center',gap:6,cursor:'pointer' }}
                onClick={() => setShowProfile(true)}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'var(--blue)',display:'inline-block',animation:'pulse 2s infinite' }} />
                {username || sh(account)}
              </div>
            : <button className="btn btn-outline" style={{ fontSize:12,padding:'7px 16px' }} onClick={connect}>Connect Wallet</button>
          }
          {connected && (
            <button className="btn btn-blue" style={{ fontSize:12,padding:'7px 16px' }} onClick={() => {
              if (!hasProfile) { setShowCreate(true); return }
              setCreateOpen(true)
            }}>
              + Create GRumble
            </button>
          )}
        </div>
      </header>

      {/* LOBBY */}
      {view === 'lobby' && (
        <div style={{ maxWidth:1060,margin:'0 auto',padding:'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,2rem)' }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:32,alignItems:'center',padding:'clamp(2rem,6vw,4rem) 0 clamp(2rem,4vw,3rem)' }}>
            <div>
              <div style={{ display:'inline-flex',alignItems:'center',gap:6,fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.15em',textTransform:'uppercase',color:'var(--lavender)',border:'1px solid var(--blue-border)',background:'var(--blue-dim)',padding:'5px 16px',borderRadius:100,marginBottom:20 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'var(--blue)',display:'inline-block',animation:'pulse 2s infinite' }} />
                Powered by Mochi × GenLayer AI
              </div>
              <h1 style={{ fontFamily:'var(--font)',fontWeight:800,fontSize:'clamp(2.4rem,7vw,4.5rem)',letterSpacing:'-.05em',lineHeight:.95,marginBottom:16 }}>
                Enter the<br />
                <span style={{ background:'linear-gradient(135deg, var(--blue), var(--lavender))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>GRumble.</span>
              </h1>
              <p style={{ fontSize:14,color:'var(--text2)',maxWidth:460,marginBottom:28,lineHeight:1.8 }}>
                Creator puts up real GEN as the prize. Everyone else joins free. AI narrates every round. Last one standing wins all the GEN.
              </p>
              <div style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
                <button className="btn btn-blue" onClick={() => {
                  if (!connected) { notify('Connect wallet first','err'); return }
                  if (!hasProfile) { setShowCreate(true); return }
                  setCreateOpen(true)
                }}>⚔ Create a GRumble</button>
                <a href={FAUCET_URL} target="_blank" rel="noreferrer">
                  <button className="btn btn-navy">💧 Get Testnet GEN</button>
                </a>
              </div>
            </div>
            <img src={MOCHI_MAIN} alt="Mochi" style={{ width:'clamp(160px,20vw,260px)',objectFit:'contain',animation:'float 4s ease-in-out infinite',filter:'drop-shadow(0 0 40px rgba(17,15,255,.3))' }} />
          </div>

          <div style={{ display:'flex',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)',background:'var(--bg2)',overflowX:'auto',marginBottom:32 }}>
            {[['Real GEN','Creator Stakes'],['Free','Join Cost'],['AI','Narrates'],['Winner','Takes All']].map(([n,l],i,arr)=>(
              <div key={l} style={{ flex:1,minWidth:100,padding:'16px 20px',textAlign:'center',borderRight:i<arr.length-1?'1px solid var(--border)':'none' }}>
                <div style={{ fontFamily:'var(--font)',fontWeight:800,fontSize:'1.2rem',background:'linear-gradient(135deg,var(--blue),var(--lavender))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',lineHeight:1 }}>{n}</div>
                <div style={{ fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--muted)',marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.18em',textTransform:'uppercase',color:'var(--muted)',marginBottom:16,display:'flex',alignItems:'center',gap:10 }}>
            Active GRumbles
            <div style={{ flex:1,height:1,background:'var(--border)' }} />
            <button onClick={loadGames} style={{ background:'transparent',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:14 }}>↻</button>
          </div>

          {loading ? (
            <div style={{ textAlign:'center',padding:'60px 20px' }}>
              <span className="spin-el" />
              <div style={{ marginTop:12,fontFamily:'var(--mono)',fontSize:11,color:'var(--muted)' }}>Loading...</div>
            </div>
          ) : games.length === 0 ? (
            <div style={{ textAlign:'center',padding:'60px 20px',color:'var(--muted)' }}>
              <img src={MOCHI_COOKIE} alt="Mochi" style={{ width:80,marginBottom:16,opacity:.7 }} />
              <div style={{ fontFamily:'var(--font)',fontWeight:800,fontSize:'.9rem',color:'var(--text2)',marginBottom:8 }}>No active GRumbles</div>
              <div style={{ fontSize:11 }}>Create one and let the carnage begin.</div>
            </div>
          ) : (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12 }}>
              {games.map(g => <GameCard key={g.id} game={g} account={account} onJoin={handleJoin} onView={viewGame} />)}
            </div>
          )}
        </div>
      )}

      {/* GAME VIEW */}
      {view === 'game' && activeGame && (
        <div style={{ maxWidth:1100,margin:'0 auto',padding:'clamp(1.5rem,4vw,2rem) clamp(1rem,4vw,2rem)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:24,flexWrap:'wrap' }}>
            <button className="btn btn-outline" style={{ fontSize:11,padding:'6px 14px' }} onClick={() => { setView('lobby'); loadGames() }}>← Back</button>
            <div>
              <div style={{ fontFamily:'var(--font)',fontWeight:800,fontSize:'1.3rem',letterSpacing:'-.03em' }}>
                {activeGame.name || `GRumble #${activeGame.id}`}
              </div>
              <div style={{ fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)' }}>
                Round {activeGame.round} · {aliveCount} alive · {rewardDisplay} GEN prize
              </div>
            </div>
            <div style={{ marginLeft:'auto',display:'flex',gap:8,flexWrap:'wrap' }}>
              {isCreator && activeGame.status==='WAITING' && (
                {activeGame.creator === account && activeGame.status === 'WAITING' && (
                  <button className="btn" style={{background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',color:'#EF4444',marginRight:8}} disabled={txBusy} onClick={() => handleCancel(activeGame.id)}>
                    ✕ Cancel & Refund
                  </button>
                )}
                <button className="btn btn-blue" disabled={txBusy} onClick={() => handleStart(activeGame.id)}>
                  {txBusy ? <span className="spin-el" /> : '⚔ Start GRumble'}
                </button>
              )}
              {activeGame.status==='WAITING' && !isInGame && (
                <button className="btn btn-navy" disabled={txBusy} onClick={() => handleJoin(activeGame.id)}>
                  Join FREE
                </button>
              )}
              {activeGame.status==='ACTIVE' && (
                <button className="btn btn-blue" disabled={txBusy} onClick={() => handlePlayRound(activeGame.id)}>
                  {txBusy ? <><span className="spin-el" style={{ marginRight:6 }} />AI narrating...</> : '⚔ Play Round'}
                </button>
              )}
              {activeGame.status==='FINISHED' && isWinner && !activeGame.prize_claimed && (
                <button className="btn btn-gold" disabled={txBusy} onClick={() => handleClaim(activeGame.id)}>
                  {txBusy ? '⟳' : `👑 Claim ${rewardDisplay} GEN`}
                </button>
              )}
              <button className="btn btn-outline" style={{ fontSize:11,padding:'7px 12px' }} onClick={() => loadGame(activeGame.id)}>↻</button>
            </div>
          </div>

          {activeGame.status==='FINISHED' && (
            <div style={{ background:isWinner?'rgba(245,158,11,.08)':'var(--card)',border:`1px solid ${isWinner?'rgba(245,158,11,.3)':'var(--border)'}`,borderRadius:'var(--r)',padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:16 }}>
              <img src={MOCHI_MAIN} alt="Mochi" style={{ width:52,objectFit:'contain' }} />
              <div>
                <div style={{ fontFamily:'var(--font)',fontWeight:800,fontSize:'1.1rem',color:isWinner?'var(--gold)':'var(--text)',marginBottom:4 }}>
                  {isWinner ? `👑 You won ${rewardDisplay} GEN!` : `Champion: ${sh(activeGame.winner)}`}
                </div>
                <div style={{ fontFamily:'var(--mono)',fontSize:11,color:'var(--muted)' }}>
                  Prize: {rewardDisplay} GEN · {activeGame.round} rounds
                </div>
              </div>
            </div>
          )}

          <div style={{ display:'grid',gridTemplateColumns:'300px 1fr',gap:20 }}>
            <div>
              <div style={{ fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.15em',textTransform:'uppercase',color:'var(--muted)',marginBottom:12,display:'flex',alignItems:'center',gap:8 }}>
                Players ({aliveCount} alive)<div style={{ flex:1,height:1,background:'var(--border)' }} />
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {sortedPlayers.map(([addr,data],i) => (
                  <PlayerCard key={addr} address={addr} data={data} isMe={addr===account} rank={i+1} />
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.15em',textTransform:'uppercase',color:'var(--muted)',marginBottom:12,display:'flex',alignItems:'center',gap:8 }}>
                Battle Log<div style={{ flex:1,height:1,background:'var(--border)' }} />
              </div>
              <RoundFeed rounds={activeGame.rounds} />
            </div>
          </div>
        </div>
      )}

      {/* LEADERBOARD */}
      {view === 'leaderboard' && (
        <div style={{ maxWidth:560,margin:'0 auto',padding:'clamp(2rem,6vw,3rem) clamp(1rem,4vw,2rem)' }}>
          <div style={{ textAlign:'center',marginBottom:32 }}>
            <img src={MOCHI_MAIN} alt="Mochi" style={{ width:100,objectFit:'contain',marginBottom:16,animation:'float 4s ease-in-out infinite' }} />
            <h2 style={{ fontFamily:'var(--font)',fontWeight:800,fontSize:'2rem',letterSpacing:'-.04em',marginBottom:8 }}>GRumble Champions</h2>
            <p style={{ fontSize:12,color:'var(--muted)' }}>Most wins on GenLayer Bradbury</p>
          </div>
          {leaderboard.length === 0
            ? <div style={{ textAlign:'center',padding:'40px 20px',color:'var(--muted)',fontFamily:'var(--mono)',fontSize:12 }}>
                No data yet. Win a GRumble to appear here!
              </div>
            : leaderboard.map((e,i) => (
              <div key={e.address} style={{ display:'flex',alignItems:'center',gap:14,background:'var(--card)',border:`1px solid ${i===0?'rgba(245,158,11,.3)':'var(--border)'}`,borderRadius:'var(--r)',padding:'14px 18px',marginBottom:8,animation:'fin .3s var(--ease) both' }}>
                <div style={{ fontFamily:'var(--font)',fontWeight:800,fontSize:'1.4rem',color:i===0?'#F59E0B':i===1?'#9CA3AF':i===2?'#92400E':'var(--muted)',minWidth:32,textAlign:'center' }}>
                  {i===0?'👑':i===1?'🥈':i===2?'🥉':i+1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'var(--font)',fontWeight:700,fontSize:13,color:e.address===account?'var(--lavender)':'var(--text)',marginBottom:2 }}>
                    {e.username || sh(e.address)} {e.address===account && '(you)'}
                  </div>
                  <div style={{ fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)' }}>{sh(e.address)}</div>
                </div>
                <div style={{ fontFamily:'var(--font)',fontWeight:800,fontSize:'1.2rem',color:'var(--blue)' }}>
                  {e.wins} <span style={{ fontSize:11,color:'var(--muted)',fontWeight:400 }}>wins</span>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,padding:'20px clamp(1rem,4vw,2.5rem)',borderTop:'1px solid var(--border)',fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)',marginTop:40 }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <img src={GL_LOGO_W} alt="GL" style={{ height:16,opacity:.5 }} />
          GRumble · AI Battle Royale · Bradbury Testnet · Chain 4221
        </div>
        <div style={{ display:'flex',gap:14 }}>
          <a href={FAUCET_URL} target="_blank" rel="noreferrer" style={{ color:'var(--muted)',textDecoration:'none' }}>💧 Faucet</a>
          <a href="https://studio.genlayer.com" target="_blank" rel="noreferrer" style={{ color:'var(--muted)',textDecoration:'none' }}>Studio</a>
          <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer" style={{ color:'var(--muted)',textDecoration:'none' }}>Docs</a>
        </div>
      </footer>

      {/* CREATE GAME MODAL */}
      {createOpen && (
        <Modal title="Create a GRumble" sub="Set the GEN prize. Players join free. Last one standing wins it all." onClose={() => setCreateOpen(false)}>
          <div className="ff">
            <label className="fl">GRumble Name</label>
            <input className="fi" value={gameName} onChange={e => setGameName(e.target.value)} placeholder="Friday Night GRumble" maxLength={40} />
          </div>
          <div className="ff">
            <label className="fl">GEN Prize — sent from your wallet</label>
            <div style={{ display:'flex',alignItems:'center',gap:0,background:'var(--bg)',border:'1.5px solid var(--border)',borderRadius:'var(--r)',overflow:'hidden',transition:'border-color 150ms' }}
              onFocusCapture={e=>e.currentTarget.style.borderColor='var(--blue)'}
              onBlurCapture={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <input style={{ flex:1,background:'transparent',border:'none',outline:'none',padding:'10px 14px',color:'var(--text)',fontFamily:'var(--mono)',fontSize:13,fontWeight:700 }}
                type="number" min="0.01" step="0.1" value={rewardGen} onChange={e => setRewardGen(e.target.value)} placeholder="2" />
              <span style={{ padding:'0 14px',fontFamily:'var(--mono)',fontSize:13,color:'var(--lavender)',fontWeight:700,borderLeft:'1px solid var(--border)' }}>GEN</span>
            </div>
            <div style={{ fontFamily:'var(--mono)',fontSize:9,color:'var(--muted)',marginTop:6 }}>
              = {rewardGen ? (parseFloat(rewardGen)||0).toFixed(2) : '0'} GEN · deducted from your wallet at creation
            </div>
          </div>
          <div style={{ background:'var(--blue-dim)',border:'1px solid var(--blue-border)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:11,color:'var(--text2)',lineHeight:1.7 }}>
            Min 2 players · Max 16 · Anyone can trigger rounds · Winner claims GEN directly
          </div>
          <button className="btn btn-blue" style={{ width:'100%' }} disabled={txBusy} onClick={handleCreate}>
            {txBusy ? <><span className="spin-el" style={{ marginRight:8 }} />Creating...</> : `⚔ Create — ${rewardGen || '?'} GEN`}
          </button>
          <div style={{ fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)',textAlign:'center',marginTop:10 }}>
            Need GEN?{' '}
            <a href={FAUCET_URL} target="_blank" rel="noreferrer" style={{ color:'var(--lavender)',textDecoration:'none' }}>Get it from the faucet →</a>
          </div>
        </Modal>
      )}

      {/* FIRST-CONNECT PROFILE SETUP */}
      {showCreate && (
        <CreateProfile
          account={account}
          onNotify={notify}
          onCreated={(name) => { setHasProfile(true); setUsername(name); setShowCreate(false) }}
        />
      )}

      {/* PROFILE PANEL */}
      {showProfile && (
        <Profile account={account} onClose={() => setShowProfile(false)} onNotify={notify} />
      )}

      <Toast msg={toast.msg} type={toast.type} onClear={() => setToast({msg:'',type:'ok'})} />
    </div>
    </>
  )
}
