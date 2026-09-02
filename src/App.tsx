import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, X, RotateCcw, Trophy, Sparkles, Timer } from 'lucide-react';

type GameState = 'playing' | 'correct' | 'gameover';
type Difficulty = 'easy' | 'hard';

const ROUND_TIME_MS = 5000;

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function generateRound(difficulty: Difficulty) {
  const baseHue = Math.floor(Math.random() * 360);
  let options: string[];

  if (difficulty === 'easy') {
    const hueOffsets = [0, 90, 180, 270];
    const shuffled = [...hueOffsets].sort(() => Math.random() - 0.5);
    options = shuffled.map((offset) => {
      const h = (baseHue + offset) % 360;
      const s = 65 + Math.floor(Math.random() * 20);
      const l = 45 + Math.floor(Math.random() * 15);
      return hslToHex(h, s, l);
    });
  } else {
    const baseSat = 55 + Math.floor(Math.random() * 25);
    const baseLight = 45 + Math.floor(Math.random() * 15);
    options = [0, 1, 2, 3].map((i) => {
      const h = (baseHue + (i * 8 - 12) + Math.random() * 4) % 360;
      const s = baseSat + (Math.random() * 10 - 5);
      const l = baseLight + (Math.random() * 10 - 5);
      return hslToHex(h, s, l);
    });
  }

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const answer = options[Math.floor(Math.random() * options.length)];
  return { answer, options };
}

