import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

export default function Timer() {
  const state = useGameStore((s) => s.state);
  const currentTurnIndex = useGameStore((s) => s.currentTurnIndex);
  const [timeLeft, setTimeLeft] = useState(30);

  // Reset timer on turn/state change
  useEffect(() => {
    setTimeLeft(30);
  }, [state, currentTurnIndex]);

  // Countdown
  useEffect(() => {
    if (state === 'WaitingForPlayers' || state === 'GameOver') return;
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [state, currentTurnIndex]);

  if (state === 'WaitingForPlayers' || state === 'GameOver') return null;

  const isLow = timeLeft <= 10;

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isLow ? 'bg-bar-danger' : 'bg-bar-gold'}`}
          style={{ width: `${(timeLeft / 30) * 100}%` }}
        />
      </div>
      <span className={`text-sm font-mono ${isLow ? 'text-bar-danger animate-pulse' : 'text-gray-400'}`}>
        {timeLeft}s
      </span>
    </div>
  );
}
