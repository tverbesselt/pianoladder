// Het bladerscherm: kies een MIDI uit je verzameling, kies het juiste spoor,
// stel de vereenvoudiging in, en speel het.

import * as lezer from './midilezer.js';
import { kandidaten, moeilijkheid } from './kandidaten.js';
import { reduceer, TRAPPEN } from './reduceer.js';
import * as audio from './audio.js';

const $ = (id) => document.getElementById(id);
const NAMEN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nootNaam = (p) => NAMEN[((p % 12) + 12) % 12] + (Math.floor(p / 12) - 1);
const url = (pad) => '../gekochte muziek/' + pad.split('/').map(encodeURIComponent).join('/');

let index = null;        // inhoud van bibliotheek.json
let huidig = null;       // { m, item, kand }
let opStarten = null;    // terugroep naar app.js
let stoppers = [];

export function koppel(bijLaden) {
  opStarten = bijLaden;
  $('bibKnop').onclick = openen;
  $('bibSluit').onclick = sluiten;
  $('bibZoek').oninput = vulLijst;
  $('bibNiveau').onchange = vulLijst;
  $('bibDup').onchange = vulLijst;
  $('bibBestand').onchange = eigenBestand;
  $('bib').addEventListener('click', (e) => { if (e.target.id === 'bib') sluiten(); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('bib').classList.contains('verborgen')) sluiten();
  });
}

/** Zet een boodschap in de lijstkolom, zodat die nooit zwijgend leeg blijft. */
function lijstMelding(regels, fout = false) {
  $('bibLijst').innerHTML =
    `<li class="lijstmelding${fout ? ' mis' : ''}">${regels.join('<br>')}</li>`;
}

async function openen() {
  $('bib').classList.remove('verborgen');
  try {
    if (!index) {
      const adres = new URL('liedjes/bibliotheek-lijst.json', location.href).href;
      lijstMelding(['Bibliotheek laden…', adres]);

      let antwoord;
      try {
        antwoord = await fetch(adres, { cache: 'no-store' });
      } catch (e) {
        lijstMelding([
          '<b>Kon de bibliotheeklijst niet ophalen.</b>',
          adres,
          e.message,
          'Draait de webserver nog? Dat is het zwarte venster van start.bat.',
        ], true);
        return;
      }

      if (!antwoord.ok) {
        lijstMelding([
          `<b>De server gaf ${antwoord.status} ${antwoord.statusText}.</b>`,
          adres,
          'Staat bibliotheek.json naast de map app? Zo niet: draai <code>py tools\\scan.py</code>.',
        ], true);
        return;
      }

      const tekst = await antwoord.text();
      try {
        index = JSON.parse(tekst);
      } catch (e) {
        lijstMelding([
          '<b>De bibliotheeklijst is geen geldige JSON.</b>',
          `${tekst.length} tekens gelezen, begint met: ${tekst.slice(0, 60)}`,
          'Bouw hem opnieuw op met <code>py tools\\scan.py</code>.',
        ], true);
        return;
      }

      if (!index.items || !index.items.length) {
        lijstMelding(['<b>De bibliotheeklijst bevat geen bestanden.</b>',
                      'Bouw hem opnieuw op met <code>py tools\\scan.py</code>.'], true);
        return;
      }
    }
    vulLijst();
  } catch (e) {
    lijstMelding(['<b>Er ging iets mis bij het openen.</b>', e.message,
                  e.stack ? e.stack.split('\n')[1] || '' : ''], true);
  }
}

function sluiten() {
  stopGeluid();
  $('bib').classList.add('verborgen');
}

function stopGeluid() {
  for (const s of stoppers) clearTimeout(s);
  stoppers = [];
}

// ---------- lijst ----------

function vulLijst() {
  if (!index) {
    lijstMelding(['De bibliotheek is nog niet geladen.'], true);
    return;
  }
  const zoek = $('bibZoek').value.trim().toLowerCase();
  const niveau = $('bibNiveau').value;
  const duplicaten = $('bibDup').checked;

  let rijen = index.items.filter((i) => {
    if (!duplicaten && i.dubbel) return false;
    if (!i.moeilijkheid) return false;
    if (niveau !== 'alles' && String(i.moeilijkheid) !== niveau) return false;
    if (zoek && !(i.titel + ' ' + i.artiest).toLowerCase().includes(zoek)) return false;
    return true;
  });
  rijen.sort((a, b) => a.moeilijkheid - b.moeilijkheid ||
                       (a.zwarte_toetsen || 0) - (b.zwarte_toetsen || 0) ||
                       a.artiest.localeCompare(b.artiest));

  const totaal = rijen.length;
  rijen = rijen.slice(0, 300);
  $('bibAantal').textContent = totaal + ' stuk' + (totaal === 1 ? '' : 'ken') +
    (totaal > 300 ? ' (eerste 300 getoond)' : '');

  const lijst = $('bibLijst');
  lijst.innerHTML = '';

  if (!rijen.length) {
    lijstMelding([
      '<b>Niets gevonden.</b>',
      `De bibliotheek bevat ${index.items.length} bestanden, maar geen enkele voldoet aan je filter.`,
      zoek ? `Zoekterm: "${zoek}"` : 'Zet het niveaufilter op "alle niveaus".',
    ]);
    return;
  }

  for (const i of rijen) {
    const li = document.createElement('li');
    li.className = 'rij' + (i.dubbel ? ' dubbel' : '');
    li.innerHTML =
      `<span class="niv niv${i.moeilijkheid}">${i.moeilijkheid}</span>` +
      `<span class="naam"><b>${i.titel}</b><i>${i.artiest}</i></span>` +
      `<span class="bij">${i.bpm} bpm · ${i.zwarte_toetsen === 0 ? 'wit' : i.zwarte_toetsen + '♯'}</span>`;
    li.onclick = () => kiesBestand(i);
    lijst.appendChild(li);
  }
}

