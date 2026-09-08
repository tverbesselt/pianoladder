# Pianoladder

Leren pianospelen op je Roland FP-7, met riffs en melodieën uit je eigen MIDI-verzameling.

## Starten

Dubbelklik **start.bat**. Er opent vanzelf een browservenster met de app.
Laat het zwarte venster open zolang je speelt — dat is de webserver. Sluiten
doe je met Ctrl+C of door het venster weg te klikken.

In dat zwarte venster staat het adres, meestal `http://localhost:8123/app/`.
Gaat de browser niet vanzelf open, plak dat adres dan zelf in Chrome of Edge.
Is poort 8123 al bezet, dan pakt de starter de eerstvolgende vrije poort en
meldt dat.

> Open `app/index.html` niet rechtstreeks. De browser blokkeert dan het laden
> van de liedjes, de bibliotheek en Web MIDI.

**Verbinding geweigerd of het venster klapt meteen dicht?** Dan is er iets met
Python. De starter probeert eerst `py` (de Windows-launcher, staat in
`C:\Windows`) en dan `python`. Vindt hij geen van beide, dan zegt hij dat en
blijft het venster open staan zodat je het kunt lezen.

## Als er iets niet werkt

Open **`http://localhost:8123/app/controle.html`**. Die pagina test los van de app
of alles bereikbaar is: de liedjeslijst, de bibliotheeklijst, een MIDI uit je
verzameling, en alle scriptbestanden. Wat groen is, is in orde; wat rood is,
noemt de oorzaak.

Bovenin de app staat naast het woord *Pianoladder* een klein bouwnummer. Klopt
dat niet met wat je verwacht, dan draait je browser nog oude bestanden — ververs
met **Ctrl+Shift+R**.

## Je piano aansluiten

