# GRumble — AI Battle Royale on GenLayer Bradbury

GRumble is an on-chain battle royale where the creator puts up real GEN as the prize, everyone else joins free, and an AI narrates every round of combat. Last one standing wins all the GEN.

## How it works

1. **Create a GRumble** — send real GEN as the winner's prize
2. **Players join free** — no cost, just sign and enter
3. **Start when ready** — creator kicks off once enough players are in
4. **AI narrates every round** — GenLayer's AI generates dramatic battle narrations, rolls random attacks, heals, and special events
5. **Last one standing wins** — winner claims all the GEN directly to their wallet

## Game mechanics

- Each player starts with 100 HP
- Every round: attacks, heals, and special events (meteor, lightning, poison gas, earthquake) are rolled
- Players at 0 HP are eliminated
- Anyone can trigger a round — permissionless
- Creator can cancel a WAITING game to recover their GEN

## Tech

- **Intelligent Contract** — Python contract on GenLayer Bradbury (Chain ID 4221)
- **Frontend** — React + Vite, deployed on Vercel
- **AI narration** — `gl.eq_principle.prompt_non_comparative` generates dramatic round commentary
- **Prize transfer** — winner receives GEN via `_EOA.emit_transfer`
- **Contract address** — `0xdf6E753e7F6a4005CB3Af9D8248ee969a1535d9e`

## Local development

```bash
npm install
npm run dev
```

## Links

- Live app: [g-rumble.vercel.app](https://g-rumble.vercel.app)
- GenLayer Explorer: [explorer-bradbury.genlayer.com](https://explorer-bradbury.genlayer.com)
- GenLayer Docs: [docs.genlayer.com](https://docs.genlayer.com)
