// Alles aan elkaar knopen: liedjes laden, tekenen, bedieningen, invoer.

import { Klavier, tekenRol, naamOctaaf } from './klavier.js';
import { Invoer } from './invoer.js';
import { Speler } from './speler.js';
import * as audio from './audio.js';
import { koppel as koppelBibliotheek } from './bibliotheek.js';

export const BOUW = 'bouw 2026-09-08-2';

const $ = (id) => document.getElementById(id);

const doek = $('doek');
const ctx = doek.getContext('2d');
const klavier = new Klavier();
const speler = new Speler();
const invoer = new Invoer();

let breedte = 0;
let hoogte = 0;
let ppt = 90;            // pixels per tel
let toonNamen = true;

// ---------- liedjes ----------

async function laadLijst() {
  const adres = new URL('liedjes/index.json', location.href).href;
  const antwoord = await fetch(adres, { cache: 'no-store' });
  if (!antwoord.ok) {
    throw new Error(`de server gaf ${antwoord.status} op ${adres}`);
  }
  const tekst = await antwoord.text();
  let lijst;
  try {
    lijst = JSON.parse(tekst);
  } catch (e) {
    throw new Error(`liedjes/index.json is geen geldige JSON (${tekst.length} tekens gelezen)`);
  }
  if (!lijst.liedjes || !lijst.liedjes.length) {
    throw new Error('liedjes/index.json bevat geen liedjes');
  }

  const keuze = $('keuze');
  keuze.innerHTML = '';

  // Bovenaan de weg naar je eigen verzameling, want daar zoeken mensen hem.
  const naarBib = document.createElement('option');
  naarBib.value = '__bibliotheek__';
  naarBib.textContent = '▸ Kies uit je eigen MIDI-bestanden…';
  keuze.appendChild(naarBib);

  // Twee groepen: de gewone lijst, en de kinderliedjes apart. Die laatste
  // krijgen geen artiest en niveau voor hun naam, dat zegt daar niets.
  const groep = document.createElement('optgroup');
  groep.label = 'Kant-en-klaar geoefend';
  const kinder = document.createElement('optgroup');
  kinder.label = 'Kinderliedjes, om mee te beginnen';
  for (const l of lijst.liedjes) {
    const o = document.createElement('option');
    o.value = l.id;
    if (l.soort === 'kind') {
      o.textContent = l.titel;
      kinder.appendChild(o);
    } else {
      o.textContent = `${l.niveau}. ${l.artiest} — ${l.titel}`;
      groep.appendChild(o);
    }
  }
  if (kinder.children.length) keuze.appendChild(kinder);
  keuze.appendChild(groep);

  let vorige = lijst.liedjes[0].id;
  keuze.onchange = () => {
    if (keuze.value === '__bibliotheek__') {
      keuze.value = vorige;          // de keuzelijst weer op het huidige stuk zetten
      $('bibKnop').click();
      return;
    }
    vorige = keuze.value;
    kies(keuze.value);
  };
  await kies(lijst.liedjes[0].id);
  keuze.value = lijst.liedjes[0].id;

  if (!keuze.options.length && window.pianoladderMeld) {
    window.pianoladderMeld('De lijst blijft leeg', [
      `index.json is wel geladen (${lijst.liedjes.length} liedjes) maar de keuzelijst is leeg.`,
    ]);
  }

  verbergBibliotheekZonderVerzameling(naarBib);
}

// Online (GitHub Pages) staat de MIDI-verzameling er niet bij: die is gekocht
// en blijft thuis. Dan heeft de bladerknop geen zin en halen we hem weg.
async function verbergBibliotheekZonderVerzameling(optie) {
  let aanwezig = false;
  try {
    const a = await fetch('liedjes/bibliotheek-lijst.json', { method: 'HEAD', cache: 'no-store' });
    aanwezig = a.ok;
  } catch (e) { /* niet bereikbaar: zelfde als afwezig */ }
  if (aanwezig) return;
  optie.remove();
  $('bibKnop').classList.add('verborgen');
}

async function kies(id) {
  zetLied(await (await fetch(`liedjes/${id}.json`)).json());
}

function zetLied(lied) {
  speler.speelt = false;
  speler.laad(lied);
  $('liedTitel').textContent = lied.titel;
  const zwart = lied.zwart === 0 ? 'alleen witte toetsen'
    : lied.zwart === 1 ? '1 zwarte toets' : `${lied.zwart} zwarte toetsen`;
  const trap = lied.trap ? ` · trap ${lied.trap}` : '';
  const maten = Math.round(lied.lengte / (lied.maatsoort[0] || 4));
  const seconden = Math.round(lied.lengte / lied.bpm * 60);
  const duur = `${maten} ${maten === 1 ? 'maat' : 'maten'}, ${seconden} s` +
               (lied.lus ? ' — herhaalt' : '');
  $('liedArtiest').textContent =
    `${lied.artiest} · ${lied.bpm} bpm · ${zwart}${trap} · ${duur}`;
  klavier.bereik(lied.laag, lied.hoog);
  $('startKnop').textContent = 'Spelen';
  if (lied.lus !== undefined) {
    speler.lus = lied.lus;
    $('lus').checked = lied.lus;
  }
  const m = $('melding');
  if (lied.toelichting) {
    m.textContent = lied.toelichting;
    m.classList.remove('verborgen');
  } else {
    m.classList.add('verborgen');
  }
  werkStandBij();
}

// ---------- tekenen ----------

