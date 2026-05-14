import { motion, AnimatePresence } from 'framer-motion';
import type { SpinOutcome } from '../../hooks/useSpin';

interface Props {
  outcome: SpinOutcome;
  spinning: boolean;
  onDismiss: () => void;
}

export default function SpinAnimation({ outcome, spinning, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {(spinning || outcome) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={outcome ? onDismiss : undefined}
        >
          {/* Background */}
          <div className={`absolute inset-0 ${outcome === 'bang' ? 'bg-danger-deep/90' : 'bg-bg-deep/90'} backdrop-blur-sm`} />

          {/* Spinning state */}
          {spinning && !outcome && (
            <motion.div className="relative z-10 text-center">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 0.4, ease: 'linear' }}
                className="text-8xl mb-6"
              >
                🔫
              </motion.div>
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="font-display text-2xl text-on-surface-variant italic"
              >
                Pulling the trigger...
              </motion.p>
              {/* Heartbeat border effect */}
              <motion.div
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute inset-0 border-4 border-danger rounded-full scale-150"
              />
            </motion.div>
          )}

          {/* CLICK — survived */}
          {outcome === 'click' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="relative z-10 text-center"
            >
              <div className="text-9xl mb-6">😮‍💨</div>
              <h2 className="font-display text-6xl italic text-on-surface-variant mb-4" style={{ textShadow: '0 0 20px rgba(171,207,184,0.5)' }}>
                *click*
              </h2>
              <p className="font-body text-lg text-text-muted">You live... for now.</p>
              <p className="font-mono text-[10px] text-text-muted mt-8 animate-pulse">tap to continue</p>
            </motion.div>
          )}

          {/* BANG — eliminated */}
          {outcome === 'bang' && (
            <motion.div
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 8 }}
              className="relative z-10 text-center"
            >
              {/* Flash effect */}
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-white"
              />
              <div className="text-9xl mb-6">💥</div>
              <motion.h2
                animate={{ x: [0, -5, 5, -3, 3, 0] }}
                transition={{ duration: 0.5 }}
                className="font-display text-7xl text-danger font-black uppercase"
                style={{ textShadow: '0 0 30px rgba(233,69,96,0.8)' }}
              >
                BANG!
              </motion.h2>
              <p className="font-body text-lg text-error mt-4">Eliminated.</p>
              <p className="font-mono text-[10px] text-text-muted mt-8 animate-pulse">tap to continue</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