// ---------- een bestand openen ----------

async function kiesBestand(item) {
  stopGeluid();
  $('bibDetail').innerHTML = '<p class="leeg">' + item.titel + ' laden…</p>';
  try {
    const buf = await (await fetch(url(item.pad))).arrayBuffer();
    const m = lezer.lees(buf);
    huidig = { m, item, kand: kandidaten(m, 5) };
    toonDetail();
  } catch (e) {
    $('bibDetail').innerHTML = '<p class="leeg">Kon dit bestand niet lezen: ' + e.message + '</p>';
  }
}

async function eigenBestand(e) {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const m = lezer.lees(await f.arrayBuffer());
    const naam = f.name.replace(/\.midi?$/i, '').replace(/[_-]+/g, ' ');
    huidig = { m, item: { titel: naam, artiest: '', pad: f.name, bpm: lezer.bpm(m) },
               kand: kandidaten(m, 5) };
    toonDetail();
  } catch (err) {
    $('bibDetail').innerHTML = '<p class="leeg">Kon dit bestand niet lezen: ' + err.message + '</p>';
  }
}

// ---------- detailscherm ----------

/** Op welke maat begint dit spoor? */
const startMaat = (k, maat) => Math.max(1, Math.floor(k.eersteTel / maat) + 1);

function toonDetail() {
  const { m, item, kand } = huidig;
  const tempo = lezer.bpm(m);
  const maat = m.maatsoort[0];
  const maten = Math.ceil(Math.max(...m.sporen.map((s) => s.lengte)) / m.div / maat);

  if (!kand.length) {
    $('bibDetail').innerHTML = `<h3>${item.titel}</h3>` +
      '<p class="leeg">In dit bestand vind ik geen spoor dat op een melodie lijkt. ' +
      'Waarschijnlijk staat alles op één spoor door elkaar.</p>';
    return;
  }

  const rijen = kand.map((k, i) => `
    <label class="spoorrij">
      <input type="radio" name="spoor" value="${k.nr}" ${i === 0 ? 'checked' : ''}>
      <span class="spoornaam">${k.naam || 'spoor ' + k.nr}</span>
      <span class="spoorbij">${k.aantal} noten · ${nootNaam(k.laag)}–${nootNaam(k.hoog)} ·
        ${k.poly < 1.15 ? 'eenstemmig' : 'meerstemmig'} · niveau ${moeilijkheid(k, tempo)}</span>
      <button class="beluister" data-spoor="${k.nr}">▶</button>
    </label>`).join('');

  $('bibDetail').innerHTML = `
    <h3>${item.titel}</h3>
    <p class="leeg">${item.artiest || ''} · ${tempo} bpm · ${maat}/4 · ${maten} maten</p>

    <h4>1. Welk spoor is de melodie?</h4>
    <p class="wenk">Klik op ▶ om te horen welke het is.</p>
    <div class="sporen">${rijen}</div>

    <h4>2. Welk stuk?</h4>
    <p class="wenk">Een riff van 4 tot 8 maten herhaalt zichzelf en is het snelst te leren.
      Wil je meer, zet het aantal maten hoger.</p>
    <div class="regel">
      <label>vanaf maat <input type="number" id="bibVan" value="${startMaat(kand[0], maat)}" min="1" max="${maten}"></label>
      <label>aantal maten <input type="number" id="bibMaten" value="8" min="1" max="400"></label>
      <button id="bibVerder" title="volgende stuk van even veel maten">volgende ▸</button>
    </div>
    <div class="regel">
      <span class="etiket">snelkeuze</span>
      ${[4, 8, 16, 32].map((n) => `<button class="maatkeuze" data-maten="${n}">${n}</button>`).join('')}
      <button class="maatkeuze" data-maten="alles" title="van hier tot het einde">tot het eind</button>
    </div>

    <h4>3. Hoe eenvoudig?</h4>
    <div class="trappen" id="bibTrappen">
      ${[1, 2, 3, 4].map((t) => `<button data-trap="${t}" class="${t === 1 ? 'aan' : ''}">${t}. ${TRAPPEN[t].naam}</button>`).join('')}
    </div>
    <p class="wenk" id="bibTrapUitleg">${TRAPPEN[1].uitleg}</p>

    <div class="regel">
      <label><input type="checkbox" id="bibWit" checked> naar witte toetsen verschuiven</label>
      <label>octaaf <input type="number" id="bibOctaaf" value="0" min="-3" max="3"></label>
    </div>

    <div class="uitslag" id="bibUitslag"></div>
    <button class="hoofd groot" id="bibSpeel">Zo spelen</button>`;

  $('bibDetail').querySelectorAll('.beluister').forEach((b) => {
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); beluister(+b.dataset.spoor); };
  });
  $('bibDetail').querySelectorAll('input[name=spoor]').forEach((r) => {
    r.onchange = () => {
      const k = kand.find((x) => x.nr === +r.value);
      if (k) $('bibVan').value = startMaat(k, maat);
      ververs();
    };
  });
  $('bibTrappen').querySelectorAll('button').forEach((b) => {
    b.onclick = () => {
      $('bibTrappen').querySelectorAll('button').forEach((x) => x.classList.remove('aan'));
      b.classList.add('aan');
      $('bibTrapUitleg').textContent = TRAPPEN[+b.dataset.trap].uitleg;
      ververs();
    };
  });
  ['bibVan', 'bibMaten', 'bibWit', 'bibOctaaf'].forEach((id) => {
    $(id).oninput = ververs;
    $(id).onchange = ververs;
  });
  $('bibVerder').onclick = () => {
    $('bibVan').value = +$('bibVan').value + Math.max(1, +$('bibMaten').value);
    ververs();
  };
  $('bibDetail').querySelectorAll('.maatkeuze').forEach((b) => {
    b.onclick = () => {
      $('bibMaten').value = b.dataset.maten === 'alles'
        ? Math.max(1, maten - (+$('bibVan').value) + 1)
        : b.dataset.maten;
      ververs();
    };
  });
  $('bibSpeel').onclick = spelen;
  ververs();
}

