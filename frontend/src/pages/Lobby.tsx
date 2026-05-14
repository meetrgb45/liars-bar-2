import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract, usePublicClient } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { GAME_ADDRESS, GAME_ABI } from '../lib/contracts';
import { shortenAddress } from '../lib/cardUtils';
import { getGasOverrides } from '../lib/gas';

export default function Lobby() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  const createGame = async () => {
    setLoading('Creating...');
    setError('');
    try {
      const gas = await getGasOverrides(publicClient!);
      const hash = await writeContractAsync({ address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'createGame', ...gas });
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      const log = receipt.logs[0];
      const gameId = log?.topics[1] ? Number(BigInt(log.topics[1])) : 0;
      navigate(`/game/${gameId}`);
    } catch (e: any) { console.error(e); setError(e.shortMessage || e.message); }
    setLoading('');
  };

  const joinGame = async () => {
    if (!joinId) return;
    setLoading('Joining...');
    setError('');
    try {
      const gas = await getGasOverrides(publicClient!);
      const hash = await writeContractAsync({ address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'joinGame', args: [BigInt(joinId)], ...gas });
      await publicClient!.waitForTransactionReceipt({ hash });
      navigate(`/game/${joinId}`);
    } catch (e: any) { console.error(e); setError(e.shortMessage || e.message); }
    setLoading('');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center">
      <div className="fixed inset-0 grain-overlay z-50"></div>
      <div className="fixed inset-0 smoke-effect pointer-events-none z-10"></div>

      <div className="relative z-30 w-full max-w-md px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <button onClick={() => navigate('/')} className="font-display text-3xl text-primary italic neon-glow">
            Liar's Deck
          </button>
          <p className="font-body text-sm text-text-muted mt-2">Choose your table wisely</p>
        </div>

        {/* Card */}
        <div className="bg-bg-surface border border-outline-variant rounded-lg p-8 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          {!isConnected ? (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full py-4 brass-border font-stamp text-lg text-primary bg-surface-container-low hover:bg-surface-variant transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">account_balance_wallet</span>
              ENTER THE BAR
            </button>
          ) : (
            <div className="space-y-6">
              {/* Wallet */}
              <div className="flex justify-between items-center pb-4 border-b border-outline-variant">
                <span className="font-mono text-xs text-text-address">{shortenAddress(address!)}</span>
                <button onClick={() => disconnect()} className="font-mono text-[10px] text-text-muted hover:text-danger transition">
                  DISCONNECT
                </button>
              </div>

              {/* Create */}
              <button
                onClick={createGame}
                disabled={!!loading}
                className="w-full py-4 bg-gold text-bg-deep font-stamp text-xl tracking-wider hover:bg-amber-bright transition-colors disabled:opacity-50"
              >
                {loading === 'Creating...' ? '⏳ CREATING...' : '🃏 NEW TABLE'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-[1px] bg-outline-variant"></div>
                <span className="font-mono text-[10px] text-text-muted">OR JOIN</span>
                <div className="flex-1 h-[1px] bg-outline-variant"></div>
              </div>

              {/* Join */}
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Table #"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="flex-1 px-4 py-3 bg-surface-container border border-outline-variant text-on-surface font-mono text-sm focus:border-brass focus:outline-none transition"
                />
                <button
                  onClick={joinGame}
                  disabled={!!loading || !joinId}
                  className="px-6 py-3 bg-secondary text-on-secondary font-stamp tracking-wider hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading === 'Joining...' ? '⏳' : 'SIT DOWN'}
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 border border-danger-deep bg-danger-deep/10 text-error font-mono text-xs break-all">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
