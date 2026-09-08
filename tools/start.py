"""Start de webserver en opent de app in de browser.

Bindt eerst de poort en opent daarna pas het venster, zodat de browser nooit
voor een gesloten deur staat. Zoekt een vrije poort als 8123 al bezet is, en
kiest Chrome of Edge als die er zijn, want alleen die kennen Web MIDI.
"""
import os
import socket
import subprocess
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

WORTEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EERSTE_POORT = 8123

BROWSERS = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe'),
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
]


class Stil(SimpleHTTPRequestHandler):
    """Alleen fouten melden, niet elk opgehaald bestand."""

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=WORTEL, **kw)

    def do_GET(self):
        # Wie op de wortel belandt krijgt anders een mappenlijst te zien,
        # en denkt dan dat de app leeg is.
        if self.path in ('/', '/index.html', '/app', '/app/index.htm'):
            self.send_response(302)
            self.send_header('Location', '/app/')
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        # Nooit uit de cache serveren: anders zie je na een wijziging het oude scherm.
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def log_message(self, formaat, *args):
        if args and str(args[1]).startswith(('4', '5')):
            sys.stderr.write('  %s %s\n' % (args[1], args[0]))

    def log_error(self, *a):
        pass


class Server(ThreadingHTTPServer):
    # Op Windows laat SO_REUSEADDR je binden aan een poort die al bezet is.
    # Dan draaien er twee servers door elkaar en krijg je willekeurig de
    # verkeerde te pakken. Dus uitzetten.
    allow_reuse_address = False
    daemon_threads = True


def vrije_poort(vanaf, pogingen=20):
    """Zoek een poort waar echt nog niets op luistert."""
    for p in range(vanaf, vanaf + pogingen):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.3)
            if s.connect_ex(('127.0.0.1', p)) == 0:
                continue                    # er luistert al iets
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', p))    # zonder SO_REUSEADDR
                return p
            except OSError:
                continue
    return None


def open_browser(adres):
    for pad in BROWSERS:
        if os.path.exists(pad):
            try:
                subprocess.Popen([pad, adres])
                return os.path.basename(pad)
            except OSError:
                pass
    webbrowser.open(adres)
    return 'je standaardbrowser'


def main():
    if not os.path.isdir(os.path.join(WORTEL, 'app')):
        print('De map "app" staat niet naast tools. Klopt de mappenstructuur nog?')
        return 1

    poort = vrije_poort(EERSTE_POORT)
    if poort is None:
        print('Geen vrije poort gevonden tussen %d en %d.' % (EERSTE_POORT, EERSTE_POORT + 19))
        return 1

    server = Server(('127.0.0.1', poort), Stil)
    adres = 'http://localhost:%d/app/' % poort

    print()
    print('  Pianoladder draait.')
    print('  ' + adres)
    if poort != EERSTE_POORT:
        print('  (poort %d was bezet, dus ik gebruik %d)' % (EERSTE_POORT, poort))
    print()

    naam = open_browser(adres)
    print('  Geopend in %s.' % naam)
    print('  Werkt het niet? Plak het adres hierboven zelf in Chrome of Edge.')
    print()
    print('  Laat dit venster open zolang je speelt. Sluiten: Ctrl+C.')
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  Gestopt.')
    finally:
        server.server_close()
    return 0


if __name__ == '__main__':
    # De browser pas openen nadat de poort gebonden is, gebeurt hierboven al:
    # ThreadingHTTPServer luistert zodra hij aangemaakt is.
    sys.exit(main())
