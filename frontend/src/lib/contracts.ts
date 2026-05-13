export const GAME_ADDRESS = (import.meta.env.VITE_GAME_ADDRESS || '0x96Da3b705E3Bd95c70927732e6656FA337E1FEfe') as `0x${string}`;
export const DECK_ADDRESS = (import.meta.env.VITE_DECK_ADDRESS || '0x10D0cD836F82a5a9B659E73a611FA272cAD41098') as `0x${string}`;
export const REVOLVER_ADDRESS = (import.meta.env.VITE_REVOLVER_ADDRESS || '0x3011DFd4076a2E6556591Acd57d7f9894cAe3bBd') as `0x${string}`;

export const GAME_ABI = [
  { type: 'function', name: 'createGame', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'joinGame', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
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
  { type: 'function', name: 'getPlayer', inputs: [{ name: 'gameId', type: 'uint256' }, { name: 'index', type: 'uint8' }], outputs: [{ name: 'addr', type: 'address' }, { name: 'alive', type: 'bool' }, { name: 'points', type: 'uint8' }, { name: 'usedExecute', type: 'bool' }, { name: 'usedDoubleSpin', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'getLastClaim', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ name: 'claimant', type: 'address' }, { name: 'count', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'getPendingSpinner', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'getPendingCtHash', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getTurnDeadline', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'forceTimeout', inputs: [{ name: 'gameId', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
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
