import React, { useEffect, useState } from 'react';

interface WindParticle {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

export const HarmattanEffect: React.FC = () => {
  const [particles, setParticles] = useState<WindParticle[]>([]);

  useEffect(() => {
    const wind: WindParticle[] = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: Math.random() * -10, // start slightly offscreen left
      size: Math.random() * 4 + 2, // px
      delay: Math.random() * -10, // seconds
      duration: Math.random() * 8 + 6, // seconds
      opacity: Math.random() * 0.25 + 0.1
    }));
    setParticles(wind);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bg-amber-500 rounded-full"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            top: `${Math.random() * 100}%`,
            animation: `blow-wind ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
            filter: 'blur(1px)'
          }}
        />
      ))}
      <style>{`
        @keyframes blow-wind {
          0% {
            transform: translateX(0) translateY(0) scale(0.8);
          }
          50% {
            transform: translateX(60vw) translateY(-5vh) scale(1.2);
          }
          100% {
            transform: translateX(115vw) translateY(5vh) scale(0.8);
          }
        }
      `}</style>
    </div>
  );
};
