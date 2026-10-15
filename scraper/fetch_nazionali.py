"""
Scraper RISULTATI NAZIONALI - solo squadre umbre
================================================
Legge i calendari/risultati di legavolley.it (Superlega e Serie A3)
e tiene solo le partite delle squadre umbre.

Uso:
    python fetch_nazionali.py                     (scarica dal sito)
    python fetch_nazionali.py --prova 999 file.html [1001 file2.html ...]

Output:
    ../react-app/data/risultati_nazionali.json
"""

import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup

URL = "https://www.legavolley.it/calendario/?idCampionato={id}"
HEADERS = {"User-Agent": "Mozilla/5.0"}
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "risultati_nazionali.json"

# (idCampionato, nome campionato)
CAMPIONATI = [
    (999, "Superlega Girone Unico"),
    (1001, "Serie A3 Maschile Girone Bianco"),
    (1002, "Serie A3 Maschile Girone Blu"),
]

# Pezzi di nome (minuscolo) delle squadre umbre da tenere
SQUADRE_UMBRE = ["sir susa", "sir safety", "altotevere", "terni"]

RE_GIORNATA = re.compile(r"(\d+)\s*ª?\s*Giornata\s*(Andata|Ritorno)?", re.I)
RE_DATA = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{4})")
RE_ORA = re.compile(r"Ore\s*(\d{1,2}[:.]\d{2})", re.I)
RE_SCORE = re.compile(r"^(\d+)\s*-\s*(\d+)$")


def scarica(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="ignore")


def e_umbra(nome):
    n = nome.lower()
    return any(k in n for k in SQUADRE_UMBRE)


def pulisci(t):
    return re.sub(r"\s+", " ", t.replace("\xa0", " ")).strip()


def leggi_calendario(html, id_camp, nome_camp):
    soup = BeautifulSoup(html, "html.parser")
    tabelle = soup.find_all("table", id="GareGiornata")
    # 1) intestazioni di giornata + righe partita, in ordine di documento
    elementi = []
    for tr in soup.find_all("tr"):
        classi = tr.get("class") or []
        if tr.get("id") == "HeadCol":
            elementi.append(("testa", pulisci(tr.get_text(" "))))
        elif "tab-gara" in classi:
            elementi.append(("gara", tr))
    max_andata = 0
    for tipo, val in elementi:
        if tipo == "testa":
            m = RE_GIORNATA.search(val)
            if m and (m.group(2) or "").lower() != "ritorno":
                max_andata = max(max_andata, int(m.group(1)))
    risultati = []
    giornata_n = None
    for tipo, val in elementi:
        if tipo == "testa":
            m = RE_GIORNATA.search(val)
            if m:
                n = int(m.group(1))
                if (m.group(2) or "").lower() == "ritorno":
                    n += max_andata
                giornata_n = n
            continue
        celle = val.find_all("td")
        if len(celle) < 5:
            continue
        num = pulisci(celle[0].get_text())
        quando = pulisci(celle[1].get_text(" "))
        casa = pulisci(celle[2].get_text())
        ris = pulisci(celle[3].get_text())
        ospite = pulisci(celle[4].get_text())
        if not (e_umbra(casa) or e_umbra(ospite)):
            continue
        md = RE_DATA.search(quando)
        mo = RE_ORA.search(quando)
        data_iso = f"{md.group(3)}-{int(md.group(2)):02d}-{int(md.group(1)):02d}" if md else None
        data_txt = quando.replace("Ore", "ore") if quando else ""
        ms = RE_SCORE.match(ris)
        giocata = bool(ms) and not (ms.group(1) == "0" and ms.group(2) == "0")
        risultati.append({
            "id": f"lv{id_camp}-{num}",
            "competition": nome_camp,
            "giornata": f"Giornata {giornata_n}" if giornata_n else "Giornata",
            "home": casa.upper(),
            "away": ospite.upper(),
            "score": ris if giocata else "da disputare",
            "status": "disputata" if giocata else "in programma",
            "data": data_txt,
            "dataIso": data_iso,
            "ora": mo.group(1).replace(".", ":") if mo else None,
            "impianto": pulisci(celle[6].get_text(" - ")) if len(celle) > 6 else None,
        })
    return risultati


def main():
    tutte = []
    if len(sys.argv) > 1 and sys.argv[1] == "--prova":
        coppie = sys.argv[2:]
        nomi = dict(CAMPIONATI)
        for i in range(0, len(coppie), 2):
            idc = int(coppie[i])
            html = open(coppie[i + 1], encoding="utf-8").read()
            tutte += leggi_calendario(html, idc, nomi[idc])
    else:
        for idc, nome in CAMPIONATI:
            try:
                html = scarica(URL.format(id=idc))
                trovate = leggi_calendario(html, idc, nome)
                print(f"{nome}: {len(trovate)} partite di squadre umbre")
                tutte += trovate
            except Exception as e:
                print(f"ERRORE {nome}: {e}")
        if not tutte:
            print("Nessun dato scaricato: lascio il file com'e'.")
            return
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"generatedAt": datetime.now(timezone.utc).isoformat(), "matches": tutte},
                  f, ensure_ascii=False, indent=2)
    print(f"Salvato {OUTPUT_PATH} ({len(tutte)} partite)")


if __name__ == "__main__":
    main()
