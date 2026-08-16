import React, { useEffect, useState } from 'react';

interface RainDrop {
  id: number;
  left: number;
  top: number;
  speed: number;
  opacity: number;
  length: number;
}

export const RainEffect: React.FC = () => {
  const [drops, setDrops] = useState<RainDrop[]>([]);

  useEffect(() => {
    const rainDrops: RainDrop[] = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // percentage
      top: Math.random() * -100, // start above screen
      speed: Math.random() * 1.5 + 1.0, // relative speed
      opacity: Math.random() * 0.3 + 0.15,
      length: Math.random() * 15 + 15 // px height
    }));
    setDrops(rainDrops);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      {drops.map((drop) => (
        <div
          key={drop.id}
          className="absolute w-[1px] bg-sky-400"
          style={{
            left: `${drop.left}%`,
            height: `${drop.length}px`,
            opacity: drop.opacity,
            top: '-50px',
            animation: `fall-rain ${drop.speed}s linear infinite`,
            transform: 'rotate(15deg)', // slanted rain
          }}
        />
      ))}
      <style>{`
        @keyframes fall-rain {
          0% {
            transform: translateY(-50px) translateX(0) rotate(15deg);
          }
          100% {
            transform: translateY(105vh) translateX(100px) rotate(15deg);
          }
        }
      `}</style>
    </div>
  );
};
