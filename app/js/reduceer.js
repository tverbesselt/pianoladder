// De vereenvoudigingsmotor: van een volledige band-MIDI naar iets wat een
// beginner met twee handen kan spelen.
//
//   trap 1  alleen de melodie, rechterhand
//   trap 2  melodie + één bastoon per maat
//   trap 3  melodie + grondtoon en kwint
//   trap 4  melodie + volledige drieklanken

import { naarTellen, bpm as leesBpm } from './midilezer.js';
import { basSpoor, zwarteToetsen, besteTranspositie } from './kandidaten.js';

const kwantiseer = (v, raster) => Math.round(v / raster) * raster;
const toonklasse = (p) => ((p % 12) + 12) % 12;

/** Leg een bastoon in een prettig linkerhandbereik. */
function inBasBereik(p) {
  while (p < 40) p += 12;
  while (p > 55) p -= 12;
  return p;
}

/** Alle noten van een spoor die binnen [van, tot) beginnen, in tellen. */
function inVenster(m, spoor, van, tot) {
  const uit = [];
  for (const n of spoor.noten) {
    const t = naarTellen(m, n.start);
    if (t < van - 1e-6 || t >= tot - 1e-6) continue;
    uit.push({ t, d: naarTellen(m, n.eind - n.start), p: n.toon, aanslag: n.aanslag });
  }
  return uit;
}

/** Per maat de grondtoon en of het majeur of mineur is. */
function akkoorden(m, van, tot, maat) {
  const bas = basSpoor(m);
  const bronnen = bas ? [bas.spoor] : m.sporen.filter(
    (sp) => sp.noten.length && !sp.noten.some((n) => n.kanaal === 9));

  const uit = [];
  for (let start = van; start < tot - 1e-6; start += maat) {
    const eind = Math.min(start + maat, tot);
    const gewicht = new Array(12).fill(0);
    const laagsteVan = new Array(12).fill(128);

    for (const sp of bronnen) {
      if (sp.noten.some((n) => n.kanaal === 9)) continue;
      for (const n of sp.noten) {
        const t = naarTellen(m, n.start);
        const e = naarTellen(m, n.eind);
        if (e <= start + 1e-6 || t >= eind - 1e-6) continue;
        const overlap = Math.min(e, eind) - Math.max(t, start);
        const tk = toonklasse(n.toon);
        gewicht[tk] += overlap;
        if (n.toon < laagsteVan[tk]) laagsteVan[tk] = n.toon;
      }
    }

    let grond = -1;
    let beste = 0;
    for (let i = 0; i < 12; i++) if (gewicht[i] > beste) { beste = gewicht[i]; grond = i; }
    if (grond < 0) { uit.push(null); continue; }

    // majeur of mineur: welke terts komt vaker voor?
    const groteTerts = gewicht[(grond + 4) % 12];
    const kleineTerts = gewicht[(grond + 3) % 12];
    const terts = groteTerts >= kleineTerts ? 4 : 3;

    const grondToon = laagsteVan[grond] < 128 ? inBasBereik(laagsteVan[grond])
                                              : inBasBereik(grond + 48);
    uit.push({ start, eind, grond: grondToon, terts });
  }
  return uit;
}

/**
 * Bouw een speelbaar liedje uit een MIDI.
 *
 * opties: { spoorNr, van, tot, trap, transp, octaaf, raster, maat, bpm,
 *           titel, artiest, bron, id, lus, stem }
 */
