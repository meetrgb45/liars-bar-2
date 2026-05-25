# Bluff and Barrel on Fhenix — Development Update

## What We Built

Bluff and Barrel is a fully on-chain, FHE-encrypted 4-player card bluffing game with Russian Roulette elimination and USDC stakes. No trusted server. No oracle. Pure cryptographic deception powered by Fhenix CoFHE.

---

## Current State — Shipped

### 3 Game Modes (All Live)

| Mode | Cards | Per Turn | Roulette | Special |
|------|-------|----------|----------|---------|
| **Basic** | 20 (6A+6K+6Q+2J) | 1-3 | Self | Joker is wild |
| **Devil** | 20 (5+1Devil+6+6+2J) | 1-3 | Self (multi on Devil) | Devil punishes all others |
| **Chaos** | 12 (5K+5Q+1Master+1Chaos) | 1 | Shoot opponent | Master/Chaos specials |

### Smart Contracts (7 contracts, deployed on Arb Sepolia)

| Contract | Purpose |
|----------|---------|
| LiarsBarRevolver | Shared per-player encrypted revolver + spinForTarget |
| LiarsBarGame | Basic mode orchestrator + USDC stake |
| LiarsBarDeck | 20-card FHE shuffle + card reveal |
| LiarsBarDevilGame | Devil mode (MultiSpinning state) |
| LiarsBarDevilDeck | 20-card + Devil card |
| LiarsBarChaosGame | Chaos mode (Targeting/Shooting states) |
| LiarsBarChaosDeck | 12-card (Master/Chaos specials) |

### Key Features

- **USDC Stake System** — Table creator sets wager, auto-payout to winner (95%), 5% platform fee
- **On-Chain Character Selection** — 8 animal masks stored per player, visible to all
- **Card Reveal on Challenge** — Individual cards decrypted and shown with actual images
- **3 Game Modes** — Basic, Devil, Chaos with mode-specific mechanics
- **60s Turn Timer** — On-chain forceTimeout() prevents griefing
- **Polished UI** — Paperboard textures, 3D buttons, character art, dramatic overlays

### FHE Integration

```
ENCRYPTED ON-CHAIN:
  Cards:   euint8[5] per player (Basic/Devil) or euint8[3] (Chaos)
  Bullet:  euint8 per player (position 1-6)
  Results: ebool (challenge valid, spin fired)

DECRYPT FLOWS:
  Own hand:      decryptForView + permit (private, auto-retry)
  Challenge:     decryptForTx + publishChallengeResult (public)
  Card reveal:   decryptForTx + publishCardReveal (public, per-card)
  Spin:          decryptForTx + publishSpinResult (public)

FHE OPS PER GAME: ~1,200 operations across ~5 rounds
  - On-chain: ~1,080 (dealing=1000, verify=40, reveal=10, spin=10, init=20)
  - Off-chain: ~120 (hand decrypt=100, challenge=15, spin=5)
```

### Frontend Stack
- Vite + React 18 + TypeScript
- wagmi v2 + viem (wallet, contracts)
- @cofhe/sdk (FHE decrypt)
- Zustand (state management)
- Framer Motion (animations)
- Custom CSS design system (paperboard/bar theme)

---

## Technical Achievements

### 1. Three Distinct FHE Game Modes
Each mode has its own deck contract with different card compositions and verification logic, sharing one revolver contract. Devil mode adds `MultiSpinning` (all others spin). Chaos mode adds `Targeting` (shoot opponents) with `spinForTarget()`.

### 2. USDC Stake with Automatic Payout
ERC20 integration in all 3 game contracts. Creator sets stake, players approve+deposit on join, winner auto-receives 95% pot on GameOver. No manual claim.

### 3. On-Chain Character Selection
`characterId` stored in Player struct. All clients read from chain, ensuring everyone sees the same characters. 8 options with alive/dead variants.

### 4. Card Reveal System
After challenge, individual cards are made `allowPublic`, decrypted by the challenger's client, and published on-chain via `publishCardReveal()`. UI shows actual card images with validity borders.

### 5. Encrypted Draw-Without-Replacement
20-card (or 12-card) fair shuffle entirely in FHE space. Pool tracking with `FHE.select` chains for constant-time card assignment. Guarantees exact distribution.

### 6. Multi-Game Revolver
Single revolver contract authorized by multiple game contracts via `authorizedGames` mapping. Supports both `beginSpin` (self) and `spinForTarget` (opponent) for different modes.

### 7. Security Audit — All Critical/High Fixed
Full audit performed covering contracts and frontend:
- 4 CRITICAL contract issues fixed (unchecked transfers, access control, multi-spin logic)
- 7 HIGH issues addressed (randomness acknowledged, info leak fixed, missing views added)
- 3 CRITICAL frontend issues fixed (wallet switch, decrypt lock, error handling)
- 6 HIGH frontend issues fixed (stale closures, WS reconnect, event parsing)

### 8. WebSocket Real-Time Relay
Node.js WebSocket server broadcasts game state changes to all players in a room. Reduces perceived latency from 3s polling to near-instant. Includes health endpoint for UptimeRobot keep-alive.

### 9. Multi-Wallet Support
EIP-6963 wallet discovery shows all installed wallets (MetaMask, Phantom, Rabby, Coinbase, etc.) with icons. Users explicitly choose which wallet to connect.

---

## Deployed (Arbitrum Sepolia)

```
Revolver:       0x13e6C9CE2845545cbb741bFC2d3E14B84A628790
Basic Game:     0xF0EF07D0a1A1A4C78eD35562B5eb7B7b311E62A0
Basic Deck:     0xD407D06b2868E8d0ED28E57842DB3877b3FA7dF8
Devil Game:     0x0821057DCD8bbABbbebe64c54a4C59d4fB7DEE0C
Devil Deck:     0xBb0ED4ce97a4bb5D92ecFA8Ba9d1a3B5aA706565
Chaos Game:     0xe8F9019455f7359E874648f7128429EaE8cB929C
Chaos Deck:     0xfba0b763b71Dd67aF9b4cfE4acb2Dd11511A7c30
USDC:           0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```

---

## Roadmap

### Completed
- [x] 3 game modes (Basic, Devil, Chaos)
- [x] USDC stake system with auto-payout
- [x] On-chain character selection (8 masks)
- [x] Card reveal on challenge
- [x] WebSocket real-time relay
- [x] Multi-wallet support (EIP-6963)
- [x] Security audit + fixes
- [x] 60s turn timer

### Next
- [ ] Dice and Barrel mode
- [ ] Slot and Barrel mode
- [ ] Sound effects
- [ ] Mobile responsive
- [ ] Tournament mode (bracket elimination)
- [ ] Leaderboard + ELO ranking
- [ ] NFT character skins

### Future
- [ ] Mainnet deployment (after formal audit)
- [ ] Multi-chain support
- [ ] Spectator mode
- [ ] Private rooms with invite codes

---

## Why FHE Makes This Possible

Without FHE, on-chain card games require either:
- A trusted server (centralized, can cheat)
- Commit-reveal schemes (complex, slow, limited)
- ZK proofs per action (expensive, complex circuits)

With Fhenix CoFHE:
- Cards are encrypted at creation — nobody can peek
- Verification happens in encrypted space — no reveal needed
- Results are proven by Threshold Network — no trust required
- The entire game is composable smart contracts

This is the first card bluffing game where cheating is mathematically impossible, with real money stakes.
