# Liar's Bar — Contract & FHE Implementation

## Why FHE is Required

Traditional on-chain card games are impossible — any value stored on-chain is publicly visible. Liar's Bar requires:
1. **Hidden cards** — only you see your hand
2. **Hidden bullet** — nobody knows where the bullet is
3. **Trustless verification** — prove a bluff without revealing all cards
4. **No trusted server** — everything enforced by the blockchain

Fhenix CoFHE solves all four with Fully Homomorphic Encryption.

---

## Contract Architecture

```
LiarsBarGame.sol (Orchestrator)
├── LiarsBarDeck.sol (Card FHE)
└── LiarsBarRevolver.sol (Bullet FHE)
```

### LiarsBarGame.sol — State Machine

Manages the entire game lifecycle:

```
WaitingForPlayers → Dealing → PlayerTurn → Challenging → Spinning → (repeat or GameOver)
```

**Key responsibilities:**
- Lobby (create/join/start)
- Turn management with 30s timeout
- Challenge flow (calls deck for verification)
- Spin flow (calls revolver for resolution)
- Elimination & win condition
- `forceTimeout()` — any player can force-skip an AFK player

### LiarsBarDeck.sol — Encrypted Card Dealing

**The 20-card deck:** 6 Ace (0), 6 King (1), 6 Queen (2), 2 Joker (3)

**Dealing algorithm** — Draw-without-replacement using FHE:
```solidity
function _drawCard(Pool memory pool) internal returns (euint8 card, Pool memory) {
    euint8 rand = FHE.rem(FHE.randomEuint8(), pool.totalLeft);
    
    // Map random index to card type via cumulative ranges
    ebool isAce = FHE.lt(rand, pool.acesLeft);
    ebool isKing = FHE.and(FHE.not(isAce), FHE.lt(rand, aceKingBound));
    ebool isQueen = ...;
    
    // Assign card value (constant-time via FHE.select)
    card = FHE.select(isAce, FHE.asEuint8(0),
           FHE.select(isKing, FHE.asEuint8(1),
           FHE.select(isQueen, FHE.asEuint8(2), FHE.asEuint8(3))));
    
    // Decrement counts (ALL updated for constant-time)
    pool.acesLeft = FHE.select(isAce, FHE.sub(pool.acesLeft, ONE), pool.acesLeft);
    ...
}
```

**Why this matters:**
- Guarantees exactly 6A + 6K + 6Q + 2J distributed
- Constant-time execution (no information leakage via gas)
- Each card encrypted individually with per-player ACL

**Challenge verification:**
```solidity
function verifyClaim(gameId, player, indices, targetCard) returns (uint256 ctHash) {
    ebool allValid = FHE.asEbool(true);
    for each played card:
        ebool cardValid = FHE.or(FHE.eq(card, target), FHE.eq(card, JOKER));
        allValid = FHE.and(allValid, cardValid);
    FHE.allowPublic(allValid);  // Anyone can decrypt the result
    return ebool.unwrap(allValid);
}
```

### LiarsBarRevolver.sol — Per-Player Encrypted Bullet

Each player has their own revolver with a hidden bullet:

```solidity
function initRevolver(gameId, player) {
    euint8 pos = FHE.add(FHE.rem(FHE.randomEuint8(), SIX), ONE); // [1-6]
    FHE.allowThis(pos);  // Only contract can compute on it
    _bulletPosition[gameId][player] = pos;
}

function beginSpin(gameId, player) returns (uint256 ctHash) {
    chamberPointer[gameId][player]++;
    ebool fired = FHE.eq(_bulletPosition[gameId][player], FHE.asEuint8(ptr));
    FHE.allowPublic(fired);  // Result is public after spin
    return ebool.unwrap(fired);
}
```

**Security:** The bullet position is NEVER revealed. Only the boolean result (fired/not) is decrypted.

---

## FHE Operations Used

| Operation | Purpose |
|-----------|---------|
| `FHE.randomEuint8()` | Generate random cards and bullet position |
| `FHE.rem(a, b)` | Map random to range (card type, bullet position) |
| `FHE.add(a, b)` | Offset calculations |
| `FHE.sub(a, b)` | Decrement pool counts |
| `FHE.eq(a, b)` | Compare card to target, bullet to chamber |
| `FHE.lt(a, b)` | Range checks for card type mapping |
| `FHE.and(a, b)` | Combine boolean results |
| `FHE.or(a, b)` | Card valid = matches target OR is joker |
| `FHE.not(a)` | Negate boolean |
| `FHE.select(cond, a, b)` | Constant-time conditional (replaces if/else) |
| `FHE.asEuint8(val)` | Encrypt plaintext constant |
| `FHE.asEbool(val)` | Encrypt boolean constant |
| `FHE.allowThis(ct)` | Contract can use in future txs |
| `FHE.allow(ct, addr)` | Grant decrypt permission to specific player |
| `FHE.allowPublic(ct)` | Anyone can decrypt (for game results) |

---

## ACL (Access Control) Strategy

```
CARD VALUES:
  FHE.allowThis(card)     → contract can verify during challenge
  FHE.allow(card, owner)  → only card owner can see their hand
  FHE.allowPublic(card)   → NEVER (cards stay hidden)

BULLET POSITION:
  FHE.allowThis(bullet)   → contract can compare with chamber
  NEVER allow/allowPublic  → bullet position is NEVER revealed

CHALLENGE RESULT (ebool):
  FHE.allowPublic(result) → everyone sees if claim was valid

SPIN RESULT (ebool):
  FHE.allowPublic(result) → everyone sees if player died
```

---

## Decrypt Flows

### Player views own hand (private):
```
Frontend: cofhe.decryptForView(ctHash, FheTypes.Uint8).withPermit().execute()
→ Returns plaintext card value (0-3)
→ Only works because FHE.allow(card, player) was called
```

### Challenge resolution (public):
```
1. Contract: verifyClaim() → ebool → FHE.allowPublic()
2. Frontend: cofhe.decryptForTx(ctHash).withoutPermit().execute()
   → Returns {decryptedValue, signature}
3. Frontend: publishChallengeResult(gameId, ctHash, value, signature)
4. Contract: FHE.publishDecryptResult() verifies signature
   → Determines who spins
```

### Spin resolution (public):
```
1. Contract: beginSpin() → ebool → FHE.allowPublic()
2. Frontend: cofhe.decryptForTx(ctHash).withoutPermit().execute()
3. Frontend: publishSpinResult(gameId, ctHash, value, signature)
4. Contract: verifies → CLICK or BANG
```

---

## Security Properties

1. **No card peeking** — Cards are `euint8` with per-player ACL. Other players cannot decrypt.
2. **No bullet prediction** — Bullet position encrypted, never revealed. Only the fired/not boolean is public.
3. **No fake results** — `publishDecryptResult` requires a Threshold Network signature. Cannot forge.
4. **No information leakage** — All FHE operations are constant-time (via `FHE.select`). No gas-based side channels.
5. **No front-running** — Card values are encrypted. Seeing the tx in mempool reveals nothing.
6. **Timeout protection** — 30s per turn, `forceTimeout()` prevents griefing.

---

## Gas Considerations

- Card dealing (20 cards): ~200 FHE operations (heaviest tx)
- Challenge verification: ~6-9 FHE operations per challenge
- Spin: ~2 FHE operations
- All contracts compiled with `viaIR` + optimizer (200 runs)
- Frontend uses 5x gas multiplier for Arb Sepolia fee volatility
