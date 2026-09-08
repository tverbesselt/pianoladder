"""Schrijft de kinderliedjes uit naar app/liedjes/.

Traditionele kinderliedjes, allemaal publiek domein en allemaal op witte
toetsen in C. Zelfde notatie als klassiek.py: (tel, toon, duur), met C4 als
middelste C en een kwartnoot als één tel.

    python tools/kinderliedjes.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from klassiek import bouw, rij, LIEDJES

# --------------------------------------------------------------------------
# 1. Hot Cross Buns. Drie tonen, het eenvoudigste liedje dat er is.
# --------------------------------------------------------------------------
buns = []
for m in (0, 4):
    buns += [(m, 'E4', 1), (m + 1, 'D4', 1), (m + 2, 'C4', 2)]
buns += rij(8, ['C4'] * 4, 0.5) + rij(10, ['D4'] * 4, 0.5)
buns += [(12, 'E4', 1), (13, 'D4', 1), (14, 'C4', 2)]

# --------------------------------------------------------------------------
# 2. Broeder Jacob (Vader Jacob, Frère Jacques). Vier zinnen, elk twee keer.
# --------------------------------------------------------------------------
jacob = []
jacob += rij(0, ['C4', 'D4', 'E4', 'C4'], 1) + rij(4, ['C4', 'D4', 'E4', 'C4'], 1)
for m in (8, 12):
    jacob += [(m, 'E4', 1), (m + 1, 'F4', 1), (m + 2, 'G4', 2)]
for m in (16, 20):
    jacob += rij(m, ['G4', 'A4', 'G4', 'F4'], 0.5) + [(m + 2, 'E4', 1), (m + 3, 'C4', 1)]
for m in (24, 28):
    jacob += [(m, 'C4', 1), (m + 1, 'G3', 1), (m + 2, 'C4', 2)]

# --------------------------------------------------------------------------
# 3. Altijd is Kortjakje ziek (Twinkle Twinkle / Ah! vous dirai-je, maman).
# --------------------------------------------------------------------------
def zin(start, a, b, c, slot):
    return rij(start, [a, a, b, b, c, c], 1) + [(start + 6, slot, 2)]

kortjakje = []
kortjakje += zin(0, 'C4', 'G4', 'A4', 'G4') + zin(8, 'F4', 'E4', 'D4', 'C4')
kortjakje += zin(16, 'G4', 'F4', 'E4', 'D4') + zin(24, 'G4', 'F4', 'E4', 'D4')
kortjakje += zin(32, 'C4', 'G4', 'A4', 'G4') + zin(40, 'F4', 'E4', 'D4', 'C4')

# --------------------------------------------------------------------------
# 4. Mary Had a Little Lamb (1830). Vijf tonen naast elkaar.
# --------------------------------------------------------------------------
mary = []
mary += rij(0, ['E4', 'D4', 'C4', 'D4'], 1) + rij(4, ['E4', 'E4'], 1) + [(6, 'E4', 2)]
mary += rij(8, ['D4', 'D4'], 1) + [(10, 'D4', 2)] + rij(12, ['E4', 'G4'], 1) + [(14, 'G4', 2)]
mary += rij(16, ['E4', 'D4', 'C4', 'D4'], 1) + rij(20, ['E4', 'E4', 'E4', 'E4'], 1)
mary += rij(24, ['D4', 'D4', 'E4', 'D4'], 1) + [(28, 'C4', 4)]

# --------------------------------------------------------------------------
# 5. Au clair de la lune (18e eeuw). Frans slaapliedje, ook in België bekend.
# --------------------------------------------------------------------------
def clair_a(start):
    return (rij(start, ['C4', 'C4', 'C4', 'D4'], 1) +
            [(start + 4, 'E4', 2), (start + 6, 'D4', 2)] +
            rij(start + 8, ['C4', 'E4', 'D4', 'D4'], 1) + [(start + 12, 'C4', 4)])

clair = clair_a(0) + clair_a(16)
clair += rij(32, ['D4', 'D4', 'D4', 'D4'], 1) + [(36, 'A3', 2), (38, 'A3', 2)]
clair += rij(40, ['D4', 'C4', 'B3', 'A3'], 1) + [(44, 'G3', 4)]
clair += clair_a(48)

# --------------------------------------------------------------------------
# 6. Old MacDonald Had a Farm. De eerste twee zinnen.
# --------------------------------------------------------------------------
def macdonald(start):
    return (rij(start, ['C4', 'C4', 'C4', 'G3'], 1) +
            rij(start + 4, ['A3', 'A3'], 1) + [(start + 6, 'G3', 2)] +
            rij(start + 8, ['E4', 'E4', 'D4', 'D4'], 1))

mac = macdonald(0) + [(12, 'C4', 3), (15, 'G3', 1)]
mac += macdonald(16) + [(28, 'C4', 4)]

# --------------------------------------------------------------------------
# 7. Hänschen klein (Lightly Row). Duits kinderliedje, eerste helft.
# --------------------------------------------------------------------------
hans = []
for m in (0, 16):
    hans += [(m, 'G4', 1), (m + 1, 'E4', 1), (m + 2, 'E4', 2)]
    hans += [(m + 4, 'F4', 1), (m + 5, 'D4', 1), (m + 6, 'D4', 2)]
hans += rij(8, ['C4', 'D4', 'E4', 'F4'], 1) + rij(12, ['G4', 'G4'], 1) + [(14, 'G4', 2)]
hans += rij(24, ['C4', 'E4', 'G4', 'G4'], 1) + [(28, 'C4', 4)]

# --------------------------------------------------------------------------
# 8. Alle meine Entchen. Een toonladder omhoog en weer naar beneden.
# --------------------------------------------------------------------------
entchen = rij(0, ['C4', 'D4', 'E4', 'F4'], 1) + [(4, 'G4', 2), (6, 'G4', 2)]
entchen += rij(8, ['A4'] * 4, 1) + [(12, 'G4', 4)]
entchen += rij(16, ['A4'] * 4, 1) + [(20, 'G4', 4)]
entchen += rij(24, ['F4'] * 4, 1) + [(28, 'E4', 2), (30, 'E4', 2)]
entchen += rij(32, ['D4'] * 4, 1) + [(36, 'C4', 4)]

# --------------------------------------------------------------------------
# 9. London Bridge Is Falling Down.
# --------------------------------------------------------------------------
def bridge(start):
    return [(start, 'G4', 1.5), (start + 1.5, 'A4', 0.5), (start + 2, 'G4', 1),
            (start + 3, 'F4', 1), (start + 4, 'E4', 1), (start + 5, 'F4', 1),
            (start + 6, 'G4', 2)]

london = bridge(0)
london += [(8, 'D4', 1), (9, 'E4', 1), (10, 'F4', 2), (12, 'E4', 1), (13, 'F4', 1), (14, 'G4', 2)]
london += bridge(16)
london += [(24, 'D4', 2), (26, 'G4', 2), (28, 'E4', 2), (30, 'C4', 2)]

# --------------------------------------------------------------------------
# 10. Jingle Bells (1857). Het refrein.
# --------------------------------------------------------------------------
def bells(start):
    n = []
    for m in (start, start + 4):
        n += [(m, 'E4', 1), (m + 1, 'E4', 1), (m + 2, 'E4', 2)]
    n += [(start + 8, 'E4', 1), (start + 9, 'G4', 1), (start + 10, 'C4', 1.5),
          (start + 11.5, 'D4', 0.5), (start + 12, 'E4', 4)]
    n += [(start + 16, 'F4', 1), (start + 17, 'F4', 1), (start + 18, 'F4', 1.5),
          (start + 19.5, 'F4', 0.5)]
    n += [(start + 20, 'F4', 1), (start + 21, 'E4', 1), (start + 22, 'E4', 1),
          (start + 23, 'E4', 0.5), (start + 23.5, 'E4', 0.5)]
    return n

jingle = bells(0)
jingle += rij(24, ['E4', 'D4', 'D4', 'E4'], 1) + [(28, 'D4', 2), (30, 'G4', 2)]
jingle += bells(32)
jingle += rij(56, ['G4', 'G4', 'F4', 'D4'], 1) + [(60, 'C4', 4)]

# --------------------------------------------------------------------------
# 11. Happy Birthday to You (1893). In driekwartsmaat, begint met een
#     opmaat: de eerste twee tellen zijn stil.
# --------------------------------------------------------------------------
birthday = []
for start, a, b, c in ((2, 'A3', 'G3', 'C4'), (8, 'A3', 'G3', 'D4')):
    birthday += [(start, 'G3', 0.5), (start + 0.5, 'G3', 0.5)]
    birthday += rij(start + 1, [a, b, c], 1)
birthday += [(6, 'B3', 2), (12, 'C4', 2)]
birthday += [(14, 'G3', 0.5), (14.5, 'G3', 0.5)] + rij(15, ['G4', 'E4', 'C4', 'B3', 'A3'], 1)
birthday += [(20, 'F4', 0.5), (20.5, 'F4', 0.5)] + rij(21, ['E4', 'C4', 'D4'], 1)
birthday += [(24, 'C4', 2)]


if __name__ == '__main__':
    os.makedirs(LIEDJES, exist_ok=True)
    bouw('hot-cross-buns', 'Hot Cross Buns', 'kinderliedje', 90, 4, buns, 1,
         'Drie tonen naast elkaar: E, D, C. Het eenvoudigste liedje van de lijst, '
         'begin hier als je nog nooit gespeeld hebt.')
    bouw('broeder-jacob', 'Broeder Jacob', 'kinderliedje', 100, 4, jacob, 1,
         'Ook bekend als Vader Jacob of Frère Jacques. Elke zin komt twee keer, '
         'dus je hoeft maar vier zinnetjes te leren. Let op de G onder de C op het einde.')
    bouw('kortjakje', 'Altijd is Kortjakje ziek', 'kinderliedje', 100, 4, kortjakje, 1,
         'Dezelfde melodie als Twinkle Twinkle Little Star. Elke toon komt twee keer, '
         'zes tonen van C tot A, alles wit.')
    bouw('mary-had-a-little-lamb', 'Mary Had a Little Lamb', 'kinderliedje', 100, 4, mary, 1,
         'Vijf tonen van C tot G, je hand blijft op één plek liggen.')
    bouw('au-clair-de-la-lune', 'Au clair de la lune', 'kinderliedje', 92, 4, clair, 1,
         'Frans slaapliedje. Het eerste zinnetje komt drie keer terug, met daartussen '
         'één zin die wat lager gaat, tot de G onder de C.')
    bouw('old-macdonald', 'Old MacDonald Had a Farm', 'kinderliedje', 104, 4, mac, 1,
         'De eerste twee zinnen. Begint op C en gaat een paar keer omlaag naar de G en A '
         'eronder.')
    bouw('hanschen-klein', 'Hänschen klein', 'kinderliedje', 108, 4, hans, 1,
         'Duits kinderliedje, in het Engels Lightly Row. De eerste helft. Vijf tonen '
         'van C tot G.')
    bouw('alle-meine-entchen', 'Alle meine Entchen', 'kinderliedje', 100, 4, entchen, 1,
         'Een toonladder omhoog van C tot A en dan stap voor stap weer naar beneden. '
         'Goed om de vingers 1 tot 5 na elkaar te leren gebruiken.')
    bouw('london-bridge', 'London Bridge Is Falling Down', 'kinderliedje', 100, 4, london, 1,
         'Zes tonen van C tot A. Het eerste ritme is een gepunte noot: lang-kort.')
    bouw('jingle-bells', 'Jingle Bells', 'kinderliedje', 110, 4, jingle, 1,
         'Het refrein, twee keer met een ander slot. Vijf tonen van C tot G, veel '
         'herhaalde E-noten.')
    bouw('happy-birthday', 'Happy Birthday to You', 'kinderliedje', 96, 3, birthday, 1,
         'In driekwartsmaat, met een opmaat: de eerste twee tellen zijn stil. Van de G '
         'onder de C tot de G erboven, alles wit.')
