import React, { useEffect, useRef } from 'react';

export interface CanvasEffectOptions {
  snow?: boolean;
  rain?: boolean;
  harmattan?: boolean;
  confetti?: boolean;
  hearts?: boolean;
  stars?: boolean;
  petals?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  rotation?: number;
  rotationSpeed?: number;
  type: 'snow' | 'rain' | 'splash' | 'harmattan' | 'confetti' | 'star' | 'heart' | 'petal' | 'moon';
  life?: number;
  maxLife?: number;
  aspectRatio?: number;
  waveOffset?: number;
  waveSpeed?: number;
}

export const EventCanvasEffects: React.FC<CanvasEffectOptions> = ({
  snow = false,
  rain = false,
  harmattan = false,
  confetti = false,
  hearts = false,
  stars = false,
  petals = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(performance.now());

  const hasAnyEffect = snow || rain || harmattan || confetti || hearts || stars || petals;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasAnyEffect) {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
      particlesRef.current = [];
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Initialize particles according to active toggles
    const particles: Particle[] = [];

    if (snow) {
      const count = Math.min(60, Math.floor((width * height) / 25000) + 25);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: Math.random() * 1.2 + 0.8,
          size: Math.random() * 3.5 + 1.5,
          color: '#ffffff',
          opacity: Math.random() * 0.6 + 0.3,
          type: 'snow',
          waveOffset: Math.random() * Math.PI * 2,
          waveSpeed: Math.random() * 0.02 + 0.01
        });
      }
    }

    if (rain) {
      const count = Math.min(70, Math.floor((width * height) / 20000) + 30);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * (width + 200) - 100,
          y: Math.random() * height,
          vx: 1.5 + Math.random() * 1.0, // slanted wind
          vy: Math.random() * 7 + 10, // fast rain drop
          size: Math.random() * 15 + 12, // streak length
          color: '#38bdf8',
          opacity: Math.random() * 0.4 + 0.25,
          type: 'rain'
        });
      }
    }

    if (harmattan) {
      const count = Math.min(80, Math.floor((width * height) / 18000) + 35);
      const colors = ['#f59e0b', '#d97706', '#fbbf24', '#b45309', '#eab308'];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.random() * 3.5 + 2.0, // horizontal Saharan sweep
          vy: (Math.random() - 0.4) * 0.8,
          size: Math.random() * 3.0 + 1.0,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.45 + 0.15,
          type: 'harmattan',
          waveOffset: Math.random() * Math.PI * 2,
          waveSpeed: Math.random() * 0.03 + 0.01
        });
      }
    }

    if (confetti) {
      const count = Math.min(50, Math.floor((width * height) / 30000) + 20);
      const colors = ['#16a34a', '#dc2626', '#fbbf24', '#3b82f6', '#ec4899', '#8b5cf6'];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 1.8 + 1.2,
          size: Math.random() * 6 + 4,
          aspectRatio: Math.random() * 0.6 + 0.4,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.7 + 0.3,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.08,
          type: Math.random() > 0.3 ? 'confetti' : 'star',
          waveOffset: Math.random() * Math.PI * 2,
          waveSpeed: Math.random() * 0.03 + 0.01
        });
      }
    }

    if (hearts) {
      const count = Math.min(30, Math.floor((width * height) / 45000) + 15);
      const heartColors = ['#f43f5e', '#ec4899', '#fb7185', '#fda4af', '#e11d48'];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: height + Math.random() * 200,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -(Math.random() * 0.9 + 0.6), // rising upwards
          size: Math.random() * 12 + 8,
          color: heartColors[Math.floor(Math.random() * heartColors.length)],
          opacity: Math.random() * 0.5 + 0.3,
          rotation: (Math.random() - 0.5) * 0.4,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          type: 'heart',
          waveOffset: Math.random() * Math.PI * 2,
          waveSpeed: Math.random() * 0.02 + 0.01
        });
      }
    }

    if (stars) {
      const count = Math.min(35, Math.floor((width * height) / 40000) + 18);
      const starColors = ['#fde047', '#facc15', '#fef08a', '#eab308', '#ffffff'];
      for (let i = 0; i < count; i++) {
        const isMoon = i === 0;
        particles.push({
          x: isMoon ? width * 0.85 : Math.random() * width,
          y: isMoon ? 90 : Math.random() * height * 0.7,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: isMoon ? 22 : Math.random() * 7 + 4,
          color: isMoon ? '#fbbf24' : starColors[Math.floor(Math.random() * starColors.length)],
          opacity: isMoon ? 0.85 : Math.random() * 0.6 + 0.3,
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 0.015,
          type: isMoon ? 'moon' : 'star',
          waveOffset: Math.random() * Math.PI * 2,
          waveSpeed: Math.random() * 0.04 + 0.02
        });
      }
    }

    if (petals) {
      const count = Math.min(40, Math.floor((width * height) / 35000) + 18);
      const petalColors = ['#fbcfe8', '#f472b6', '#fda4af', '#f9a8d4', '#fdf2f8'];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * (width + 100) - 50,
          y: Math.random() * height,
          vx: Math.random() * 1.2 + 0.6,
          vy: Math.random() * 1.1 + 0.8,
          size: Math.random() * 7 + 5,
          aspectRatio: Math.random() * 0.4 + 0.5,
          color: petalColors[Math.floor(Math.random() * petalColors.length)],
          opacity: Math.random() * 0.6 + 0.3,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.03,
          type: 'petal',
          waveOffset: Math.random() * Math.PI * 2,
          waveSpeed: Math.random() * 0.025 + 0.015
        });
      }
    }

    particlesRef.current = particles;

    // Helper functions for custom vector drawing
    const drawHeart = (c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha: number, rot: number) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.globalAlpha = alpha;
      c.fillStyle = color;
      c.beginPath();
      const topCurveHeight = size * 0.3;
      c.moveTo(0, topCurveHeight);
      // top left curve
      c.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
      // bottom left curve
      c.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, (size + topCurveHeight) / 1.4, 0, size);
      // bottom right curve
      c.bezierCurveTo(0, (size + topCurveHeight) / 1.4, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
      // top right curve
      c.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
      c.closePath();
      c.fill();
      c.restore();
    };

    const draw4PointStar = (c: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha: number, rot: number) => {
      c.save();
      c.translate(cx, cy);
      c.rotate(rot);
      c.globalAlpha = alpha;
      c.fillStyle = color;
      c.beginPath();
      const inner = r * 0.25;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const aNext = a + Math.PI / 4;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        c.lineTo(Math.cos(aNext) * inner, Math.sin(aNext) * inner);
      }
      c.closePath();
      c.fill();
      c.restore();
    };

    const drawCrescentMoon = (c: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha: number) => {
      c.save();
      c.translate(cx, cy);
      c.globalAlpha = alpha;
      c.fillStyle = color;
      c.beginPath();
      c.arc(0, 0, r, 0.2 * Math.PI, 1.8 * Math.PI, false);
      c.bezierCurveTo(r * 0.3, -r * 0.7, r * 0.3, r * 0.7, Math.cos(0.2 * Math.PI) * r, Math.sin(0.2 * Math.PI) * r);
      c.closePath();
      c.fill();
      c.restore();
    };

    const drawPetal = (c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha: number, rot: number) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.globalAlpha = alpha;
      c.fillStyle = color;
      c.beginPath();
      c.ellipse(0, 0, size * 0.6, size, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    // Main 60 FPS Render Loop
    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      const parts = particlesRef.current;
      const newSplashes: Particle[] = [];

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];

        if (p.type === 'snow') {
          p.waveOffset = (p.waveOffset || 0) + (p.waveSpeed || 0.02);
          p.x += p.vx + Math.sin(p.waveOffset) * 0.5;
          p.y += p.vy;

          if (p.y > height + 10) {
            p.y = -10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;

          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'rain') {
          p.x += p.vx;
          p.y += p.vy;

          // If drop hits the bottom region, spawn a gentle ripple splash
          if (p.y >= height - 30 && Math.random() < 0.25) {
            newSplashes.push({
              x: p.x,
              y: height - 10 - Math.random() * 15,
              vx: 0,
              vy: 0,
              size: 2,
              color: '#38bdf8',
              opacity: 0.5,
              type: 'splash',
              life: 0,
              maxLife: 20
            });
          }

          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * (width + 200) - 100;
          }

          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2.5, p.y - p.size);
          ctx.stroke();
          ctx.restore();
        } else if (p.type === 'splash') {
          p.life = (p.life || 0) + 1;
          p.size += 0.8;
          p.opacity = 0.5 * (1 - (p.life / (p.maxLife || 20)));

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 2, p.size * 0.7, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (p.type === 'harmattan') {
          p.waveOffset = (p.waveOffset || 0) + (p.waveSpeed || 0.02);
          p.x += p.vx;
          p.y += p.vy + Math.sin(p.waveOffset) * 0.4;

          if (p.x > width + 20) {
            p.x = -20;
            p.y = Math.random() * height;
          }

          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'confetti') {
          p.waveOffset = (p.waveOffset || 0) + (p.waveSpeed || 0.02);
          p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0.03);
          p.x += p.vx + Math.sin(p.waveOffset) * 0.7;
          p.y += p.vy;

          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -(p.size * (p.aspectRatio || 0.5)) / 2, p.size, p.size * (p.aspectRatio || 0.5));
          ctx.restore();
        } else if (p.type === 'star') {
          p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0.02);
          p.waveOffset = (p.waveOffset || 0) + (p.waveSpeed || 0.03);
          p.y += p.vy;

          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }

          const pulseOpacity = p.opacity * (0.7 + Math.sin(p.waveOffset) * 0.3);
          draw4PointStar(ctx, p.x, p.y, p.size, p.color, pulseOpacity, p.rotation);
        } else if (p.type === 'heart') {
          p.waveOffset = (p.waveOffset || 0) + (p.waveSpeed || 0.02);
          p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0.01);
          p.x += p.vx + Math.sin(p.waveOffset) * 0.8;
          p.y += p.vy; // rising up

          if (p.y < -30) {
            p.y = height + 20;
            p.x = Math.random() * width;
          }

          drawHeart(ctx, p.x, p.y, p.size, p.color, p.opacity, p.rotation);
        } else if (p.type === 'moon') {
          p.waveOffset = (p.waveOffset || 0) + 0.01;
          const pulse = p.opacity * (0.85 + Math.sin(p.waveOffset) * 0.15);
          drawCrescentMoon(ctx, p.x, p.y, p.size, p.color, pulse);
        } else if (p.type === 'petal') {
          p.waveOffset = (p.waveOffset || 0) + (p.waveSpeed || 0.02);
          p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0.02);
          p.x += p.vx + Math.sin(p.waveOffset) * 1.2;
          p.y += p.vy;

          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * (width + 100) - 50;
          }

          drawPetal(ctx, p.x, p.y, p.size, p.color, p.opacity, p.rotation);
        }
      }

      // Filter expired splashes and merge new ones (cap splashes to prevent performance degradation)
      const filtered = parts.filter(p => p.type !== 'splash' || ((p.life || 0) < (p.maxLife || 20)));
      if (newSplashes.length > 0 && filtered.length < 250) {
        particlesRef.current = [...filtered, ...newSplashes.slice(0, 10)];
      } else {
        particlesRef.current = filtered;
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    };
  }, [hasAnyEffect, snow, rain, harmattan, confetti, hearts, stars, petals]);

  if (!hasAnyEffect) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9998] select-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
