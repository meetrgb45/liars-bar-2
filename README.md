# 🃏 Liar's Bar — On-Chain Deception Game

> A fully on-chain, FHE-encrypted 4-player card bluffing game with Russian Roulette elimination. Built on Fhenix CoFHE. Deployed on Arbitrum Sepolia.

![Liar's Bar](https://img.shields.io/badge/Status-Live%20on%20Testnet-green) ![FHE](https://img.shields.io/badge/Powered%20by-Fhenix%20CoFHE-purple) ![Players](https://img.shields.io/badge/Players-4-gold)

---

## 🎮 What is Liar's Bar?

Inspired by the Steam Awards 2024 winner "Liar's Bar", this is the first fully on-chain card bluffing game where:

- **Cards are encrypted** — nobody can see your hand, not even the contract
- **Bluffs are verified cryptographically** — no trusted server, no oracle
- **The revolver is real** — bullet position is FHE-encrypted, unknown until it fires
- **Everything is provably fair** — powered by Fhenix Fully Homomorphic Encryption

### Game Modes
- 🃏 **Liar's Deck** — Live now
- 🎲 **Liar's Dice** — Coming soon
- 🎰 **Liar's Slots** — Coming soon

---

## 🕹️ How to Play

1. **Create or join a table** (4 players required)
2. **Each round**: a target card is announced (Ace, King, or Queen)
3. **On your turn**: play 1-3 cards face-down, claiming they're the target
4. **Other players**: believe you or call "LIAR!"
5. **If challenged**: cards are revealed via FHE decryption
   - Lie confirmed → you pull the trigger
   - False accusation → accuser pulls the trigger
6. **Russian Roulette**: 6 chambers, 1 bullet, position unknown
7. **Last player alive wins**

---

## 🏗️ Architecture

```
liarsbar2/
├── contracts/                 # Solidity + Hardhat + Fhenix CoFHE
│   ├── contracts/
│   │   ├── LiarsBarGame.sol       # Game orchestrator (state machine, turns, timeout)
│   │   ├── LiarsBarDeck.sol       # FHE card dealing (20-card shuffle) + verification
│   │   ├── LiarsBarRevolver.sol   # Per-player encrypted revolver
│   │   └── interfaces/ILiarsBarGame.sol
│   ├── scripts/deploy.ts
│   └── test/LiarsBar.test.ts
├── frontend/                  # Vite + React + wagmi + @cofhe/sdk
│   ├── src/
│   │   ├── pages/             # Landing, Lobby, GameRoom
│   │   ├── components/        # Cards, Overlays, Timer, Revolver
│   │   ├── hooks/             # useCofhe, useMyHand, useChallenge, useSpin
│   │   ├── stores/            # Zustand game state
│   │   └── lib/               # Contracts, CoFHE client, utilities
│   └── .env
└── plan.md                    # Full implementation plan
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask wallet
- Arbitrum Sepolia ETH ([faucet](https://www.alchemy.com/faucets/arbitrum-sepolia))

### Run Frontend
```bash
cd liarsbar2/frontend
npm install
npm run dev
```
Open http://localhost:5173

### Deploy Contracts (optional)
```bash
cd liarsbar2/contracts
npm install
cp .env.example .env  # Add your PRIVATE_KEY
npx hardhat run scripts/deploy.ts --network arb-sepolia
```

---

## 📜 Deployed Contracts (Arbitrum Sepolia)

| Contract | Address |
|----------|---------|
| LiarsBarGame | `0x96Da3b705E3Bd95c70927732e6656FA337E1FEfe` |
| LiarsBarDeck | `0x10D0cD836F82a5a9B659E73a611FA272cAD41098` |
| LiarsBarRevolver | `0x3011DFd4076a2E6556591Acd57d7f9894cAe3bBd` |

---

## 🔐 FHE Integration

See [CONTRACTS.md](./CONTRACTS.md) for detailed FHE implementation.

| What's Hidden | FHE Type | Who Can Decrypt |
|---------------|----------|-----------------|
| Your cards | `euint8` | Only you (via permit) |
| Challenge result | `ebool` | Anyone (public, after challenge) |
| Bullet position | `euint8` | Nobody (until spin resolves) |
| Spin result | `ebool` | Anyone (public, after spin) |

---

## 🛠️ Tech Stack

**Contracts**: Solidity 0.8.28, Hardhat, @fhenixprotocol/cofhe-contracts, viaIR

**Frontend**: Vite, React 18, TypeScript, wagmi v2, viem, @cofhe/sdk, Zustand, Tailwind CSS, Framer Motion

**Network**: Arbitrum Sepolia (Chain ID: 421614)

**FHE**: Fhenix CoFHE (Threshold Network decryption)

---

## 📄 Documentation

- [CONTRACTS.md](./CONTRACTS.md) — FHE & contract implementation details
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) — Step-by-step testing guide for judges
- [WAVE_UPDATE.md](./WAVE_UPDATE.md) — Development progress & roadmap

---

## 👥 Game Rules Summary

- **Deck**: 20 cards — 6 Ace, 6 King, 6 Queen, 2 Joker (wildcard)
- **Players**: Exactly 4
- **Revolver**: Per-player, 6 chambers, 1 hidden bullet
- **Turn timer**: 30 seconds (auto-play on timeout)
- **Win condition**: Last player alive

---

## 📝 License

MIT
