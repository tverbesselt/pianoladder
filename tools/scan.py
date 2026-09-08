"""Leest de hele map 'gekochte muziek' en schrijft bibliotheek.json.

Per bestand: leesbaar of niet, gedetecteerd melodiespoor, moeilijkheidsgraad,
en of het muzikaal identiek is aan een ander bestand.
"""
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import midi
import analyse

WORTEL = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      'gekochte muziek')
UIT = os.path.join(os.path.dirname(WORTEL), 'bibliotheek.json')


def vingerafdruk(m):
    """Muzikale hash: de toonhoogtereeks van alle niet-drumsporen."""
    tonen = []
    for sp in m['sporen']:
        for n in sp['noten']:
            if n['kanaal'] != 9:
                tonen.append((n['start'], n['toon']))
    tonen.sort()
    ruw = ','.join(str(t) for _, t in tonen[:400])
    return hashlib.md5(ruw.encode()).hexdigest()[:16]


def titel(pad):
    naam = os.path.splitext(os.path.basename(pad))[0]
    naam = naam.replace('_', ' ').replace('-', ' ').strip()
    return ' '.join(w.capitalize() for w in naam.split())


def artiest(pad):
    delen = os.path.dirname(pad).replace(chr(92), '/').split('/')
    map_ = delen[0] if delen and delen[0] else ''
    map_ = map_.replace('_', ' ').strip()
    return ' '.join(w.capitalize() for w in map_.split()) or 'Onbekend'


def main():
    bestanden = []
    for wortel, mappen, namen in os.walk(WORTEL):
        mappen[:] = [m for m in mappen if not m.startswith(chr(95))]
        for n in namen:
            if n.lower().endswith(('.mid', '.midi')):
                vol = os.path.join(wortel, n)
                bestanden.append(os.path.relpath(vol, WORTEL))
    bestanden.sort()

    items, gezien = [], {}
    for rel in bestanden:
        vol = os.path.join(WORTEL, rel)
        item = dict(pad=rel.replace(os.sep, chr(47)), titel=titel(rel),
                    artiest=artiest(rel), status='ok')
        try:
            m = midi.lees(vol)
            if not any(sp['noten'] for sp in m['sporen']):
                raise midi.MidiFout('geen noten')
        except Exception as e:
            item['status'] = 'kapot'
            item['fout'] = str(e)[:80]
            items.append(item)
            continue

        vp = vingerafdruk(m)
        if vp in gezien:
            item['status'] = 'duplicaat'
            item['zelfde_als'] = gezien[vp]
        else:
            gezien[vp] = item['pad']

        bpm = midi.bpm(m)
        kand = analyse.kandidaten(m)
        item.update(bpm=bpm, sporen=len(m['sporen']),
                    maatsoort=list(m['maatsoort']), afdruk=vp,
                    kandidaten=kand)
        if kand:
            k = kand[0]
            item['moeilijkheid'] = analyse.moeilijkheid(k, bpm)
            tonen = []
            for n in m['sporen'][k['nr']]['noten']:
                tonen.append(n['toon'])
            d, zwart = analyse.beste_transpositie(tonen)
            item['transpositie'] = d
            item['zwarte_toetsen'] = zwart
        else:
            item['moeilijkheid'] = None
        items.append(item)

    with open(UIT, 'w', encoding='utf-8') as f:
        json.dump(dict(aantal=len(items), items=items), f,
                  ensure_ascii=False, indent=1)

    # Slanke versie voor de app: alleen wat de bladerlijst nodig heeft.
    # De volledige index is enkele honderden kilobytes en dat hoeft de
    # browser niet elke keer op te halen.
    kort = [
        dict(pad=i['pad'], titel=i['titel'], artiest=i['artiest'],
             bpm=i.get('bpm'), moeilijkheid=i['moeilijkheid'],
             zwarte_toetsen=i.get('zwarte_toetsen'),
             dubbel=1 if i['status'] == 'duplicaat' else 0)
        for i in items
        if i['status'] != 'kapot' and i.get('moeilijkheid')
    ]
    kort_pad = os.path.join(os.path.dirname(WORTEL), 'app', 'liedjes', 'bibliotheek-lijst.json')
    with open(kort_pad, 'w', encoding='utf-8') as f:
        json.dump(dict(aantal=len(kort), items=kort), f, ensure_ascii=False)
    print('lijst voor app :', len(kort), 'stukken,',
          round(os.path.getsize(kort_pad) / 1024), 'kB')

    ok = [i for i in items if i['status'] == 'ok']
    dup = [i for i in items if i['status'] == 'duplicaat']
    kapot = [i for i in items if i['status'] == 'kapot']
    print('bestanden      :', len(items))
    print('bruikbaar      :', len(ok))
    print('duplicaat      :', len(dup))
    print('kapot          :', len(kapot))
    for i in kapot:
        print('   -', i['pad'], '|', i.get('fout'))
    from collections import Counter
    c = Counter(i.get('moeilijkheid') for i in ok)
    print('moeilijkheid   :', dict(sorted((k, v) for k, v in c.items() if k)))
    print('geen melodie   :', c.get(None, 0))
    print('->', UIT)


if __name__ == '__main__':
    main()
