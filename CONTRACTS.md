# Bluff and Barrel — Contract and FHE Implementation

## Why FHE is Required

Traditional on-chain card games are impossible — any value stored on-chain is publicly visible. Bluff and Barrel requires:
1. **Hidden cards** — only you see your hand
2. **Hidden bullet** — nobody knows where the bullet is
3. **Trustless verification** — prove a bluff without revealing all cards
4. **No trusted server** — everything enforced by the blockchain

Fhenix CoFHE solves all four with Fully Homomorphic Encryption.

---

## Contract Architecture

```
LiarsBarRevolver.sol (Shared — per-player encrypted bullet)
│
├── LiarsBarGame.sol + LiarsBarDeck.sol           (Basic Mode)
├── LiarsBarDevilGame.sol + LiarsBarDevilDeck.sol  (Devil Mode)
└── LiarsBarChaosGame.sol + LiarsBarChaosDeck.sol  (Chaos Mode)
```

All three game contracts share one Revolver (multi-game authorized via `authorizedGames` mapping).

---

## Game Contracts

### LiarsBarGame.sol — Basic Mode

State machine:
```
WaitingForPlayers → Dealing → PlayerTurn → Challenging → Spinning → (repeat or GameOver)
```

Key features:
- USDC stake (set by creator, collected on join, paid to winner minus 5% fee)
- Character selection (stored on-chain per player)
- Card reveal on challenge (individual cards decrypted and shown)
- 60s turn timeout with `forceTimeout()`

### LiarsBarDevilGame.sol — Devil Mode

Additional state: `MultiSpinning`

When Devil card is revealed during challenge, ALL other alive players must spin simultaneously. Each calls `triggerMySpin()` individually.

### LiarsBarChaosGame.sol — Chaos Mode

Additional states: `Targeting`, `MultiTargeting`, `Shooting`

Roulette is flipped — winner shoots an opponent. Players call `chooseTarget(address)` to pick who gets shot. Chaos card triggers `MultiTargeting` where everyone picks simultaneously.

---

## Deck Contracts

### LiarsBarDeck.sol — 20 Cards (Basic)

Composition: 6 Ace(0), 6 King(1), 6 Queen(2), 2 Joker(3)

Draw-without-replacement using FHE pool tracking:
```solidity
function _drawCard(Pool memory pool) internal returns (euint8 card, Pool memory) {
    euint8 rand = FHE.rem(FHE.randomEuint8(), pool.totalLeft);
    ebool isAce = FHE.lt(rand, pool.acesLeft);
    // ... cumulative range checks ...
    card = FHE.select(isAce, FHE.asEuint8(0),
           FHE.select(isKing, FHE.asEuint8(1), ...));
    // Decrement counts (constant-time)
    pool.acesLeft = FHE.select(isAce, FHE.sub(pool.acesLeft, ONE), pool.acesLeft);
}
```

### LiarsBarDevilDeck.sol — 20 Cards + Devil

Composition: 5 of table type + 1 Devil(4) + 6 type2 + 6 type3 + 2 Joker(3)

Devil card (value=4) counts as valid during verification but triggers multi-spin.

### LiarsBarChaosDeck.sol — 12 Cards

Composition: 5 King(0), 5 Queen(1), 1 Master(2), 1 Chaos(3)

Master and Chaos are NEVER considered lies regardless of table card.

---

## Revolver Contract

### LiarsBarRevolver.sol — Shared Across All Modes

