// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FHE, euint8, ebool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "./interfaces/ILiarsBarGame.sol";

/**
 * @title LiarsBarRevolver
 * @notice Each player has their OWN revolver with 6 chambers and 1 hidden bullet.
 *         Bullet position is per-player, fixed for the entire game.
 *         Chamber pointer is per-player, increments on each spin.
 *         After 5 safe clicks, the 6th is guaranteed death.
 */
contract LiarsBarRevolver is ILiarsBarGame {
    uint8 public constant CHAMBERS = 6;

    // Per-player encrypted bullet position (1-6)
    mapping(uint256 => mapping(address => euint8)) private _bulletPosition;
    // Per-player chamber pointer
    mapping(uint256 => mapping(address => uint8)) public chamberPointer;
    // Pending spin ctHash
    mapping(uint256 => uint256) public pendingSpinCtHash;
    // Pending double spin second ctHash
    mapping(uint256 => uint256) public pendingDoubleCt;
    // Whether current pending is double
    mapping(uint256 => bool) public isDoubleSpin;

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
     * @notice Initialize revolver for a player. Called once per player at game start.
     */
    function initRevolver(uint256 gameId, address player) external onlyGame {
        euint8 rand = FHE.randomEuint8();
        FHE.allowThis(rand);
        euint8 six = FHE.asEuint8(CHAMBERS);
        FHE.allowThis(six);
        euint8 mod = FHE.rem(rand, six);
        FHE.allowThis(mod);
        euint8 one = FHE.asEuint8(1);
        FHE.allowThis(one);
        euint8 pos = FHE.add(mod, one);
        FHE.allowThis(pos);
        _bulletPosition[gameId][player] = pos;
        chamberPointer[gameId][player] = 0;
    }

    /**
     * @notice Begin a normal spin for a player.
     */
    function beginSpin(uint256 gameId, address player) external onlyGame returns (uint256 ctHash) {
        uint8 ptr = chamberPointer[gameId][player] + 1;
        require(ptr <= CHAMBERS, "All chambers exhausted");

        chamberPointer[gameId][player] = ptr;
        isDoubleSpin[gameId] = false;

        ebool fired = FHE.eq(_bulletPosition[gameId][player], FHE.asEuint8(ptr));
        FHE.allowPublic(fired);

        ctHash = uint256(ebool.unwrap(fired));
        pendingSpinCtHash[gameId] = ctHash;
        pendingDoubleCt[gameId] = 0;
    }

    /**
     * @notice Begin a double spin for a player.
     */
    function beginDoubleSpin(uint256 gameId, address player) external onlyGame returns (uint256 ctHash) {
        uint8 ptr = chamberPointer[gameId][player] + 1;
        require(ptr + 1 <= CHAMBERS, "Not enough chambers for double spin");

        chamberPointer[gameId][player] = ptr;
        isDoubleSpin[gameId] = true;

        ebool fired = FHE.eq(_bulletPosition[gameId][player], FHE.asEuint8(ptr));
        FHE.allowPublic(fired);

        ctHash = uint256(ebool.unwrap(fired));
        pendingSpinCtHash[gameId] = ctHash;

        // Pre-compute second check
        uint8 ptr2 = ptr + 1;
        ebool fired2 = FHE.eq(_bulletPosition[gameId][player], FHE.asEuint8(ptr2));
        FHE.allowPublic(fired2);
        pendingDoubleCt[gameId] = uint256(ebool.unwrap(fired2));
    }

    /**
     * @notice Submit decrypted spin result.
     */
    function publishSpinResult(
        uint256 gameId,
        address player,
        uint256 ctHash,
        uint256 result,
        bytes calldata signature
    ) external {
        require(ctHash == pendingSpinCtHash[gameId], "Wrong ctHash");
        FHE.publishDecryptResult(ctHash, result, signature);
        delete pendingSpinCtHash[gameId];
    }

    /**
     * @notice Submit second spin result for double spin.
     */
    function publishDoubleSpinResult(
        uint256 gameId,
        address player,
        uint256 ctHash,
        uint256 result,
        bytes calldata signature
    ) external {
        require(ctHash == pendingDoubleCt[gameId], "Wrong ctHash");
        require(isDoubleSpin[gameId], "Not a double spin");
        FHE.publishDecryptResult(ctHash, result, signature);

        // Advance pointer for second chamber
        chamberPointer[gameId][player] = chamberPointer[gameId][player] + 1;
        delete pendingDoubleCt[gameId];
        isDoubleSpin[gameId] = false;
    }

    function getChamberPointer(uint256 gameId, address player) external view returns (uint8) {
        return chamberPointer[gameId][player];
    }

    function getPendingCtHash(uint256 gameId) external view returns (uint256) {
        return pendingSpinCtHash[gameId];
    }

    function getPendingDoubleCt(uint256 gameId) external view returns (uint256) {
        return pendingDoubleCt[gameId];
    }
}