const HIGH_SCORE_KEY = 'hex-game-highscore';

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [round, setRound] = useState(() => generateRound('easy'));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [state, setState] = useState<GameState>('playing');
  const [picked, setPicked] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_MS);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const clearTimeout_ = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startTimer = useCallback(() => {
    clearTimer();
    setTimeLeft(ROUND_TIME_MS);
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      if (stateRef.current !== 'playing') return;
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, ROUND_TIME_MS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearTimer();
        setState('gameover');
      }
    }, 50);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    if (saved) setHighScore(parseInt(saved, 10) || 0);
  }, []);

  useEffect(() => {
    if (state === 'playing') {
      startTimer();
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [state, round, startTimer]);

  // Save high score on game over
  useEffect(() => {
    if (state === 'gameover' && score > highScore) {
      setHighScore(score);
      localStorage.setItem(HIGH_SCORE_KEY, String(score));
    }
  }, [state, score, highScore]);

  const switchDifficulty = (mode: Difficulty) => {
    if (mode === difficulty) return;
    clearTimer();
    clearTimeout_();
    setDifficulty(mode);
    setRound(generateRound(mode));
    setScore(0);
    setState('playing');
    setPicked(null);
  };

  const handlePick = useCallback(
    (color: string) => {
      if (state !== 'playing') return;
      setPicked(color);
      if (color === round.answer) {
        setState('correct');
        const newScore = score + 10;
        setScore(newScore);
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          setRound(generateRound(difficulty));
          setState('playing');
          setPicked(null);
        }, 700);
      } else {
        setState('gameover');
      }
    },
    [state, round, score, difficulty]
  );

  const restart = () => {
    clearTimer();
    clearTimeout_();
    setRound(generateRound(difficulty));
    setScore(0);
    setState('playing');
    setPicked(null);
  };

  const timePct = (timeLeft / ROUND_TIME_MS) * 100;
  const timeSec = (timeLeft / 1000).toFixed(1);
  const timerColor = timePct > 50 ? 'bg-green-400' : timePct > 25 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 transition-colors duration-700 pointer-events-none"
        style={{ backgroundColor: round.answer }}
      />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-6">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <h1 className="text-lg font-bold tracking-wide">HEX Hunter</h1>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">{highScore}</span>
          </div>
        </div>

        {/* Difficulty toggle */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
          <button
            onClick={() => switchDifficulty('easy')}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
              difficulty === 'easy'
                ? 'bg-green-500/20 text-green-400 ring-1 ring-green-400/40'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            Easy
          </button>
          <button
            onClick={() => switchDifficulty('hard')}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
              difficulty === 'hard'
                ? 'bg-red-500/20 text-red-400 ring-1 ring-red-400/40'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            Hard
          </button>
        </div>

        {/* Timer bar */}
        {state !== 'gameover' && (
          <div className="w-full max-w-md flex items-center gap-3">
            <Timer className="w-4 h-4 text-white/40 shrink-0" />
            <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-75 ease-linear ${timerColor}`}
                style={{ width: `${timePct}%` }}
              />
            </div>
            <span className="text-sm font-mono tabular-nums text-white/60 w-10 text-right">
              {timeSec}s
            </span>
          </div>
        )}

        {/* Score */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-1">Score</p>
            <p className="text-3xl font-bold tabular-nums">{score}</p>
          </div>
        </div>

        {/* HEX display */}
        <div className="flex flex-col items-center gap-4 mt-2">
          <p className="text-sm text-white/40 uppercase tracking-widest">Guess this color</p>
          <div
            className="text-5xl sm:text-7xl font-bold tracking-tight font-mono transition-all duration-300"
            style={{
              textShadow: `0 0 40px ${round.answer}80`,
            }}
          >
            {round.answer}
          </div>
        </div>

        {/* Feedback */}
        <div className="h-8 flex items-center">
          {state === 'correct' && (
            <div className="flex items-center gap-2 text-green-400 animate-[fadeIn_0.2s_ease]">
              <Check className="w-5 h-5" />
              <span className="font-semibold">ถูกต้อง! +10</span>
            </div>
          )}
          {state === 'gameover' && (
            <div className="flex items-center gap-2 text-red-400 animate-[shake_0.4s_ease-in-out]">
              <X className="w-5 h-5" />
              <span className="font-semibold">Game Over</span>
            </div>
          )}
        </div>

        {/* Color options */}
        {state === 'gameover' ? (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-[fadeIn_0.3s_ease]">
            <div className="text-center">
              <p className="text-white/40 text-sm mb-1">คะแนนรวม</p>
              <p className="text-6xl font-bold tabular-nums">{score}</p>
              {score >= highScore && score > 0 && (
                <p className="text-amber-400 text-sm font-semibold mt-2 flex items-center justify-center gap-1">
                  <Trophy className="w-4 h-4" /> สถิติใหม่!
                </p>
              )}
            </div>
            <button
              onClick={restart}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-white text-black font-semibold hover:bg-white/90 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              เล่นอีกครั้ง
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 xs:gap-4 sm:gap-5 w-full max-w-xs xs:max-w-sm sm:max-w-md">
            {round.options.map((color) => {
              const isAnswer = color === round.answer;
              const isPicked = picked === color;
              let ringClass = 'ring-white/10 hover:ring-white/40 hover:scale-[1.03]';
              if (state === 'correct' && isAnswer) {
                ringClass = 'ring-green-400 scale-[1.03]';
              } else if (state === 'gameover' && isAnswer) {
                ringClass = 'ring-green-400';
              } else if (state === 'gameover' && isPicked) {
                ringClass = 'ring-red-400';
              }
              return (
                <button
                  key={color}
                  onClick={() => handlePick(color)}
                  disabled={state !== 'playing'}
                  className={`aspect-square rounded-xl xs:rounded-2xl ring-2 ${ringClass} transition-all duration-200 shadow-lg ${state === 'playing' ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 8px 32px ${color}40`,
                  }}
                  aria-label={`เลือกสี ${color}`}
                />
              );
            })}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 max-w-md text-center text-sm text-white/40 leading-relaxed">
          <p className="font-semibold text-white/60 mb-1">วิธีเล่น</p>
          ดูรหัสสี HEX ที่แสดงด้านบน แล้วเลือกปุ่มสีที่ตรงกับรหัสนั้น
          มีเวลา 5 วินาทีต่อข้อ ตอบถูกจะได้ 10 คะแนนและเข้าสู่ข้อถัดไป
          ตอบผิดหรือหมดเวลาจะจบเกมทันที
          {difficulty === 'easy'
            ? ' โหมด Easy: สีตัวเลือกมีความต่างกันชัดเจน'
            : ' โหมด Hard: สีตัวเลือกเป็นเฉดสีที่ใกล้เคียงกันมาก'}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
