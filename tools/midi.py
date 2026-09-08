"""Minimale MIDI-lezer op de standaardbibliotheek. Geen externe pakketten nodig."""
import struct


class MidiFout(Exception):
    pass


def _var(d, i):
    v = 0
    while True:
        b = d[i]
        i += 1
        v = (v << 7) | (b & 0x7F)
        if not b & 0x80:
            return v, i


def _sporen(d):
    """Splits het bestand in ruwe MTrk-blokken."""
    if d[:4] != b'MThd':
        raise MidiFout('geen MThd-kop')
    fmt, ntrk, div = struct.unpack('>HHH', d[8:14])
    if div & 0x8000:
        raise MidiFout('SMPTE-tijdcode wordt niet ondersteund')
    i, blokken = 14, []
    while i < len(d) - 8:
        if d[i:i + 4] != b'MTrk':
            i += 1
            continue
        ln = struct.unpack('>I', d[i + 4:i + 8])[0]
        blokken.append(d[i + 8:i + 8 + ln])
        i += 8 + ln
    return fmt, div, blokken


def _events(blok):
    """Loop een spoor af en geef (tick, soort, ...) terug."""
    i, t, vorig = 0, 0, None
    while i < len(blok):
        dt, i = _var(blok, i)
        t += dt
        if i >= len(blok):
            return
        b = blok[i]
        if b < 0x80:
            st = vorig
            if st is None:
                return
        else:
            st = b
            i += 1
            if st < 0xF0:
                vorig = st
        soort, kan = st & 0xF0, st & 0x0F
        if st == 0xFF:
            mt = blok[i]
            i += 1
            ln, i = _var(blok, i)
            yield t, 'meta', mt, blok[i:i + ln]
            i += ln
        elif st in (0xF0, 0xF7):
            ln, i = _var(blok, i)
            i += ln
        elif soort in (0x80, 0x90, 0xA0, 0xB0, 0xE0):
            if i + 1 >= len(blok):
                return
            yield t, 'kan', soort, kan, blok[i], blok[i + 1]
            i += 2
        elif soort in (0xC0, 0xD0):
            if i >= len(blok):
                return
            yield t, 'kan', soort, kan, blok[i], 0
            i += 1
        else:
            return


def lees(pad):
    """Lees een MIDI-bestand tot een woordenboek met sporen en noten.

    Elke noot: {start, eind (in tellen), toon, aanslag, kanaal}
    """
    with open(pad, 'rb') as f:
        d = f.read()
    fmt, div, blokken = _sporen(d)
    if not blokken:
        raise MidiFout('geen sporen gevonden')

    tempi = []          # (tick, microseconden per tel)
    maatsoort = (4, 4)
    sporen = []

    for nr, blok in enumerate(blokken):
        naam = None
        instr = {}
        open_noten = {}
        noten = []
        laatste_tick = 0
        for ev in _events(blok):
            t = ev[0]
            laatste_tick = max(laatste_tick, t)
            if ev[1] == 'meta':
                mt, data = ev[2], ev[3]
                if mt == 0x03 and naam is None:
                    naam = data.decode('latin-1', 'replace').strip()
                elif mt == 0x51 and len(data) == 3:
                    tempi.append((t, data[0] << 16 | data[1] << 8 | data[2]))
                elif mt == 0x58 and len(data) >= 2 and t == 0:
                    maatsoort = (data[0], 2 ** data[1])
            else:
                soort, kan, a, b = ev[2], ev[3], ev[4], ev[5]
                if soort == 0xC0:
                    instr[kan] = a
                elif soort == 0x90 and b > 0:
                    open_noten.setdefault((kan, a), []).append((t, b))
                elif soort == 0x80 or (soort == 0x90 and b == 0):
                    stapel = open_noten.get((kan, a))
                    if stapel:
                        start, vel = stapel.pop(0)
                        if t > start:
                            noten.append(dict(start=start, eind=t, toon=a,
                                              aanslag=vel, kanaal=kan))
        # nog klinkende noten netjes afsluiten
        for (kan, a), stapel in open_noten.items():
            for start, vel in stapel:
                noten.append(dict(start=start, eind=start + div, toon=a,
                                  aanslag=vel, kanaal=kan))
        noten.sort(key=lambda n: (n['start'], n['toon']))
        sporen.append(dict(nr=nr, naam=naam, instr=instr, noten=noten,
                           lengte=laatste_tick))

    if not tempi:
        tempi = [(0, 500000)]
    tempi.sort()
    return dict(formaat=fmt, div=div, maatsoort=maatsoort,
                tempi=tempi, sporen=splits_kanalen(sporen))


def splits_kanalen(sporen):
    """Sommige bestanden proppen de hele band op één spoor. Zo'n spoor knippen
    we per MIDI-kanaal uit elkaar, anders valt er geen melodie uit te halen."""
    uit = []
    for sp in sporen:
        kanalen = sorted({n['kanaal'] for n in sp['noten']})
        if len(kanalen) <= 1:
            sp['nr'] = len(uit)
            uit.append(sp)
            continue
        for k in kanalen:
            noten = [n for n in sp['noten'] if n['kanaal'] == k]
            if not noten:
                continue
            naam = ((sp['naam'] + ' ') if sp['naam'] else '') + 'kanaal %d' % (k + 1)
            uit.append(dict(nr=len(uit), naam=naam,
                            instr={k: sp['instr'][k]} if k in sp['instr'] else {},
                            noten=noten, lengte=sp['lengte']))
    return uit


def bpm(m):
    """Beginteempo in slagen per minuut."""
    return round(60000000 / m['tempi'][0][1], 1)


def naar_tellen(m, tick):
    """Ticks omrekenen naar tellen (kwartnoten)."""
    return tick / m['div']


def seconden(m, tick):
    """Ticks omrekenen naar seconden, met de volledige tempokaart."""
    s, vorig_tick, upt = 0.0, 0, m['tempi'][0][1]
    for t, u in m['tempi']:
        if t >= tick:
            break
        s += (t - vorig_tick) / m['div'] * upt / 1e6
        vorig_tick, upt = t, u
    return s + (tick - vorig_tick) / m['div'] * upt / 1e6
