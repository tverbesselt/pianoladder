// MIDI-lezer in de browser. Zelfde opzet als tools/midi.py, zodat het
// gereedschap en de app dezelfde resultaten geven.

const latijn = new TextDecoder('latin1');

class Loper {
  constructor(d) { this.d = d; this.i = 0; }
  byte() { return this.d[this.i++]; }
  woord() { const v = (this.d[this.i] << 8) | this.d[this.i + 1]; this.i += 2; return v; }
  lang() {
    const v = (this.d[this.i] << 24 | this.d[this.i + 1] << 16 |
               this.d[this.i + 2] << 8 | this.d[this.i + 3]) >>> 0;
    this.i += 4;
    return v;
  }
  variabel() {
    let v = 0;
    for (;;) {
      const b = this.d[this.i++];
      v = (v << 7) | (b & 0x7f);
      if (!(b & 0x80)) return v;
    }
  }
  tekens(n) { const s = latijn.decode(this.d.subarray(this.i, this.i + n)); this.i += n; return s; }
}

export function lees(buffer) {
  const d = new Uint8Array(buffer);
  const l = new Loper(d);
  if (l.tekens(4) !== 'MThd') throw new Error('Dit is geen MIDI-bestand (kop ontbreekt).');
  l.lang();
  const formaat = l.woord();
  l.woord();                       // aantal sporen, we tellen ze zelf
  const div = l.woord();
  if (div & 0x8000) throw new Error('Dit bestand gebruikt SMPTE-tijdcode; die lees ik niet.');

  const tempi = [];
  let maatsoort = [4, 4];
  const sporen = [];

  while (l.i < d.length - 8) {
    if (latijn.decode(d.subarray(l.i, l.i + 4)) !== 'MTrk') { l.i++; continue; }
    l.i += 4;
    const lengte = l.lang();
    const eind = l.i + lengte;
    const spoor = { nr: sporen.length, naam: null, instr: {}, noten: [], lengte: 0 };
    const open = new Map();
    let t = 0;
    let vorigeStatus = null;

    while (l.i < eind) {
      t += l.variabel();
      if (l.i >= eind) break;
      let st = d[l.i];
      if (st < 0x80) {
        st = vorigeStatus;
        if (st === null) break;
      } else {
        l.i++;
        if (st < 0xf0) vorigeStatus = st;
      }
      const soort = st & 0xf0;
      const kanaal = st & 0x0f;

      if (st === 0xff) {
        const mt = l.byte();
        const n = l.variabel();
        const begin = l.i;
        if (mt === 0x03 && spoor.naam === null) spoor.naam = l.tekens(n).trim();
        else if (mt === 0x51 && n === 3) {
          tempi.push([t, (d[begin] << 16) | (d[begin + 1] << 8) | d[begin + 2]]);
          l.i += n;
        } else if (mt === 0x58 && n >= 2 && t === 0) {
          maatsoort = [d[begin], Math.pow(2, d[begin + 1])];
          l.i += n;
        } else l.i += n;
      } else if (st === 0xf0 || st === 0xf7) {
        l.i += l.variabel();
      } else if (soort === 0xc0 || soort === 0xd0) {
        const a = l.byte();
        if (soort === 0xc0) spoor.instr[kanaal] = a;
      } else if (soort === 0x80 || soort === 0x90 || soort === 0xa0 ||
                 soort === 0xb0 || soort === 0xe0) {
        const a = l.byte();
        const b = l.byte();
        const sleutel = kanaal * 128 + a;
        if (soort === 0x90 && b > 0) {
          if (!open.has(sleutel)) open.set(sleutel, []);
          open.get(sleutel).push([t, b]);
        } else if (soort === 0x80 || (soort === 0x90 && b === 0)) {
          const stapel = open.get(sleutel);
          if (stapel && stapel.length) {
            const [start, aanslag] = stapel.shift();
            if (t > start) spoor.noten.push({ start, eind: t, toon: a, aanslag, kanaal });
          }
        }
      } else break;
      spoor.lengte = Math.max(spoor.lengte, t);
    }

    for (const [sleutel, stapel] of open) {
      const a = sleutel % 128;
      const kanaal = (sleutel - a) / 128;
      for (const [start, aanslag] of stapel) {
        spoor.noten.push({ start, eind: start + div, toon: a, aanslag, kanaal });
      }
    }
    spoor.noten.sort((x, y) => x.start - y.start || x.toon - y.toon);
    sporen.push(spoor);
    l.i = eind;
  }

  if (!tempi.length) tempi.push([0, 500000]);
  tempi.sort((a, b) => a[0] - b[0]);
  return { formaat, div, maatsoort, tempi, sporen: splitsKanalen(sporen) };
}

/**
 * Sommige bestanden proppen de hele band op één spoor. Zo'n spoor knippen we
 * per MIDI-kanaal uit elkaar, anders valt er geen melodie uit te halen.
 */
function splitsKanalen(sporen) {
  const uit = [];
  for (const sp of sporen) {
    const kanalen = [...new Set(sp.noten.map((n) => n.kanaal))];
    if (kanalen.length <= 1) {
      sp.nr = uit.length;
      uit.push(sp);
      continue;
    }
    kanalen.sort((a, b) => a - b);
    for (const k of kanalen) {
      const noten = sp.noten.filter((n) => n.kanaal === k);
      if (!noten.length) continue;
      uit.push({
        nr: uit.length,
        naam: (sp.naam ? sp.naam + ' ' : '') + 'kanaal ' + (k + 1),
        instr: k in sp.instr ? { [k]: sp.instr[k] } : {},
        noten,
        lengte: sp.lengte,
      });
    }
  }
  return uit;
}

export const bpm = (m) => Math.round(60000000 / m.tempi[0][1] * 10) / 10;
export const naarTellen = (m, tick) => tick / m.div;
