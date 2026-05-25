// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FHE, euint8, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title LiarsBarDevilDeck
 * @notice 20-card FHE deck for Devil Mode.
 *         Composition: 5 of table type + 1 Devil(4) + 6 of type2 + 6 of type3 + 2 Joker(3).
 *         The Devil card replaces one card of the table type.
 *         Card values: 0=Ace, 1=King, 2=Queen, 3=Joker, 4=Devil.
 *         Devil counts as valid (matches table) but has special game effects.
 */
contract LiarsBarDevilDeck {
    uint8 public constant HAND_SIZE = 5;
    uint8 public constant PLAYER_COUNT = 4;

    struct Pool {
        euint8 tableLeft;   // 5 of table type
        euint8 type2Left;   // 6 of second type
        euint8 type3Left;   // 6 of third type
        euint8 jokersLeft;  // 2
        euint8 devilLeft;   // 1
        euint8 totalLeft;   // 20
    }

    mapping(uint256 => mapping(address => euint8[5])) private _hands;
    mapping(uint256 => mapping(address => mapping(uint8 => bool))) public cardPlayed;
    mapping(uint256 => uint8) public deckTargetCard; // stores which card type is the table card

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
     * @notice Deal 20 cards. targetCard determines composition:
     *         5 of targetCard + 1 Devil + 6 of type2 + 6 of type3 + 2 Joker.
     */
    function dealAllHands(uint256 gameId, address[4] calldata players, uint8 targetCard) external onlyGame {
        deckTargetCard[gameId] = targetCard;

        Pool memory pool = Pool(
            FHE.asEuint8(5),  // table type (one was replaced by devil)
            FHE.asEuint8(6),  // second type
            FHE.asEuint8(6),  // third type
            FHE.asEuint8(2),  // jokers
            FHE.asEuint8(1),  // devil
            FHE.asEuint8(20)
        );
        FHE.allowThis(pool.tableLeft);
        FHE.allowThis(pool.type2Left);
        FHE.allowThis(pool.type3Left);
        FHE.allowThis(pool.jokersLeft);
        FHE.allowThis(pool.devilLeft);
        FHE.allowThis(pool.totalLeft);

        for (uint8 p = 0; p < PLAYER_COUNT; p++) {
            for (uint8 i = 0; i < HAND_SIZE; i++) {
                euint8 card;
                (card, pool) = _drawCard(pool, targetCard);
                FHE.allow(card, players[p]);
                _hands[gameId][players[p]][i] = card;
                cardPlayed[gameId][players[p]][i] = false;
            }
        }
    }

    function _drawCard(Pool memory pool, uint8 targetCard) internal returns (euint8 card, Pool memory) {
        euint8 rand = FHE.rem(FHE.randomEuint8(), pool.totalLeft);
        FHE.allowThis(rand);

        // Ranges: [0, tableLeft) = table card, [tableLeft, tableLeft+type2Left) = type2, etc.
        ebool isTable = FHE.lt(rand, pool.tableLeft);

        euint8 bound2 = FHE.add(pool.tableLeft, pool.type2Left);
        FHE.allowThis(bound2);
        ebool isType2 = FHE.and(FHE.not(isTable), FHE.lt(rand, bound2));

        euint8 bound3 = FHE.add(bound2, pool.type3Left);
        FHE.allowThis(bound3);
        ebool isTableOrType2 = FHE.or(isTable, isType2);
        ebool isType3 = FHE.and(FHE.not(isTableOrType2), FHE.lt(rand, bound3));

        euint8 bound4 = FHE.add(bound3, pool.jokersLeft);
        FHE.allowThis(bound4);
        ebool isFirst3 = FHE.or(isTableOrType2, isType3);
        ebool isJoker = FHE.and(FHE.not(isFirst3), FHE.lt(rand, bound4));

        ebool isDevil = FHE.not(FHE.or(isFirst3, isJoker));

        // Determine actual card values based on targetCard
        // targetCard=0(Ace): table=0, type2=1(King), type3=2(Queen)
        // targetCard=1(King): table=1, type2=0(Ace), type3=2(Queen)
        // targetCard=2(Queen): table=2, type2=0(Ace), type3=1(King)
        uint8 type2Val;
        uint8 type3Val;
        if (targetCard == 0) { type2Val = 1; type3Val = 2; }
        else if (targetCard == 1) { type2Val = 0; type3Val = 2; }
        else { type2Val = 0; type3Val = 1; }

        card = FHE.select(isTable, FHE.asEuint8(targetCard),
               FHE.select(isType2, FHE.asEuint8(type2Val),
               FHE.select(isType3, FHE.asEuint8(type3Val),
               FHE.select(isJoker, FHE.asEuint8(3),
               FHE.asEuint8(4))))); // 4 = Devil
        FHE.allowThis(card);

        // Decrement
        euint8 one = FHE.asEuint8(1);
        pool.tableLeft = FHE.select(isTable, FHE.sub(pool.tableLeft, one), pool.tableLeft);
        pool.type2Left = FHE.select(isType2, FHE.sub(pool.type2Left, one), pool.type2Left);
        pool.type3Left = FHE.select(isType3, FHE.sub(pool.type3Left, one), pool.type3Left);
        pool.jokersLeft = FHE.select(isJoker, FHE.sub(pool.jokersLeft, one), pool.jokersLeft);
        pool.devilLeft = FHE.select(isDevil, FHE.sub(pool.devilLeft, one), pool.devilLeft);
        pool.totalLeft = FHE.sub(pool.totalLeft, one);

        FHE.allowThis(pool.tableLeft);
        FHE.allowThis(pool.type2Left);
        FHE.allowThis(pool.type3Left);
        FHE.allowThis(pool.jokersLeft);
        FHE.allowThis(pool.devilLeft);
        FHE.allowThis(pool.totalLeft);

        return (card, pool);
    }

    function markCardsPlayed(uint256 gameId, address player, uint8[] calldata indices) external onlyGame {
        for (uint8 i = 0; i < indices.length; i++) {
            require(indices[i] < HAND_SIZE, "Invalid card index");
            require(!cardPlayed[gameId][player][indices[i]], "Already played");
            cardPlayed[gameId][player][indices[i]] = true;
        }
    }

    /**
     * @notice Verify claim. Returns ctHash of ebool (allValid).
     *         Valid = matches target OR joker OR devil.
     */
    function verifyClaim(
        uint256 gameId,
        address player,
        uint8[] calldata indices,
        uint8 targetCard
    ) external onlyGame returns (uint256 ctHash) {
        euint8 encTarget = FHE.asEuint8(targetCard);
        euint8 encJoker = FHE.asEuint8(3);
        euint8 encDevil = FHE.asEuint8(4);
        FHE.allowThis(encTarget);
        FHE.allowThis(encJoker);
        FHE.allowThis(encDevil);

        ebool allValid = FHE.asEbool(true);
        FHE.allowThis(allValid);

        for (uint8 i = 0; i < indices.length; i++) {
            euint8 card = _hands[gameId][player][indices[i]];
            ebool matchesTarget = FHE.eq(card, encTarget);
            ebool isJoker = FHE.eq(card, encJoker);
            ebool isDevil = FHE.eq(card, encDevil);
            ebool cardValid = FHE.or(FHE.or(matchesTarget, isJoker), isDevil);
            allValid = FHE.and(allValid, cardValid);
            FHE.allowThis(allValid);
        }

        FHE.allowPublic(allValid);
        ctHash = uint256(ebool.unwrap(allValid));
    }

    /**
     * @notice Make cards publicly decryptable for reveal.
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

    function getHandHashes(uint256 gameId, address player) external view returns (uint256[5] memory hashes) {
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
