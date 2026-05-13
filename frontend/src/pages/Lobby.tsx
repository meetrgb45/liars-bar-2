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
    } catch (e: any) { console.error('createGame error:', e); setError(e.shortMessage || e.message); }
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
    } catch (e: any) { console.error('joinGame error:', e); setError(e.shortMessage || e.message); }
    setLoading('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-bar-panel p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-center text-bar-gold">🃏 Liar's Bar</h1>
        <p className="text-center text-gray-400 text-sm">4-Player Bluffing • FHE Encrypted • Russian Roulette</p>

        {!isConnected ? (
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full py-3 bg-bar-gold text-black font-bold rounded-lg hover:opacity-90 transition"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">{shortenAddress(address!)}</span>
              <button onClick={() => disconnect()} className="text-xs text-red-400 hover:underline">Disconnect</button>
            </div>

            <button
              onClick={createGame}
              disabled={!!loading}
              className="w-full py-3 bg-bar-gold text-black font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {loading === 'Creating...' ? '⏳ Creating...' : '🎲 Create Game'}
            </button>

            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Game ID"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                className="flex-1 px-4 py-3 bg-bar-bg border border-gray-600 rounded-lg text-white"
              />
              <button
                onClick={joinGame}
                disabled={!!loading}
                className="px-6 py-3 bg-green-600 font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {loading === 'Joining...' ? '⏳' : 'Join'}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-sm text-red-300 break-all">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
