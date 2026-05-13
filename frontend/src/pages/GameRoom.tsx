import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { useGameStore } from '../stores/gameStore';
import { useGameState } from '../hooks/useGameState';
import { useMyHand } from '../hooks/useMyHand';
import { useCofhe } from '../hooks/useCofhe';
import { useChallenge } from '../hooks/useChallenge';
import { useSpin } from '../hooks/useSpin';
import { useAutoAction } from '../hooks/useAutoAction';
import { GAME_ADDRESS, GAME_ABI } from '../lib/contracts';
import { getGasOverrides } from '../lib/gas';
import { shortenAddress } from '../lib/cardUtils';
import PlayerSeat from '../components/game/PlayerSeat';
import CardHand from '../components/game/CardHand';
import ActionButtons from '../components/game/ActionButtons';
import TargetCard from '../components/game/TargetCard';
import RevolverWheel from '../components/revolver/RevolverWheel';
import SpinAnimation from '../components/revolver/SpinAnimation';
import GameLog from '../components/shared/GameLog';
import Timer from '../components/shared/Timer';

export default function GameRoom() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const cofheReady = useCofhe();
  const setGameId = useGameStore((s) => s.setGameId);
  const state = useGameStore((s) => s.state);
  const players = useGameStore((s) => s.players);
  const round = useGameStore((s) => s.round);
  const winner = useGameStore((s) => s.winner);
  const currentTurnIndex = useGameStore((s) => s.currentTurnIndex);

  const { decryptHand } = useMyHand();
  const { resolveChallenge, resolving } = useChallenge();
  const { resolveSpin, spinning, outcome, clearOutcome, isMySpinTurn } = useSpin();
  const resetPlayedCards = useGameStore((s) => s.resetPlayedCards);
  const prevRoundRef = useRef(0);
  const challengeResolvedRef = useRef(false);
  const spinResolvedRef = useRef(false);
  const handDecryptedRef = useRef(0); // tracks which round was decrypted
  const myPlayer = players.find((p) => p.addr?.toLowerCase() === address?.toLowerCase());
  useGameState();
  useAutoAction();

  useEffect(() => { if (id) setGameId(Number(id)); }, [id, setGameId]);

  // Reset hand state when new round starts
  useEffect(() => {
    if (round > 0 && round !== prevRoundRef.current) {
      prevRoundRef.current = round;
      challengeResolvedRef.current = false;
      spinResolvedRef.current = false;
      resetPlayedCards();
    }
  }, [round, resetPlayedCards]);

  // Auto-decrypt hand ONCE per round (only if alive)
  useEffect(() => {
    if (cofheReady && state === 'PlayerTurn' && round > 0 && handDecryptedRef.current !== round && myPlayer?.alive) {
      handDecryptedRef.current = round;
      setTimeout(decryptHand, 2000);
    }
  }, [cofheReady, state, round, decryptHand, myPlayer?.alive]);

  // Only the CHALLENGER resolves the challenge — ONCE
  const iAmChallenger = players[currentTurnIndex]?.addr?.toLowerCase() === address?.toLowerCase();
  useEffect(() => {
    if (state === 'Challenging' && cofheReady && iAmChallenger && !challengeResolvedRef.current) {
      challengeResolvedRef.current = true;
      setTimeout(resolveChallenge, 3000);
    }
  }, [state, cofheReady, iAmChallenger, resolveChallenge]);

  // Spin is now manual — player clicks "Pull Trigger" button
  const isHost = players[0]?.addr?.toLowerCase() === address?.toLowerCase();
  const playerCount = players.filter((p) => p.addr !== '0x0000000000000000000000000000000000000000').length;
  const canStart = state === 'WaitingForPlayers' && isHost && playerCount === 4;

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const startGame = async () => {
    setError('');
    setLoading(true);
    try {
      const gas = await getGasOverrides(publicClient!);
      const hash = await writeContractAsync({ address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'startGame', args: [BigInt(id!)], ...gas });
      await publicClient!.waitForTransactionReceipt({ hash });
    } catch (e: any) {
      console.error('startGame failed:', e);
      setError(e.shortMessage || e.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto space-y-4">
      {/* Spin overlay */}
      <SpinAnimation outcome={outcome} spinning={spinning} onDismiss={clearOutcome} />

      {/* Header */}
      <div className="flex justify-between items-center bg-bar-panel p-4 rounded-xl">
        <h2 className="text-xl font-bold text-bar-gold">Game #{id}</h2>
        <Timer />
        <TargetCard />
        <RevolverWheel />
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {players.map((p, i) => (
          <PlayerSeat key={i} player={p} index={i} />
        ))}
      </div>

      {/* Waiting / Start */}
      {state === 'WaitingForPlayers' && (
        <div className="text-center space-y-4">
          <p className="text-gray-400">Waiting for players... ({playerCount}/4)</p>
          {canStart && (
            <button onClick={startGame} disabled={loading} className="px-8 py-3 bg-bar-gold text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
              {loading ? '⏳ Starting...' : '🚀 Start Game'}
            </button>
          )}
          {error && <p className="text-red-400 text-sm break-all">{error}</p>}
        </div>
      )}

      {/* Challenging state */}
      {state === 'Challenging' && (
        <div className="text-center py-4 space-y-3">
          {iAmChallenger ? (
            <>
              <p className="text-yellow-400 text-lg">⚔️ Revealing cards...</p>
              {!resolving && (
                <button onClick={resolveChallenge} className="px-6 py-3 bg-yellow-600 font-bold rounded-lg hover:bg-yellow-500">
                  🔄 Reveal Cards
                </button>
              )}
              {resolving && <p className="text-yellow-400 animate-pulse text-sm">Decrypting via FHE network...</p>}
            </>
          ) : (
            <p className="text-yellow-400 animate-pulse text-lg">⚔️ Waiting for card reveal...</p>
          )}
        </div>
      )}

      {/* Spinning state */}
      {state === 'Spinning' && (
        <div className="text-center py-4 space-y-3">
          {isMySpinTurn ? (
            <>
              <p className="text-red-400 text-lg">🔫 Your turn to pull the trigger...</p>
              {!spinning && (
                <button
                  onClick={resolveSpin}
                  className="px-8 py-4 bg-bar-danger font-bold text-xl rounded-lg hover:bg-red-500 animate-pulse"
                >
                  🔫 Pull Trigger
                </button>
              )}
              {spinning && <p className="text-yellow-400 animate-pulse">Resolving...</p>}
            </>
          ) : (
            <p className="text-yellow-400 animate-pulse text-lg">🔫 Waiting for player to pull trigger...</p>
          )}
        </div>
      )}

      {/* Game Over */}
      {state === 'GameOver' && (
        <div className="bg-bar-panel rounded-2xl p-8 text-center space-y-6">
          <h2 className="text-5xl font-bold text-bar-gold">🏆 Game Over!</h2>
          <div className="space-y-4">
            {players.map((p, i) => {
              if (p.addr === '0x0000000000000000000000000000000000000000') return null;
              const isWinner = p.alive;
              const isMe = p.addr?.toLowerCase() === address?.toLowerCase();
              return (
                <div key={i} className={`flex items-center justify-between p-4 rounded-xl ${isWinner ? 'bg-bar-gold/20 border-2 border-bar-gold' : 'bg-gray-800/50 opacity-60'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{isWinner ? '👑' : '💀'}</span>
                    <span className="font-mono">{isMe ? '👤 You' : shortenAddress(p.addr)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isWinner && <span className="text-green-400 font-bold">WINNER</span>}
                    {!p.alive && <span className="text-red-400 text-sm">Eliminated</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {players.find(p => p.alive && p.addr?.toLowerCase() === address?.toLowerCase()) && (
            <p className="text-3xl text-green-400 font-bold animate-pulse">🎉 You Won!</p>
          )}
          {players.find(p => !p.alive && p.addr?.toLowerCase() === address?.toLowerCase()) && (
            <p className="text-xl text-gray-400">Better luck next time...</p>
          )}
          <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-bar-gold text-black font-bold rounded-lg hover:opacity-90">
            🍺 Back to Lobby
          </button>
        </div>
      )}

      {/* Hand + Actions (only if alive) */}
      {(state === 'PlayerTurn' || state === 'Challenging' || state === 'Spinning') && myPlayer?.alive && (
        <div className="space-y-4">
          <CardHand />
          {state === 'PlayerTurn' && <ActionButtons gameId={id!} />}
        </div>
      )}

      {/* CoFHE loading */}
      {!cofheReady && <p className="text-center text-yellow-400 animate-pulse">🔐 Initializing encryption...</p>}

      {/* Game Log */}
      <GameLog gameId={id!} />
    </div>
  );
}
