import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { shortenAddress, targetName } from '../../lib/cardUtils';

const MASKS = ['🦊', '🐰', '🐱', '🦉'];
const MASK_NAMES = ['Fox', 'Rabbit', 'Cat', 'Owl'];

type Phase = 'accusation' | 'revealing' | 'verdict-lie' | 'verdict-valid' | null;

interface Props {
  phase: Phase;
  accuserIndex: number;
  accusedIndex: number;
  onDismiss: () => void;
}

export default function ChallengeOverlay({ phase, accuserIndex, accusedIndex, onDismiss }: Props) {
  const players = useGameStore((s) => s.players);
  const lastClaimCount = useGameStore((s) => s.lastClaimCount);
  const targetCard = useGameStore((s) => s.targetCard);

  if (!phase) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden"
        onClick={phase.startsWith('verdict') ? onDismiss : undefined}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-black/90" style={{ background: 'radial-gradient(circle, transparent 40%, rgba(139,26,26,0.3) 100%), rgba(0,0,0,0.9)' }} />
        <div className="absolute inset-0 grain-overlay"></div>

        {/* PHASE: ACCUSATION */}
        {phase === 'accusation' && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 8 }}
            className="relative z-10 flex flex-col items-center"
          >
            {/* LIAR heading */}
            <motion.h1
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="font-display text-[96px] text-danger uppercase italic tracking-tighter leading-none mb-12"
              style={{ textShadow: '0 0 20px rgba(233,69,96,0.8), 0 0 40px rgba(139,26,26,0.6)' }}
            >
              LIAR!
            </motion.h1>

            {/* VS Avatars */}
            <div className="flex items-center gap-16">
              {/* Accuser */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full border-4 border-gold flex items-center justify-center text-5xl bg-surface shadow-[0_0_20px_rgba(201,168,76,0.4)]">
                    {MASKS[accuserIndex]}
                  </div>
                  <div className="absolute -top-3 -right-3 bg-gold text-bg-deep font-stamp px-2 py-0.5 text-xs">
                    ACCUSER
                  </div>
                </div>
                <span className="font-stamp text-lg text-gold">{MASK_NAMES[accuserIndex]}</span>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center">
                <span className="font-display text-3xl text-on-surface-variant italic">vs</span>
              </div>

              {/* Accused */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full border-4 border-danger flex items-center justify-center text-5xl bg-surface shadow-[0_0_20px_rgba(139,26,26,0.4)]">
                    {MASKS[accusedIndex]}
                  </div>
                  <div className="absolute -top-3 -right-3 bg-danger text-white font-stamp px-2 py-0.5 text-xs">
                    ACCUSED
                  </div>
                </div>
                <span className="font-stamp text-lg text-danger">{MASK_NAMES[accusedIndex]}</span>
              </div>
            </div>

            {/* Claim info */}
            <p className="mt-8 font-body text-on-surface-variant italic">
              Claimed {lastClaimCount} {targetName(targetCard)}{lastClaimCount > 1 ? 's' : ''}
            </p>
          </motion.div>
        )}

        {/* PHASE: REVEALING */}
        {phase === 'revealing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 flex flex-col items-center gap-8"
          >
            <h2 className="font-display text-3xl text-on-surface-variant italic">Revealing cards...</h2>
            {/* Animated card flips */}
            <div className="flex gap-3">
              {Array.from({ length: lastClaimCount }, (_, i) => (
                <motion.div
                  key={i}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: [0, 90, 180, 270, 360] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                  className="w-16 h-24 rounded border-2 border-outline-variant bg-card-back shadow-lg"
                />
              ))}
            </div>
            <p className="font-mono text-xs text-text-muted animate-pulse">Decrypting via FHE network...</p>
          </motion.div>
        )}

        {/* PHASE: VERDICT — LIE CONFIRMED */}
        {phase === 'verdict-lie' && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 10 }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            <motion.h1
              animate={{ x: [0, -3, 3, -2, 2, 0] }}
              transition={{ duration: 0.5 }}
              className="font-display text-6xl text-danger uppercase font-black"
              style={{ textShadow: '0 0 20px rgba(233,69,96,0.8)' }}
            >
              CAUGHT LYING!
            </motion.h1>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border-4 border-danger flex items-center justify-center text-3xl bg-surface glow-danger">
                {MASKS[accusedIndex]}
              </div>
              <div className="text-left">
                <p className="font-stamp text-xl text-danger">{MASK_NAMES[accusedIndex]}</p>
                <p className="font-body text-on-surface-variant">must face the revolver</p>
              </div>
            </div>
            {/* Fake revealed cards with X marks */}
            <div className="flex gap-2 mt-4">
              {Array.from({ length: lastClaimCount }, (_, i) => (
                <div key={i} className="w-14 h-20 rounded border-2 border-danger bg-card-face/10 flex items-center justify-center">
                  <span className="text-2xl text-danger">✗</span>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-text-muted mt-4 animate-pulse">tap to continue</p>
          </motion.div>
        )}

        {/* PHASE: VERDICT — ALL VALID (false accusation) */}
        {phase === 'verdict-valid' && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 10 }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            <h1 className="font-display text-6xl text-secondary uppercase font-black"
              style={{ textShadow: '0 0 20px rgba(171,207,184,0.5)' }}
            >
              ALL VALID ✓
            </h1>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border-4 border-danger flex items-center justify-center text-3xl bg-surface glow-danger">
                {MASKS[accuserIndex]}
              </div>
              <div className="text-left">
                <p className="font-stamp text-xl text-danger">{MASK_NAMES[accuserIndex]}</p>
                <p className="font-body text-on-surface-variant">false accusation — must face the revolver</p>
              </div>
            </div>
            {/* Fake revealed cards with checkmarks */}
            <div className="flex gap-2 mt-4">
              {Array.from({ length: lastClaimCount }, (_, i) => (
                <div key={i} className="w-14 h-20 rounded border-2 border-secondary bg-card-face/10 flex items-center justify-center">
                  <span className="text-2xl text-secondary">✓</span>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-text-muted mt-4 animate-pulse">tap to continue</p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
