"""
applica_pallavolo_umbria.py

Aggiunge a PallaVolleyAmo la pagina "Pallavolo Umbria":
  1. copia pallavolo-umbria.json in data/ (solo se non esiste gia')
  2. modifica src/App.jsx: import, componente, route, route valide, voce di menu
  3. lancia npm run build
  4. su tua conferma, fa commit e push

Uso (dalla cartella react-app, con i tre file qui accanto):
    python applica_pallavolo_umbria.py
    python applica_pallavolo_umbria.py --solo-modifiche   (si ferma dopo aver modificato App.jsx)

Si puo' rilanciare senza danni: quello che c'e' gia' non viene duplicato.
"""

import re
import shutil
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
APP = BASE / "src" / "App.jsx"
JSON_SRC = BASE / "pallavolo-umbria.json"
JSON_DST = BASE / "data" / "pallavolo-umbria.json"
COMP_SRC = BASE / "PallavoloUmbriaPage.jsx"
BACKUP = BASE / "App.jsx.backup-prima-di-pallavolo-umbria"
SOLO_MODIFICHE = "--solo-modifiche" in sys.argv


def leggi(percorso):
    with open(percorso, "r", encoding="utf-8", newline="") as f:
        return f.read()


def scrivi(percorso, testo):
    with open(percorso, "w", encoding="utf-8", newline="") as f:
        f.write(testo)


def esci(messaggio, codice=1):
    print(messaggio)
    sys.exit(codice)


if not APP.exists():
    esci("Non trovo src/App.jsx. Metti questo script nella cartella react-app e lancialo da li'.")
if not COMP_SRC.exists():
    esci("Manca PallavoloUmbriaPage.jsx accanto allo script.")
if not JSON_DST.exists() and not JSON_SRC.exists():
    esci("Manca pallavolo-umbria.json accanto allo script.")

testo = leggi(APP)
eol = "\r\n" if "\r\n" in testo else "\n"


def conv(s):
    return s.replace("\r\n", "\n").replace("\n", eol)


nuovo = testo
fatte = []
errori = []


def una_sola(pattern, descrizione):
    trovati = list(re.finditer(pattern, nuovo, re.M))
    if len(trovati) != 1:
        errori.append(f"{descrizione}: trovato {len(trovati)} volte, ne serve esattamente 1")
        return None
    return trovati[0]


# 1. import del file dati
if "pallavoloUmbriaData" not in nuovo:
    m = una_sola(r'^[ \t]*import calendarioSquadreData from [^\n]*\n', "riga di import di calendarioSquadreData")
    if m:
        riga = 'import pallavoloUmbriaData from "../data/pallavolo-umbria.json";' + eol
        nuovo = nuovo[:m.end()] + riga + nuovo[m.end():]
        fatte.append("aggiunto l'import del file dati")

# 2. componente della pagina, prima di export default function App
if "function PallavoloUmbriaPage" not in nuovo:
    m = una_sola(r'^export default function App\s*\(', "riga export default function App")
    if m:
        comp = leggi(COMP_SRC).strip("\r\n")
        nuovo = nuovo[:m.start()] + conv(comp) + eol + eol + nuovo[m.start():]
        fatte.append("aggiunta la funzione PallavoloUmbriaPage")

# 3. route
if 'route === "pallavolo-umbria"' not in nuovo:
    m = una_sola(r'^([ \t]*)\{route === "privacy" && <PrivacyPage />\}[ \t]*\r?\n', "route di privacy")
    if m:
        riga = m.group(1) + '{route === "pallavolo-umbria" && <PallavoloUmbriaPage />}' + eol
        nuovo = nuovo[:m.end()] + riga + nuovo[m.end():]
        fatte.append("aggiunta la route pallavolo-umbria")

# 4. elenco delle route valide
if not re.search(r'"pallavolo-umbria"\s*\]\.includes\(route\)', nuovo):
    ancora = "].includes(route) && <NotFoundPage />"
    if nuovo.count(ancora) != 1:
        errori.append(f"elenco route valide: ancora trovata {nuovo.count(ancora)} volte, ne serve esattamente 1")
    else:
        nuovo = nuovo.replace(ancora, ',"pallavolo-umbria"' + ancora)
        fatte.append("aggiunta pallavolo-umbria all'elenco delle route valide")

# 5. voce di menu (nel menu Notizie, dopo News Squadre)
if 'href: "#/pallavolo-umbria"' not in nuovo:
    m = una_sola(r'^([ \t]*)\{\s*href:\s*"#/squadre-top"[^\n]*\},[ \t]*\r?\n', "voce di menu News Squadre")
    if m:
        riga = m.group(1) + '{ href: "#/pallavolo-umbria", label: "Pallavolo Umbria", locked: true },' + eol
        nuovo = nuovo[:m.end()] + riga + nuovo[m.end():]
        fatte.append("aggiunta la voce di menu Pallavolo Umbria")

if errori:
    print("NON HO MODIFICATO NIENTE. Problemi trovati:")
    for e in errori:
        print(" -", e)
    esci("Mandami questo messaggio e sistemiamo.")

modificato = nuovo != testo
if modificato:
    if not BACKUP.exists():
        shutil.copyfile(APP, BACKUP)
        print(f"Copia di sicurezza: {BACKUP.name}")
    scrivi(APP, nuovo)
    print("Modifiche a src/App.jsx:")
    for f in fatte:
        print("  -", f)
else:
    print("src/App.jsx e' gia' a posto, niente da modificare.")

if not JSON_DST.exists():
    JSON_DST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(JSON_SRC, JSON_DST)
    print("Copiato pallavolo-umbria.json in data/")
else:
    print("data/pallavolo-umbria.json esiste gia': non lo tocco.")

if SOLO_MODIFICHE:
    esci("Fatto (--solo-modifiche). Mi fermo qui.", 0)

print("\nEseguo npm run build (ci vuole qualche secondo)...")
r = subprocess.run("npm run build", shell=True, cwd=BASE)
if r.returncode != 0:
    if modificato:
        shutil.copyfile(BACKUP, APP)
        print("La build e' fallita: ho rimesso App.jsx com'era prima.")
    esci("Incollami l'errore che vedi qui sopra.")

risposta = input("\nBuild riuscita. Pubblico ora (commit e push)? [s/N] ").strip().lower()
if risposta != "s":
    esci("Non ho pubblicato. Puoi provare con npm run dev, poi rilancia lo script per pubblicare.", 0)

FILE_DA_PUBBLICARE = ["src/App.jsx", "data/pallavolo-umbria.json"]


def git(*args):
    return subprocess.run(["git", *args], cwd=BASE)


git("add", *FILE_DA_PUBBLICARE)
if git("diff", "--cached", "--quiet", "--", *FILE_DA_PUBBLICARE).returncode == 0:
    print("Niente da committare: e' gia' tutto nel repository.")
elif git("commit", "-m", "Aggiunge pagina Pallavolo Umbria", "--", *FILE_DA_PUBBLICARE).returncode != 0:
    esci("Il commit non e' riuscito. Incollami il messaggio qui sopra.")

if git("pull", "--rebase", "--autostash", "origin", "main").returncode != 0:
    esci("Il pull non e' riuscito (forse un conflitto). Non ho pubblicato. Incollami il messaggio qui sopra.")

if git("push", "origin", "main").returncode != 0:
    esci("Il push non e' riuscito. Incollami il messaggio qui sopra.")

print("\nFatto: pubblicato. Controlla il sito tra qualche minuto.")
git("log", "--oneline", "-2")