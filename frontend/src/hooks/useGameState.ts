import { useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { GAME_ADDRESS, GAME_ABI, REVOLVER_ADDRESS, REVOLVER_ABI } from '../lib/contracts';
import { useGameStore } from '../stores/gameStore';

export function useGameState() {
  const publicClient = usePublicClient();
  const gameId = useGameStore((s) => s.gameId);
  const updateFromChain = useGameStore((s) => s.updateFromChain);
  const setPlayers = useGameStore((s) => s.setPlayers);
  const setLastClaim = useGameStore((s) => s.setLastClaim);
  const setChamberPointer = useGameStore((s) => s.setChamberPointer);
  const setChamberPointers = useGameStore((s) => s.setChamberPointers);
  const setPendingSpinner = useGameStore((s) => s.setPendingSpinner);

  useEffect(() => {
    if (gameId === null || !publicClient) return;
    const poll = async () => {
      try {
        const [state, round, targetCard, currentTurnIndex, aliveCount, winner] = await publicClient.readContract({
          address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'getGameState', args: [BigInt(gameId)],
        }) as [number, number, number, number, number, string];
        updateFromChain({ state, round, targetCard, currentTurnIndex, aliveCount, winner });

        // Fetch players
        const players = await Promise.all([0, 1, 2, 3].map(async (i) => {
          const [addr, alive, points, usedExecute, usedDoubleSpin] = await publicClient.readContract({
            address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'getPlayer', args: [BigInt(gameId), i],
          }) as [string, boolean, number, boolean, boolean];
          return { addr, alive, points: Number(points), usedExecute, usedDoubleSpin };
        }));
        setPlayers(players);

        // Last claim
        const [claimant, count] = await publicClient.readContract({
          address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'getLastClaim', args: [BigInt(gameId)],
        }) as [string, number];
        setLastClaim(claimant, Number(count));

        // Chamber pointers (per-player)
        const pointers: Record<string, number> = {};
        for (const p of players) {
          if (p.addr === '0x0000000000000000000000000000000000000000') continue;
          try {
            const ptr = await publicClient.readContract({
              address: REVOLVER_ADDRESS, abi: REVOLVER_ABI, functionName: 'getChamberPointer', args: [BigInt(gameId), p.addr as `0x${string}`],
            }) as number;
            pointers[p.addr.toLowerCase()] = Number(ptr);
          } catch {}
        }
        setChamberPointers(pointers);

        // Pending spinner
        const spinner = await publicClient.readContract({
          address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'getPendingSpinner', args: [BigInt(gameId)],
        }) as string;
        setPendingSpinner(spinner);
      } catch (e) { console.error('Poll error:', e); }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [gameId, publicClient, updateFromChain, setPlayers, setLastClaim, setChamberPointer, setPendingSpinner]);
}
