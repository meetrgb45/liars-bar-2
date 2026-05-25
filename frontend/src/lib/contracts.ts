export const GAME_ADDRESS = (import.meta.env.VITE_GAME_ADDRESS || '0x97cf127337eDA4Efa9a6362c99cCc9D7BF86E8AD') as `0x${string}`;
export const DECK_ADDRESS = (import.meta.env.VITE_DECK_ADDRESS || '0xBdd750d59947819b923163AE43722978A264414d') as `0x${string}`;
export const REVOLVER_ADDRESS = (import.meta.env.VITE_REVOLVER_ADDRESS || '0x44be7D331d13FB46129bd263225Dfd9Da31A9410') as `0x${string}`;
export const DEVIL_GAME_ADDRESS = (import.meta.env.VITE_DEVIL_GAME_ADDRESS || '0x1898E6e55dEE61F5606eFfAC618f2eAB3C5d60fF') as `0x${string}`;
export const DEVIL_DECK_ADDRESS = (import.meta.env.VITE_DEVIL_DECK_ADDRESS || '0x0cC95ba3295e90A53686fcE806248ab1c3338D86') as `0x${string}`;
export const CHAOS_GAME_ADDRESS = (import.meta.env.VITE_CHAOS_GAME_ADDRESS || '0x4f0Be815D6D70247E167b3f2D7dA1cfC3713da8C') as `0x${string}`;
export const CHAOS_DECK_ADDRESS = (import.meta.env.VITE_CHAOS_DECK_ADDRESS || '0xD4FCF7b0812E5a0c88c94A6BD333f9AD33e249d7') as `0x${string}`;
export const USDC_ADDRESS = (import.meta.env.VITE_USDC_ADDRESS || '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d') as `0x${string}`;

export const GAME_ABI = [
  { type: 'function', name: 'createGame', inputs: [{ name: 'characterId', type: 'uint8' }, { name: 'stakeAmount', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'joinGame', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'characterId', type: 'uint8' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'startGame', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'playCards', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'cardIndices', type: 'uint8[]' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'callLiar', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'publishChallengeResult', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'ctHash', type: 'uint256' }, { name: 'result', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'publishSpinResult', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'ctHash', type: 'uint256' }, { name: 'result', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'publishDoubleSpinResult', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'ctHash', type: 'uint256' }, { name: 'result', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'useDoubleSpin', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'useExecute', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'nextGameId', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getGameState', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ name: 'state', type: 'uint8' }, { name: 'round', type: 'uint8' }, { name: 'targetCard', type: 'uint8' }, { name: 'currentTurnIndex', type: 'uint8' }, { name: 'aliveCount', type: 'uint8' }, { name: 'winner', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'getPlayer', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'index', type: 'uint8' }], outputs: [{ name: 'addr', type: 'address' }, { name: 'alive', type: 'bool' }, { name: 'points', type: 'uint8' }, { name: 'usedExecute', type: 'bool' }, { name: 'usedDoubleSpin', type: 'bool' }, { name: 'characterId', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getLastClaim', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ name: 'claimant', type: 'address' }, { name: 'count', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getPendingSpinner', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'getPendingCtHash', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getTurnDeadline', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getStakeAmount', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'forceTimeout', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'publishCardReveal', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'ctHashes', type: 'uint256[]' }, { name: 'results', type: 'uint256[]' }, { name: 'signatures', type: 'bytes[]' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getRevealCtHashes', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256[]' }], stateMutability: 'view' },
  { type: 'function', name: 'getRevealedCards', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint8[]' }], stateMutability: 'view' },
  // Events
  { type: 'event', name: 'GameCreated', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'host', type: 'address', indexed: true }] },
  { type: 'event', name: 'PlayerJoined', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'index', type: 'uint8', indexed: false }] },
  { type: 'event', name: 'GameStarted', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }] },
  { type: 'event', name: 'RoundStarted', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'round', type: 'uint8', indexed: false }, { name: 'targetCard', type: 'uint8', indexed: false }] },
  { type: 'event', name: 'CardsPlayed', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'count', type: 'uint8', indexed: false }] },
  { type: 'event', name: 'LiarCalled', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'accuser', type: 'address', indexed: true }, { name: 'accused', type: 'address', indexed: true }] },
  { type: 'event', name: 'ChallengeResolved', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'lieConfirmed', type: 'bool', indexed: false }, { name: 'spinner', type: 'address', indexed: false }] },
  { type: 'event', name: 'SpinResult', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'fired', type: 'bool', indexed: false }] },
  { type: 'event', name: 'PlayerEliminated', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'cause', type: 'string', indexed: false }] },
  { type: 'event', name: 'GameOver', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'winner', type: 'address', indexed: true }] },
  { type: 'event', name: 'PointsUpdated', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'delta', type: 'int8', indexed: false }] },
  { type: 'event', name: 'ExecuteUsed', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'executor', type: 'address', indexed: true }, { name: 'target', type: 'address', indexed: true }] },
  { type: 'event', name: 'SpinTriggered', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'isDoubleSpin', type: 'bool', indexed: false }] },
  { type: 'event', name: 'CardsRevealed', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'cardValues', type: 'uint8[]', indexed: false }, { name: 'wasLie', type: 'bool', indexed: false }] },
] as const;

