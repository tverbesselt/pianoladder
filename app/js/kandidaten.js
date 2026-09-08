// Welk spoor is de melodie, hoe moeilijk is het, en naar welke toonaard
// verschuiven we om zo min mogelijk zwarte toetsen over te houden?
// Zelfde regels als tools/analyse.py.

const GOED = /voc|lead|melod|sing|voice|solo|piano|synth|flute|organ|string|guit/i;
const SLECHT = /drum|perc|kick|snare|hat|tom|cymb|bass\b|bas\b/i;

const inBereik = (i, a, b) => i >= a && i < b;
const gmGoed = (i) => inBereik(i, 0, 8) || inBereik(i, 16, 24) || inBereik(i, 40, 48) ||
                      inBereik(i, 52, 55) || inBereik(i, 56, 80);
const gmBas = (i) => inBereik(i, 32, 40);

export function kenmerken(m, spoor) {
  const n = spoor.noten;
  if (!n.length) return null;
  let laag = 128;
  let hoog = 0;
  const starts = new Map();
  const kanalen = new Set();
  for (const x of n) {
    if (x.toon < laag) laag = x.toon;
    if (x.toon > hoog) hoog = x.toon;
    starts.set(x.start, (starts.get(x.start) || 0) + 1);
    kanalen.add(x.kanaal);
  }
  const eersteTick = n[0].start;
  const laatsteTick = Math.max(...n.map((x) => x.eind));
  const tellen = Math.max(1, (laatsteTick - eersteTick) / m.div);
  return {
    nr: spoor.nr,
    naam: spoor.naam || '',
    kanalen: [...kanalen].sort((a, b) => a - b),
    aantal: n.length,
    laag,
    hoog,
    bereik: hoog - laag,
    poly: Math.round((n.length / starts.size) * 100) / 100,
    dichtheid: Math.round((n.length / tellen) * 100) / 100,
    instr: [...new Set(Object.values(spoor.instr))],
    eersteTel: Math.round(eersteTick / m.div),
    tellen: Math.round(tellen),
  };
}

export function score(k) {
  if (k.kanalen.includes(9)) return -99;
  if (k.aantal < 20) return -99;
  if (k.bereik < 5) return -50;
  if (k.bereik > 30) return -20;
  let s = 0;
  if (GOED.test(k.naam)) s += 6;
  if (SLECHT.test(k.naam)) s -= 8;
  if (k.instr.some(gmGoed)) s += 2;
  if (k.instr.some(gmBas)) s -= 5;
  if (k.poly < 1.15) s += 5;
  else if (k.poly > 2.5) s -= 4;
  if (k.laag >= 55 && k.laag <= 72) s += 3;
  if (k.bereik >= 12 && k.bereik <= 24) s += 3;
  if (k.dichtheid > 4) s -= 6;
  return Math.round(s * 10) / 10;
}

/** De beste melodiesporen, beste eerst. */
export function kandidaten(m, top = 5) {
  const uit = [];
  for (const sp of m.sporen) {
    const k = kenmerken(m, sp);
    if (!k) continue;
    k.score = score(k);
    uit.push(k);
  }
  uit.sort((a, b) => b.score - a.score);
  return uit.filter((k) => k.score > -50).slice(0, top);
}

/** Het spoor dat het meest op een bas lijkt: laag, eenstemmig, veel noten. */
export function basSpoor(m) {
  let beste = null;
  for (const sp of m.sporen) {
    const k = kenmerken(m, sp);
    if (!k || k.kanalen.includes(9) || k.aantal < 20) continue;
    let s = 0;
    if (SLECHT.test(k.naam) && /bas/i.test(k.naam)) s += 8;
    if (k.instr.some(gmBas)) s += 6;
    if (k.hoog < 60) s += 5;
    if (k.poly < 1.3) s += 3;
    s -= k.laag / 12;
    if (!beste || s > beste.s) beste = { s, k, spoor: sp };
  }
  return beste && beste.s > 0 ? beste : null;
}

export function moeilijkheid(k, tempo) {
  let p = 0;
  p += k.bereik <= 12 ? 0 : k.bereik <= 17 ? 1 : 2;
  const nps = k.dichtheid * tempo / 60;
  p += nps <= 2 ? 0 : nps <= 3.5 ? 1 : 2;
  p += k.poly < 1.15 ? 0 : k.poly < 2 ? 1 : 2;
  return Math.min(5, 1 + p);
}

export const zwarteToetsen = (tonen) => {
  const zwart = new Set([1, 3, 6, 8, 10]);
  const gezien = new Set();
  for (const t of tonen) if (zwart.has(((t % 12) + 12) % 12)) gezien.add(((t % 12) + 12) % 12);
  return gezien.size;
};

/** Verschuiving tussen -6 en +6 met de minste zwarte toetsen. */
export function besteTranspositie(tonen) {
  let beste = 0;
  let minst = 99;
  for (let d = -6; d <= 6; d++) {
    const n = zwarteToetsen(tonen.map((t) => t + d));
    if (n < minst || (n === minst && Math.abs(d) < Math.abs(beste))) { beste = d; minst = n; }
  }
  return { verschuiving: beste, zwart: minst };
}
