# Bluff and Barrel — On-Chain Deception Game

> A fully on-chain, FHE-encrypted 4-player card bluffing game with Russian Roulette elimination and USDC stakes. Built on Fhenix CoFHE. Deployed on Arbitrum Sepolia.

![Status](https://img.shields.io/badge/Status-Live%20on%20Testnet-green) ![FHE](https://img.shields.io/badge/Powered%20by-Fhenix%20CoFHE-purple) ![Players](https://img.shields.io/badge/Players-4-gold)

---

## What is Bluff and Barrel?

A provably fair on-chain card bluffing game where:

- **Cards are encrypted** — nobody can see your hand, not even the contract
- **Bluffs are verified cryptographically** — no trusted server, no oracle
- **The revolver is real** — bullet position is FHE-encrypted, unknown until it fires
- **Stakes are real** — USDC wagers with automatic winner payout
- **Everything is provably fair** — powered by Fhenix Fully Homomorphic Encryption

### Game Modes

| Mode | Status | Description |
|------|--------|-------------|
| **Card and Barrel** (Basic) | Live | 5 cards, bluff or call, loser spins |
| **Card and Barrel** (Devil) | Live | Devil card punishes ALL other players |
| **Card and Barrel** (Chaos) | Live | Shoot your opponents, Master/Chaos specials |
| **Dice and Barrel** | Coming soon | Bid on hidden dice |
| **Slot and Barrel** | Coming soon | Spin slots, lie about results |

---

## How to Play

1. **Choose your character** (8 animal masks) and **set USDC stake** (or play free)
2. **Create or join a table** (4 players required)
3. **Each round**: a target card is announced (Ace, King, or Queen)
4. **On your turn**: play 1-3 cards face-down, claiming they're the target
5. **Other players**: believe you or call "LIAR!"
6. **If challenged**: cards are revealed via FHE decryption — everyone sees the actual cards
7. **Russian Roulette**: 6 chambers, 1 bullet, position unknown
8. **Last player alive wins** the pot (stake x 4, minus 5% platform fee)

---

## Architecture

```
liarsbar2/
├── contracts/
│   ├── LiarsBarGame.sol           # Basic mode orchestrator + USDC stake
│   ├── LiarsBarDevilGame.sol      # Devil mode (multi-spin on Devil card)
│   ├── LiarsBarChaosGame.sol      # Chaos mode (shoot opponents, Master/Chaos)
│   ├── LiarsBarDeck.sol           # 20-card FHE shuffle (Basic)
│   ├── LiarsBarDevilDeck.sol      # 20-card + Devil card
│   ├── LiarsBarChaosDeck.sol      # 12-card (King/Queen/Master/Chaos)
│   ├── LiarsBarRevolver.sol       # Shared per-player encrypted revolver
│   └── scripts/deploy-all.ts
├── frontend/
│   ├── src/
│   │   ├── pages/                 # Landing, Lobby (mode select), GameRoom
│   │   ├── components/            # Cards, Overlays, Timer, Revolver
│   │   ├── hooks/                 # useCofhe, useMyHand, useChallenge, useSpin
│   │   ├── stores/                # Zustand game state
│   │   └── lib/                   # Contracts, CoFHE, characters, gas
│   └── public/                    # Character art, card art, sounds
└── devil-chaos-plan.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MetaMask wallet
- Arbitrum Sepolia ETH ([faucet](https://www.alchemy.com/faucets/arbitrum-sepolia))
- USDC on Arb Sepolia (for staked games)

### Run Frontend
```bash
cd liarsbar2/frontend
npm install
npm run dev
```
Open http://localhost:5173

### Deploy Contracts
```bash
cd liarsbar2/contracts
npm install
cp .env.example .env  # Add PRIVATE_KEY
npx hardhat run scripts/deploy-all.ts --network arb-sepolia
```

---

## Deployed Contracts (Arbitrum Sepolia)

| Contract | Address |
|----------|---------|
| LiarsBarRevolver (shared) | `0x841e7d5d94aEb35Ce79AA1E310DbA1c859e4df0B` |
| **Basic Mode** | |
| LiarsBarGame | `0xa8F9c55d817e6e04E31D80A7D064697d5ADE5A2D` |
| LiarsBarDeck | `0x6778664E42A95c1E52f25949228B74a195063292` |
| **Devil Mode** | |
| LiarsBarDevilGame | `0xC5EA6c3F59f0e93D847C9b41501368Cec2CE37A2` |
| LiarsBarDevilDeck | `0x6E26Bffa8156863e5cBFAE05B8FB32f1D2A797F9` |
| **Chaos Mode** | |
| LiarsBarChaosGame | `0x23DC7899C287AF749eBA0Bc0Dcbe53CDA1A2f1Fd` |
| LiarsBarChaosDeck | `0x2FaB9916571955f61596A2bBe80fe611F2549f4A` |
| **USDC** | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |

---

## FHE Operations Per Game

| Operation | Per Round | x5 Rounds | Total |
|-----------|-----------|-----------|-------|
| Deal cards (20 draws) | ~200 | x5 | 1,000 |
| Revolver init (once) | — | — | 20 |
| Challenge verify | ~8 | x5 | 40 |
| Card reveal (allowPublic) | ~2 | x5 | 10 |
| Spin (eq check) | ~2 | x5 | 10 |
| **On-chain total** | | | **~1,080** |
| Hand decrypt (5 cards x 4 players) | 20 | x5 | 100 |
| Challenge + card reveal decrypt | 3 | x5 | 15 |
| Spin decrypt | 1 | x5 | 5 |
| **Off-chain total** | | | **~120** |
| **Grand total per game** | | | **~1,200** |

---

## FHE Integration

| What's Hidden | FHE Type | Who Can Decrypt |
|---------------|----------|-----------------|
| Your cards | `euint8` | Only you (via permit) |
| Challenge result | `ebool` | Anyone (public, after challenge) |
| Revealed cards | `euint8` | Anyone (public, after challenge) |
| Bullet position | `euint8` | Nobody (until spin resolves) |
| Spin result | `ebool` | Anyone (public, after spin) |

---

## USDC Stake System

- Table creator sets stake amount (0 = free game)
- Each player deposits USDC on join (ERC20 approve + transferFrom)
- Winner receives 95% of pot (stake x 4 players)
- 5% platform fee sent to treasury
- Automatic payout on GameOver — no manual claim needed

---

## Tech Stack

**Contracts**: Solidity 0.8.28, Hardhat, @fhenixprotocol/cofhe-contracts, viaIR

**Frontend**: Vite, React 18, TypeScript, wagmi v2, viem, @cofhe/sdk, Zustand, Tailwind CSS, Framer Motion

**Network**: Arbitrum Sepolia (Chain ID: 421614)

**FHE**: Fhenix CoFHE (Threshold Network decryption)

---

## Game Modes Detail

### Basic Mode
- 20 cards: 6 Ace, 6 King, 6 Queen, 2 Joker (wild)
- 5 cards per player, play 1-3 per turn
- Loser of challenge spins own revolver

### Devil Mode
- Same as Basic + 1 Devil Card (replaces one table-type card)
- Devil can only be played alone
- If challenged and Devil revealed: ALL other players face Roulette

### Chaos Mode
- 12 cards: 5 King, 5 Queen, 1 Master, 1 Chaos
- 3 cards per player, play exactly 1 per turn
- Winner of challenge shoots an opponent of choice
- Master card: accused gets to shoot someone
- Chaos card: ALL players shoot simultaneously

---

## Features

- 8 selectable character masks (on-chain storage)
- Card reveal on challenge (actual card images shown)
- Per-player revolver with chamber indicators
- 60-second turn timer with on-chain forceTimeout()
- Dramatic overlays (LIAR!, CLICK, BANG, Winner)
- Mode selector (Basic/Devil/Chaos) in lobby
- USDC stake with automatic payout
- Rules info button in lobby and game

---

## Documentation

- [CONTRACTS.md](./CONTRACTS.md) — FHE and contract implementation details
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) — Step-by-step testing guide
- [devil-chaos-plan.md](./devil-chaos-plan.md) — Devil and Chaos mode design

---

## License

MIT
