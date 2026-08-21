"""
fetch_calendario_squadre.py
Scarica il calendario partite delle squadre umbre di club
(Sir Perugia, Terni Volley Academy) dal sito legavolley.it
Output: react-app/data/calendario_squadre.json
"""

import json
import re
import urllib.request
from pathlib import Path
from datetime import datetime, timezone
from bs4 import BeautifulSoup

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "calendario_squadre.json"
HEADERS = {"User-Agent": "Mozilla/5.0"}

SQUADRE_LEGAVOLLEY = [
    {
        "id": "sir-perugia",
        "nome": "Sir Susa Vim Perugia",
        "categoria": "Superlega",
        "url": "https://www.legavolley.it/calendario/?idCampionato=974",
        "nome_ricerca": ["sir susa", "perugia"],
    },
    {
        "id": "tva",
        "nome": "Terni Volley Academy",
        "categoria": "Serie A3",
        "url": "https://www.legavolley.it/calendario/?idCampionato=1002",
        "nome_ricerca": ["terni volley academy"],
    },
]


def parse_data_ora(testo):
    match = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", testo)
    ora_match = re.search(r"(\d{1,2}):(\d{2})", testo)
    if not match:
        return None, None
    giorno, mese, anno = match.groups()
    data_iso = f"{anno}-{int(mese):02d}-{int(giorno):02d}"
    ora = ora_match.group(0) if ora_match else None
    return data_iso, ora


def fetch_calendario_legavolley(squadra, debug=False):
    try:
        req = urllib.request.Request(squadra["url"], headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as response:
            html = response.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"  ERRORE scaricando {squadra['nome']}: {e}")
        return []

    soup = BeautifulSoup(html, "html.parser")
    partite = []

    rows = soup.find_all("tr")
    print(f"    Righe tabella trovate: {len(rows)}")

    if debug:
        count = 0
        for row in rows:
            testo = row.get_text(" ", strip=True)
            if testo and count < 8:
                print(f"    DEBUG riga: {testo[:120]}")
                count += 1

    for row in rows:
        testo_riga = row.get_text(" ", strip=True)
        testo_lower = testo_riga.lower()

        if not any(nome in testo_lower for nome in squadra["nome_ricerca"]):
            continue

        cells = row.find_all("td")
        if len(cells) < 5:
            continue

        data_ora_testo = cells[1].get_text(" ", strip=True) if len(cells) > 1 else ""
        casa = cells[2].get_text(strip=True) if len(cells) > 2 else ""
        risultato = cells[3].get_text(strip=True) if len(cells) > 3 else ""
        ospite = cells[4].get_text(strip=True) if len(cells) > 4 else ""
        impianto = cells[6].get_text(" ", strip=True) if len(cells) > 6 else ""

        data_iso, ora = parse_data_ora(data_ora_testo)
        if not data_iso:
            continue

        partite.append({
            "id": f"{squadra['id']}-{len(partite)}",
            "squadra": squadra["nome"],
            "categoria": squadra["categoria"],
            "data": data_iso,
            "ora": ora,
            "casa": casa,
            "ospite": ospite,
            "risultato": risultato if risultato and risultato != "-" else None,
            "impianto": impianto,
        })

    return partite


def main():
    tutte_partite = []

    for squadra in SQUADRE_LEGAVOLLEY:
        print(f"Scarico calendario {squadra['nome']}...", end=" ", flush=True)
        debug = (squadra["id"] == "tva")
        partite = fetch_calendario_legavolley(squadra, debug=debug)
        print(f"OK ({len(partite)} partite)")
        tutte_partite.extend(partite)

    tutte_partite.sort(key=lambda p: p["data"])

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "partite": tutte_partite,
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nSalvate {len(tutte_partite)} partite in: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
