# Liar's Bar on Fhenix — Wave 2 Update

## What We Built

Liar's Bar is a fully on-chain, FHE-encrypted 4-player card bluffing game with Russian Roulette elimination. No trusted server. No oracle. Pure cryptographic deception powered by Fhenix CoFHE.

**This wave:** Complete game with full mechanics, polished UI inspired by the real Liar's Bar (Steam Awards 2024 winner), and three planned game modes.

---

## Wave 4 — Full Game (Shipped) ✅

### Smart Contracts (3 contracts, deployed on Arb Sepolia)

| Contract | Purpose | Key FHE |
|----------|---------|---------|
| **LiarsBarGame** | Orchestrator — state machine, turns, timeout, elimination | — |
| **LiarsBarDeck** | 20-card encrypted shuffle, draw-without-replacement, challenge verification | `euint8`, `ebool`, `FHE.select` chains |
| **LiarsBarRevolver** | Per-player encrypted bullet, spin resolution | `euint8`, `ebool` |

### What's New vs Wave 3

| Feature | Wave 3 | Wave 4 |
|---------|--------|--------|
| Card deck | 3 random cards (duplicates possible) | 20-card exact distribution (6A+6K+6Q+2J) |
| Dealing | `random % 52` per card | Draw-without-replacement via FHE pool |
| Target card | Player chooses any rank | Random per round (Ace/King/Queen) |
| Revolver | Global (shared pointer) | Per-player (each has own bullet) |
| Challenge | Counts matching cards | Boolean: all valid or not |
| Turn timer | None | 30s with on-chain `forceTimeout()` |
| Auto-action | None | Auto-play on timeout |
| Frontend | Next.js (40min builds) | Vite (1s builds) |
| UI | Basic functional | Polished bar theme (masks, overlays, animations) |
| Game modes | 1 | 3 planned (Deck live, Dice/Slots coming) |

### FHE Integration

```
┌─────────────────────────────────────────────────┐
│              ENCRYPTED ON-CHAIN                   │
├─────────────────────────────────────────────────┤
│ Cards:   euint8[5] per player (values 0-3)      │
│ Bullet:  euint8 per player (position 1-6)       │
│ Results: ebool (challenge valid, spin fired)     │
├─────────────────────────────────────────────────┤
│              DECRYPT FLOWS                        │
├─────────────────────────────────────────────────┤
│ Own hand:  decryptForView + permit (private)    │
│ Challenge: decryptForTx + publishDecryptResult  │
│ Spin:      decryptForTx + publishDecryptResult  │
└─────────────────────────────────────────────────┘
```

### Frontend Stack
- **Vite + React 18 + TypeScript** — 1-second builds (vs 40min with Next.js)
- **wagmi v2 + viem** — wallet connection, contract interaction
- **@cofhe/sdk** — FHE encryption/decryption (WASM, threshold network)
- **Zustand** — game state management
- **Framer Motion** — dramatic animations (CLICK/BANG overlays)
- **Tailwind CSS** — dark bar theme with custom design system

### UI/UX Highlights
- 🦊🐰🐱🦉 Animal mask avatars (like the real game)
- Per-player revolver chamber indicators
- Dramatic "LIAR!" challenge overlay with card reveal
- Full-screen CLICK/BANG trigger pull animation
- 30-second turn timer with visual countdown
- Game event log
- Landing page with 3 game modes (Deck live, Dice/Slots teased)

### Deployed (Arbitrum Sepolia)
```
LiarsBarGame:     0x96Da3b705E3Bd95c70927732e6656FA337E1FEfe
LiarsBarDeck:     0x10D0cD836F82a5a9B659E73a611FA272cAD41098
LiarsBarRevolver: 0x3011DFd4076a2E6556591Acd57d7f9894cAe3bBd
```

---

## Technical Achievements

### 1. Encrypted Draw-Without-Replacement
The hardest FHE challenge: dealing 20 cards fairly without duplicates, entirely in encrypted space. Our algorithm tracks remaining counts per card type as `euint8` and uses `FHE.select` chains for constant-time card assignment. ~200 FHE operations per deal, guaranteeing exact distribution.

### 2. Per-Player Encrypted Revolvers
Each player has their own hidden bullet position. The contract computes `FHE.eq(bulletPosition, chamberPointer)` without ever revealing where the bullet is. Only the boolean result (fired/not) is decrypted.

### 3. On-Chain Timeout System
30-second turn deadline enforced on-chain. Any player can call `forceTimeout()` to skip AFK players. Combined with frontend auto-action for seamless gameplay.

### 4. Two-Phase Decrypt Pattern
Challenge and spin both use: compute encrypted → `allowPublic` → frontend `decryptForTx` → `publishDecryptResult` on-chain. This ensures results are cryptographically verified by the Threshold Network.

---

## Wave 5 — Planned

### Game Modes
- [ ] **Liar's Dice** — Bid on hidden dice, call bluffs, drink poison
- [ ] **Liar's Slots** — Spin slots, lie about hearts, Death Spin

### Features
- [ ] Realistic SVG revolver (replace emoji)
- [ ] Sound effects (card slam, gunshot, click)
- [ ] Spectator mode
- [ ] Private rooms with invite codes
- [ ] Mobile responsive layout
- [ ] Mainnet deployment after audit

### Technical
- [ ] WebSocket relay for real-time sync (replace polling)
- [ ] Replay system from on-chain events
- [ ] Gas optimization (batch FHE operations)

---

## Why FHE Makes This Possible

Without FHE, on-chain card games require either:
- A trusted server (centralized, can cheat)
- Commit-reveal schemes (complex, slow, limited)
- ZK proofs per action (expensive, complex circuits)

With Fhenix CoFHE:
- Cards are **encrypted at creation** — nobody can peek
- Verification happens **in encrypted space** — no reveal needed
- Results are **proven by Threshold Network** — no trust required
- The entire game is **one smart contract** — fully composable

This is the first card bluffing game where cheating is **mathematically impossible**.
