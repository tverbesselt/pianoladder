"""Haalt een speelbare partij uit een band-MIDI en schrijft er een liedbestand van.

Voorbeeld:
    python tools/extract.py "gekochte muziek/BLACK SABBATH/ironman.mid" \
        --spoor 1 --van 40 --tot 56 --transp -1 \
        --id ironman --titel "Iron Man" --artiest "Black Sabbath" --niveau 1 --lus
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import midi
import analyse

HIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIEDJES = os.path.join(HIER, 'app', 'liedjes')
NAMEN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def noot_naam(p):
    return NAMEN[p % 12] + str(p // 12 - 1)


def kwantiseer(waarde, raster):
    return round(waarde / raster) * raster


def haal(pad, spoor, van, tot, transp, raster, octaaf, stem='alles'):
    m = midi.lees(pad)
    sp = m['sporen'][spoor]
    ruw = []
    for n in sp['noten']:
        t = midi.naar_tellen(m, n['start'])
        if t < van - 1e-6 or t >= tot - 1e-6:
            continue
        d = midi.naar_tellen(m, n['eind'] - n['start'])
        ruw.append(dict(
            t=round(kwantiseer(t - van, raster), 4),
            d=round(max(raster, kwantiseer(d, raster)), 4),
            p=n['toon'] + transp + 12 * octaaf,
            h='R',
        ))

    if stem in ('laag', 'hoog'):
        # uit elk akkoord alleen de onderste of bovenste noot houden
        per_tijd = {}
        for n in ruw:
            vorig = per_tijd.get(n['t'])
            if vorig is None or (n['p'] < vorig['p'] if stem == 'laag' else n['p'] > vorig['p']):
                per_tijd[n['t']] = n
        ruw = list(per_tijd.values())

    uit = ruw
    uit.sort(key=lambda n: (n['t'], n['p']))
    # dubbele noten op dezelfde plek weggooien (unisono-verdubbeling)
    schoon, gezien = [], set()
    for n in uit:
        sleutel = (n['t'], n['p'])
        if sleutel in gezien:
            continue
        gezien.add(sleutel)
        schoon.append(n)
    return m, schoon


def main():
    a = argparse.ArgumentParser()
    a.add_argument('midi')
    a.add_argument('--spoor', type=int, required=True)
    a.add_argument('--van', type=float, default=0)
    a.add_argument('--tot', type=float, default=1e9)
    a.add_argument('--transp', type=int, default=0)
    a.add_argument('--octaaf', type=int, default=0, help='hele octaven verschuiven')
    a.add_argument('--stem', choices=['alles','laag','hoog'], default='alles', help='uit akkoorden alleen de onderste of bovenste noot houden')
    a.add_argument('--raster', type=float, default=0.25)
    a.add_argument('--id', required=True)
    a.add_argument('--titel', required=True)
    a.add_argument('--artiest', default='')
    a.add_argument('--niveau', type=int, default=1)
    a.add_argument('--lus', action='store_true')
    a.add_argument('--toelichting', default='')
    a.add_argument('--bpm', type=float, default=None)
    a.add_argument('--maat', type=int, default=None, help='maatsoort overschrijven, bv. 4')
    a.add_argument('--lengte', type=float, default=None, help='lengte in tellen overschrijven')
    o = a.parse_args()

    m, noten = haal(o.midi, o.spoor, o.van, o.tot, o.transp, o.raster, o.octaaf, o.stem)
    if not noten:
        sys.exit('geen noten in dat bereik gevonden')

    tonen = [n['p'] for n in noten]
    lengte = max(n['t'] + n['d'] for n in noten)
    maat = o.maat or m['maatsoort'][0]
    lied = dict(
        id=o.id, titel=o.titel, artiest=o.artiest,
        bron=os.path.relpath(o.midi, HIER).replace(os.sep, chr(47)),
        spoor=o.spoor, spoornaam=m['sporen'][o.spoor]['naam'] or '',
        bpm=round(o.bpm or midi.bpm(m)), maatsoort=[maat, 4],
        transpositie=o.transp + 12 * o.octaaf,
        niveau=o.niveau, lus=o.lus, toelichting=o.toelichting,
        lengte=o.lengte or (round(lengte / maat + 0.4) * maat if maat else lengte),
        laag=min(tonen), hoog=max(tonen),
        zwart=analyse.zwarte_toetsen(tonen),
        noten=noten,
    )

    os.makedirs(LIEDJES, exist_ok=True)
    uit = os.path.join(LIEDJES, o.id + '.json')
    with open(uit, 'w', encoding='utf-8') as f:
        json.dump(lied, f, ensure_ascii=False, indent=1)

    reeks = ' '.join(noot_naam(n['p']) for n in noten)
    print('%s  ->  %s' % (o.titel, uit))
    print('  %d noten, %g tellen, bereik %s-%s, %d zwarte toetsen' % (
        len(noten), lied['lengte'], noot_naam(lied['laag']),
        noot_naam(lied['hoog']), lied['zwart']))
    print('  ' + reeks)


if __name__ == '__main__':
    main()