function pasMaatAan() {
  const r = doek.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return;
  const dpr = window.devicePixelRatio || 1;
  if (breedte === r.width && hoogte === r.height && doek.width > 0) return;
  breedte = r.width;
  hoogte = r.height;
  doek.width = Math.round(breedte * dpr);
  doek.height = Math.round(hoogte * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  klavier.breedte = breedte;
  klavier.hoogte = Math.min(130, Math.max(70, hoogte * 0.22));
  klavier.herbereken();
}

function teken() {
  const kh = klavier.hoogte;
  const rolHoogte = hoogte - kh;

  tekenRol(ctx, klavier, speler.lied, speler.nu, {
    breedte, hoogte: rolHoogte, ppt,
    maat: speler.lied ? speler.lied.maatsoort[0] : 4,
    actief: speler.actieveNoten(),
    namen: toonNamen,
  });

  ctx.save();
  ctx.translate(0, rolHoogte);
  klavier.teken(ctx, invoer.ingedrukt, speler.gevraagd(), toonNamen);
  ctx.restore();

  if (speler.modus === 'wachten' && speler.wacht && speler.speelt) {
    ctx.fillStyle = 'rgba(255,209,102,.9)';
    ctx.font = '600 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('speel de opgelichte toets', breedte / 2, rolHoogte - 14);
  }
}

let vorigeTijd = 0;
function lus(tijd) {
  const dt = Math.min(0.05, (tijd - vorigeTijd) / 1000 || 0);
  vorigeTijd = tijd;
  pasMaatAan();
  speler.tik(dt);
  if (breedte > 0) teken();
  requestAnimationFrame(lus);
}

// ---------- stand ----------

function werkStandBij() {
  $('treffers').textContent = speler.treffers;
  $('fouten').textContent = speler.fouten;
  $('rondes').textContent = speler.rondes;
}

// ---------- bedieningen ----------

function knoppen() {
  $('startKnop').onclick = () => {
    audio.wek();
    speler.speelt = !speler.speelt;
    $('startKnop').textContent = speler.speelt ? 'Pauze' : 'Spelen';
    $('melding').classList.add('verborgen');
  };

  $('opnieuwKnop').onclick = () => {
    speler.herstel();
    werkStandBij();
  };

  $('voorKnop').onclick = () => {
    audio.wek();
    speler.modus = 'luisteren';
    speler.herstel();
    speler.speelt = true;
    $('startKnop').textContent = 'Pauze';
    zetModusKnoppen(null);
  };

  document.querySelectorAll('#modus button').forEach((b) => {
    b.onclick = () => {
      speler.modus = b.dataset.modus;
      speler.herstel();
      zetModusKnoppen(b.dataset.modus);
      werkStandBij();
    };
  });

  $('tempo').oninput = (e) => {
    speler.tempo = e.target.value / 100;
    $('tempoWaarde').textContent = e.target.value + '%';
  };

  $('namen').onchange = (e) => { toonNamen = e.target.checked; };
  $('lus').onchange = (e) => { speler.lus = e.target.checked; };
  $('metronoom').onchange = (e) => { metronoomAan = e.target.checked; };
  $('eigenGeluid').onchange = (e) => { eigenGeluid = e.target.checked; };
}

function zetModusKnoppen(modus) {
  document.querySelectorAll('#modus button').forEach((b) => {
    b.classList.toggle('aan', b.dataset.modus === modus);
  });
}

// ---------- invoer koppelen ----------

let metronoomAan = false;
let eigenGeluid = false;

function koppelInvoer() {
  invoer.aan = (p, aanslag) => {
    audio.wek();
    if (eigenGeluid || !invoer.midiActief) audio.toon(p, 0.5, aanslag / 127);
    speler.aanslag(p);
    werkStandBij();
    const el = $('laatsteNoot');
    el.textContent = `${naamOctaaf(p)} · aanslag ${aanslag}`;
    el.classList.add('raak');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('raak'), 220);
  };
  invoer.uit = () => {};

  invoer.opStatus = ({ ok, tekst }) => {
    invoer.midiActief = ok;
    $('midiLamp').className = 'lamp ' + (ok ? 'aan' : 'uit');
    $('midiTekst').textContent = ok ? tekst : tekst;
    $('hulp').style.display = ok ? 'none' : '';
  };

  invoer.startToetsenbord();
  invoer.startMuis(doek, (e) => {
    const r = doek.getBoundingClientRect();
    const y = e.clientY - r.top - (hoogte - klavier.hoogte);
    if (y < 0) return null;
    return klavier.toetsOp(e.clientX - r.left, y);
  });
  invoer.startMidi();

  speler.opNoot = (n) => {
    if (speler.modus !== 'wachten') audio.toon(n.p, Math.max(0.25, n.d * 60 / speler.bpm()));
  };
  speler.opTel = (tel, sterk) => { if (metronoomAan) audio.tik(sterk); };
  speler.opRonde = () => werkStandBij();
  speler.opEinde = () => { $('startKnop').textContent = 'Spelen'; };
}

// ---------- starten ----------

// handig om vanuit de console aan te rommelen tijdens het bouwen
window.pianoladder = { speler, klavier, invoer, teken, pasMaatAan, zetLied };

$('bouw').textContent = BOUW;
koppelBibliotheek(zetLied);

window.addEventListener('resize', pasMaatAan);
pasMaatAan();
knoppen();
koppelInvoer();
laadLijst().catch((e) => {
  const regels = [
    e.message,
    'Adres van de app: ' + location.href,
    location.protocol === 'file:'
      ? 'Je hebt index.html rechtstreeks geopend. Start de app met start.bat.'
      : 'Draait de webserver nog? Dat is het zwarte venster van start.bat.',
  ];
  if (window.pianoladderMeld) window.pianoladderMeld('Kon de liedjes niet laden', regels);
  const m = $('melding');
  m.textContent = 'Kon de liedjes niet laden: ' + e.message;
  m.classList.remove('verborgen');
});
requestAnimationFrame(lus);