1. USB-kabel (type B, zo'n printerkabel) van **USB to Host** op de FP-7 naar je laptop.
2. Staat de FP-7 op **USB Driver: GENERIC**? Zo niet, zet hem daarop en herstart
   de piano — anders wacht hij op Roland's eigen driver en ziet de browser hem niet.
3. Gebruik **Chrome** of **Edge**. Firefox en Safari kennen Web MIDI niet.
4. De browser vraagt eenmalig toestemming voor MIDI. Zeg ja.

Het lampje rechtsboven wordt groen zodra de piano gevonden is, en ernaast staat
de naam van het apparaat. Het vakje daarnaast toont bij elke toets die je indrukt
de noot en de aanslagsterkte, bijvoorbeeld `C4 · aanslag 97`. Blijft daar
"nog geen noot ontvangen" staan terwijl het lampje groen is, dan is de piano wel
gevonden maar stuurt hij niets — controleer dan of hij op **Local Off** staat of
op een ander MIDI-kanaal zendt.

**Geen piano bij de hand?** Speel mee met je computertoetsenbord:
`z s x d c v g b h n j m` is één octaaf, `q 2 w 3 e r 5 t 6 y 7 u` het octaaf
erboven. Met de pijltjestoetsen verschuif je een octaaf. Klikken op het
schermklavier werkt ook.

## De twee modi

| Modus | Wat het doet |
|---|---|
| **Wachten** | De muziek staat stil tot je de juiste toets speelt. Zo leer je een stuk. |
| **Meespelen** | De muziek loopt door op het ingestelde tempo. Zo maak je het vloeiend. |

Met **Voorspelen** hoor je hoe het hoort te klinken, zonder zelf te spelen.
Het tempo staat standaard op 60% — zet het lager als het te snel gaat.

Oranje noten zijn voor de rechterhand, blauwe voor de linkerhand.

## De liedjes

Tweeëntwintig stuks in drie niveaus, plus elf kinderliedjes. De rock- en rapstukken komen uit je eigen
MIDI-verzameling; de klassieke stukken staan daar niet in en zijn met de hand
genoteerd in `tools/klassiek.py` — dat bestand kun je lezen en aanpassen, en met
`python tools/klassiek.py` schrijf je ze opnieuw weg.

| Niveau 1 | Niveau 2 | Niveau 3 |
|---|---|---|
| Iron Man | Back in Black | Under the Bridge |
| Another One Bites the Dust | Enter Sandman | Nothing Else Matters |
| Smells Like Teen Spirit | Nuthin' but a G Thang | Stan |
| Come As You Are | Keep Their Heads Ringin' | Für Elise |
| I'll Be Missing You | Changes | Maanlichtsonate |
| Ode an die Freude | Riders on the Storm · Good Riddance | Preludium in C |
| | Morgenstimmung · Canon in D · Menuet in G | |

### Kinderliedjes

Daarnaast staan er elf kinderliedjes in een eigen groep bovenaan de
keuzelijst, allemaal alleen rechterhand en alleen witte toetsen. Ze zijn
bedoeld om mee te beginnen als de rock- en rapriffs nog te snel gaan. In
volgorde van moeilijkheid:

| Liedje | Tonen | Bijzonderheid |
|---|---|---|
| Hot Cross Buns | E D C | drie tonen, het eenvoudigste stuk van de lijst |
| Broeder Jacob | G3 tot A4 | elke zin komt twee keer |
| Mary Had a Little Lamb | C tot G | de hand blijft op één plek |
| Altijd is Kortjakje ziek | C tot A | dezelfde melodie als Twinkle Twinkle |
| Alle meine Entchen | C tot A | een toonladder op en neer |
| Hänschen klein | C tot G | eerste helft |
| Au clair de la lune | G3 tot E4 | Frans slaapliedje |
| Old MacDonald Had a Farm | G3 tot E4 | eerste twee zinnen |
| London Bridge Is Falling Down | C tot A | begint met een gepunte noot |
| Jingle Bells | C tot G | het refrein |
| Happy Birthday to You | G3 tot G4 | driekwartsmaat, begint met een opmaat |

Ze staan genoteerd in `tools/kinderliedjes.py`, op dezelfde manier als de
klassieke stukken; met `python tools/kinderliedjes.py` schrijf je ze opnieuw
weg. In `app/liedjes/index.json` hebben ze `"soort": "kind"`, daaraan herkent
de app dat ze in de aparte groep horen.

Bij de klassieke stukken is een en ander vereenvoudigd, en dat staat er telkens
bij: de Canon, Morgenstimmung en de Maanlichtsonate zijn naar een toonaard
zonder zwarte toetsen verschoven, van Für Elise is het ritme van 3/8 naar 4/4
teruggebracht, en van het Preludium en het Menuet zijn alleen de eerste vier
maten uitgeschreven.

## Kiezen uit je eigen MIDI-bestanden

Bovenaan de keuzelijst **Liedje** staat de regel *▸ Kies uit je eigen
MIDI-bestanden…*; rechts ernaast staat dezelfde knop **Mijn MIDI-bestanden…**.
Allebei openen ze je hele verzameling, gesorteerd op moeilijkheid — 422 stukken
waar de app een speelbare melodie in gevonden heeft.

Kies een stuk en je doorloopt drie stappen:

1. **Welk spoor is de melodie?** De app zet de vier beste kandidaten bovenaan.
   Klik op ▶ om te horen welke het is — dat is betrouwbaarder dan raden.
   Bij het wisselen van spoor springt de app meteen naar de maat waar dat
   spoor begint, want maat 1 is vaak nog stil.
2. **Welk stuk?** Vanaf welke maat, en hoeveel maten. Met **volgende ▸**
   schuif je één blok verder.
3. **Hoe eenvoudig?** Vier trappen:

| Trap | Rechterhand | Linkerhand |
|---|---|---|
| 1 | melodie | stil |
| 2 | melodie | één grondtoon per maat |
| 3 | melodie | grondtoon en kwint, in ritme |
| 4 | melodie | volledige drieklanken |

Daaronder staat wat eruit komt: hoeveel noten, welk bereik, hoeveel zwarte
toetsen. Met **naar witte toetsen verschuiven** aan zoekt de app de toonaard
met de minste zwarte toetsen. Botsen je handen, dan tilt hij de melodie
vanzelf een octaaf op.

Met **eigen MIDI…** sleep je een bestand van buiten de map naar binnen.

### Wat de motor wel en niet kan

De grondtonen worden per maat afgeleid uit het bas-spoor. Dat klopt meestal,
maar niet altijd: bij een maat met veel doorgangsnoten kan er een verkeerde
grondtoon uitkomen. Majeur of mineur wordt bepaald door te tellen welke terts
er vaker klinkt. Het is een goede eerste versie om op te oefenen, geen
uitgeschreven arrangement.

## Wat er in deze map zit

```
gekochte muziek/          jouw MIDI-bestanden (onaangeroerd)
gekochte muziek/_kapot/   twee onleesbare bestanden, apart gezet
bibliotheek.json          index van alle bestanden
app/                      de applicatie
  liedjes/                de kant-en-klare liedjes
tools/                    het gereedschap
start.bat                 starten
```

## De index opnieuw opbouwen

Na het toevoegen van MIDI's:

```bash
python tools/scan.py
```

Per bestand komt daarin: **status** (`ok`, `duplicaat`, `kapot`), de
**kandidaten** voor het melodiespoor, de **moeilijkheid** 1–5, de beste
**transpositie** en hoeveel **zwarte_toetsen** er dan overblijven.
Duplicaten worden gevonden op de nootreeks zelf, niet op bestandsnaam.

Sporen waar meerdere instrumenten door elkaar op staan, worden automatisch
per MIDI-kanaal uit elkaar geknipt. Zonder dat blijven bestanden als
Bohemian Rhapsody onbruikbaar.

## Een liedje vast in de lijst zetten

Wat je in de bibliotheek maakt, is er voor die ene keer. Wil je iets
permanent in de keuzelijst, gebruik dan het gereedschap:

```bash
python tools/bekijk.py "gekochte muziek/QUEEN/we_will_rock_you.mid"
```

Dat toont de sporen met hun score. Kies er een en knip een stuk uit:

```bash
python tools/extract.py "gekochte muziek/QUEEN/we_will_rock_you.mid" --spoor 3 --van 0 --tot 16 --transp -2 --id we-will-rock-you --titel "We Will Rock You" --artiest "Queen" --niveau 2 --lus
```

| Schakelaar | Betekenis |
|---|---|
| `--spoor` | welk spoor uit de MIDI |
| `--van` / `--tot` | van welke tel tot welke tel |
| `--transp` | halve tonen verschuiven, om zwarte toetsen te vermijden |
| `--octaaf` | hele octaven verschuiven |
| `--stem laag\|hoog` | uit akkoorden alleen de onderste of bovenste noot |
| `--maat` / `--lengte` | maatsoort en lengte overschrijven als de MIDI ze fout heeft |
| `--raster` | ritme afronden, standaard op zestienden (0.25) |
| `--lus` | het stukje blijft herhalen |

Zet het nieuwe liedje daarna in `app/liedjes/index.json`, anders verschijnt het
niet in de keuzelijst. Om te zien welke sporen en maten je kunt gebruiken,
helpt `tools/bekijk.py bestand.mid --spoor 3 --van 0 --tot 32`.

## Online versie

De app staat ook op GitHub Pages, zodat je hem op elke computer met een
browser kunt openen zonder start.bat:

    https://tverbesselt.github.io/pianoladder/

Daar zit alles in behalve de map `gekochte muziek`: die bestanden zijn gekocht
en blijven thuis. De knop **Mijn MIDI-bestanden…** verdwijnt online dus
vanzelf. Een eigen MIDI vanaf je computer slepen kan wel nog.

Web MIDI werkt online alleen via https, en dat regelt GitHub Pages zelf.
Chrome of Edge blijft nodig.

Iets aangepast? Dan zet je het zo opnieuw online:

```bash
git add -A
git commit -m "wat je veranderd hebt"
git push
```

Een minuut later staat het er. GitHub Pages bewaart bestanden tot tien
minuten in de cache; zie je nog het oude bouwnummer, ververs dan met
**Ctrl+Shift+R**.

## Wat er nog niet in zit

- Bladmuzieknotatie naast de vallende noten
- Pedaal
- Oefenen per stukje (een moeilijke maat apart herhalen)
- Vingerzetting
