import { create } from 'zustand';

export type GameState = 'WaitingForPlayers' | 'Dealing' | 'PlayerTurn' | 'Challenging' | 'Spinning' | 'GameOver';
const STATE_MAP: GameState[] = ['WaitingForPlayers', 'Dealing', 'PlayerTurn', 'Challenging', 'Spinning', 'GameOver'];

export interface PlayerInfo {
  addr: string;
  alive: boolean;
  points: number;
  usedExecute: boolean;
  usedDoubleSpin: boolean;
}

interface GameStore {
  gameId: number | null;
  state: GameState;
  round: number;
  targetCard: number;
  currentTurnIndex: number;
  aliveCount: number;
  winner: string;
  players: PlayerInfo[];
  myHand: (number | null)[];
  playedCards: number[]; // indices of cards already played this round
  selectedCards: number[];
  cofheReady: boolean;
  lastClaimant: string;
  lastClaimCount: number;
  chamberPointer: number;
  chamberPointers: Record<string, number>; // per-player
  pendingSpinner: string;
  // Actions
  setGameId: (id: number | null) => void;
  setCofheReady: (ready: boolean) => void;
  setMyHand: (hand: (number | null)[]) => void;
  toggleCard: (index: number) => void;
  clearSelection: () => void;
  markCardsPlayed: (indices: number[]) => void;
  resetPlayedCards: () => void;
  updateFromChain: (data: { state: number; round: number; targetCard: number; currentTurnIndex: number; aliveCount: number; winner: string }) => void;
  setPlayers: (players: PlayerInfo[]) => void;
  setLastClaim: (claimant: string, count: number) => void;
  setChamberPointer: (ptr: number) => void;
  setChamberPointers: (pointers: Record<string, number>) => void;
  setPendingSpinner: (addr: string) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameId: null,
  state: 'WaitingForPlayers',
  round: 0,
  targetCard: 0,
  currentTurnIndex: 0,
  aliveCount: 0,
  winner: '',
  players: [],
  myHand: [null, null, null, null, null],
  playedCards: [],
  selectedCards: [],
  cofheReady: false,
  lastClaimant: '',
  lastClaimCount: 0,
  chamberPointer: 0,
  chamberPointers: {},
  pendingSpinner: '',
  setGameId: (id) => set({ gameId: id }),
  setCofheReady: (ready) => set({ cofheReady: ready }),
  setMyHand: (hand) => set({ myHand: hand }),
  toggleCard: (index) => set((s) => {
    if (s.playedCards.includes(index)) return s; // can't select played cards
    const sel = s.selectedCards.includes(index)
      ? s.selectedCards.filter((i) => i !== index)
      : s.selectedCards.length < 3 ? [...s.selectedCards, index] : s.selectedCards;
    return { selectedCards: sel };
  }),
  clearSelection: () => set({ selectedCards: [] }),
  markCardsPlayed: (indices) => set((s) => ({ playedCards: [...s.playedCards, ...indices], selectedCards: [] })),
  resetPlayedCards: () => set({ playedCards: [], selectedCards: [], myHand: [null, null, null, null, null] }),
  updateFromChain: (data) => set({
    state: STATE_MAP[Number(data.state)] ?? 'WaitingForPlayers',
    round: data.round,
    targetCard: data.targetCard,
    currentTurnIndex: data.currentTurnIndex,
    aliveCount: data.aliveCount,
    winner: data.winner,
  }),
  setPlayers: (players) => set({ players }),
  setLastClaim: (claimant, count) => set({ lastClaimant: claimant, lastClaimCount: count }),
  setChamberPointer: (ptr) => set({ chamberPointer: ptr }),
  setChamberPointers: (pointers) => set({ chamberPointers: pointers }),
  setPendingSpinner: (addr) => set({ pendingSpinner: addr }),
}));
