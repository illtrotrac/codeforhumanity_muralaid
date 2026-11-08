// A magic "ting", synthesised with the Web Audio API, so there's no sound
// file to download or license.
//
// Browsers only allow audio that starts from a user action, so call this
// directly inside a click handler. The delay is scheduled on the audio
// clock, which keeps the sound in sync with the wand's tap.

let audioContext: AudioContext | null = null;

// A bell sound is several high notes ringing together. Each one starts a
// little later and is quieter, which gives the shimmer.
const PARTIALS = [
  { frequency: 1568, offset: 0 }, // G6
  { frequency: 2349, offset: 0.05 }, // D7
  { frequency: 3136, offset: 0.1 }, // G7
  { frequency: 4186, offset: 0.16 }, // C8
];

export function playChime(delaySeconds = 0) {
  audioContext ??= new AudioContext();
  const ctx = audioContext;
  void ctx.resume();

  const master = ctx.createGain();
  master.gain.value = 0.18; // overall volume
  master.connect(ctx.destination);

  const start = ctx.currentTime + delaySeconds;

  PARTIALS.forEach(({ frequency, offset }, i) => {
    const t = start + offset;
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    // Envelope: near-silent, a sharp strike, then a long ring-out.
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(1 / (i + 1), t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);

    oscillator.connect(gain).connect(master);
    oscillator.start(t);
    oscillator.stop(t + 1.7);
  });
}
