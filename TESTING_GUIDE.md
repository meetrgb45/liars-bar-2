# Bluff and Barrel — Testing Guide

## Prerequisites

1. **4 browser windows/tabs** with MetaMask (4 different accounts)
2. **Arbitrum Sepolia ETH** on all 4 accounts ([faucet](https://www.alchemy.com/faucets/arbitrum-sepolia))
3. **USDC on Arb Sepolia** (for staked games — optional, can play free)
4. **MetaMask** connected to Arbitrum Sepolia (Chain ID: 421614)

---

## Step-by-Step Testing

### 1. Access the Game

Open the app in 4 browser tabs. Each tab uses a different MetaMask account.

### 2. Landing Page

- "Card and Barrel" is LIVE with 3 sub-modes (Basic, Devil, Chaos)
- "Dice and Barrel" and "Slot and Barrel" show Coming Soon
- Click **"PLAY NOW"** on Card and Barrel

### 3. Lobby — Choose Mode and Character

- Select game mode: **Basic**, **Devil**, or **Chaos**
- Click **?** button to read rules for each mode
- Use the character carousel to pick your mask (8 options)
- Set USDC stake amount (leave empty for free game)

### 4. Create a Table (Player 1)

- Click **"New Table"**
- Sign MetaMask transaction (approve USDC if staked)
- Redirected to game room with your Table ID

### 5. Join the Table (Players 2-4)

- Enter the Table ID, click **"Sit Down"**
- Sign MetaMask transaction
- Each player sees their chosen character in their seat

### 6. Start the Game (Player 1 only)

- Once 4/4 seated, host sees **"Deal the Cards"**
- Click and sign — this is a heavy FHE transaction (~30s)
- Deals encrypted cards + initializes 4 revolvers

### 7. View Your Cards

- Cards auto-decrypt after ~10-15 seconds
- Each player sees different cards (face images: Ace, King, Queen, Joker)
- If cards stay face-down, wait for retry (auto-retries after 18s)

### 8. Play Cards

- Select 1-3 cards by clicking (they lift up when selected)
- Click **"Play [N] as [Target]"** to play face-down
- In Chaos mode: exactly 1 card per turn

### 9. Call LIAR

- Next player can click **"LIAR!"** to challenge
- Or play their own cards to continue

### 10. Challenge Resolution

- Overlay shows accuser vs accused with their chosen characters
- Cards are revealed with actual card images (green border = valid, red = lie)
- Verdict: "CAUGHT LYING!" or "ALL VALID"

### 11. Revolver

- **Basic/Devil**: Loser clicks "Pull Trigger" on their own revolver
- **Chaos**: Winner picks an opponent to shoot (target picker)
- Result: CLICK (survived) or BANG! (eliminated)

### 12. Devil Mode Special

- If Devil card is revealed during challenge, ALL other players must spin
- Each affected player triggers their own spin

### 13. Chaos Mode Special

- Master card: accused gets to shoot someone
- Chaos card: ALL players simultaneously pick targets and shoot

### 14. Game Over

- Winner shown with crown, character, and wallet address
- Eliminated players shown below
- If staked: winner auto-receives USDC (95% of pot)
- Click "Another Round" to return to lobby

---

## What to Test

### Core Mechanics
- [ ] 4 players join, choose characters, start game
- [ ] Cards are encrypted and auto-decrypt per player
- [ ] Playing cards removes them from hand
- [ ] LIAR challenge triggers FHE verification
- [ ] Card reveal shows actual card images
- [ ] Correct player faces revolver
- [ ] Per-player revolver chambers track correctly
- [ ] Game ends when 1 player remains

### Game Modes
- [ ] Basic: 5 cards, 1-3 per turn, Joker is wild
- [ ] Devil: Devil card triggers multi-spin on all others
- [ ] Chaos: 3 cards, 1 per turn, winner shoots opponent

### Stake System
- [ ] Create table with USDC stake (e.g. 1 USDC)
- [ ] Joining requires USDC approval + transfer
- [ ] Winner receives pot minus 5% fee on GameOver
- [ ] Free games (stake=0) work without USDC

### Character System
- [ ] 8 characters available in carousel
- [ ] Choice stored on-chain (all players see correct characters)
- [ ] Characters show in game, overlays, and winner screen

### UI/UX
- [ ] Mode selector (Basic/Devil/Chaos) in lobby
- [ ] Rules popup (? button) in lobby and game
- [ ] Stake/pot shown in game nav bar
- [ ] 60-second timer with visual countdown
- [ ] Challenge overlay with character images
- [ ] Winner modal with wallet address

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cards stay face-down | Auto-retries after 18s. If persistent, Fhenix testnet may be temporarily down. |
| "max fee per gas less than block base fee" | Retry — Arb Sepolia fee fluctuated. |
| "USDC transfer failed" | Ensure you have USDC and approved the game contract. |
| Game stuck in Challenging | Challenger's client auto-resolves. Wait for timeout (60s). |
| Wrong character shown | Characters are on-chain — ensure you selected before joining. |
| High gas alert | Normal for Arb Sepolia. Actual cost is minimal (~$0.001). |

---

## Contract Addresses (Arbitrum Sepolia)

```
Revolver:       0x841e7d5d94aEb35Ce79AA1E310DbA1c859e4df0B
Basic Game:     0xa8F9c55d817e6e04E31D80A7D064697d5ADE5A2D
Basic Deck:     0x6778664E42A95c1E52f25949228B74a195063292
Devil Game:     0xC5EA6c3F59f0e93D847C9b41501368Cec2CE37A2
Devil Deck:     0x6E26Bffa8156863e5cBFAE05B8FB32f1D2A797F9
Chaos Game:     0x23DC7899C287AF749eBA0Bc0Dcbe53CDA1A2f1Fd
Chaos Deck:     0x2FaB9916571955f61596A2bBe80fe611F2549f4A
USDC:           0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
```
