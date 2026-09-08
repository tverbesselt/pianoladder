// Geometrie en tekenwerk van een 88-toetsen klavier, plus de vallende noten.

export const LAAGSTE = 21;   // A0
export const HOOGSTE = 108;  // C8
const WIT = [0, 2, 4, 5, 7, 9, 11];
const LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const isWit = (p) => WIT.includes(((p % 12) + 12) % 12);
export const naam = (p) => LETTERS[((p % 12) + 12) % 12];
export const naamOctaaf = (p) => naam(p) + (Math.floor(p / 12) - 1);

// Aantal witte toetsen onder een toon, vooraf uitgerekend.
const WITTOT = new Int16Array(129);
for (let p = 1; p <= 128; p++) WITTOT[p] = WITTOT[p - 1] + (isWit(p - 1) ? 1 : 0);

export function omlaagNaarWit(p) {
  while (p > LAAGSTE && !isWit(p)) p--;
  return Math.max(LAAGSTE, p);
}

export function omhoogNaarWit(p) {
  while (p < HOOGSTE && !isWit(p)) p++;
  return Math.min(HOOGSTE, p);
}

export class Klavier {
  constructor() {
    this.laag = 48;
    this.hoog = 72;
    this.breedte = 0;
    this.hoogte = 74;
  }

  /** Zet het bereik dat het stuk nodig heeft. Het zichtbare bereik groeit
   *  daarna mee met de schermbreedte, zodat de toetsen niet absurd breed worden. */
  bereik(laag, hoog, lucht = 3) {
    this.doelLaag = Math.max(LAAGSTE, laag - lucht);
    this.doelHoog = Math.min(HOOGSTE, hoog + lucht);
    this.herbereken();
  }

  /** Breid uit tot een witte toets hoogstens MAXWIT breed is. */
  herbereken() {
    if (this.doelLaag === undefined) return;
    let lo = omlaagNaarWit(this.doelLaag);
    let hi = omhoogNaarWit(this.doelHoog);
    const wit = () => WITTOT[hi + 1] - WITTOT[lo];
    const MAXWIT = 44;
    let omhoog = true;
    while (this.breedte / wit() > MAXWIT && (lo > LAAGSTE || hi < HOOGSTE)) {
      if (omhoog && hi < HOOGSTE) hi = omhoogNaarWit(hi + 1);
      else if (lo > LAAGSTE) lo = omlaagNaarWit(lo - 1);
      else if (hi < HOOGSTE) hi = omhoogNaarWit(hi + 1);
      omhoog = !omhoog;
    }
    this.laag = lo;
    this.hoog = hi;
  }

  aantalWit() {
    return WITTOT[this.hoog + 1] - WITTOT[this.laag];
  }

  witBreedte() {
    return this.breedte / this.aantalWit();
  }

  /** Positie en maat van één toets. Geeft null buiten het zichtbare bereik. */
  vak(p) {
    if (p < this.laag || p > this.hoog) return null;
    const w = this.witBreedte();
    const i = WITTOT[p] - WITTOT[this.laag];
    if (isWit(p)) return { x: i * w, w: w, wit: true };
    return { x: i * w - w * 0.29, w: w * 0.58, wit: false };
  }

  /** Welke toets ligt er onder deze x? Zwarte toetsen krijgen voorrang. */
  toetsOp(x, y) {
    const zwartHoogte = this.hoogte * 0.62;
    if (y < zwartHoogte) {
      for (let p = this.laag; p <= this.hoog; p++) {
        if (isWit(p)) continue;
        const v = this.vak(p);
        if (v && x >= v.x && x <= v.x + v.w) return p;
      }
    }
    for (let p = this.laag; p <= this.hoog; p++) {
      if (!isWit(p)) continue;
      const v = this.vak(p);
      if (v && x >= v.x && x <= v.x + v.w) return p;
    }
    return null;
  }

