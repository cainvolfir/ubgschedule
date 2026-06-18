import { useEffect, useRef } from 'react';

/**
 * Matrix-style binary rain background.
 * Very slow, subtle, safe for photosensitive users.
 */
export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let drops: number[] = [];
    let fontSize = 13;
    let columns = 0;
    let lastTime = 0;
    const fps = 8; // Very slow — 8 frames per second
    const interval = 1000 / fps;

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      fontSize = 13;
      columns = Math.ceil(canvas.width / fontSize);
      if (drops.length === 0) {
        drops = new Array(columns).fill(0).map(() => Math.random() * -100);
      }
    };

    init();
    window.addEventListener('resize', init);

    const draw = (timestamp: number) => {
      animationId = requestAnimationFrame(draw);

      const delta = timestamp - lastTime;
      if (delta < interval) return;
      lastTime = timestamp - (delta % interval);

      // Fully clear the canvas each frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fill with background color
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Draw a trail of fading characters above the head
        for (let j = 0; j < 6; j++) {
          const trailY = y - j * fontSize;
          if (trailY < 0) break;

          const char = Math.random() > 0.5 ? '1' : '0';
          // Fade from bright head to dim tail
          const alpha = j === 0 ? 0.15 : Math.max(0.015, 0.05 - j * 0.006);
          ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
          ctx.fillText(char, x, trailY);
        }

        // Very slow movement — only move every few frames
        if (y > canvas.height + 6 * fontSize && Math.random() > 0.99) {
          drops[i] = 0;
        } else {
          drops[i] += 0.3; // Very slow — 0.3px per frame at 8fps = 2.4px/second
        }
      }
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}
