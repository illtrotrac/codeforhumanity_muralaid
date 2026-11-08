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
      <Wand />
    </div>
  );
}

// A four-pointed sparkle with curved sides, centred on (cx, cy).
function sparkle(cx: number, cy: number, r: number) {
  return `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`;
}

// Our own wand, drawn in SVG: a tapered wooden handle with a gold band and
// a spray of sparkles. The tip sits at (12, 12), where the CSS expects it.
function Wand() {
  return (
    <svg className="magic-wand" viewBox="0 0 140 140">
      {/* Sparkles trailing from the tip */}
      <g className="wand-sparkles">
        <path d={sparkle(12, 12, 9)} />
        <path d={sparkle(30, 4, 4)} />
        <path d={sparkle(4, 32, 4.5)} />
        <path d={sparkle(34, 26, 3)} />
        <path d={sparkle(22, 40, 2.5)} />
      </g>
      {/* The handle: thin at the tip, fattening toward a rounded end */}
      <path className="wand-wood" d="M16 18 L20 14 L124 118 Q136 128 130 134 Q124 140 114 128 Z" />
      {/* A highlight along one edge, so it reads as round, not flat */}
      <path className="wand-shine" d="M19 15.5 L121 117.5" />
      {/* The gold band where your hand would hold it */}
      <path className="wand-band" d="M98 96 L104 90 L112 98 L106 104 Z" />
    </svg>
  );
}
