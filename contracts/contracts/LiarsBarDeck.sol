// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FHE, euint8, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/ILiarsBarGame.sol";

/**
 * @title LiarsBarDeck
 * @notice Encrypted 20-card deck: 6 Ace(0), 6 King(1), 6 Queen(2), 2 Joker(3).
 *         Deals 5 cards to each of 4 players using draw-without-replacement.
 *         Joker is wildcard — always valid regardless of target card.
 */
contract LiarsBarDeck {
    uint8 public constant HAND_SIZE = 5;
    uint8 public constant PLAYER_COUNT = 4;

    // Pool state passed between draw calls to avoid stack depth issues
    struct Pool {
        euint8 acesLeft;
        euint8 kingsLeft;
        euint8 queensLeft;
        euint8 jokersLeft;
        euint8 totalLeft;
    }

    // gameId => player => 5 encrypted cards (values 0-3)
    mapping(uint256 => mapping(address => euint8[5])) private _hands;
    // gameId => player => card index => played
    mapping(uint256 => mapping(address => mapping(uint8 => bool))) public cardPlayed;

    address public gameContract;

    modifier onlyGame() {
        require(msg.sender == gameContract, "Only game");
        _;
    }

    constructor(address _gameContract) {
        gameContract = _gameContract;
    }

    function setGameContract(address _gameContract) external {
        require(gameContract == address(0) || gameContract == msg.sender, "Unauthorized");
        gameContract = _gameContract;
    }

    /**
     * @notice Deal all 20 cards to 4 players (5 each).
     */
    function dealAllHands(uint256 gameId, address[4] calldata players) external onlyGame {
        Pool memory pool = Pool(
            FHE.asEuint8(6),
            FHE.asEuint8(6),
            FHE.asEuint8(6),
            FHE.asEuint8(2),
            FHE.asEuint8(20)
        );
        FHE.allowThis(pool.acesLeft);
        FHE.allowThis(pool.kingsLeft);
        FHE.allowThis(pool.queensLeft);
        FHE.allowThis(pool.jokersLeft);
        FHE.allowThis(pool.totalLeft);

        for (uint8 p = 0; p < PLAYER_COUNT; p++) {
            for (uint8 i = 0; i < HAND_SIZE; i++) {
                euint8 card;
                (card, pool) = _drawCard(pool);
                FHE.allow(card, players[p]);
                _hands[gameId][players[p]][i] = card;
                cardPlayed[gameId][players[p]][i] = false;
            }
        }
    }

    /**
     * @notice Draw one card from the pool. Returns card value and updated pool.
     */
    function _drawCard(Pool memory pool) internal returns (euint8 card, Pool memory) {
        euint8 rand = FHE.rem(FHE.randomEuint8(), pool.totalLeft);
        FHE.allowThis(rand);

        // Determine card type via cumulative ranges
        ebool isAce = FHE.lt(rand, pool.acesLeft);

        euint8 akBound = FHE.add(pool.acesLeft, pool.kingsLeft);
        FHE.allowThis(akBound);
        ebool isKing = FHE.and(FHE.not(isAce), FHE.lt(rand, akBound));

        ebool isAceOrKing = FHE.or(isAce, isKing);
        euint8 akqBound = FHE.add(akBound, pool.queensLeft);
        FHE.allowThis(akqBound);
        ebool isQueen = FHE.and(FHE.not(isAceOrKing), FHE.lt(rand, akqBound));

        ebool isJoker = FHE.not(FHE.or(isAceOrKing, isQueen));

        // Assign card value
        card = FHE.select(isAce, FHE.asEuint8(0),
               FHE.select(isKing, FHE.asEuint8(1),
               FHE.select(isQueen, FHE.asEuint8(2),
               FHE.asEuint8(3))));
        FHE.allowThis(card);

        // Decrement counts (constant-time)
        euint8 one = FHE.asEuint8(1);
        pool.acesLeft = FHE.select(isAce, FHE.sub(pool.acesLeft, one), pool.acesLeft);
        pool.kingsLeft = FHE.select(isKing, FHE.sub(pool.kingsLeft, one), pool.kingsLeft);
        pool.queensLeft = FHE.select(isQueen, FHE.sub(pool.queensLeft, one), pool.queensLeft);
        pool.jokersLeft = FHE.select(isJoker, FHE.sub(pool.jokersLeft, one), pool.jokersLeft);
        pool.totalLeft = FHE.sub(pool.totalLeft, one);

        FHE.allowThis(pool.acesLeft);
        FHE.allowThis(pool.kingsLeft);
        FHE.allowThis(pool.queensLeft);
        FHE.allowThis(pool.jokersLeft);
        FHE.allowThis(pool.totalLeft);

        return (card, pool);
    }

    /**
     * @notice Mark cards as played face-down on table.
     */
    function markCardsPlayed(uint256 gameId, address player, uint8[] calldata indices) external onlyGame {
        for (uint8 i = 0; i < indices.length; i++) {
            require(indices[i] < HAND_SIZE, "Invalid card index");
            require(!cardPlayed[gameId][player][indices[i]], "Already played");
            cardPlayed[gameId][player][indices[i]] = true;
        }
    }

    /**
     * @notice Verify if ALL played cards are valid (match target OR are Joker).
     *         Returns ctHash of ebool for public decryption.
     */
    function verifyClaim(
        uint256 gameId,
        address player,
        uint8[] calldata indices,
        uint8 targetCard
    ) external onlyGame returns (uint256 ctHash) {
        euint8 encTarget = FHE.asEuint8(targetCard);
        euint8 encJoker = FHE.asEuint8(3);
        FHE.allowThis(encTarget);
        FHE.allowThis(encJoker);

        ebool allValid = FHE.asEbool(true);
        FHE.allowThis(allValid);

        for (uint8 i = 0; i < indices.length; i++) {
            euint8 card = _hands[gameId][player][indices[i]];
            ebool matchesTarget = FHE.eq(card, encTarget);
            ebool isJoker = FHE.eq(card, encJoker);
            ebool cardValid = FHE.or(matchesTarget, isJoker);
            allValid = FHE.and(allValid, cardValid);
            FHE.allowThis(allValid);
        }

        FHE.allowPublic(allValid);
        ctHash = uint256(ebool.unwrap(allValid));
    }

    /**
     * @notice Returns ciphertext handles for a player's hand.
     */
    function getHandHashes(
        uint256 gameId,
        address player
    ) external view returns (uint256[5] memory hashes) {
        for (uint8 i = 0; i < HAND_SIZE; i++) {
            hashes[i] = uint256(euint8.unwrap(_hands[gameId][player][i]));
        }
    }

    /**
     * @notice Make specific cards publicly decryptable (for challenge reveal).
     *         Returns ctHashes for each card so frontend can decrypt and publish.
     */
    function revealCards(
        uint256 gameId,
        address player,
        uint8[] calldata indices
    ) external onlyGame returns (uint256[] memory ctHashes) {
        ctHashes = new uint256[](indices.length);
        for (uint8 i = 0; i < indices.length; i++) {
            euint8 card = _hands[gameId][player][indices[i]];
            FHE.allowPublic(card);
            ctHashes[i] = uint256(euint8.unwrap(card));
        }
    }

    /**
     * @notice Get remaining unplayed card count.
     */
    function remainingCards(uint256 gameId, address player) external view returns (uint8 count) {
        for (uint8 i = 0; i < HAND_SIZE; i++) {
            if (!cardPlayed[gameId][player][i]) count++;
        }
    }
}
