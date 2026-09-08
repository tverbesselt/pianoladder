// Invoer: MIDI-piano, computertoetsenbord en muis. Alles komt op dezelfde
// twee terugroepfuncties uit: aan(toon, aanslag) en uit(toon).

const RIJ_ONDER = ['z', 's', 'x', 'd', 'c', 'v', 'g', 'b', 'h', 'n', 'j', 'm'];
const RIJ_BOVEN = ['q', '2', 'w', '3', 'e', 'r', '5', 't', '6', 'y', '7', 'u'];

export class Invoer {
  constructor() {
    this.aan = () => {};
    this.uit = () => {};
    this.opStatus = () => {};
    this.ingedrukt = new Set();
    this.basis = 60;              // C4 onder de linkerhand van het toetsenbord
    this.toetsKaart = new Map();
    RIJ_ONDER.forEach((k, i) => this.toetsKaart.set(k, i));
    RIJ_BOVEN.forEach((k, i) => this.toetsKaart.set(k, i + 12));
    this.actieveToetsen = new Map();
  }

  _aan(p, aanslag = 100) {
    if (p < 0 || p > 127) return;
    this.ingedrukt.add(p);
    this.aan(p, aanslag);
  }

  _uit(p) {
    this.ingedrukt.delete(p);
    this.uit(p);
  }

  // ---------- MIDI ----------

  async startMidi() {
    if (!navigator.requestMIDIAccess) {
      this.opStatus({ ok: false, tekst: 'Deze browser kent geen Web MIDI — gebruik Chrome of Edge.' });
      return;
    }
    let toegang;
    try {
      toegang = await navigator.requestMIDIAccess({ sysex: false });
    } catch (e) {
      this.opStatus({ ok: false, tekst: 'MIDI-toegang geweigerd. Geef toestemming in de browser.' });
      return;
    }
    this.midi = toegang;
    toegang.onstatechange = () => this._koppel();
    this._koppel();
  }

  _koppel() {
    const namen = [];
    for (const ingang of this.midi.inputs.values()) {
      ingang.onmidimessage = (b) => this._bericht(b.data);
      namen.push(ingang.name);
    }
    if (namen.length) {
      this.opStatus({ ok: true, tekst: namen.join(', ') });
    } else {
      this.opStatus({ ok: false, tekst: 'Geen MIDI-apparaat gevonden' });
    }
  }

  _bericht(d) {
    const soort = d[0] & 0xf0;
    if (soort === 0x90 && d[2] > 0) this._aan(d[1], d[2]);
    else if (soort === 0x80 || (soort === 0x90 && d[2] === 0)) this._uit(d[1]);
  }

  // ---------- computertoetsenbord ----------

  startToetsenbord() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'ArrowLeft') { this.basis = Math.max(24, this.basis - 12); e.preventDefault(); return; }
      if (e.key === 'ArrowRight') { this.basis = Math.min(96, this.basis + 12); e.preventDefault(); return; }
      const i = this.toetsKaart.get(e.key.toLowerCase());
      if (i === undefined) return;
      e.preventDefault();
      const p = this.basis + i;
      this.actieveToetsen.set(e.key.toLowerCase(), p);
      this._aan(p, 90);
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      const p = this.actieveToetsen.get(k);
      if (p === undefined) return;
      this.actieveToetsen.delete(k);
      this._uit(p);
    });

    window.addEventListener('blur', () => {
      for (const p of [...this.ingedrukt]) this._uit(p);
      this.actieveToetsen.clear();
    });
  }

  // ---------- muis op het getekende klavier ----------

  startMuis(doek, zoekToets) {
    let vast = null;
    const los = () => {
      if (vast !== null) { this._uit(vast); vast = null; }
    };
    doek.addEventListener('pointerdown', (e) => {
      const p = zoekToets(e);
      if (p === null) return;
      doek.setPointerCapture(e.pointerId);
      vast = p;
      this._aan(p, 90);
    });
    doek.addEventListener('pointerup', los);
    doek.addEventListener('pointercancel', los);
    doek.addEventListener('pointerleave', los);
  }
}
