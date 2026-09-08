"""Toont de sporen van een MIDI-bestand met hun nootreeks, om een stuk uit te kiezen.

    python tools/bekijk.py "gekochte muziek/AC-DC/back_in_black.mid"
    python tools/bekijk.py bestand.mid --spoor 2 --van 0 --tot 32
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import midi
import analyse

NAMEN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
nm = lambda p: NAMEN[p % 12] + str(p // 12 - 1)


def main():
    a = argparse.ArgumentParser()
    a.add_argument('midi')
    a.add_argument('--spoor', type=int, default=None)
    a.add_argument('--van', type=float, default=0)
    a.add_argument('--tot', type=float, default=64)
    a.add_argument('--aantal', type=int, default=40)
    o = a.parse_args()

    m = midi.lees(o.midi)
    print('%s | %s bpm | maatsoort %d/%d | %d sporen' % (
        os.path.basename(o.midi), midi.bpm(m), m['maatsoort'][0], m['maatsoort'][1],
        len(m['sporen'])))

    if o.spoor is None:
        for sp in m['sporen']:
            k = analyse.kenmerken(m, sp)
            if not k:
                continue
            s = analyse.score(k)
            eerste = sp['noten'][0]
            print('  spoor %-2d %-26s %4d noten  %-8s poly %.1f  dicht %.2f  start tel %.0f  score %+.1f%s'
                  % (k['nr'], (k['naam'] or '?')[:26], k['aantal'],
                     nm(k['laag']) + '-' + nm(k['hoog']), k['poly'], k['dichtheid'],
                     midi.naar_tellen(m, eerste['start']), s,
                     '  <-- drums' if 9 in k['kanalen'] else ''))
        return

    sp = m['sporen'][o.spoor]
    print('spoor %d: %s' % (o.spoor, sp['naam'] or '?'))
    n = 0
    for x in sp['noten']:
        t = midi.naar_tellen(m, x['start'])
        if t < o.van or t >= o.tot:
            continue
        d = midi.naar_tellen(m, x['eind'] - x['start'])
        print('   tel %8.2f  maat %5.1f  %-5s duur %.2f' % (t, t / m['maatsoort'][0] + 1, nm(x['toon']), d))
        n += 1
        if n >= o.aantal:
            print('   ...')
            break


if __name__ == '__main__':
    main()
