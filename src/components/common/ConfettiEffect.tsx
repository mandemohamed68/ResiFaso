import React, { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  left: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  angle: number;
}

export const ConfettiEffect: React.FC = () => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const colors = ['#ef4444', '#10b981', '#fbbf24', '#3b82f6', '#ec4899'];
    const list: ConfettiPiece[] = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * -10,
      duration: Math.random() * 6 + 4,
      angle: Math.random() * 360
    }));
    setPieces(list);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.5}px`,
            backgroundColor: p.color,
            top: '-20px',
            borderRadius: '2px',
            transform: `rotate(${p.angle}deg)`,
            animation: `fall-confetti ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
            opacity: 0.8
          }}
        />
      ))}
      <style>{`
        @keyframes fall-confetti {
          0% {
            transform: translateY(0) rotate(0deg) translateX(0);
          }
          50% {
            transform: translateY(50vh) rotate(180deg) translateX(25px);
          }
          100% {
            transform: translateY(105vh) rotate(360deg) translateX(-10px);
          }
        }
      `}</style>
    </div>
  );
};
