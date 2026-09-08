// Eenvoudige pianoklank en metronoom via Web Audio.
// Bedoeld om voor te spelen; het echte geluid komt uit je piano.

let ctx = null;
let bus = null;

function zorgVoorContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    bus = ctx.createGain();
    bus.gain.value = 0.5;
    bus.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function wek() {
  zorgVoorContext();
}

const frequentie = (p) => 440 * Math.pow(2, (p - 69) / 12);

/** Speel één toon. duur in seconden. */
export function toon(p, duur = 0.6, sterkte = 0.8) {
  const c = zorgVoorContext();
  const t0 = c.currentTime;
  const f = frequentie(p);

  const uit = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(7000, f * 8), t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2.2), t0 + 0.35);
  filter.connect(uit);
  uit.connect(bus);

  // grondtoon plus twee boventonen geeft net genoeg 'piano'
  const delen = [[1, 1.0], [2, 0.32], [3, 0.12]];
  for (const [veelvoud, aandeel] of delen) {
    const osc = c.createOscillator();
    osc.type = veelvoud === 1 ? 'triangle' : 'sine';
    osc.frequency.value = f * veelvoud;
    osc.detune.value = (Math.random() - 0.5) * 6;
    const g = c.createGain();
    g.gain.value = aandeel;
    osc.connect(g);
    g.connect(filter);
    osc.start(t0);
    osc.stop(t0 + duur + 0.4);
  }

  const top = 0.28 * sterkte;
  uit.gain.setValueAtTime(0.0001, t0);
  uit.gain.exponentialRampToValueAtTime(top, t0 + 0.008);
  uit.gain.exponentialRampToValueAtTime(top * 0.35, t0 + 0.18);
  uit.gain.exponentialRampToValueAtTime(0.0001, t0 + duur + 0.3);
}

/** Metronoomtik. Sterk op de eerste tel van de maat. */
export function tik(sterk = false) {
  const c = zorgVoorContext();
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'square';
  osc.frequency.value = sterk ? 1600 : 1050;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(sterk ? 0.16 : 0.08, t0 + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
  osc.connect(g);
  g.connect(bus);
  osc.start(t0);
  osc.stop(t0 + 0.09);
}
