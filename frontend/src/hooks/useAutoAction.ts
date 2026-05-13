import { useEffect, useRef } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { useGameStore } from '../stores/gameStore';
import { GAME_ADDRESS, GAME_ABI } from '../lib/contracts';
import { getGasOverrides } from '../lib/gas';

/**
 * Auto-acts when the turn timer expires:
 * - PlayerTurn (my turn): auto-play first unplayed card
 * - Challenging (I'm challenger): auto-resolve is already handled
 * - Spinning (I'm spinner): auto-pull trigger
 */
export function useAutoAction() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const gameId = useGameStore((s) => s.gameId);
  const state = useGameStore((s) => s.state);
  const players = useGameStore((s) => s.players);
  const currentTurnIndex = useGameStore((s) => s.currentTurnIndex);
  const playedCards = useGameStore((s) => s.playedCards);
  const lastClaimant = useGameStore((s) => s.lastClaimant);
  const markCardsPlayed = useGameStore((s) => s.markCardsPlayed);
  const autoActedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMyTurn = players[currentTurnIndex]?.addr?.toLowerCase() === address?.toLowerCase();

  // Reset auto-acted flag when turn/state changes
  useEffect(() => {
    autoActedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [state, currentTurnIndex]);

  // Set 30s timer for auto-action on MY turn
  useEffect(() => {
    if (!publicClient || gameId === null || !address) return;
    if (state !== 'PlayerTurn' || !isMyTurn) return;
    if (autoActedRef.current) return;

    timerRef.current = setTimeout(async () => {
      if (autoActedRef.current) return;
      autoActedRef.current = true;

      try {
        const gas = await getGasOverrides(publicClient);
        const hasClaimToChallenge = lastClaimant && lastClaimant !== '0x0000000000000000000000000000000000000000' && lastClaimant.toLowerCase() !== address.toLowerCase();

        // Find first unplayed card
        const unplayedIndex = [0, 1, 2, 3, 4].find((i) => !playedCards.includes(i));

        if (unplayedIndex !== undefined) {
          // Auto-play one random card
          console.log('[autoAction] timer expired, auto-playing card', unplayedIndex);
          await writeContractAsync({
            address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'playCards',
            args: [BigInt(gameId), [unplayedIndex]], ...gas,
          });
          markCardsPlayed([unplayedIndex]);
        } else if (hasClaimToChallenge) {
          // No cards left, auto-call liar
          console.log('[autoAction] timer expired, auto-calling liar');
          await writeContractAsync({
            address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'callLiar',
            args: [BigInt(gameId)], ...gas,
          });
        }
      } catch (e) {
        console.error('[autoAction] failed:', e);
      }
    }, 30000); // 30 seconds

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state, isMyTurn, gameId, address, publicClient, writeContractAsync, playedCards, lastClaimant, markCardsPlayed]);
}