function instellingen() {
  const { m } = huidig;
  const maat = m.maatsoort[0];
  const van = (Math.max(1, +$('bibVan').value) - 1) * maat;
  const maten = Math.max(1, +$('bibMaten').value);
  const gekozen = $('bibDetail').querySelector('input[name=spoor]:checked');
  return {
    spoorNr: +gekozen.value,
    van,
    tot: van + maten * maat,
    trap: +$('bibTrappen').querySelector('.aan').dataset.trap,
    transp: $('bibWit').checked ? 'auto' : 0,
    octaaf: +$('bibOctaaf').value,
    maat,
    titel: huidig.item.titel,
    artiest: huidig.item.artiest,
    bron: huidig.item.pad,
    id: 'import',
    lus: true,
  };
}

function ververs() {
  try {
    const lied = reduceer(huidig.m, instellingen());
    huidig.lied = lied;
    const links = lied.noten.filter((n) => n.h === 'L').length;
    const balken = Math.round(lied.lengte / lied.maatsoort[0]);
    const sec = Math.round(lied.lengte / lied.bpm * 60);
    $('bibUitslag').innerHTML =
      `<b>${balken} ${balken === 1 ? 'maat' : 'maten'} — ${sec} seconden, herhalend</b><br>` +
      `<b>${lied.noten.length} noten</b> · ${nootNaam(lied.laag)}–${nootNaam(lied.hoog)} · ` +
      `${lied.zwart === 0 ? 'alleen witte toetsen' : lied.zwart + ' zwarte toets' + (lied.zwart === 1 ? '' : 'en')} · ` +
      `${links ? links + ' voor de linkerhand' : 'alleen rechterhand'}` +
      (lied.transpositie ? ` · ${lied.transpositie > 0 ? '+' : ''}${lied.transpositie} halve tonen verschoven` : '');
    $('bibSpeel').disabled = false;
  } catch (e) {
    huidig.lied = null;
    $('bibUitslag').innerHTML = '<span class="waarschuwing">' + e.message + '</span>';
    $('bibSpeel').disabled = true;
  }
}

function spelen() {
  if (!huidig.lied) return;
  sluiten();
  opStarten(huidig.lied);
}

// ---------- voorbeeldje afspelen ----------

function beluister(spoorNr) {
  stopGeluid();
  audio.wek();
  const { m } = huidig;
  const spoor = m.sporen[spoorNr];
  if (!spoor.noten.length) return;
  const tempo = lezer.bpm(m);
  const begin = lezer.naarTellen(m, spoor.noten[0].start);
  const perTel = 60 / tempo;
  let n = 0;
  for (const noot of spoor.noten) {
    const t = lezer.naarTellen(m, noot.start) - begin;
    if (t > 8) break;
    if (n++ > 40) break;
    const d = lezer.naarTellen(m, noot.eind - noot.start);
    stoppers.push(setTimeout(() => audio.toon(noot.toon, Math.max(0.2, d * perTel)),
                             t * perTel * 1000));
  }
}