  /**
   * Teken het klavier.
   * @param ctx      canvas-context, al verschoven naar de linkerbovenhoek van het klavier
   * @param ingedrukt  Set van tonen die de speler nu vasthoudt
   * @param gevraagd   Map toon -> kleur, voor wat er nú gespeeld moet worden
   * @param namen      notennamen op de witte toetsen tonen
   */
  teken(ctx, ingedrukt, gevraagd, namen) {
    const h = this.hoogte;
    const zh = h * 0.62;
    const w = this.witBreedte();

    for (let p = this.laag; p <= this.hoog; p++) {
      if (!isWit(p)) continue;
      const v = this.vak(p);
      const wacht = gevraagd.get(p);
      ctx.fillStyle = wacht ? wacht : (ingedrukt.has(p) ? '#9fb4cc' : '#f2f4f7');
      ctx.fillRect(v.x, 0, v.w - 1, h);
      ctx.strokeStyle = '#0e1116';
      ctx.lineWidth = 1;
      ctx.strokeRect(v.x + 0.5, 0.5, v.w - 1, h - 1);
      if (namen && w > 15) {
        ctx.fillStyle = wacht ? 'rgba(0,0,0,.7)' : '#98a2b1';
        ctx.font = `${Math.min(12, w * 0.5)}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(naam(p), v.x + v.w / 2, h - 7);
      }
    }

    for (let p = this.laag; p <= this.hoog; p++) {
      if (isWit(p)) continue;
      const v = this.vak(p);
      const wacht = gevraagd.get(p);
      ctx.fillStyle = wacht ? wacht : (ingedrukt.has(p) ? '#5b6980' : '#1b2028');
      ctx.fillRect(v.x, 0, v.w, zh);
      ctx.strokeStyle = '#0a0d11';
      ctx.strokeRect(v.x + 0.5, 0.5, v.w - 1, zh - 1);
    }

    // middenC even aanwijzen
    const c4 = this.vak(60);
    if (c4) {
      ctx.fillStyle = 'rgba(255,138,61,.9)';
      ctx.beginPath();
      ctx.arc(c4.x + c4.w / 2, h - 20, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** De vallende noten boven het klavier. */
export function tekenRol(ctx, klavier, lied, nu, opts) {
  const { breedte, hoogte, ppt, maat, actief } = opts;

  ctx.fillStyle = '#0b0e13';
  ctx.fillRect(0, 0, breedte, hoogte);

  // maatstrepen
  const eersteTel = Math.floor(nu);
  const laatsteTel = nu + hoogte / ppt + 1;
  for (let t = eersteTel; t <= laatsteTel; t++) {
    const y = hoogte - (t - nu) * ppt;
    if (y < 0 || y > hoogte) continue;
    const opMaat = ((t % maat) + maat) % maat === 0;
    ctx.strokeStyle = opMaat ? '#2b3442' : '#1a212b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(breedte, y + 0.5);
    ctx.stroke();
  }

  // baanlijnen bij elke C
  for (let p = klavier.laag; p <= klavier.hoog; p++) {
    if (p % 12 !== 0) continue;
    const v = klavier.vak(p);
    if (!v) continue;
    ctx.strokeStyle = '#1d2530';
    ctx.beginPath();
    ctx.moveTo(v.x + 0.5, 0);
    ctx.lineTo(v.x + 0.5, hoogte);
    ctx.stroke();
  }

  if (!lied) return;

  const rond = (x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  };

  for (const n of lied.noten) {
    const onder = hoogte - (n.t - nu) * ppt;
    const boven = onder - Math.max(n.d, 0.22) * ppt;
    if (onder < -40 || boven > hoogte + 40) continue;
    const v = klavier.vak(n.p);
    if (!v) continue;

    const isActief = actief && actief.has(n);
    const gedaan = n.gedaan;
    const linkerhand = n.h === 'L';
    ctx.fillStyle = isActief ? '#ffd166'
      : gedaan ? '#2f6d4b'
      : linkerhand ? (v.wit ? '#4fc3f7' : '#2f9fd4')
      : (v.wit ? '#ff8a3d' : '#e0662a');
    rond(v.x + 1, boven, v.w - 2, onder - boven, 5);

    if (isActief) {
      ctx.strokeStyle = '#fff2cc';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const h = onder - boven;
    if (opts.namen && v.w > 15 && h > 15) {
      ctx.fillStyle = 'rgba(20,14,6,.85)';
      ctx.font = `600 ${Math.min(12, v.w * 0.45)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(naam(n.p), v.x + v.w / 2, onder - 5);
    }
  }

  // treflijn
  ctx.strokeStyle = 'rgba(79,195,247,.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, hoogte - 1);
  ctx.lineTo(breedte, hoogte - 1);
  ctx.stroke();
}
