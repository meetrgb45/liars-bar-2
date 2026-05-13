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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={outcome ? onDismiss : undefined}
        >
          {spinning && !outcome && (
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 0.5, ease: 'linear' }}
              className="text-8xl"
            >
              🔫
            </motion.div>
          )}

          {outcome === 'click' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <div className="text-9xl mb-4">😮‍💨</div>
              <div className="text-5xl font-bold text-green-400">CLICK</div>
              <p className="text-gray-400 mt-4 text-sm">Tap to continue</p>
            </motion.div>
          )}

          {outcome === 'bang' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              className="text-center"
            >
              <div className="text-9xl mb-4">💥</div>
              <div className="text-5xl font-bold text-bar-danger">BANG!</div>
              <p className="text-gray-400 mt-4 text-sm">Tap to continue</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