export const DECK_ABI = [
  { type: 'function', name: 'getHandHashes', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }], outputs: [{ type: 'uint256[5]' }], stateMutability: 'view' },
  { type: 'function', name: 'cardPlayed', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }, { name: 'index', type: 'uint8' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'remainingCards', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
] as const;

export const REVOLVER_ABI = [
  { type: 'function', name: 'chamberPointer', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getChamberPointer', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getPendingCtHash', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getPendingDoubleCt', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
] as const;

// Devil Mode — same ABI as basic but with extra functions
export const DEVIL_GAME_ABI = [
  { type: 'function', name: 'createGame', inputs: [{ name: 'characterId', type: 'uint8' }, { name: 'stakeAmount', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'joinGame', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'characterId', type: 'uint8' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'startGame', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'playCards', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'cardIndices', type: 'uint8[]' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'callLiar', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'publishChallengeResult', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'ctHash', type: 'uint256' }, { name: 'result', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'publishCardReveal', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'ctHashes', type: 'uint256[]' }, { name: 'results', type: 'uint256[]' }, { name: 'signatures', type: 'bytes[]' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'publishSpinResult', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'ctHash', type: 'uint256' }, { name: 'result', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'triggerMySpin', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'forceTimeout', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getGameState', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ name: 'state', type: 'uint8' }, { name: 'round', type: 'uint8' }, { name: 'targetCard', type: 'uint8' }, { name: 'currentTurnIndex', type: 'uint8' }, { name: 'aliveCount', type: 'uint8' }, { name: 'winner', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'getPlayer', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'index', type: 'uint8' }], outputs: [{ name: 'addr', type: 'address' }, { name: 'alive', type: 'bool' }, { name: 'characterId', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getLastClaim', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ name: 'claimant', type: 'address' }, { name: 'count', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getPendingSpinner', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'getPendingCtHash', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getTurnDeadline', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getStakeAmount', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getRevealCtHashes', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256[]' }], stateMutability: 'view' },
  { type: 'function', name: 'getRevealedCards', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint8[]' }], stateMutability: 'view' },
  { type: 'function', name: 'getPendingSpinners', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'address[]' }], stateMutability: 'view' },
  // Events
  { type: 'event', name: 'GameCreated', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'host', type: 'address', indexed: true }] },
  { type: 'event', name: 'PlayerJoined', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'index', type: 'uint8', indexed: false }] },
  { type: 'event', name: 'GameStarted', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }] },
  { type: 'event', name: 'RoundStarted', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'round', type: 'uint8', indexed: false }, { name: 'targetCard', type: 'uint8', indexed: false }] },
  { type: 'event', name: 'DevilRevealed', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }] },
  { type: 'event', name: 'SpinResult', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'fired', type: 'bool', indexed: false }] },
  { type: 'event', name: 'PlayerEliminated', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }] },
  { type: 'event', name: 'GameOver', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'winner', type: 'address', indexed: true }] },
] as const;

