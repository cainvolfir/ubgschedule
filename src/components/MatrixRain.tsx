import { useEffect, useRef } from 'react';

/**
 * Matrix-style binary rain background.
 * Fills the entire screen with falling 0s and 1s.
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
    let fontSize = 14;
    let columns = 0;

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      fontSize = 13;
      columns = Math.ceil(canvas.width / fontSize);
      // Initialize drops at random Y positions above the screen
      drops = new Array(columns).fill(0).map(() => Math.random() * -100);
    };

    init();
    window.addEventListener('resize', init);

    const draw = () => {
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
        for (let j = 0; j < 8; j++) {
          const trailY = y - j * fontSize;
          if (trailY < 0) break;

          const char = Math.random() > 0.5 ? '1' : '0';
          // Fade from bright head to dim tail — more visible on mobile
          const alpha = j === 0 ? 0.18 : Math.max(0.02, 0.06 - j * 0.005);
          ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
          ctx.fillText(char, x, trailY);
        }

        // Reset drop to top when it goes off screen
        if (y > canvas.height + 8 * fontSize && Math.random() > 0.98) {
          drops[i] = 0;
        } else {
          drops[i]++;
        }
      }

      animationId = requestAnimationFrame(draw);
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
