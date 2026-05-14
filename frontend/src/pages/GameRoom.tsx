import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { shortenAddress, targetName, cardName, cardEmoji } from '../lib/cardUtils';
import SpinAnimation from '../components/revolver/SpinAnimation';
import Timer from '../components/shared/Timer';

const MASKS = ['🦊', '🐰', '🐱', '🦉'];
const MASK_NAMES = ['Fox', 'Rabbit', 'Cat', 'Owl'];

export default function GameRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const targetCard = useGameStore((s) => s.targetCard);
  const myHand = useGameStore((s) => s.myHand);
  const selectedCards = useGameStore((s) => s.selectedCards);
  const playedCards = useGameStore((s) => s.playedCards);
  const toggleCard = useGameStore((s) => s.toggleCard);
  const markCardsPlayed = useGameStore((s) => s.markCardsPlayed);
  const lastClaimant = useGameStore((s) => s.lastClaimant);
  const lastClaimCount = useGameStore((s) => s.lastClaimCount);
  const chamberPointers = useGameStore((s) => s.chamberPointers);
  const resetPlayedCards = useGameStore((s) => s.resetPlayedCards);

  const myPlayer = players.find((p) => p.addr?.toLowerCase() === address?.toLowerCase());
  const myIndex = players.findIndex((p) => p.addr?.toLowerCase() === address?.toLowerCase());
  const prevRoundRef = useRef(0);
  const challengeResolvedRef = useRef(false);
  const handDecryptedRef = useRef(0);

  const { decryptHand } = useMyHand();
  const { resolveChallenge, resolving } = useChallenge();
  const { resolveSpin, spinning, outcome, clearOutcome, isMySpinTurn } = useSpin();
  useGameState();
  useAutoAction();

  useEffect(() => { if (id) setGameId(Number(id)); }, [id, setGameId]);

  useEffect(() => {
    if (round > 0 && round !== prevRoundRef.current) {
      prevRoundRef.current = round;
      challengeResolvedRef.current = false;
      resetPlayedCards();
    }
  }, [round, resetPlayedCards]);

  useEffect(() => {
    if (cofheReady && state === 'PlayerTurn' && round > 0 && handDecryptedRef.current !== round && myPlayer?.alive) {
      handDecryptedRef.current = round;
      setTimeout(decryptHand, 2000);
    }
  }, [cofheReady, state, round, decryptHand, myPlayer?.alive]);

  const iAmChallenger = players[currentTurnIndex]?.addr?.toLowerCase() === address?.toLowerCase();
  useEffect(() => {
    if (state === 'Challenging' && cofheReady && iAmChallenger && !challengeResolvedRef.current) {
      challengeResolvedRef.current = true;
      setTimeout(resolveChallenge, 3000);
    }
  }, [state, cofheReady, iAmChallenger, resolveChallenge]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isMyTurn = players[currentTurnIndex]?.addr?.toLowerCase() === address?.toLowerCase();
  const playerCount = players.filter((p) => p.addr !== '0x0000000000000000000000000000000000000000').length;
  const isHost = players[0]?.addr?.toLowerCase() === address?.toLowerCase();
  const canStart = state === 'WaitingForPlayers' && isHost && playerCount === 4;
  const hasClaimToChallenge = lastClaimant && lastClaimant !== '0x0000000000000000000000000000000000000000' && lastClaimant.toLowerCase() !== address?.toLowerCase();
  const hasCardsLeft = playedCards.length < 5;

  const startGame = async () => {
    setError(''); setLoading(true);
    try {
      const gas = await getGasOverrides(publicClient!);
      const hash = await writeContractAsync({ address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'startGame', args: [BigInt(id!)], ...gas });
      await publicClient!.waitForTransactionReceipt({ hash });
    } catch (e: any) { setError(e.shortMessage || e.message); }
    setLoading(false);
  };

  const playCards = async () => {
    if (selectedCards.length === 0) return;
    const gas = await getGasOverrides(publicClient!);
    await writeContractAsync({ address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'playCards', args: [BigInt(id!), selectedCards.map((i) => i)], ...gas });
    markCardsPlayed(selectedCards);
  };

  const callLiar = async () => {
    const gas = await getGasOverrides(publicClient!);
    await writeContractAsync({ address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'callLiar', args: [BigInt(id!)], ...gas });
  };

  // Get opponents (everyone except me)
  const opponents = players.filter((_, i) => i !== myIndex).filter(p => p.addr !== '0x0000000000000000000000000000000000000000');

  return (
    <div className="relative h-screen flex flex-col overflow-hidden">
      <div className="fixed inset-0 grain-overlay z-50 pointer-events-none"></div>
      <div className="fixed inset-0 table-gradient z-0"></div>
      <SpinAnimation outcome={outcome} spinning={spinning} onDismiss={clearOutcome} />

      {/* TOP — Opponents */}
      <header className="relative z-20 h-1/4 flex justify-around items-end pb-4 px-8">
        {opponents.map((p, i) => {
          const pIdx = players.indexOf(p);
          const isTurn = pIdx === currentTurnIndex;
          const chambers = chamberPointers[p.addr?.toLowerCase()] || 0;
          return (
            <div key={i} className={`flex flex-col items-center gap-1 transition-all ${!p.alive ? 'opacity-30 grayscale' : ''} ${isTurn ? 'scale-110' : 'scale-90 opacity-80'}`}>
              {isTurn && <div className="absolute -inset-3 border border-gold rounded-full opacity-30 animate-pulse"></div>}
              <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-4xl ${isTurn ? 'border-gold glow-gold' : 'border-outline-variant'} bg-surface`}>
                {p.alive ? MASKS[pIdx] : '💀'}
              </div>
              <div className={`px-3 py-0.5 ${isTurn ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}`}>
                <span className="font-stamp text-sm">{MASK_NAMES[pIdx]}</span>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 6 }, (_, j) => (
                  <div key={j} className={`w-2.5 h-2.5 rounded-full border ${j < chambers ? 'bg-danger-deep border-danger-deep' : 'border-outline'}`} />
                ))}
              </div>
              {!p.alive && <span className="font-mono text-[10px] text-danger">ELIMINATED</span>}
            </div>
          );
        })}
      </header>

      {/* CENTER — Table */}
      <section className="relative z-20 flex-1 flex flex-col items-center justify-center">
        {/* Target + Round + Timer */}
        <div className="flex items-center gap-6 mb-4">
          {state !== 'WaitingForPlayers' && state !== 'GameOver' && (
            <>
              <span className="font-mono text-[10px] text-text-muted">ROUND {round}</span>
              <div className="brass-border px-4 py-2 bg-surface-container">
                <span className="font-stamp text-xl text-primary tracking-wider">{targetName(targetCard)}</span>
              </div>
              <Timer />
            </>
          )}
        </div>

        {/* Table cards / claim */}
        {lastClaimant && lastClaimant !== '0x0000000000000000000000000000000000000000' && state === 'PlayerTurn' && (
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="flex gap-1">
              {Array.from({ length: lastClaimCount }, (_, i) => (
                <div key={i} className="w-10 h-14 rounded bg-card-back border border-outline-variant shadow-lg" />
              ))}
            </div>
            <span className="font-body text-sm text-on-surface-variant italic">
              claims {lastClaimCount} {targetName(targetCard)}{lastClaimCount > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Waiting state */}
        {state === 'WaitingForPlayers' && (
          <div className="text-center space-y-4">
            <p className="font-display text-2xl text-primary neon-glow">Table #{id}</p>
            <p className="font-body text-text-muted">{playerCount}/4 seated</p>
            <div className="flex justify-center gap-3">
              {[0,1,2,3].map(i => (
                <div key={i} className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl ${i < playerCount ? 'border-gold bg-surface-container' : 'border-outline-variant border-dashed'}`}>
                  {i < playerCount ? MASKS[i] : ''}
                </div>
              ))}
            </div>
            {canStart && (
              <button onClick={startGame} disabled={loading} className="mt-4 px-8 py-3 bg-gold text-bg-deep font-stamp text-xl tracking-wider hover:bg-amber-bright transition disabled:opacity-50">
                {loading ? '⏳ DEALING...' : '🃏 DEAL THE CARDS'}
              </button>
            )}
            {error && <p className="font-mono text-xs text-error">{error}</p>}
            <p className="font-mono text-[10px] text-text-muted">Share Table ID: {id}</p>
          </div>
        )}

        {/* Challenging */}
        {state === 'Challenging' && (
          <div className="text-center space-y-3">
            <p className="font-display text-2xl text-danger animate-pulse">⚔️ REVEALING CARDS...</p>
            {iAmChallenger && !resolving && (
              <button onClick={resolveChallenge} className="px-6 py-2 brass-border font-stamp text-primary">REVEAL</button>
            )}
            {resolving && <p className="font-mono text-xs text-text-muted animate-pulse">Decrypting via FHE...</p>}
          </div>
        )}

        {/* Spinning */}
        {state === 'Spinning' && (
          <div className="text-center space-y-4">
            {isMySpinTurn ? (
              <>
                <p className="font-display text-2xl text-danger">Your turn to pull...</p>
                {!spinning && (
                  <button onClick={resolveSpin} className="px-10 py-4 bg-danger-deep border-2 border-danger font-stamp text-2xl text-white tracking-wider hover:bg-danger transition animate-pulse">
                    🔫 PULL TRIGGER
                  </button>
                )}
                {spinning && <p className="font-mono text-sm text-text-muted animate-pulse">Resolving...</p>}
              </>
            ) : (
              <p className="font-body text-on-surface-variant animate-pulse">Waiting for trigger pull...</p>
            )}
          </div>
        )}

        {/* Game Over */}
        {state === 'GameOver' && (
          <div className="text-center space-y-6">
            <h2 className="font-display text-4xl text-primary neon-glow">LAST ONE STANDING</h2>
            <div className="flex justify-center gap-4">
              {players.filter(p => p.addr !== '0x0000000000000000000000000000000000000000').map((p, i) => {
                const isWinner = p.alive;
                return (
                  <div key={i} className={`flex flex-col items-center gap-2 p-4 rounded-lg ${isWinner ? 'border border-gold bg-gold/10' : 'opacity-40'}`}>
                    <span className="text-4xl">{isWinner ? '👑' : '💀'}</span>
                    <span className="text-2xl">{MASKS[i]}</span>
                    <span className="font-mono text-[10px] text-text-address">{shortenAddress(p.addr)}</span>
                    {isWinner && <span className="font-stamp text-gold">WINNER</span>}
                  </div>
                );
              })}
            </div>
            <button onClick={() => navigate('/lobby')} className="px-8 py-3 bg-gold text-bg-deep font-stamp text-lg tracking-wider">
              ANOTHER ROUND
            </button>
          </div>
        )}
      </section>

      {/* BOTTOM — My Hand + Actions */}
      {myPlayer?.alive && (state === 'PlayerTurn' || state === 'Challenging' || state === 'Spinning') && (
        <footer className="relative z-20 bg-bg-surface/80 backdrop-blur border-t border-outline-variant p-4">
          {/* My revolver */}
          <div className="absolute top-2 left-4 flex items-center gap-1">
            <span className="text-xs">🔫</span>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full border ${i < (chamberPointers[address?.toLowerCase() || ''] || 0) ? 'bg-danger-deep border-danger-deep' : 'border-outline'}`} />
            ))}
          </div>

          {/* Cards */}
          <div className="flex justify-center gap-2 mb-3">
            {myHand.map((card, i) => {
              const isPlayed = playedCards.includes(i);
              const isSelected = selectedCards.includes(i);
              if (isPlayed) return <div key={i} className="w-14 h-20 rounded border border-outline-variant/30 bg-surface-container/20" />;
              return (
                <button
                  key={i}
                  onClick={() => card !== null && toggleCard(i)}
                  className={`w-14 h-20 rounded border-2 flex flex-col items-center justify-center font-bold transition-all
                    ${isSelected ? 'border-gold bg-gold/10 -translate-y-3 shadow-[0_0_12px_rgba(201,168,76,0.3)]' : 'border-outline-variant bg-card-face/5 hover:border-brass'}
                    ${card === null ? 'opacity-40' : 'cursor-pointer'}`}
                >
                  {card !== null ? (
                    <>
                      <span className="text-xl">{cardEmoji(card)}</span>
                      <span className="text-[9px] text-on-surface-variant">{cardName(card)}</span>
                    </>
                  ) : (
                    <span className="text-lg animate-pulse">🔒</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          {state === 'PlayerTurn' && isMyTurn && (
            <div className="flex justify-center gap-3">
              {hasCardsLeft && (
                <button onClick={playCards} disabled={selectedCards.length === 0}
                  className="px-6 py-2 bg-gold text-bg-deep font-stamp tracking-wider disabled:opacity-30 hover:bg-amber-bright transition">
                  PLAY {selectedCards.length || ''} AS {targetName(targetCard)}
                </button>
              )}
              {hasClaimToChallenge && (
                <button onClick={callLiar}
                  className="px-6 py-2 bg-danger-deep border border-danger text-white font-stamp tracking-wider hover:bg-danger transition">
                  🤥 LIAR!
                </button>
              )}
              {!hasCardsLeft && !hasClaimToChallenge && (
                <span className="font-mono text-xs text-text-muted">Waiting...</span>
              )}
            </div>
          )}
          {state === 'PlayerTurn' && !isMyTurn && (
            <p className="text-center font-mono text-xs text-text-muted">Waiting for {MASK_NAMES[currentTurnIndex]}...</p>
          )}

          {/* Decrypt button */}
          {cofheReady && myHand.every(c => c === null) && state === 'PlayerTurn' && (
            <button onClick={decryptHand} className="mt-2 mx-auto block font-mono text-[10px] text-brass hover:underline">
              🔓 Decrypt Hand
            </button>
          )}
        </footer>
      )}

      {/* CoFHE loading */}
      {!cofheReady && state !== 'WaitingForPlayers' && (
        <div className="fixed bottom-4 left-4 z-40 font-mono text-[10px] text-amber-bright animate-pulse">
          🔐 Initializing encryption...
        </div>
      )}
    </div>
  );
}