Per-player encrypted bullet with multi-game support:
```solidity
mapping(address => bool) public authorizedGames;  // Multiple game contracts

function initRevolver(gameId, player) external onlyGame {
    euint8 pos = FHE.add(FHE.rem(FHE.randomEuint8(), SIX), ONE); // [1-6]
    _bulletPosition[gameId][player] = pos;
}

function beginSpin(gameId, player) external onlyGame returns (uint256 ctHash) {
    chamberPointer[gameId][player]++;
    ebool fired = FHE.eq(_bulletPosition[gameId][player], FHE.asEuint8(ptr));
    FHE.allowPublic(fired);
    return uint256(ebool.unwrap(fired));
}

// Chaos mode: shoot opponent's revolver
function spinForTarget(gameId, target) external onlyGame returns (uint256 ctHash) {
    chamberPointer[gameId][target]++;
    ebool fired = FHE.eq(_bulletPosition[gameId][target], FHE.asEuint8(ptr));
    FHE.allowPublic(fired);
    return uint256(ebool.unwrap(fired));
}
```

---

## USDC Stake System

```solidity
IERC20 public usdc;
address public treasury;
uint256 public constant FEE_BPS = 500; // 5%

function createGame(uint8 characterId, uint256 stakeAmount) external {
    g.stakeAmount = stakeAmount;
    if (stakeAmount > 0) usdc.transferFrom(msg.sender, address(this), stakeAmount);
}

function joinGame(uint256 gameId, uint8 characterId) external {
    if (g.stakeAmount > 0) usdc.transferFrom(msg.sender, address(this), g.stakeAmount);
}

// On GameOver:
uint256 pot = g.stakeAmount * 4;
uint256 fee = (pot * FEE_BPS) / 10000;
usdc.transfer(treasury, fee);
usdc.transfer(winner, pot - fee);
```

---

## Card Reveal System

When a challenge occurs, individual cards are made publicly decryptable:
```solidity
function revealCards(gameId, player, indices) external onlyGame returns (uint256[] memory ctHashes) {
    for (uint8 i = 0; i < indices.length; i++) {
        FHE.allowPublic(_hands[gameId][player][indices[i]]);
        ctHashes[i] = uint256(euint8.unwrap(_hands[gameId][player][indices[i]]));
    }
}
```

Frontend decrypts each card individually and calls `publishCardReveal()` to store results on-chain and emit `CardsRevealed` event.

---

## FHE Operations Summary

| Operation | Purpose |
|-----------|---------|
| `FHE.randomEuint8()` | Random cards and bullet position |
| `FHE.rem(a, b)` | Map random to range |
| `FHE.eq(a, b)` | Compare card to target, bullet to chamber |
| `FHE.lt(a, b)` | Range checks for card type |
| `FHE.select(cond, a, b)` | Constant-time conditional |
| `FHE.and/or/not` | Boolean logic |
| `FHE.allow(ct, addr)` | Grant decrypt to player |
| `FHE.allowPublic(ct)` | Public decrypt (results) |

**Per game (~5 rounds): ~1,200 FHE operations total**

---

## ACL Strategy

```
CARD VALUES:     allowThis + allow(owner)     → only owner decrypts
BULLET POSITION: allowThis only               → NEVER revealed
CHALLENGE BOOL:  allowPublic                  → everyone sees result
REVEALED CARDS:  allowPublic (after challenge) → everyone sees actual cards
SPIN RESULT:     allowPublic                  → everyone sees fired/safe
```

---

## Security Properties

1. **No card peeking** — euint8 with per-player ACL
2. **No bullet prediction** — position never revealed, only fired/not boolean
3. **No fake results** — Threshold Network signature required
4. **No information leakage** — constant-time FHE.select (no gas side channels)
5. **No front-running** — encrypted values in mempool reveal nothing
6. **Timeout protection** — 60s per turn, forceTimeout() prevents griefing
7. **Fair stakes** — USDC held in contract escrow, auto-distributed

---

## Gas Considerations

- Card dealing (20 cards): ~200 FHE ops (heaviest tx, ~30s confirmation)
- Challenge verification: ~6-9 FHE ops
- Spin: ~2 FHE ops
- Compiled with `viaIR` + optimizer (200 runs)
- Frontend uses 5x gas multiplier for Arb Sepolia fee volatility
