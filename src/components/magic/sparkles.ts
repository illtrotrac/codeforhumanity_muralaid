// A small canvas particle system for the mural-complete celebration.
// Plain TypeScript, no React: it draws frames until every particle has faded.

type Particle = {
  x: number;
  y: number;
  vx: number; // velocity, in px per frame at 60fps
  vy: number;
  gravity: number;
  age: number; // in frames
  life: number;
  size: number;
  spin: number;
  color: string;
};

type SparkleOptions = {
  startAfterMs: number; // when the wand taps
  twinkleForMs: number; // how long new sparkles keep appearing after the tap
  spillPx: number; // the canvas is bigger than the mural by this much on every side
  onDone: () => void;
};

// Colours come from the design tokens, so the palette lives in one place.
function readSparkleColors(): string[] {
  const styles = getComputedStyle(document.documentElement);
  return ["--sparkle-1", "--sparkle-2", "--sparkle-3", "--sparkle-4"]
    .map((name) => styles.getPropertyValue(name).trim())
    .filter(Boolean);
}

// A four-pointed star: alternate between long and short points around a circle.
function drawStar(ctx: CanvasRenderingContext2D, p: Particle, alpha: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.spin);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = p.size * 3;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const radius = i % 2 === 0 ? p.size : p.size * 0.28;
    const angle = (i * Math.PI) / 4;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Starts the animation and returns a function that stops it early.
export function runSparkles(canvas: HTMLCanvasElement, options: SparkleOptions): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    options.onDone();
    return () => {};
  }

  // Draw at the screen's real pixel density so stars stay crisp on retina screens.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const colors = readSparkleColors();
  const pick = () => colors[Math.floor(Math.random() * colors.length)];
  const centerX = width / 2;
  const centerY = height / 2;
  const particles: Particle[] = [];

  // The burst: stars fly out in every direction from the wand's tap point.
  function spawnBurst() {
    for (let i = 0; i < 140; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 6;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.04,
        age: 0,
        life: 50 + Math.random() * 50,
        size: 2 + Math.random() * 4,
        spin: Math.random() * Math.PI,
        color: pick(),
      });
    }
  }

  // The shimmer: small stars appear all over the mural and drift upwards.
  function spawnTwinkle() {
    const s = options.spillPx;
    particles.push({
      x: s + Math.random() * (width - 2 * s),
      y: s + Math.random() * (height - 2 * s),
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.3 - Math.random() * 0.6,
      gravity: 0,
      age: 0,
      life: 40 + Math.random() * 40,
      size: 1.5 + Math.random() * 3,
      spin: Math.random() * Math.PI,
      color: pick(),
    });
  }

  const start = performance.now();
  let last = start;
  let burstDone = false;
  let frameId = 0;

  function frame(now: number) {
    // dt = how many 60fps frames have passed, so speed is the same on 120Hz screens.
    const dt = Math.min((now - last) / (1000 / 60), 3);
    last = now;
    const elapsed = now - start;
    const tapped = elapsed >= options.startAfterMs;
    const twinkling = tapped && elapsed < options.startAfterMs + options.twinkleForMs;

    if (tapped && !burstDone) {
      spawnBurst();
      burstDone = true;
    }
    if (twinkling) for (let i = 0; i < 3; i++) spawnTwinkle();

    ctx!.clearRect(0, 0, width, height);
    ctx!.globalCompositeOperation = "lighter"; // overlapping stars add up to brighter light

    // Loop backwards so removing a dead particle doesn't skip the next one.
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        particles.splice(i, 1);
        continue;
      }
      const drag = Math.pow(0.96, dt);
      p.vx *= drag;
      p.vy = p.vy * drag + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spin += 0.05 * dt;

      // Fade in quickly, fade out slowly, and flicker a little.
      const t = p.age / p.life;
      const fade = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
      const flicker = 0.7 + 0.3 * Math.sin(p.age * 0.5);
      drawStar(ctx!, p, fade * flicker);
    }

    if (burstDone && !twinkling && particles.length === 0) {
      options.onDone();
      return;
    }
    frameId = requestAnimationFrame(frame);
  }

  frameId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(frameId);
}
