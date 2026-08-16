import React, { useEffect, useState } from 'react';

interface Snowflake {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

export const SnowEffect: React.FC = () => {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    const flakes: Snowflake[] = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // percentage
      size: Math.random() * 5 + 3, // px
      delay: Math.random() * -15, // seconds (negative so they start pre-rendered)
      duration: Math.random() * 12 + 8, // seconds
      opacity: Math.random() * 0.7 + 0.3
    }));
    setSnowflakes(flakes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute bg-white rounded-full"
          style={{
            left: `${flake.left}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            top: '-10px',
            animation: `snowfall ${flake.duration}s linear infinite`,
            animationDelay: `${flake.delay}s`,
            filter: 'blur(0.5px)'
          }}
        />
      ))}
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(0) translateX(0);
          }
          33% {
            transform: translateY(33vh) translateX(10px);
          }
          66% {
            transform: translateY(66vh) translateX(-10px);
          }
          100% {
            transform: translateY(105vh) translateX(5px);
          }
        }
      `}</style>
    </div>
  );
};
