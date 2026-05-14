# Liar's Bar — Testing Guide for Judges

## Prerequisites

1. **4 browser windows/tabs** with MetaMask (4 different accounts)
2. **Arbitrum Sepolia ETH** on all 4 accounts ([faucet](https://www.alchemy.com/faucets/arbitrum-sepolia))
3. **MetaMask** connected to Arbitrum Sepolia (Chain ID: 421614)

> **Tip:** Use MetaMask's "Create Account" to make 4 accounts in one browser, then open 4 tabs.

---

## Step-by-Step Testing

### 1. Access the Game

Open http://localhost:5173 (or deployed URL) in 4 browser tabs.

Each tab should use a different MetaMask account.

### 2. Landing Page

- You'll see the landing page with 3 game modes
- "Liar's Deck" is LIVE, others show "Coming Soon"
- Click **"PLAY NOW"** on Liar's Deck

### 3. Create a Table (Player 1)

- In Tab 1: Click **"NEW TABLE"**
- Sign the MetaMask transaction
- Wait for confirmation → you'll be redirected to the game room
- Note the **Table ID** shown on screen

### 4. Join the Table (Players 2-4)

- In Tabs 2, 3, 4: Enter the Table ID and click **"SIT DOWN"**
- Sign the MetaMask transaction in each
- Wait for confirmation before the next player joins
- You'll see seats fill up (animal masks: Fox, Rabbit, Cat, Owl)

### 5. Start the Game (Player 1 only)

- Once 4/4 seated, Player 1 (host) sees **"DEAL THE CARDS"**
- Click it and sign the transaction
- This is a heavy transaction (deals 20 encrypted cards + inits 4 revolvers)
- Wait ~15-30 seconds for confirmation

### 6. View Your Cards

- After the game starts, each player sees their 5 encrypted cards
- Cards will show 🔒 initially, then decrypt after ~10-15 seconds
- If cards don't appear, click **"🔓 Decrypt Hand"**
- Each player sees different cards (Ace, King, Queen, or Joker)

> **Note:** Card decryption requires the Fhenix CoFHE threshold network. If you get 403 errors, the testnet may be temporarily down.

### 7. Play Cards (Current Turn Player)

- The player whose turn it is (gold highlight) can:
  - **Select 1-3 cards** by clicking them (they lift up with gold glow)
  - Click **"PLAY [N] AS [TARGET]"** to play them face-down
- The claim is always the target card (shown in the center)
- You CAN lie — play Queens when the target is Kings!

### 8. Call Liar (Next Player)

- After someone plays cards, the next player sees the **"LIAR!"** button
- They can either:
  - Play their own cards (believe the previous player)
  - Click **"LIAR!"** to challenge

### 9. Challenge Resolution

- When LIAR is called:
  - Dramatic overlay appears: "LIAR!" with accuser vs accused
  - Cards are verified via FHE (takes 5-15 seconds)
  - The challenger's client auto-submits the decrypt result
  - Verdict shown: "CAUGHT LYING!" or "ALL VALID ✓"

### 10. Pull the Trigger

- The loser sees a **"🔫 PULL TRIGGER"** button
- Click it to resolve the spin
- Sign the MetaMask transaction
- Result: either *click* (survived) or BANG! (eliminated)
- Full-screen dramatic animation plays

### 11. New Round

- After a spin resolves (survived), a new round starts automatically
- New target card is selected
- New cards are dealt to all alive players
- Turn passes to the next alive player

### 12. Game Over

- When only 1 player remains alive, the game ends
- Winner screen shows with crown
- All eliminated players shown with their masks cracked

---

## What to Test

### Core Mechanics ✓
- [ ] 4 players can join and start a game
- [ ] Cards are encrypted (each player sees different cards)
- [ ] Playing cards removes them from hand
- [ ] Calling LIAR triggers FHE verification
- [ ] Correct player gets the revolver (liar or false accuser)
- [ ] Revolver is per-player (each has own chamber count)
- [ ] Game ends when 1 player remains

### FHE Verification ✓
- [ ] Playing target cards + getting challenged → "ALL VALID" (accuser spins)
- [ ] Playing wrong cards + getting challenged → "CAUGHT LYING" (liar spins)
- [ ] Joker always counts as valid (wildcard)

### Edge Cases ✓
- [ ] Timer expires (30s) → auto-plays a card
- [ ] Player with no cards left → must call LIAR
- [ ] Rejecting MetaMask tx → can retry via button
- [ ] Dead players don't get cards or turns

### UI/UX ✓
- [ ] Challenge overlay shows dramatic "LIAR!" animation
- [ ] Spin overlay shows CLICK or BANG with effects
- [ ] Turn timer counts down visually
- [ ] Game log shows events
- [ ] Per-player revolver chambers update correctly

---

## Known Limitations

1. **Card decryption delay** — FHE threshold network takes 5-20 seconds. Cards show 🔒 until decrypted.
2. **Fhenix testnet availability** — The CoFHE threshold network (`testnet-cofhe-tn.fhenix.zone`) may occasionally return 403. Retry after a few minutes.
3. **Gas estimation** — Arb Sepolia base fee fluctuates. We use 5x multiplier but occasionally a tx may fail. Retry.
4. **Heavy start transaction** — `startGame` deals 20 FHE cards + inits 4 revolvers. Can take 30+ seconds.
5. **No real-time sync** — Uses 3-second polling. Other players' actions appear with slight delay.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cards show 🔒 forever | Click "Decrypt Hand" button. If 403 error, Fhenix testnet may be down. |
| "max fee per gas less than block base fee" | Retry — gas price fluctuated. Our 5x multiplier usually handles this. |
| Game stuck in "Challenging" | The challenger's client auto-resolves. If they're offline, wait for timeout (30s) then any player can force. |
| Game stuck in "Spinning" | The spinner must click "Pull Trigger". If offline, wait for timeout. |
| Transaction fails silently | Check browser console for detailed error. Usually gas-related. |
| Can't see other players' actions | Wait 3 seconds for polling to update. |

---

## Contract Verification

All contracts are deployed on Arbitrum Sepolia and can be verified:

```
Game:     0x96Da3b705E3Bd95c70927732e6656FA337E1FEfe
Deck:     0x10D0cD836F82a5a9B659E73a611FA272cAD41098
Revolver: 0x3011DFd4076a2E6556591Acd57d7f9894cAe3bBd
```

View on [Arbiscan Sepolia](https://sepolia.arbiscan.io/address/0x96Da3b705E3Bd95c70927732e6656FA337E1FEfe)
