# Bluff and Barrel — Roadmap

## Vision

Bluff and Barrel is the first provably fair, FHE-encrypted card bluffing game with real stakes. Our goal is to build the go-to on-chain social deception platform — starting with cards, expanding to dice and slots, and creating a full ecosystem of NFTs, tournaments, and community.

---

## Timeline

### Phase 1: Card and Barrel (LIVE — June 1, 2026)

**Status: Shipped**

- 3 game modes: Basic, Devil, Chaos
- USDC stake system (5% platform fee)
- 8 selectable characters (on-chain)
- FHE-encrypted cards and revolver
- Card reveal on challenge
- WebSocket real-time sync
- Sound effects
- Invite links
- Security audited

---

### Phase 2: Dice and Barrel (End of July 2026)

**The Game:**
- 4 players, each rolls 5 hidden dice (FHE-encrypted)
- Players bid on total count of a face value across ALL players' dice
- "I say there are six 4s on the table"
- Next player: raise the bid OR call "LIAR!"
- If liar called: all dice revealed
  - Bid was correct or under → caller drinks poison (spins revolver)
  - Bid was over → bidder drinks poison
- Last player alive wins the pot

**Key Mechanics:**
- 20 encrypted dice total (5 per player)
- Bids are public (not encrypted)
- Reveal is all-or-nothing (all 20 dice shown)
- Same revolver system as Card and Barrel

**New Contract:** `LiarsBarDice.sol` — FHE dice roll + bid verification

**Assets Needed:**
- Dice face images (1-6) in the game's art style (paperboard/vintage)
- Dice rolling animation (3D tumble or flat spin)
- Poison bottle / drink animation (replaces gun for thematic variety, or keep revolver)
- Bid UI mockup (number selector + face selector)
- Sound: dice_roll.mp3, dice_reveal.mp3, poison_drink.mp3

---

### Phase 3: Slot and Barrel (End of September 2026)

**The Game:**
- 4 players, each has a hidden slot machine result (FHE-encrypted)
- Slot shows 3 symbols: Hearts, Diamonds, Skulls
- Players take turns claiming how many Hearts they got
- Others can call "LIAR!" or raise
- If challenged: slot revealed
  - Liar caught → spins revolver
  - False accusation → accuser spins
- Special: 3 Skulls = "Death Spin" (instant double chamber advance)

**Key Mechanics:**
- 3 encrypted symbols per player (euint8, values 0-2)
- Claims are about Hearts count only
- Skulls add a risk/reward element
- Same revolver + stake system

**New Contract:** `LiarsBarSlots.sol` — FHE slot generation + claim verification

**Assets Needed:**
- Slot machine frame (vintage/steampunk style matching theme)
- Symbol images: Heart, Diamond, Skull (in paperboard art style)
- Slot spinning animation (reels rolling)
- "Death Spin" special effect overlay
- Sound: slot_spin.mp3, slot_stop.mp3, skull_reveal.mp3

---

### Phase 4: Character NFTs (October 2026)

**What:**
- Mint the 8 base characters as NFTs (free claim for early players)
- New premium characters (12-16 additional) as paid mint
- NFT holders get exclusive table access + reduced platform fee (3% instead of 5%)
- Characters are ERC-721 on Arbitrum

**Premium Character Ideas:**
- Dragon, Phoenix, Kraken, Viper, Raven, Hyena, Scorpion, Mantis
- Each with unique alive/dead art variants
- Animated idle poses (subtle breathing/blinking)

**Assets Needed:**
- 12-16 new character illustrations (same style as current 8)
- Each needs: alive pose, dead pose
- NFT metadata (name, description, traits)
- Mint page UI
- Collection preview gallery

---

### Phase 5: Shielded Token (November 2026)

**What:**
- Launch $BLUFF token (ERC-20 on Arbitrum)
- FHE-shielded balances — nobody can see how much you hold
- Use as alternative stake currency (alongside USDC)
- Earn $BLUFF by playing (small rewards per game)
- Stake $BLUFF for governance + fee sharing

**Tokenomics (suggested):**
- Total supply: 100M $BLUFF
- 40% — Play-to-earn rewards (vested over 3 years)
- 20% — Team (1 year cliff, 2 year vest)
- 15% — Treasury/DAO
- 15% — Liquidity
- 10% — Early supporters / NFT holders airdrop

**Assets Needed:**
- Token logo/icon
- Tokenomics infographic
- Staking UI page
- Shielded balance display component

