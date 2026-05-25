// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FHE} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./LiarsBarChaosDeck.sol";
import "./LiarsBarRevolver.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title LiarsBarChaosGame
 * @notice Chaos Mode: 12 cards, 3 per player, 1 card per turn.
 *         Roulette is flipped — winner shoots opponent of choice.
 *         Master card: accused gets to shoot. Chaos card: everyone shoots.
 *
 *         Challenge outcomes (after card reveal):
 *         - Regular lie: challenger picks target to shoot
 *         - Regular valid: accused picks target to shoot
 *         - Master: accused picks target to shoot
 *         - Chaos: all alive players pick targets simultaneously
 */
contract LiarsBarChaosGame {
    enum GameState { WaitingForPlayers, Dealing, PlayerTurn, Challenging, Targeting, MultiTargeting, Shooting, GameOver }

    struct Player {
        address addr;
        bool alive;
        uint8 characterId;
    }

    struct Game {
        GameState state;
        uint8 round;
        uint8 targetCard;       // 0=King, 1=Queen
        uint8 currentTurnIndex;
        uint8 aliveCount;
        Player[4] players;
        address lastClaimant;
        uint8 lastPlayedIndex;  // single card index
        uint256 pendingCtHash;
        address winner;
        uint256 turnDeadline;
        // Targeting
        address shooter;                    // single shooter (Targeting state)
        address[] multiShooters;            // all shooters (MultiTargeting state)
        mapping(address => address) chosenTargets;
        uint8 targetsChosen;
        uint256 stakeAmount;
    }

    // Card reveal
    mapping(uint256 => uint256) public revealCtHash;   // single card
    mapping(uint256 => uint8) public revealedCard;
    mapping(uint256 => bool) public cardRevealed;

    event GameCreated(uint256 indexed gameId, address indexed host);
    event PlayerJoined(uint256 indexed gameId, address indexed player, uint8 index);
    event GameStarted(uint256 indexed gameId);
    event RoundStarted(uint256 indexed gameId, uint8 round, uint8 targetCard);
    event CardPlayed(uint256 indexed gameId, address indexed player);
    event LiarCalled(uint256 indexed gameId, address indexed accuser, address indexed accused);
    event ChallengeResolved(uint256 indexed gameId, bool lieConfirmed, uint8 cardType);
    event CardRevealed(uint256 indexed gameId, uint8 cardValue);
    event TargetChosen(uint256 indexed gameId, address indexed shooter, address indexed target);
    event SpinResult(uint256 indexed gameId, address indexed target, bool fired);
    event PlayerEliminated(uint256 indexed gameId, address indexed player);
    event GameOver(uint256 indexed gameId, address indexed winner);

    uint256 public constant TURN_TIMEOUT = 60;
    uint256 public constant FEE_BPS = 500;
    mapping(uint256 => Game) public games;
    uint256 public nextGameId;

    LiarsBarChaosDeck public deck;
    LiarsBarRevolver public revolver;
    IERC20 public usdc;
    address public treasury;

    constructor(address _deck, address _revolver, address _usdc, address _treasury) {
        deck = LiarsBarChaosDeck(_deck);
        revolver = LiarsBarRevolver(_revolver);
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    // ─── Lobby ────────────────────────────────────────────────────────────

    function createGame(uint8 characterId, uint256 stakeAmount) external returns (uint256 gameId) {
        gameId = nextGameId++;
        Game storage g = games[gameId];
        g.state = GameState.WaitingForPlayers;
        g.players[0] = Player(msg.sender, true, characterId);
        g.aliveCount = 1;
        g.stakeAmount = stakeAmount;
        if (stakeAmount > 0) require(usdc.transferFrom(msg.sender, address(this), stakeAmount), "USDC transfer failed");
        emit GameCreated(gameId, msg.sender);
        emit PlayerJoined(gameId, msg.sender, 0);
    }

    function joinGame(uint256 gameId, uint8 characterId) external {
        Game storage g = games[gameId];
        require(g.state == GameState.WaitingForPlayers, "Not waiting");
        uint8 idx = _playerCount(g);
        require(idx < 4, "Full");
        for (uint8 i = 0; i < idx; i++) require(g.players[i].addr != msg.sender, "Already joined");
        g.players[idx] = Player(msg.sender, true, characterId);
        g.aliveCount++;
        if (g.stakeAmount > 0) require(usdc.transferFrom(msg.sender, address(this), g.stakeAmount), "USDC transfer failed");
        emit PlayerJoined(gameId, msg.sender, idx);
    }

    function startGame(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.state == GameState.WaitingForPlayers && _playerCount(g) == 4, "Not ready");
        require(msg.sender == g.players[0].addr, "Only host");
        g.state = GameState.Dealing;
        emit GameStarted(gameId);
        for (uint8 i = 0; i < 4; i++) revolver.initRevolver(gameId, g.players[i].addr);
        _startRound(gameId);
    }

    // ─── Gameplay ─────────────────────────────────────────────────────────

    /**
     * @notice Play exactly 1 card face-down.
     */
    function playCard(uint256 gameId, uint8 cardIndex) external {
        Game storage g = games[gameId];
        require(g.state == GameState.PlayerTurn, "Not turn phase");
        require(msg.sender == g.players[g.currentTurnIndex].addr, "Not your turn");

        deck.markCardsPlayed(gameId * 100 + g.round, msg.sender, cardIndex);
        g.lastClaimant = msg.sender;
        g.lastPlayedIndex = cardIndex;
        emit CardPlayed(gameId, msg.sender);
        _advanceTurn(gameId);
    }

    function callLiar(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.state == GameState.PlayerTurn, "Not turn phase");
        require(msg.sender == g.players[g.currentTurnIndex].addr, "Not your turn");
        require(g.lastClaimant != address(0) && g.lastClaimant != msg.sender, "Nothing to challenge");

        g.state = GameState.Challenging;
        g.turnDeadline = block.timestamp + TURN_TIMEOUT;

        // Reveal the single card
        uint256 cardCt = deck.revealCard(gameId * 100 + g.round, g.lastClaimant, g.lastPlayedIndex);
        revealCtHash[gameId] = cardCt;
        cardRevealed[gameId] = false;

        // Verify claim (for the boolean result)
        uint256 ctHash = deck.verifyClaim(gameId * 100 + g.round, g.lastClaimant, g.lastPlayedIndex, g.targetCard);
        g.pendingCtHash = ctHash;
        emit LiarCalled(gameId, msg.sender, g.lastClaimant);
    }

    /**
     * @notice Publish the card reveal (what the actual card was).
     *         This determines the outcome type (regular/master/chaos).
     */
    function publishCardReveal(uint256 gameId, uint256 ctHash, uint256 result, bytes calldata signature) external {
        require(ctHash == revealCtHash[gameId], "Wrong ctHash");
        FHE.publishDecryptResult(ctHash, result, signature);
        revealedCard[gameId] = uint8(result);
        cardRevealed[gameId] = true;
        emit CardRevealed(gameId, uint8(result));
    }

    /**
     * @notice Publish challenge boolean result + determine who shoots.
     *         Must be called AFTER publishCardReveal so we know the card type.
     */
    function publishChallengeResult(uint256 gameId, uint256 ctHash, uint256 result, bytes calldata signature) external {
        Game storage g = games[gameId];
        require(g.state == GameState.Challenging, "Not challenging");
        require(ctHash == g.pendingCtHash, "Wrong ctHash");
        require(cardRevealed[gameId], "Reveal card first");

        FHE.publishDecryptResult(ctHash, result, signature);
        g.pendingCtHash = 0;

        uint8 card = revealedCard[gameId];
        address accuser = g.players[g.currentTurnIndex].addr;
        address accused = g.lastClaimant;

        if (card == 3) {
            // CHAOS card — everyone shoots an opponent
            g.state = GameState.MultiTargeting;
            delete g.multiShooters;
            g.targetsChosen = 0;
            for (uint8 i = 0; i < 4; i++) {
                if (g.players[i].alive) {
                    g.multiShooters.push(g.players[i].addr);
                }
            }
            emit ChallengeResolved(gameId, false, 3);
        } else if (card == 2) {
            // MASTER card — accused gets to shoot
            g.state = GameState.Targeting;
            g.shooter = accused;
            g.turnDeadline = block.timestamp + TURN_TIMEOUT;
            emit ChallengeResolved(gameId, false, 2);
        } else {
            // Regular card
            bool wasLie = (result == 0); // 0 = not valid = lie
            if (wasLie) {
                // Challenger was right — challenger shoots
                g.state = GameState.Targeting;
                g.shooter = accuser;
            } else {
                // Challenger was wrong — accused shoots
                g.state = GameState.Targeting;
                g.shooter = accused;
            }
            g.turnDeadline = block.timestamp + TURN_TIMEOUT;
            emit ChallengeResolved(gameId, wasLie, card);
        }
    }

    /**
     * @notice Choose target to shoot (Targeting state — single shooter).
     */
    function chooseTarget(uint256 gameId, address target) external {
        Game storage g = games[gameId];
        require(g.state == GameState.Targeting, "Not targeting");
        require(msg.sender == g.shooter, "Not the shooter");
        require(_isAlivePlayer(gameId, target) && target != msg.sender, "Invalid target");

        g.chosenTargets[msg.sender] = target;
        emit TargetChosen(gameId, msg.sender, target);

        // Execute shot
        g.state = GameState.Shooting;
        uint256 spinCt = revolver.spinForTarget(gameId, target);
        g.pendingCtHash = spinCt;
    }

    /**
     * @notice Choose target in MultiTargeting (Chaos card — everyone shoots).
     */
    function chooseTargetMulti(uint256 gameId, address target) external {
        Game storage g = games[gameId];
        require(g.state == GameState.MultiTargeting, "Not multi-targeting");
        require(_isMultiShooter(gameId, msg.sender), "Not a shooter");
        require(_isAlivePlayer(gameId, target) && target != msg.sender, "Invalid target");
        require(g.chosenTargets[msg.sender] == address(0), "Already chosen");

        g.chosenTargets[msg.sender] = target;
        g.targetsChosen++;
        emit TargetChosen(gameId, msg.sender, target);

        // Once all have chosen, execute all shots
        if (g.targetsChosen >= g.multiShooters.length) {
            g.state = GameState.Shooting;
            // Execute shots one by one — first shot triggers, rest follow
            address firstTarget = g.chosenTargets[g.multiShooters[0]];
            uint256 spinCt = revolver.spinForTarget(gameId, firstTarget);
            g.pendingCtHash = spinCt;
        }
    }

    /**
     * @notice Publish spin result for a shot.
     */
    function publishSpinResult(uint256 gameId, uint256 ctHash, uint256 result, bytes calldata signature, address target) external {
        Game storage g = games[gameId];
        require(g.state == GameState.Shooting, "Not shooting");

        revolver.publishSpinResult(gameId, target, ctHash, result, signature);
        bool fired = (result == 1);
        emit SpinResult(gameId, target, fired);

        if (fired) {
            _eliminatePlayerNoRound(gameId, target);
        }

        // Check if more shots pending (multi-targeting)
        if (g.multiShooters.length > 1) {
            // Track which shot we're on using targetsChosen as decrementing counter
            // First shot was index 0 (already fired before this function)
            // Subsequent shots: index 1, 2, ...
            uint8 shotsCompleted = uint8(g.multiShooters.length) - uint8(g.targetsChosen) + 1;
            g.targetsChosen--;
            if (g.targetsChosen > 0 && g.aliveCount > 1) {
                address nextTarget = g.chosenTargets[g.multiShooters[shotsCompleted]];
                if (nextTarget != address(0) && _isAlivePlayer(gameId, nextTarget)) {
                    uint256 spinCt = revolver.spinForTarget(gameId, nextTarget);
                    g.pendingCtHash = spinCt;
                    return;
                }
            }
        }

        // All shots done
        if (g.aliveCount <= 1) {
            _checkWinner(gameId);
        } else {
            // Clean up targeting state
            for (uint256 i = 0; i < g.multiShooters.length; i++) {
                delete g.chosenTargets[g.multiShooters[i]];
            }
            delete g.multiShooters;
            _startRound(gameId);
        }
    }

    function forceTimeout(uint256 gameId) external {
        Game storage g = games[gameId];
        require(block.timestamp >= g.turnDeadline, "Not timed out");
        if (g.state == GameState.PlayerTurn) {
            _advanceTurn(gameId);
        } else if (g.state == GameState.Challenging) {
            // Challenger forfeits — accused shoots them
            g.state = GameState.Targeting;
            g.shooter = g.lastClaimant;
            g.turnDeadline = block.timestamp + TURN_TIMEOUT;
        } else if (g.state == GameState.Targeting) {
            // Shooter didn't pick — random target (first alive opponent)
            address target = _firstAliveOpponent(gameId, g.shooter);
            g.chosenTargets[g.shooter] = target;
            g.state = GameState.Shooting;
            uint256 spinCt = revolver.spinForTarget(gameId, target);
            g.pendingCtHash = spinCt;
        }
    }

    // ─── Views ────────────────────────────────────────────────────────────

    function getPlayer(uint256 gameId, uint8 index) external view returns (address addr, bool alive, uint8 characterId) {
        return (games[gameId].players[index].addr, games[gameId].players[index].alive, games[gameId].players[index].characterId);
    }

    function getGameState(uint256 gameId) external view returns (
        GameState state, uint8 round, uint8 targetCard, uint8 currentTurnIndex, uint8 aliveCount, address winner
    ) {
        Game storage g = games[gameId];
        return (g.state, g.round, g.targetCard, g.currentTurnIndex, g.aliveCount, g.winner);
    }

    function getLastClaim(uint256 gameId) external view returns (address claimant, uint8 cardIndex) {
        return (games[gameId].lastClaimant, games[gameId].lastPlayedIndex);
    }

    function getPendingCtHash(uint256 gameId) external view returns (uint256) { return games[gameId].pendingCtHash; }
    function getTurnDeadline(uint256 gameId) external view returns (uint256) { return games[gameId].turnDeadline; }
    function getStakeAmount(uint256 gameId) external view returns (uint256) { return games[gameId].stakeAmount; }
    function getShooter(uint256 gameId) external view returns (address) { return games[gameId].shooter; }
    function getMultiShooters(uint256 gameId) external view returns (address[] memory) { return games[gameId].multiShooters; }
    function getRevealCtHash(uint256 gameId) external view returns (uint256) { return revealCtHash[gameId]; }
    function getRevealedCard(uint256 gameId) external view returns (uint8) { return revealedCard[gameId]; }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _startRound(uint256 gameId) internal {
        Game storage g = games[gameId];
        g.round++;
        // Table card: 0=King or 1=Queen only
        g.targetCard = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, gameId, g.round))) % 2);

        address[4] memory dealTo;
        for (uint8 i = 0; i < 4; i++) dealTo[i] = g.players[i].alive ? g.players[i].addr : address(0);
        deck.dealAllHands(gameId * 100 + g.round, dealTo);

        g.lastClaimant = address(0);
        g.lastPlayedIndex = 0;
        g.shooter = address(0);
        delete g.multiShooters;
        g.targetsChosen = 0;

        g.currentTurnIndex = _nextAliveIndex(g, type(uint8).max);
        g.state = GameState.PlayerTurn;
        g.turnDeadline = block.timestamp + TURN_TIMEOUT;
        emit RoundStarted(gameId, g.round, g.targetCard);
    }

    function _eliminatePlayerNoRound(uint256 gameId, address player) internal {
        Game storage g = games[gameId];
        uint8 idx = _playerIndex(gameId, player);
        g.players[idx].alive = false;
        g.aliveCount--;
        emit PlayerEliminated(gameId, player);
        if (g.aliveCount == 1) _checkWinner(gameId);
    }

    function _checkWinner(uint256 gameId) internal {
        Game storage g = games[gameId];
        for (uint8 i = 0; i < 4; i++) {
            if (g.players[i].alive) {
                g.winner = g.players[i].addr;
                g.state = GameState.GameOver;
                if (g.stakeAmount > 0) {
                    uint256 pot = g.stakeAmount * 4;
                    uint256 fee = (pot * FEE_BPS) / 10000;
                    require(usdc.transfer(treasury, fee), "Fee transfer failed");
                    require(usdc.transfer(g.winner, pot - fee), "Winner transfer failed");
                }
                emit GameOver(gameId, g.winner);
                return;
            }
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
        return 0;
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

    function _isAlivePlayer(uint256 gameId, address player) internal view returns (bool) {
        for (uint8 i = 0; i < 4; i++) {
            if (games[gameId].players[i].addr == player && games[gameId].players[i].alive) return true;
        }
        return false;
    }

    function _isMultiShooter(uint256 gameId, address player) internal view returns (bool) {
        Game storage g = games[gameId];
        for (uint256 i = 0; i < g.multiShooters.length; i++) {
            if (g.multiShooters[i] == player) return true;
        }
        return false;
    }

    function _firstAliveOpponent(uint256 gameId, address exclude) internal view returns (address) {
        for (uint8 i = 0; i < 4; i++) {
            if (games[gameId].players[i].alive && games[gameId].players[i].addr != exclude) {
                return games[gameId].players[i].addr;
            }
        }
        revert("No opponent");
    }
}