export function reduceer(m, opties) {
  const o = Object.assign({
    trap: 1, transp: 0, octaaf: 0, raster: 0.25, stem: 'hoog', lus: true,
  }, opties);
  const maat = o.maat || m.maatsoort[0] || 4;
  const tempo = o.bpm || leesBpm(m);
  const spoor = m.sporen[o.spoorNr];
  if (!spoor) throw new Error('Dat spoor bestaat niet.');

  // ---- rechterhand: de melodie ----
  let melodie = inVenster(m, spoor, o.van, o.tot);
  if (!melodie.length) {
    const eerste = spoor.noten.length ? naarTellen(m, spoor.noten[0].start) : 0;
    throw new Error('Hier staat niets in dit spoor — het begint pas op maat ' +
                    (Math.floor(eerste / maat) + 1) + '.');
  }

  if (o.stem !== 'alles' && o.trap < 4) {
    const perTijd = new Map();
    for (const n of melodie) {
      const sleutel = Math.round(n.t * 1000);
      const vorig = perTijd.get(sleutel);
      const beter = !vorig || (o.stem === 'laag' ? n.p < vorig.p : n.p > vorig.p);
      if (beter) perTijd.set(sleutel, n);
    }
    melodie = [...perTijd.values()];
  }

  const rechts = melodie.map((n) => ({
    t: Math.round(kwantiseer(n.t - o.van, o.raster) * 1000) / 1000,
    d: Math.round(Math.max(o.raster, kwantiseer(n.d, o.raster)) * 1000) / 1000,
    p: n.p,
    h: 'R',
  }));

  // ---- verschuiving bepalen, op basis van de melodie ----
  let verschuiving = o.transp;
  if (o.transp === 'auto') {
    verschuiving = besteTranspositie(rechts.map((n) => n.p)).verschuiving;
  }
  const schuif = verschuiving + 12 * o.octaaf;
  for (const n of rechts) n.p += schuif;

  // ---- linkerhand ----
  // De grondtoon wordt eerst verschoven en dan pas in het linkerhandbereik
  // gelegd, anders zakt hij bij een grote verschuiving door de bodem.
  const links = [];
  if (o.trap >= 2) {
    for (const a of akkoorden(m, o.van, o.tot, maat)) {
      if (!a) continue;
      const t = Math.round((a.start - o.van) * 1000) / 1000;
      const lengte = a.eind - a.start;
      const grond = inBasBereik(a.grond + schuif);
      if (o.trap === 2) {
        links.push({ t, d: lengte, p: grond, h: 'L' });
      } else if (o.trap === 3) {
        links.push({ t, d: lengte / 2, p: grond, h: 'L' });
        links.push({ t: t + lengte / 2, d: lengte / 2, p: grond + 7, h: 'L' });
      } else {
        for (const stap of [0, a.terts, 7]) {
          links.push({ t, d: lengte, p: grond + stap, h: 'L' });
        }
      }
    }
  }

  // Botsen de handen? Til de melodie dan per octaaf op tot ze uit elkaar liggen.
  if (links.length) {
    const basHoog = Math.max(...links.map((n) => n.p));
    let melodieLaag = Math.min(...rechts.map((n) => n.p));
    let melodieHoog = Math.max(...rechts.map((n) => n.p));
    while (melodieLaag < basHoog + 3 && melodieHoog < 84) {
      for (const n of rechts) n.p += 12;
      melodieLaag += 12;
      melodieHoog += 12;
    }
  }

  const alles = [...rechts, ...links];
  alles.sort((a, b) => a.t - b.t || a.p - b.p);

  // dubbels weg
  const schoon = [];
  const gezien = new Set();
  for (const n of alles) {
    const s = n.t + ':' + n.p;
    if (gezien.has(s)) continue;
    gezien.add(s);
    schoon.push(n);
  }

  const tonen = schoon.map((n) => n.p);
  const eind = Math.max(...schoon.map((n) => n.t + n.d));
  return {
    id: o.id || 'import',
    titel: o.titel || 'Naamloos',
    artiest: o.artiest || '',
    bron: o.bron || '',
    spoor: o.spoorNr,
    spoornaam: spoor.naam || '',
    bpm: Math.round(tempo),
    maatsoort: [maat, 4],
    transpositie: verschuiving + 12 * o.octaaf,
    trap: o.trap,
    niveau: Math.min(5, o.trap),
    lus: o.lus,
    toelichting: '',
    lengte: Math.max(maat, Math.ceil(eind / maat) * maat),
    laag: Math.min(...tonen),
    hoog: Math.max(...tonen),
    zwart: zwarteToetsen(tonen),
    noten: schoon,
  };
}

/** Korte beschrijving van wat een trap doet, voor in het scherm. */
export const TRAPPEN = [
  null,
  { naam: 'Alleen melodie', uitleg: 'Rechterhand speelt de melodie. Linkerhand blijft stil.' },
  { naam: 'Melodie + bastoon', uitleg: 'Linkerhand legt één lange grondtoon per maat.' },
  { naam: 'Melodie + kwint', uitleg: 'Linkerhand speelt grondtoon en kwint, in ritme.' },
  { naam: 'Melodie + drieklanken', uitleg: 'Volledige akkoorden links, alle stemmen rechts.' },
];
