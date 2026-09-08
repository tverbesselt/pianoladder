"""Schrijft de klassieke stukken uit naar app/liedjes/.

Deze staan niet in de MIDI-verzameling — ze zijn hier met de hand genoteerd.
Alles is publiek domein: de componisten zijn ruim honderd jaar dood.

Noten worden geschreven als (tel, toon, duur). Toon is de notennaam met
octaafcijfer, waarbij C4 de middelste C is.

    python tools/klassiek.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyse

HIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIEDJES = os.path.join(HIER, 'app', 'liedjes')
BASIS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def toon(naam):
    """'F#5' of 'Bb3' of 'C4' -> MIDI-nummer."""
    letter = naam[0].upper()
    rest = naam[1:]
    p = BASIS[letter]
    while rest and rest[0] in '#b':
        p += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    return p + (int(rest) + 1) * 12


def rij(start, namen, duur, hand='R'):
    """Noten na elkaar, allemaal even lang."""
    return [(start + i * duur, n, duur) for i, n in enumerate(namen)]


def bouw(id, titel, artiest, bpm, maat, noten, niveau, toelichting, lus=True):
    uit = []
    for t, n, d in noten:
        h = 'R'
        if isinstance(n, tuple):
            n, h = n
        uit.append({'t': round(t, 4), 'd': round(d, 4), 'p': toon(n), 'h': h})
    uit.sort(key=lambda n: (n['t'], n['p']))
    tonen = [n['p'] for n in uit]
    lengte = max(n['t'] + n['d'] for n in uit)
    lied = {
        'id': id, 'titel': titel, 'artiest': artiest,
        'bron': 'met de hand genoteerd', 'spoor': None, 'spoornaam': '',
        'bpm': bpm, 'maatsoort': [maat, 4], 'transpositie': 0,
        'niveau': niveau, 'lus': lus, 'toelichting': toelichting,
        'lengte': round(lengte / maat + 0.4) * maat,
        'laag': min(tonen), 'hoog': max(tonen),
        'zwart': analyse.zwarte_toetsen(tonen),
        'noten': uit,
    }
    with open(os.path.join(LIEDJES, id + '.json'), 'w', encoding='utf-8') as f:
        json.dump(lied, f, ensure_ascii=False, indent=1)
    links = sum(1 for n in uit if n['h'] == 'L')
    print('%-26s %2d noten, %2g tellen, %d zwart%s' % (
        titel, len(uit), lied['lengte'], lied['zwart'],
        ', %d links' % links if links else ''))
    return id


# --------------------------------------------------------------------------
# 1. Beethoven, Ode an die Freude (1824), in C. Alleen witte toetsen.
# --------------------------------------------------------------------------
ode = []
for maat_start in (0, 16):
    ode += rij(maat_start + 0, ['E4', 'E4', 'F4', 'G4'], 1)
    ode += rij(maat_start + 4, ['G4', 'F4', 'E4', 'D4'], 1)
    ode += rij(maat_start + 8, ['C4', 'C4', 'D4', 'E4'], 1)
eind1 = [(12, 'E4', 1.5), (13.5, 'D4', 0.5), (14, 'D4', 2)]
eind2 = [(28, 'D4', 1.5), (29.5, 'C4', 0.5), (30, 'C4', 2)]
ode += eind1 + eind2

# --------------------------------------------------------------------------
# 2. Pachelbel, Canon in D (ca. 1690), verschoven naar C. Beide handen.
# --------------------------------------------------------------------------
canon = []
canon += [(i * 2, n, 2) for i, n in enumerate(['E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'A4', 'B4'])]
canon += [(i * 2, (n, 'L'), 2) for i, n in
          enumerate(['C3', 'G2', 'A2', 'E2', 'F2', 'C2', 'F2', 'G2'])]

# --------------------------------------------------------------------------
# 3. Bach, Preludium in C, BWV 846 (1722). Eerste vier maten.
#    Elke halve maat: twee liggende noten links, dan zes zestienden rechts.
# --------------------------------------------------------------------------
prelude = []
maten = [
    ('C2', 'E3', ['G3', 'C4', 'E4', 'G3', 'C4', 'E4']),
    ('C2', 'D3', ['A3', 'D4', 'F4', 'A3', 'D4', 'F4']),
    ('B1', 'D3', ['G3', 'D4', 'F4', 'G3', 'D4', 'F4']),
    ('C2', 'E3', ['G3', 'C4', 'E4', 'G3', 'C4', 'E4']),
]
for i, (bas, tenor, figuur) in enumerate(maten):
    for helft in (0, 2):
        t0 = i * 4 + helft
        prelude.append((t0, (bas, 'L'), 2))
        prelude.append((t0 + 0.25, (tenor, 'L'), 1.75))
        prelude += [(t0 + 0.5 + j * 0.25, n, 0.25) for j, n in enumerate(figuur)]

# --------------------------------------------------------------------------
# 4. Grieg, Morgenstimmung uit Peer Gynt (1875), verschoven naar C.
# --------------------------------------------------------------------------
morgen = rij(0, ['G4', 'E4', 'D4', 'C4', 'D4', 'E4', 'G4', 'E4',
                 'G4', 'A4', 'G4', 'E4', 'D4', 'C4', 'D4', 'E4'], 0.5)

# --------------------------------------------------------------------------
# 5. Petzold, Menuet in G, BWV Anh. 114 (ca. 1725). Eerste vier maten.
# --------------------------------------------------------------------------
menuet = [(0, 'D5', 1)] + rij(1, ['G4', 'A4', 'B4', 'C5'], 0.5)
menuet += rij(3, ['D5', 'G4', 'G4'], 1)
menuet += [(6, 'E5', 1)] + rij(7, ['C5', 'D5', 'E5', 'F#5'], 0.5)
menuet += rij(9, ['G5', 'G4', 'G4'], 1)

# --------------------------------------------------------------------------
# 6. Beethoven, Für Elise (1810). Het hoofdthema, rechterhand.
#    Ritme vereenvoudigd van 3/8 naar 4/4.
# --------------------------------------------------------------------------
elise = rij(0, ['E5', 'D#5', 'E5', 'D#5', 'E5', 'B4', 'D5', 'C5'], 0.5)
elise += [(4, 'A4', 1)] + rij(5, ['C4', 'E4', 'A4'], 0.5)
elise += [(6.5, 'B4', 1)] + rij(7.5, ['E4', 'G#4', 'B4'], 0.5)
elise += [(9, 'C5', 1)] + rij(10, ['E4'], 0.5)
elise += rij(10.5, ['E5', 'D#5', 'E5', 'D#5', 'E5', 'B4', 'D5', 'C5'], 0.5)
elise += [(14.5, 'A4', 1.5)]

# --------------------------------------------------------------------------
# 7. Beethoven, Maanlichtsonate op. 27 nr. 2 (1801). De openingsmaten,
#    van cis klein naar a klein verschoven zodat alles wit wordt.
# --------------------------------------------------------------------------
maan = []
for maat_nr in range(2):
    maan.append((maat_nr * 4, ('A2', 'L'), 4))
    for tel in range(4):
        t0 = maat_nr * 4 + tel
        for j, n in enumerate(['E3', 'A3', 'C4']):
            maan.append((round(t0 + j / 3, 3), n, 0.333))


if __name__ == '__main__':
    os.makedirs(LIEDJES, exist_ok=True)
    bouw('ode-an-die-freude', 'Ode an die Freude', 'Beethoven', 96, 4, ode, 1,
         'Het bekendste thema uit de negende symfonie, in C. Vier tonen naast elkaar, '
         'alles wit, je hand hoeft niet te verschuiven.')
    bouw('canon-in-d', 'Canon in D', 'Pachelbel', 66, 4, canon, 2,
         'Naar C verschoven zodat alles wit blijft. Rechts de melodie, links de acht '
         'akkoorden waar half de popmuziek op geleend is.')
    bouw('prelude-in-c', 'Preludium in C', 'Bach', 60, 4, prelude, 3,
         'De eerste vier maten. Eén patroon dat zich blijft herhalen — ideaal om te leren '
         'lezen. Begin op 30 procent tempo.')
    bouw('morgenstimmung', 'Morgenstimmung', 'Grieg', 80, 4, morgen, 2,
         'Het ochtendthema uit Peer Gynt, naar C verschoven. Vijf tonen, allemaal wit.')
    bouw('menuet-in-g', 'Menuet in G', 'Petzold', 108, 3, menuet, 2,
         'Lang aan Bach toegeschreven, uit het notenboekje van Anna Magdalena. '
         'Eerste vier maten, in driekwartsmaat.')
    bouw('fur-elise', 'Für Elise', 'Beethoven', 84, 4, elise, 3,
         'Het hoofdthema, rechterhand alleen. Het ritme is vereenvoudigd naar vier kwart. '
         'Twee zwarte toetsen: de D# en de G#.')
    bouw('maanlichtsonate', 'Maanlichtsonate', 'Beethoven', 54, 4, maan, 3,
         'De openingsmaten, van cis klein naar a klein verschoven zodat alles wit wordt. '
         'Drie noten per tel, links één lange bastoon.')
