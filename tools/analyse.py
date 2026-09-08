"""Herkent in een band-MIDI welk spoor de melodie is, en hoe moeilijk die is."""
import re

GOED = re.compile(r'voc|lead|melod|sing|voice|solo|piano|synth|flute|organ|string|guit', re.I)
SLECHT = re.compile(r'drum|perc|kick|snare|hat|tom|cymb|bass\b|bas\b', re.I)

# General MIDI: 0-7 piano, 16-23 orgel, 40-47 strijkers, 52-54 koor, 56-79 blazers/lead
GM_GOED = set(range(0, 8)) | set(range(16, 24)) | set(range(40, 48)) | set(range(52, 55)) | set(range(56, 80))
GM_BAS = set(range(32, 40))


def kenmerken(m, spoor):
    """Meet een spoor: bereik, dichtheid, meerstemmigheid."""
    n = spoor['noten']
    if not n:
        return None
    tonen = [x['toon'] for x in n]
    starts = {}
    for x in n:
        starts[x['start']] = starts.get(x['start'], 0) + 1
    poly = len(n) / len(starts)
    duur = max(x['eind'] for x in n) - min(x['start'] for x in n)
    tellen = duur / m['div'] or 1
    kanalen = sorted({x['kanaal'] for x in n})
    return dict(nr=spoor['nr'], naam=spoor['naam'] or '', kanalen=kanalen,
                aantal=len(n), laag=min(tonen), hoog=max(tonen),
                bereik=max(tonen) - min(tonen), poly=round(poly, 2),
                dichtheid=round(len(n) / tellen, 2),
                instr=sorted(set(spoor['instr'].values())))


def score(k):
    """Hoe waarschijnlijk is dit de melodie? Hoger is beter."""
    if 9 in k['kanalen']:          # kanaal 10 is altijd drums
        return -99
    if k['aantal'] < 20:
        return -99
    if k['bereik'] < 5:            # staande riff of pedaaltoon, geen melodie
        return -50
    if k['bereik'] > 30:           # meer dan 2,5 octaaf: geen handpositie
        return -20
    s = 0.0
    if GOED.search(k['naam']):
        s += 6
    if SLECHT.search(k['naam']):
        s -= 8
    if any(i in GM_GOED for i in k['instr']):
        s += 2
    if any(i in GM_BAS for i in k['instr']):
        s -= 5
    if k['poly'] < 1.15:           # eenstemmig = zingbaar
        s += 5
    elif k['poly'] > 2.5:
        s -= 4
    if 55 <= k['laag'] <= 72:      # ligt lekker onder de rechterhand
        s += 3
    if 12 <= k['bereik'] <= 24:
        s += 3
    if k['dichtheid'] > 4:         # meer dan 4 noten per tel: onspeelbaar
        s -= 6
    return round(s, 2)


def kandidaten(m, top=4):
    """Geef de beste melodiesporen, beste eerst."""
    uit = []
    for sp in m['sporen']:
        k = kenmerken(m, sp)
        if not k:
            continue
        k['score'] = score(k)
        uit.append(k)
    uit.sort(key=lambda k: -k['score'])
    return [k for k in uit if k['score'] > -20][:top]


def moeilijkheid(k, bpm):
    """1 = eerste week, 5 = ver weg."""
    p = 0
    p += 0 if k['bereik'] <= 12 else 1 if k['bereik'] <= 17 else 2
    nps = k['dichtheid'] * bpm / 60
    p += 0 if nps <= 2 else 1 if nps <= 3.5 else 2
    p += 0 if k['poly'] < 1.15 else 1 if k['poly'] < 2 else 2
    return min(5, 1 + p)


def zwarte_toetsen(tonen):
    """Hoeveel verschillende zwarte toetsen komen er voor?"""
    return len({t % 12 for t in tonen} & {1, 3, 6, 8, 10})


def beste_transpositie(tonen):
    """Zoek de verschuiving (-6..+6) met de minste zwarte toetsen."""
    beste, best_n = 0, 99
    for d in range(-6, 7):
        n = zwarte_toetsen([t + d for t in tonen])
        if n < best_n or (n == best_n and abs(d) < abs(beste)):
            beste, best_n = d, n
    return beste, best_n
