// De motor: houdt de tijd bij, bevriest in wachtmodus tot je de juiste toets
// speelt, en telt treffers en fouten.

const EPS = 1e-6;
const VENSTER = 0.35;   // tolerantie in tellen bij meespelen

export class Speler {
  constructor() {
    this.lied = null;
    this.groepen = [];
    this.nu = 0;
    this.modus = 'wachten';    // wachten | meespelen | luisteren
    this.tempo = 0.6;
    this.speelt = false;
    this.lus = true;
    this.wacht = null;
    this.treffers = 0;
    this.fouten = 0;
    this.rondes = 0;
    this._laatsteTel = -1;

    this.opNoot = () => {};    // een noot passeert de treflijn (om voor te spelen)
    this.opTel = () => {};     // metronoom
    this.opRonde = () => {};
    this.opEinde = () => {};
  }

  laad(lied) {
    this.lied = lied;
    const perTijd = new Map();
    for (const n of lied.noten) {
      const sleutel = n.t.toFixed(4);
      if (!perTijd.has(sleutel)) perTijd.set(sleutel, []);
      perTijd.get(sleutel).push(n);
    }
    this.groepen = [...perTijd.entries()]
      .map(([t, noten]) => ({
        t: parseFloat(t),
        noten,
        nodig: new Set(noten.map((n) => n.p)),
        geraakt: new Set(),
        klaar: false,
      }))
      .sort((a, b) => a.t - b.t);
    this.herstel();
  }

  herstel() {
    this.nu = 0;
    this.wacht = null;
    this.treffers = 0;
    this.fouten = 0;
    this.rondes = 0;
    this._laatsteTel = -1;
    this._nieuweRonde();
  }

  _nieuweRonde() {
    for (const g of this.groepen) {
      g.klaar = false;
      g.gemist = false;
      g.geraakt.clear();
      for (const n of g.noten) { n.gedaan = false; n.gespeeld = false; }
    }
    this.wacht = null;
  }

  bpm() {
    return (this.lied ? this.lied.bpm : 100) * this.tempo;
  }

  /** Tonen die de speler nu moet aanslaan, met de kleur waarin ze oplichten. */
  gevraagd() {
    const m = new Map();
    if (this.modus === 'wachten' && this.wacht) {
      for (const p of this.wacht.nodig) {
        m.set(p, this.wacht.geraakt.has(p) ? '#3ddc84' : '#ffd166');
      }
    }
    return m;
  }

  actieveNoten() {
    return this.wacht ? new Set(this.wacht.noten) : null;
  }

  _eerstvolgende() {
    for (const g of this.groepen) {
      if (!g.klaar && g.t >= this.nu - EPS) return g;
    }
    return null;
  }

  tik(dt) {
    if (!this.speelt || !this.lied) return;
    const stap = dt * this.bpm() / 60;

    if (this.modus === 'wachten') {
      const g = this._eerstvolgende();
      if (g && this.nu + stap >= g.t - EPS) {
        this.nu = g.t;
        if (this.wacht !== g) {
          this.wacht = g;
          g.geraakt.clear();
        }
        this._telklok();
        return;                       // bevroren tot de juiste toets komt
      }
      this.wacht = null;
      this.nu += stap;
    } else {
      this.nu += stap;
      this._klankVanPasserendeNoten();
      if (this.modus === 'meespelen') this._gemisteNoten();
    }

    this._telklok();
    this._einde();
  }

  _telklok() {
    const tel = Math.floor(this.nu);
    if (tel !== this._laatsteTel && tel >= 0) {
      this._laatsteTel = tel;
      const maat = this.lied.maatsoort ? this.lied.maatsoort[0] : 4;
      this.opTel(tel, tel % maat === 0);
    }
  }

  _klankVanPasserendeNoten() {
    for (const n of this.lied.noten) {
      if (!n.gespeeld && n.t <= this.nu + EPS) {
        n.gespeeld = true;
        this.opNoot(n);
      }
    }
  }

  _gemisteNoten() {
    for (const g of this.groepen) {
      if (g.klaar || g.gemist) continue;
      if (this.nu > g.t + VENSTER) {
        g.gemist = true;
        this.fouten += g.nodig.size;
      }
    }
  }

  _einde() {
    if (this.nu < this.lied.lengte) return;
    this.rondes++;
    this.opRonde(this.rondes);
    if (this.lus) {
      this.nu = 0;
      this._laatsteTel = -1;
      this._nieuweRonde();
    } else {
      this.speelt = false;
      this.opEinde();
    }
  }

  // ---------- invoer ----------

  aanslag(p) {
    if (!this.lied) return;

    if (this.modus === 'wachten') {
      const g = this.wacht;
      if (!g) return;                       // tussen twee noten: geen oordeel
      if (g.nodig.has(p)) {
        g.geraakt.add(p);
        if (g.geraakt.size >= g.nodig.size) {
          g.klaar = true;
          for (const n of g.noten) n.gedaan = true;
          this.treffers += g.nodig.size;
          this.wacht = null;
        }
      } else {
        this.fouten++;
      }
      return;
    }

    if (this.modus === 'meespelen') {
      let beste = null;
      let afstand = VENSTER;
      for (const g of this.groepen) {
        if (g.klaar || !g.nodig.has(p) || g.geraakt.has(p)) continue;
        const d = Math.abs(g.t - this.nu);
        if (d <= afstand) { afstand = d; beste = g; }
      }
      if (beste) {
        beste.geraakt.add(p);
        this.treffers++;
        for (const n of beste.noten) if (n.p === p) n.gedaan = true;
        if (beste.geraakt.size >= beste.nodig.size) beste.klaar = true;
      } else {
        this.fouten++;
      }
    }
  }

  los() { /* voorlopig niets: we beoordelen alleen aanslagen */ }
}