---

### Phase 6: Theme NFTs (December 2026)

**What:**
- NFT collections that change the entire game UI theme
- Holder applies a theme → their game room looks different for ALL players in that room
- Themes are cosmetic — no gameplay advantage

**Theme Ideas:**
- **Cyberpunk** — Neon lights, holographic cards, laser revolver
- **Wild West** — Saloon, poker chips, six-shooter
- **Space Station** — Zero-G cards, plasma gun, alien masks
- **Underwater** — Coral table, bubble effects, harpoon gun
- **Samurai** — Dojo, katana (replaces revolver), oni masks

**Assets Needed (per theme):**
- Background/table texture
- Card back design
- Card face redesigns (Ace/King/Queen/Joker in theme style)
- Revolver/weapon replacement
- Character mask variants (or new characters per theme)
- UI panel textures (buttons, borders)
- Sound pack (themed card flip, weapon sound, ambient)
- ~50-80 assets per theme

---

### Phase 7: Tournament — EF Devcon Mumbai (February 2027)

**What:**
- Live tournament at Devcon with real prizes
- 64-player bracket (16 tables of 4 → winners advance)
- Entry: 50 USDC or 5000 $BLUFF
- Prize pool: Entry fees + sponsor pool
- Streamed live with spectator mode

**Features Needed:**
- Tournament bracket UI (create, join, view bracket)
- Spectator mode (watch live games without playing)
- Tournament smart contract (bracket management, prize distribution)
- Leaderboard (ELO rating system)
- Live stream integration (OBS overlay?)

**Assets Needed:**
- Tournament bracket visualization
- Winner podium / trophy animation
- Spectator UI (minimal, view-only game room)
- Devcon-specific theme (optional limited edition)
- Marketing materials (banner, poster, social cards)

---

## Additional Suggestions

### Mobile App (Q1 2027)
- React Native or PWA
- Same contracts, mobile-optimized UI
- Push notifications for turn alerts

### Private Rooms (Phase 2+)
- Invite-only tables with custom rules
- Password-protected rooms
- Custom stake amounts beyond presets

### Leaderboard + ELO (Phase 2+)
- Track wins/losses per wallet
- Seasonal rankings with rewards
- Matchmaking by skill level

### Multi-chain (Phase 5+)
- Deploy on Base, Polygon, Optimism
- Cross-chain $BLUFF bridging
- Chain-specific themes

### AI Opponents (Future)
- Fill empty seats with AI players for practice
- Different AI difficulty levels
- No stakes in AI games

---

## Asset Summary

| Phase | Assets Needed | Priority |
|-------|--------------|----------|
| Phase 2 (Dice) | 6 dice faces, roll animation, bid UI, 3 sounds | High |
| Phase 3 (Slots) | Slot frame, 3 symbols, spin animation, 3 sounds | High |
| Phase 4 (NFTs) | 12-16 character illustrations (alive+dead), mint page | Medium |
| Phase 5 (Token) | Logo, tokenomics graphic, staking UI | Medium |
| Phase 6 (Themes) | 50-80 assets per theme (5 themes = 250-400 assets) | Low |
| Phase 7 (Tournament) | Bracket UI, trophy, spectator mode, marketing | Medium |

### Art Style Guide
All assets should match the current aesthetic:
- Paperboard/vintage textures
- Warm color palette (#c9a84c gold, #2a1a0a dark, #dfd5b4 cream)
- Hand-drawn / illustrated feel (not photorealistic)
- Animal mask characters with expressive poses
- Dark bar/underground atmosphere
- No emojis anywhere

---

## Revenue Model

| Source | When | Estimate |
|--------|------|----------|
| Platform fee (5% of stakes) | Phase 1+ | Scales with players |
| Character NFT mint | Phase 4 | One-time revenue |
| Theme NFT mint | Phase 6 | Recurring per theme drop |
| Tournament entry fees | Phase 7 | Per event |
| $BLUFF token appreciation | Phase 5+ | Long-term |

---

## Key Milestones

- [x] June 1, 2026 — Card and Barrel live
- [ ] By June 30, 2026 — Dice and Barrel live
- [ ] By July 31, 2026 — Slot and Barrel live
- [ ] By August 31 2026 — Character NFT mint
- [ ] By September 30 2026 — $BLUFF token launch
- [ ] By October 15 2026 — First theme NFT drop
- [ ] November 2026 — Devcon Mumbai tournament
