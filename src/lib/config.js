export const CONTRACT_ADDR = '0x8F33aCb564026b6F89648c054802200c17a41f32'
export const sh = a => a?.length > 10 ? a.slice(0,6) + '..' + a.slice(-4) : (a || '')

export const FAUCET_URL = 'https://testnet-faucet.genlayer.foundation'

// Convert wei to GEN display string
export const weiToGen = (wei) => {
  if (!wei) return '0'
  const n = BigInt(Math.floor(Number(wei)))
  const gen  = n / BigInt(10 ** 18)
  const rem  = n % BigInt(10 ** 18)
  if (rem === 0n) return gen.toString()
  const dec = rem.toString().padStart(18, '0').replace(/0+$/, '').slice(0, 4)
  return `${gen}.${dec}`
}

// Convert GEN string to wei BigInt
export const genToWei = (gen) => {
  const f = parseFloat(gen) || 0
  return BigInt(Math.floor(f * 10 ** 18))
}
