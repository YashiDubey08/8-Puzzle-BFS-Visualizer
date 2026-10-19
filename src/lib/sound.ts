// Tiny browser-generated sounds via Web Audio. Only created after user enables sound.
let ctx: AudioContext | null = null;
export function beep(freq = 520, dur = 0.06, vol = 0.05) {
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; o.type = "sine";
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* audio unavailable */ }
}
export function winSound() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.15, 0.06), i * 110)); }
