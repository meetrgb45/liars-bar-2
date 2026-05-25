// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FHE} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/ILiarsBarGame.sol";
import "./LiarsBarDeck.sol";
import "./LiarsBarRevolver.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title LiarsBarGame
 * @notice Full Liar's Bar orchestrator — 4-player elimination card bluffing.
 *
 * Game flow:
 *   1. Create → 4 players join → start
 *   2. Each round: pick target card, deal 20 cards (5 per player)
 *   3. Players take turns: play 1-3 cards OR call liar OR use execute
 *   4. On "call liar": verify claim via FHE → loser spins revolver
 *   5. Spin resolves (CLICK/BANG) → new round or elimination
 *   6. Last player alive wins
 *
 * Special mechanics:
 *   - Points: +N for playing N cards unchallenged, -N if caught lying
 *   - Execute: spend 5+ points to instantly eliminate lowest scorer (one-time)
 *   - Double Spin: advance revolver by 2 instead of 1 (one-time, risky)
 */
contract LiarsBarGame is ILiarsBarGame {
    struct Player {
        address addr;
        bool alive;
        uint8 points;
        bool hasUsedExecute;
        bool hasUsedDoubleSpin;
        uint8 characterId;
    }

    struct Game {
        GameState state;
        uint8 round;
        uint8 targetCard;           // 0=Ace, 1=King, 2=Queen
        uint8 currentTurnIndex;     // index into players array
        uint8 aliveCount;
        Player[4] players;
        // Last claim info (for challenge)
        address lastClaimant;
        uint8 lastClaimCount;
        uint8[] lastPlayedIndices;
        // Pending resolution
        uint256 pendingCtHash;
        address pendingSpinner;     // who must spin after challenge
        bool pendingIsDoubleSpin;
        address winner;
        // Turn timer
        uint256 turnDeadline;       // block.timestamp when current turn expires
        // Stake
        uint256 stakeAmount;        // USDC per player (0 = free game)
    }

    uint256 public constant TURN_TIMEOUT = 60; // 60 seconds per turn
    uint256 public constant FEE_BPS = 500;     // 5% platform fee

    mapping(uint256 => Game) public games;
    uint256 public nextGameId;

    // Card reveal
    mapping(uint256 => uint256[]) public revealCtHashes;
    mapping(uint256 => uint8[]) public revealedCards;

    event CardsRevealed(uint256 indexed gameId, uint8[] cardValues, bool wasLie);

    LiarsBarDeck public deck;
    LiarsBarRevolver public revolver;
    IERC20 public usdc;
    address public treasury;

    constructor(address _deck, address _revolver, address _usdc, address _treasury) {
        deck = LiarsBarDeck(_deck);
        revolver = LiarsBarRevolver(_revolver);
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    // ─── Lobby ────────────────────────────────────────────────────────────

    function createGame(uint8 characterId, uint256 stakeAmount) external returns (uint256 gameId) {
        gameId = nextGameId++;
        Game storage g = games[gameId];
        g.state = GameState.WaitingForPlayers;
        g.players[0] = Player(msg.sender, true, 0, false, false, characterId);
        g.aliveCount = 1;
        g.stakeAmount = stakeAmount;
        if (stakeAmount > 0) {
            require(usdc.transferFrom(msg.sender, address(this), stakeAmount), "USDC transfer failed");
        }
        emit GameCreated(gameId, msg.sender);
        emit PlayerJoined(gameId, msg.sender, 0);
    }

    function joinGame(uint256 gameId, uint8 characterId) external {
        Game storage g = games[gameId];
        if (g.state != GameState.WaitingForPlayers) revert NotInCorrectPhase();

        uint8 idx = _playerCount(g);
        if (idx >= 4) revert GameFull();

        // Check not already joined
        for (uint8 i = 0; i < idx; i++) {
            if (g.players[i].addr == msg.sender) revert AlreadyJoined();
        }

        g.players[idx] = Player(msg.sender, true, 0, false, false, characterId);
        g.aliveCount++;
        if (g.stakeAmount > 0) {
            require(usdc.transferFrom(msg.sender, address(this), g.stakeAmount), "USDC transfer failed");
        }
        emit PlayerJoined(gameId, msg.sender, idx);
    }

    function startGame(uint256 gameId) external {
        Game storage g = games[gameId];
        if (g.state != GameState.WaitingForPlayers) revert NotInCorrectPhase();
        if (_playerCount(g) != 4) revert GameNotFull();
        require(msg.sender == g.players[0].addr, "Only host");

        g.state = GameState.Dealing;
        emit GameStarted(gameId);

        // Init revolver (one bullet for entire game)
        // Init revolver for each player (each has own bullet)
        for (uint8 i = 0; i < 4; i++) {
            revolver.initRevolver(gameId, g.players[i].addr);
        }

        // Start first round
        _startRound(gameId);
    }

    // ─── Gameplay ─────────────────────────────────────────────────────────

    /**
     * @notice Play 1-3 cards face-down, claiming they are the target card.
     */
    function playCards(uint256 gameId, uint8[] calldata cardIndices) external {
        Game storage g = games[gameId];
        if (g.state != GameState.PlayerTurn) revert NotInCorrectPhase();
        if (msg.sender != g.players[g.currentTurnIndex].addr) revert NotYourTurn();
        if (cardIndices.length < 1 || cardIndices.length > 3) revert InvalidCardCount();

        // Mark cards as played in deck
        deck.markCardsPlayed(gameId * 100 + g.round, msg.sender, cardIndices);

        // Store claim info for potential challenge
        g.lastClaimant = msg.sender;
        g.lastClaimCount = uint8(cardIndices.length);
        g.lastPlayedIndices = cardIndices;

        // Award points immediately (deducted if caught lying)
        _addPoints(gameId, _playerIndex(gameId, msg.sender), uint8(cardIndices.length));

        emit CardsPlayed(gameId, msg.sender, uint8(cardIndices.length));

        // Advance to next alive player
        _advanceTurn(gameId);
    }

    /**
     * @notice Challenge the previous player's claim. Triggers FHE verification.
     */
    function callLiar(uint256 gameId) external {
        Game storage g = games[gameId];
        if (g.state != GameState.PlayerTurn) revert NotInCorrectPhase();
        if (msg.sender != g.players[g.currentTurnIndex].addr) revert NotYourTurn();
        if (g.lastClaimant == address(0)) revert NothingToChallenge();
        if (msg.sender == g.lastClaimant) revert CannotChallengeSelf();

        g.state = GameState.Challenging;
        g.turnDeadline = block.timestamp + TURN_TIMEOUT;

        // Make challenged cards publicly decryptable for reveal
        uint256[] memory cardCts = deck.revealCards(
            gameId * 100 + g.round, g.lastClaimant, g.lastPlayedIndices
        );
        revealCtHashes[gameId] = cardCts;
        delete revealedCards[gameId];

        // Verify claim via encrypted card check
        uint256 ctHash = deck.verifyClaim(
            gameId * 100 + g.round, g.lastClaimant, g.lastPlayedIndices, g.targetCard
        );
        g.pendingCtHash = ctHash;

        emit LiarCalled(gameId, msg.sender, g.lastClaimant);
    }

    /**
     * @notice Submit decrypted challenge result. Called by frontend after decryptForTx.
     * @param result 1 = all cards valid (false accusation), 0 = lie confirmed
     */
    function publishChallengeResult(
        uint256 gameId,
        uint256 ctHash,
        uint256 result,
        bytes calldata signature
    ) external {
        Game storage g = games[gameId];
        if (g.state != GameState.Challenging) revert NotInCorrectPhase();
        if (ctHash != g.pendingCtHash) revert InvalidCtHash();

        FHE.publishDecryptResult(ctHash, result, signature);

        bool allValid = (result == 1);
        address accuser = g.players[g.currentTurnIndex].addr;
        address accused = g.lastClaimant;

        if (allValid) {
            // False accusation — accuser spins
            g.pendingSpinner = accuser;
            emit ChallengeResolved(gameId, false, accuser);
        } else {
            // Lie confirmed — accused spins + loses points
            g.pendingSpinner = accused;
            uint8 accusedIdx = _playerIndex(gameId, accused);
            _deductPoints(gameId, accusedIdx, g.lastClaimCount);
            emit ChallengeResolved(gameId, true, accused);
        }

        // Transition to spinning
        g.state = GameState.Spinning;
        g.pendingCtHash = 0;
        g.turnDeadline = block.timestamp + TURN_TIMEOUT;
        _triggerSpin(gameId);
    }

    /**
     * @notice Opt to use double spin (must be called before spin resolves).
     *         Only available if player hasn't used it yet.
     */
    function useDoubleSpin(uint256 gameId) external {
        Game storage g = games[gameId];
        if (g.state != GameState.Spinning) revert NotInCorrectPhase();
        require(msg.sender == g.pendingSpinner, "Not the spinner");

        uint8 idx = _playerIndex(gameId, msg.sender);
        if (g.players[idx].hasUsedDoubleSpin) revert AlreadyUsedDoubleSpin();

        g.players[idx].hasUsedDoubleSpin = true;
        g.pendingIsDoubleSpin = true;

        emit DoubleSpinUsed(gameId, msg.sender);

        // Re-trigger as double spin
        _triggerDoubleSpin(gameId);
    }

    /**
     * @notice Submit decrypted spin result.
     * @param result 0 = survived (CLICK), 1 = fired (BANG)
     */
    function publishSpinResult(
        uint256 gameId,
        uint256 ctHash,
        uint256 result,
        bytes calldata signature
    ) external {
        Game storage g = games[gameId];
        if (g.state != GameState.Spinning) revert NotInCorrectPhase();

        revolver.publishSpinResult(gameId, g.pendingSpinner, ctHash, result, signature);

        bool fired = (result == 1);
        address spinner = g.pendingSpinner;

        emit SpinResult(gameId, spinner, fired);

        if (fired) {
            _eliminatePlayer(gameId, spinner, "SPIN");
        } else if (g.pendingIsDoubleSpin && revolver.pendingDoubleCt(gameId) != 0) {
            // Double spin: first was safe, wait for second result
            emit SpinTriggered(gameId, spinner, true);
            return;
        } else {
            // Survived — start new round
            _startRound(gameId);
        }
    }

    /**
     * @notice Submit second spin result for double spin.
     */
    function publishDoubleSpinResult(
        uint256 gameId,
        uint256 ctHash,
        uint256 result,
        bytes calldata signature
    ) external {
        Game storage g = games[gameId];
        if (g.state != GameState.Spinning) revert NotInCorrectPhase();

        revolver.publishDoubleSpinResult(gameId, g.pendingSpinner, ctHash, result, signature);

        bool fired = (result == 1);
        address spinner = g.pendingSpinner;

        emit SpinResult(gameId, spinner, fired);

        if (fired) {
            _eliminatePlayer(gameId, spinner, "DOUBLE_SPIN");
        } else {
            // Survived both — start new round
            _startRound(gameId);
        }
    }

    /**
     * @notice Use Execute ability: instantly eliminate the lowest-scoring alive player.
     *         Requires 5+ points, one-time use, takes your turn.
     */
    function useExecute(uint256 gameId) external {
        Game storage g = games[gameId];
        if (g.state != GameState.PlayerTurn) revert NotInCorrectPhase();
        if (msg.sender != g.players[g.currentTurnIndex].addr) revert NotYourTurn();

        uint8 myIdx = g.currentTurnIndex;
        if (g.players[myIdx].points < 5) revert InsufficientPoints();
        if (g.players[myIdx].hasUsedExecute) revert AlreadyUsedExecute();

        g.players[myIdx].hasUsedExecute = true;

        // Find lowest scorer (not self, must be alive)
        uint8 targetIdx = type(uint8).max;
        uint8 lowestScore = type(uint8).max;
        for (uint8 i = 0; i < 4; i++) {
            if (i == myIdx || !g.players[i].alive) continue;
            if (g.players[i].points < lowestScore) {
                lowestScore = g.players[i].points;
                targetIdx = i;
            }
        }
        require(targetIdx != type(uint8).max, "No valid target");

        emit ExecuteUsed(gameId, msg.sender, g.players[targetIdx].addr);
        _eliminatePlayer(gameId, g.players[targetIdx].addr, "EXECUTE");
    }

    /**
     * @notice Force timeout when a player doesn't act within TURN_TIMEOUT.
     *         Any player in the game can call this after deadline passes.
     *         - PlayerTurn: skip turn (pass to next player)
     *         - Challenging: challenger forfeits, they spin
     *         - Spinning: spinner is eliminated (refused to pull trigger)
     */
    function forceTimeout(uint256 gameId) external {
        Game storage g = games[gameId];
        require(block.timestamp >= g.turnDeadline, "Not timed out yet");
        require(g.state == GameState.PlayerTurn || g.state == GameState.Challenging || g.state == GameState.Spinning, "No timeout in this state");

        if (g.state == GameState.PlayerTurn) {
            // Skip turn — if there's a claim, auto-call liar on the current player's behalf
            // If no claim exists, just pass turn
            if (g.lastClaimant != address(0)) {
                // Auto-call liar (current player is forced to challenge)
                // But we can't do FHE verification without the decrypt flow.
                // Simpler: just skip their turn, pass to next player
                _advanceTurn(gameId);
            } else {
                _advanceTurn(gameId);
            }
        } else if (g.state == GameState.Challenging) {
            // Challenger didn't reveal — they forfeit, they spin instead
            address challenger = g.players[g.currentTurnIndex].addr;
            g.pendingSpinner = challenger;
            g.state = GameState.Spinning;
            g.turnDeadline = block.timestamp + TURN_TIMEOUT;
            _triggerSpin(gameId);
            emit ChallengeResolved(gameId, false, challenger);
        } else if (g.state == GameState.Spinning) {
            // Player refused to pull trigger — auto-eliminate
            address spinner = g.pendingSpinner;
            _eliminatePlayer(gameId, spinner, "TIMEOUT");
        }
    }

    /**
     * @notice Publish decrypted card values for the challenge reveal.
     *         Called by frontend after decrypting each card's ctHash.
     */
    function publishCardReveal(
        uint256 gameId,
        uint256[] calldata ctHashes,
        uint256[] calldata results,
        bytes[] calldata signatures
    ) external {
        Game storage g = games[gameId];
        require(ctHashes.length == results.length && results.length == signatures.length, "Length mismatch");

        uint8[] memory cards = new uint8[](results.length);
        bool wasLie = false;
        for (uint256 i = 0; i < results.length; i++) {
            FHE.publishDecryptResult(ctHashes[i], results[i], signatures[i]);
            cards[i] = uint8(results[i]);
            // Check if card doesn't match target and isn't joker
            if (results[i] != g.targetCard && results[i] != 3) {
                wasLie = true;
            }
        }
        revealedCards[gameId] = cards;
        emit CardsRevealed(gameId, cards, wasLie);
    }

    /**
     * @notice Get the ctHashes for challenged cards (for frontend to decrypt).
     */
    function getRevealCtHashes(uint256 gameId) external view returns (uint256[] memory) {
        return revealCtHashes[gameId];
    }

    /**
     * @notice Get the revealed card values after challenge.
     */
    function getRevealedCards(uint256 gameId) external view returns (uint8[] memory) {
        return revealedCards[gameId];
    }

    // ─── View Functions ───────────────────────────────────────────────────

    function getPlayer(uint256 gameId, uint8 index) external view returns (
        address addr, bool alive, uint8 points, bool usedExecute, bool usedDoubleSpin, uint8 characterId
    ) {
        Player storage p = games[gameId].players[index];
        return (p.addr, p.alive, p.points, p.hasUsedExecute, p.hasUsedDoubleSpin, p.characterId);
    }

    function getGameState(uint256 gameId) external view returns (
        GameState state, uint8 round, uint8 targetCard,
        uint8 currentTurnIndex, uint8 aliveCount, address winner
    ) {
        Game storage g = games[gameId];
        return (g.state, g.round, g.targetCard, g.currentTurnIndex, g.aliveCount, g.winner);
    }

    function getLastClaim(uint256 gameId) external view returns (
        address claimant, uint8 count
    ) {
        Game storage g = games[gameId];
        return (g.lastClaimant, g.lastClaimCount);
    }

    function getPendingSpinner(uint256 gameId) external view returns (address) {
        return games[gameId].pendingSpinner;
    }

    function getPendingCtHash(uint256 gameId) external view returns (uint256) {
        return games[gameId].pendingCtHash;
    }

    function getTurnDeadline(uint256 gameId) external view returns (uint256) {
        return games[gameId].turnDeadline;
    }

    function getStakeAmount(uint256 gameId) external view returns (uint256) {
        return games[gameId].stakeAmount;
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _startRound(uint256 gameId) internal {
        Game storage g = games[gameId];
        g.round++;

        // Random target card: 0=Ace, 1=King, 2=Queen (never Joker)
        g.targetCard = uint8(uint256(keccak256(abi.encodePacked(
            block.timestamp, block.prevrandao, gameId, g.round
        ))) % 3);

        // Deal 5 cards to each alive player
        address[4] memory alivePlayers;
        uint8 count = 0;
        for (uint8 i = 0; i < 4; i++) {
            if (g.players[i].alive) {
                alivePlayers[count] = g.players[i].addr;
                count++;
            }
        }
        // Fill remaining slots with first alive player (won't be dealt to in practice
        // since dealAllHands always deals to all 4 — but we only have alive players)
        // Actually: we need exactly 4 players for the 20-card deal.
        // If players are eliminated, we deal fewer cards total.
        // For simplicity: deal to alive players only, pad array with address(0)
        // The deck contract handles 4 addresses — we pass alive ones + zero addresses
        // BUT: the deck always deals 20 cards to 4 players.
        // After elimination, we can't deal 20 cards to fewer players.
        // SOLUTION: Only deal to alive players, 5 cards each. Remaining cards are discarded.
        // This means we need a different dealing approach for < 4 alive players.

        // For the full game: deal to all 4 slots, dead players' cards are just wasted
        address[4] memory dealTo;
        for (uint8 i = 0; i < 4; i++) {
            dealTo[i] = g.players[i].alive ? g.players[i].addr : g.players[0].addr;
        }
        deck.dealAllHands(gameId * 100 + g.round, dealTo);

        // Reset turn state
        g.lastClaimant = address(0);
        g.lastClaimCount = 0;
        delete g.lastPlayedIndices;
        g.pendingSpinner = address(0);
        g.pendingIsDoubleSpin = false;

        // Set turn to first alive player
        g.currentTurnIndex = _nextAliveIndex(g, type(uint8).max);
        g.state = GameState.PlayerTurn;
        g.turnDeadline = block.timestamp + TURN_TIMEOUT;

        emit RoundStarted(gameId, g.round, g.targetCard);
    }

    function _triggerSpin(uint256 gameId) internal {
        address spinner = games[gameId].pendingSpinner;
        uint256 ctHash = revolver.beginSpin(gameId, spinner);
        games[gameId].pendingCtHash = ctHash;
        emit SpinTriggered(gameId, spinner, false);
    }

    function _triggerDoubleSpin(uint256 gameId) internal {
        address spinner = games[gameId].pendingSpinner;
        uint256 ctHash = revolver.beginDoubleSpin(gameId, spinner);
        games[gameId].pendingCtHash = ctHash;
    }

    function _eliminatePlayer(uint256 gameId, address player, string memory cause) internal {
        Game storage g = games[gameId];
        uint8 idx = _playerIndex(gameId, player);
        g.players[idx].alive = false;
        g.aliveCount--;

        emit PlayerEliminated(gameId, player, cause);

        if (g.aliveCount == 1) {
            // Find winner
            for (uint8 i = 0; i < 4; i++) {
                if (g.players[i].alive) {
                    g.winner = g.players[i].addr;
                    g.state = GameState.GameOver;
                    // Payout
                    if (g.stakeAmount > 0) {
                        uint256 pot = g.stakeAmount * 4;
                        uint256 fee = (pot * FEE_BPS) / 10000;
                        usdc.transfer(treasury, fee);
                        usdc.transfer(g.winner, pot - fee);
                    }
                    emit GameOver(gameId, g.winner);
                    return;
                }
            }
        } else {
            // Continue — start new round
            _startRound(gameId);
        }
    }

    function _advanceTurn(uint256 gameId) internal {
        Game storage g = games[gameId];
        g.currentTurnIndex = _nextAliveIndex(g, g.currentTurnIndex);
        g.turnDeadline = block.timestamp + TURN_TIMEOUT;
    }

    function _nextAliveIndex(Game storage g, uint8 current) internal view returns (uint8) {
        uint8 next = (current == type(uint8).max) ? 0 : (current + 1) % 4;
        for (uint8 i = 0; i < 4; i++) {
            if (g.players[next].alive) return next;
            next = (next + 1) % 4;
        }
        return 0; // should never reach
    }

    function _addPoints(uint256 gameId, uint8 playerIdx, uint8 amount) internal {
        games[gameId].players[playerIdx].points += amount;
        emit PointsUpdated(gameId, games[gameId].players[playerIdx].addr, int8(uint8(amount)));
    }

    function _deductPoints(uint256 gameId, uint8 playerIdx, uint8 amount) internal {
        Player storage p = games[gameId].players[playerIdx];
        uint8 deducted = amount > p.points ? p.points : amount;
        p.points -= deducted;
        emit PointsUpdated(gameId, p.addr, -int8(deducted));
    }

    function _playerIndex(uint256 gameId, address player) internal view returns (uint8) {
        for (uint8 i = 0; i < 4; i++) {
            if (games[gameId].players[i].addr == player) return i;
        }
        revert("Player not found");
    }

    function _playerCount(Game storage g) internal view returns (uint8) {
        for (uint8 i = 0; i < 4; i++) {
            if (g.players[i].addr == address(0)) return i;
        }
        return 4;
    }
}
