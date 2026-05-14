import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { shortenAddress } from '../lib/cardUtils';

export default function Landing() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center">
      {/* Atmospheric overlays */}
      <div className="fixed inset-0 grain-overlay z-50"></div>
      <div className="fixed inset-0 smoke-effect pointer-events-none z-10"></div>

      {/* Nav */}
      <nav className="w-full max-w-7xl px-8 py-6 flex justify-between items-center z-40">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">token</span>
          <span className="font-mono text-xs tracking-widest text-text-muted">FHENIX_ENCRYPTED</span>
        </div>
        {isConnected ? (
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-text-address">{shortenAddress(address!)}</span>
            <button onClick={() => disconnect()} className="text-xs text-text-muted hover:text-danger transition">
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="brass-border px-6 py-2 font-stamp text-primary bg-surface-container-low hover:bg-surface-variant transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
            CONNECT WALLET
          </button>
        )}
      </nav>

      {/* Main Branding */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 z-30 py-12">
        <div className="relative">
          <h1 className="font-display text-6xl md:text-8xl text-primary italic neon-glow mb-2 uppercase select-none font-black">
            Liar's Bar
          </h1>
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
        </div>
        <p className="font-display text-xl text-on-surface-variant mb-4 italic">
          Bluff. Deceive. Survive.
        </p>
        <p className="font-body text-outline max-w-xl leading-relaxed mb-4">
          Enter the ultimate arena for on-chain deception. Powered by Fhenix's Fully Homomorphic Encryption — your secrets remain hidden until you choose to reveal them.
        </p>
        <div className="flex items-center gap-4 py-6">
          <div className="h-[1px] w-12 bg-brass/30"></div>
          <span className="font-mono text-xs text-brass uppercase tracking-[0.3em]">The House Always Wins</span>
          <div className="h-[1px] w-12 bg-brass/30"></div>
        </div>

        {/* Game Modes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mt-8 px-4">
          {/* Liar's Deck — LIVE */}
          <div className="group relative flex flex-col">
            <div className="absolute -inset-0.5 bg-gradient-to-b from-gold to-primary opacity-50 rounded-lg blur-[2px]"></div>
            <div className="relative bg-bg-surface rounded-lg p-6 flex flex-col h-full border border-gold/30 shadow-[0_0_20px_rgba(201,168,76,0.15)] hover:scale-[1.02] transition-transform">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-gold text-bg-deep font-stamp px-3 py-1 text-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">sensors</span>
                  LIVE
                </span>
              </div>
              <div className="w-full h-40 mb-4 bg-surface-container-high rounded overflow-hidden flex items-center justify-center">
                <span className="text-6xl">🃏</span>
              </div>
              <h3 className="font-display text-2xl text-primary mb-2">Liar's Deck</h3>
              <p className="font-body text-sm text-outline mb-4 flex-1">
                Bluff your cards. Get caught? Face the revolver. 4 players, encrypted hands, one bullet.
              </p>
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="font-mono text-[10px] text-text-muted border border-outline-variant px-2 py-0.5">4 PLAYERS</span>
                <span className="font-mono text-[10px] text-text-muted border border-outline-variant px-2 py-0.5">CARDS</span>
                <span className="font-mono text-[10px] text-text-muted border border-outline-variant px-2 py-0.5">REVOLVER</span>
              </div>
              <button
                onClick={() => navigate('/lobby')}
                className="w-full py-3 bg-gold text-bg-deep font-stamp text-lg tracking-wider hover:bg-amber-bright transition-colors"
              >
                PLAY NOW
              </button>
            </div>
          </div>

          {/* Liar's Dice — COMING SOON */}
          <div className="relative flex flex-col opacity-60">
            <div className="relative bg-bg-surface rounded-lg p-6 flex flex-col h-full border border-outline-variant">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-coming-soon text-white font-stamp px-3 py-1 text-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  SOON
                </span>
              </div>
              <div className="w-full h-40 mb-4 bg-surface-container-high rounded overflow-hidden flex items-center justify-center grayscale">
                <span className="text-6xl">🎲</span>
              </div>
              <h3 className="font-display text-2xl text-outline mb-2">Liar's Dice</h3>
              <p className="font-body text-sm text-text-muted mb-4 flex-1">
                Bid on hidden dice. Call the bluff or drink poison. Two bottles and you're out.
              </p>
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="font-mono text-[10px] text-text-muted border border-outline-variant px-2 py-0.5">4 PLAYERS</span>
                <span className="font-mono text-[10px] text-text-muted border border-outline-variant px-2 py-0.5">DICE</span>
                <span className="font-mono text-[10px] text-text-muted border border-outline-variant px-2 py-0.5">POISON</span>
              </div>
              <button disabled className="w-full py-3 bg-surface-container-high text-text-muted font-stamp text-lg tracking-wider cursor-not-allowed">
                COMING SOON
              </button>
            </div>
          </div>

          {/* Liar's Slots — COMING SOON */}
          <div className="relative flex flex-col opacity-60">
            <div className="relative bg-bg-surface rounded-lg p-6 flex flex-col h-full border border-outline-variant">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-coming-soon text-white font-stamp px-3 py-1 text-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  SOON
                </span>
              </div>
              <div className="w-full h-40 mb-4 bg-surface-container-high rounded overflow-hidden flex items-center justify-center grayscale">
                <span className="text-6xl">🎰</span>
              </div>
              <h3 className="font-display text-2xl text-outline mb-2">Liar's Slots</h3>
              <p className="font-body text-sm text-text-muted mb-4 flex-1">
                Spin the slots. Lie about your hearts. Death Spin awaits the unlucky.
              </p>
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="font-mono text-[10px] text-text-muted border border-outline-variant px-2 py-0.5">4 PLAYERS</span>
                <span className="font-mono text-[10px] text-text-muted border border-outline-variant px-2 py-0.5">SLOTS</span>
                <span className="font-mono text-[10px] text-text-muted border border-outline-variant px-2 py-0.5">DEATH SPIN</span>
              </div>
              <button disabled className="w-full py-3 bg-surface-container-high text-text-muted font-stamp text-lg tracking-wider cursor-not-allowed">
                COMING SOON
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 flex items-center gap-4">
          <span className="font-mono text-[10px] text-text-muted tracking-wider">BUILT ON FHENIX • FULLY ENCRYPTED • PROVABLY FAIR</span>
        </div>
      </main>
    </div>
  );
}