export const DEVIL_DECK_ABI = [
  { type: 'function', name: 'getHandHashes', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }], outputs: [{ type: 'uint256[5]' }], stateMutability: 'view' },
  { type: 'function', name: 'cardPlayed', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }, { name: 'index', type: 'uint8' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'remainingCards', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
] as const;

// Chaos Mode
export const CHAOS_GAME_ABI = [
  { type: 'function', name: 'createGame', inputs: [{ name: 'characterId', type: 'uint8' }, { name: 'stakeAmount', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'joinGame', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'characterId', type: 'uint8' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'startGame', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'playCard', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'cardIndex', type: 'uint8' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'callLiar', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'publishCardReveal', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'ctHash', type: 'uint256' }, { name: 'result', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'publishChallengeResult', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'ctHash', type: 'uint256' }, { name: 'result', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'chooseTarget', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'target', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'chooseTargetMulti', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'target', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'publishSpinResult', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'ctHash', type: 'uint256' }, { name: 'result', type: 'uint256' }, { name: 'signature', type: 'bytes' }, { name: 'target', type: 'address' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'forceTimeout', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'getGameState', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ name: 'state', type: 'uint8' }, { name: 'round', type: 'uint8' }, { name: 'targetCard', type: 'uint8' }, { name: 'currentTurnIndex', type: 'uint8' }, { name: 'aliveCount', type: 'uint8' }, { name: 'winner', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'getPlayer', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'index', type: 'uint8' }], outputs: [{ name: 'addr', type: 'address' }, { name: 'alive', type: 'bool' }, { name: 'characterId', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getLastClaim', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ name: 'claimant', type: 'address' }, { name: 'cardIndex', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getPendingCtHash', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getTurnDeadline', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getStakeAmount', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getShooter', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'getMultiShooters', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'address[]' }], stateMutability: 'view' },
  { type: 'function', name: 'getRevealCtHash', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getRevealedCard', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
  // Events
  { type: 'event', name: 'GameCreated', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'host', type: 'address', indexed: true }] },
  { type: 'event', name: 'PlayerJoined', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'index', type: 'uint8', indexed: false }] },
  { type: 'event', name: 'GameStarted', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }] },
  { type: 'event', name: 'RoundStarted', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'round', type: 'uint8', indexed: false }, { name: 'targetCard', type: 'uint8', indexed: false }] },
  { type: 'event', name: 'CardRevealed', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'cardValue', type: 'uint8', indexed: false }] },
  { type: 'event', name: 'TargetChosen', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'shooter', type: 'address', indexed: true }, { name: 'target', type: 'address', indexed: true }] },
  { type: 'event', name: 'SpinResult', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'target', type: 'address', indexed: true }, { name: 'fired', type: 'bool', indexed: false }] },
  { type: 'event', name: 'PlayerEliminated', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }] },
  { type: 'event', name: 'GameOver', inputs: [{ name: 'gameId', type: 'uint256', indexed: true }, { name: 'winner', type: 'address', indexed: true }] },
] as const;

export const CHAOS_DECK_ABI = [
  { type: 'function', name: 'getHandHashes', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }], outputs: [{ type: 'uint256[3]' }], stateMutability: 'view' },
  { type: 'function', name: 'cardPlayed', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }, { name: 'index', type: 'uint8' }], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'remainingCards', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'player', type: 'address' }], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
] as const;

export const USDC_ABI = [
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
] as const;
