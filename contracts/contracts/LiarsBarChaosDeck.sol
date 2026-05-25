// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FHE, euint8, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title LiarsBarChaosDeck
 * @notice 12-card FHE deck for Chaos Mode.
 *         Composition: 5 Kings(0), 5 Queens(1), 1 Master(2), 1 Chaos(3).
 *         Each of 4 players gets 3 cards. Table card is King(0) or Queen(1).
 *         Master and Chaos are NEVER considered lies.
 */
contract LiarsBarChaosDeck {
    uint8 public constant HAND_SIZE = 3;
    uint8 public constant PLAYER_COUNT = 4;

    struct Pool {
        euint8 kingsLeft;   // 5
        euint8 queensLeft;  // 5
        euint8 masterLeft;  // 1
        euint8 chaosLeft;   // 1
        euint8 totalLeft;   // 12
    }

    mapping(uint256 => mapping(address => euint8[3])) private _hands;
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

    function dealAllHands(uint256 gameId, address[4] calldata players) external onlyGame {
        Pool memory pool = Pool(
            FHE.asEuint8(5),
            FHE.asEuint8(5),
            FHE.asEuint8(1),
            FHE.asEuint8(1),
            FHE.asEuint8(12)
        );
        FHE.allowThis(pool.kingsLeft);
        FHE.allowThis(pool.queensLeft);
        FHE.allowThis(pool.masterLeft);
        FHE.allowThis(pool.chaosLeft);
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

    function _drawCard(Pool memory pool) internal returns (euint8 card, Pool memory) {
        euint8 rand = FHE.rem(FHE.randomEuint8(), pool.totalLeft);
        FHE.allowThis(rand);

        ebool isKing = FHE.lt(rand, pool.kingsLeft);

        euint8 kqBound = FHE.add(pool.kingsLeft, pool.queensLeft);
        FHE.allowThis(kqBound);
        ebool isQueen = FHE.and(FHE.not(isKing), FHE.lt(rand, kqBound));

        euint8 kqmBound = FHE.add(kqBound, pool.masterLeft);
        FHE.allowThis(kqmBound);
        ebool isKQ = FHE.or(isKing, isQueen);
        ebool isMaster = FHE.and(FHE.not(isKQ), FHE.lt(rand, kqmBound));

        ebool isChaos = FHE.not(FHE.or(isKQ, isMaster));

        // 0=King, 1=Queen, 2=Master, 3=Chaos
        card = FHE.select(isKing, FHE.asEuint8(0),
               FHE.select(isQueen, FHE.asEuint8(1),
               FHE.select(isMaster, FHE.asEuint8(2),
               FHE.asEuint8(3))));
        FHE.allowThis(card);

        euint8 one = FHE.asEuint8(1);
        pool.kingsLeft = FHE.select(isKing, FHE.sub(pool.kingsLeft, one), pool.kingsLeft);
        pool.queensLeft = FHE.select(isQueen, FHE.sub(pool.queensLeft, one), pool.queensLeft);
        pool.masterLeft = FHE.select(isMaster, FHE.sub(pool.masterLeft, one), pool.masterLeft);
        pool.chaosLeft = FHE.select(isChaos, FHE.sub(pool.chaosLeft, one), pool.chaosLeft);
        pool.totalLeft = FHE.sub(pool.totalLeft, one);

        FHE.allowThis(pool.kingsLeft);
        FHE.allowThis(pool.queensLeft);
        FHE.allowThis(pool.masterLeft);
        FHE.allowThis(pool.chaosLeft);
        FHE.allowThis(pool.totalLeft);

        return (card, pool);
    }

    function markCardsPlayed(uint256 gameId, address player, uint8 cardIndex) external onlyGame {
        require(cardIndex < HAND_SIZE, "Invalid card index");
        require(!cardPlayed[gameId][player][cardIndex], "Already played");
        cardPlayed[gameId][player][cardIndex] = true;
    }

    /**
     * @notice Verify claim. In Chaos mode, Master(2) and Chaos(3) are ALWAYS valid.
     *         Returns ctHash of ebool + also returns separate checks for special cards.
     */
    function verifyClaim(
        uint256 gameId,
        address player,
        uint8 cardIndex,
        uint8 targetCard
    ) external onlyGame returns (uint256 ctHash) {
        euint8 card = _hands[gameId][player][cardIndex];
        euint8 encTarget = FHE.asEuint8(targetCard);
        euint8 encMaster = FHE.asEuint8(2);
        euint8 encChaos = FHE.asEuint8(3);
        FHE.allowThis(encTarget);
        FHE.allowThis(encMaster);
        FHE.allowThis(encChaos);

        ebool matchesTarget = FHE.eq(card, encTarget);
        ebool isMaster = FHE.eq(card, encMaster);
        ebool isChaos = FHE.eq(card, encChaos);
        ebool cardValid = FHE.or(FHE.or(matchesTarget, isMaster), isChaos);
        FHE.allowThis(cardValid);
        FHE.allowPublic(cardValid);

        ctHash = uint256(ebool.unwrap(cardValid));
    }

    /**
     * @notice Make card publicly decryptable for reveal.
     */
    function revealCard(uint256 gameId, address player, uint8 cardIndex) external onlyGame returns (uint256 ctHash) {
        euint8 card = _hands[gameId][player][cardIndex];
        FHE.allowPublic(card);
        ctHash = uint256(euint8.unwrap(card));
    }

    function getHandHashes(uint256 gameId, address player) external view returns (uint256[3] memory hashes) {
        for (uint8 i = 0; i < HAND_SIZE; i++) {
            hashes[i] = uint256(euint8.unwrap(_hands[gameId][player][i]));
        }
    }

    function remainingCards(uint256 gameId, address player) external view returns (uint8 count) {
        for (uint8 i = 0; i < HAND_SIZE; i++) {
            if (!cardPlayed[gameId][player][i]) count++;
        }
    }
}
