"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { runSparkles } from "./sparkles";

// The celebration timeline, in one place. CSS reads these as variables.
export const WAND_MS = 1600;
export const TAP_MS = Math.round(WAND_MS * 0.7); // the tap is at 70% of the wand-swoop keyframes
const TWINKLE_MS = 2400;
const SPILL_PX = 48; // sparkles may fly this far past the mural's edge
const REDUCED_MOTION_MS = 1200;

type MuralMagicProps = {
  onDone: () => void;
};

// Sits on top of the mural: the wand swoops in and taps the centre, a ring
// of light bursts out, and sparkles fill the wall. Purely decorative, so it
// is hidden from screen readers (the live region announces completion).
export function MuralMagic({ onDone }: MuralMagicProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep the latest onDone in a ref so the effect below runs only once.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // People who turned on "reduce motion" get the gold glow, no particles.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = setTimeout(() => onDoneRef.current(), REDUCED_MOTION_MS);
      return () => clearTimeout(timer);
    }

    // runSparkles returns a stop function; returning it from the effect
    // means React stops the animation if this component disappears.
    return runSparkles(canvas, {
      startAfterMs: TAP_MS,
      twinkleForMs: TWINKLE_MS,
      spillPx: SPILL_PX,
      onDone: () => onDoneRef.current(),
    });
  }, []);

  const timing = {
    "--wand-duration": `${WAND_MS}ms`,
    "--magic-tap": `${TAP_MS}ms`,
    "--magic-spill": `${SPILL_PX}px`,
  } as CSSProperties;

  return (
    <div className="magic-layer" style={timing} aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <span className="magic-ring" />
      <svg className="magic-wand" viewBox="0 0 140 140">
        <defs>
          <linearGradient id="wand-shaft" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--ink-strong)" }} />
            <stop offset="1" style={{ stopColor: "var(--surface-raised)" }} />
          </linearGradient>
        </defs>
        <line x1="22" y1="22" x2="130" y2="130" stroke="url(#wand-shaft)" strokeWidth="6" strokeLinecap="round" />
        {/* The star tip, centred on (12, 12) */}
        <path className="fill-magic" d="M12 0 L15 9 L24 12 L15 15 L12 24 L9 15 L0 12 L9 9 Z" />
      </svg>
    </div>
  );
}
