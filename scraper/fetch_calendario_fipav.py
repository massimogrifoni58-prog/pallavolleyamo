"""
fetch_calendario_fipav.py
Scarica automaticamente il calendario di campionati regionali
dal portale FIPAV Umbria (formato tabella con date e risultati)
Output: react-app/data/calendario_regionali.json

Uso:
    python fetch_calendario_fipav.py
"""

import json
import re
import urllib.request
from pathlib import Path
from datetime import datetime, timezone
from bs4 import BeautifulSoup

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "calendario_regionali.json"
HEADERS = {"User-Agent": "Mozilla/5.0"}

# Campionati regionali da monitorare - aggiungi qui altri CId/PId quando li trovi
CAMPIONATI = [
    {
        "id": "serie-c-maschile",
        "nome": "Serie C Maschile Girone Unico",
        "url": "https://umbria.portalefipav.net/risultati-classifiche.aspx?ComitatoId=30&StId=2410&DataDa=&StatoGara=&CId=92680&SId=&PId=7323&btFiltro=CERCA",
    },
    {
        "id": "serie-c-femminile",
        "nome": "Serie C Femminile Girone Unico",
        "url": "https://umbria.portalefipav.net/risultati-classifiche.aspx?ComitatoId=30&StId=2410&DataDa=&StatoGara=&CId=92698&SId=&PId=7323&btFiltro=CERCA",
    },
    {
        "id": "serie-d-femminile-a",
        "nome": "Serie D Femminile Girone A",
        "url": "https://umbria.portalefipav.net/risultati-classifiche.aspx?ComitatoId=30&StId=2410&DataDa=&StatoGara=&CId=92699&SId=&PId=7323&btFiltro=CERCA",
    },
    {
        "id": "serie-d-femminile-b",
        "nome": "Serie D Femminile Girone B",
        "url": "https://umbria.portalefipav.net/risultati-classifiche.aspx?ComitatoId=30&StId=2410&DataDa=&StatoGara=&CId=92700&SId=&PId=7323&btFiltro=CERCA",
    },
]


def parse_data_ora(testo):
    """Converte 'GG/MM/AA HH:MM' in data ISO e ora separate"""
    match = re.search(r"(\d{2})/(\d{2})/(\d{2})\s+(\d{2}):(\d{2})", testo)
    if not match:
        return None, None
    giorno, mese, anno, ora, minuto = match.groups()
    anno_completo = f"20{anno}"
    data_iso = f"{anno_completo}-{mese}-{giorno}"
    return data_iso, f"{ora}:{minuto}"


def fetch_campionato(campionato):
    try:
        req = urllib.request.Request(campionato["url"], headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as response:
            html = response.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"  ERRORE: {e}")
        return []

    soup = BeautifulSoup(html, "html.parser")
    partite = []

    rows = soup.find_all("tr")
    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 6:
            continue

        testi = [c.get_text(strip=True) for c in cells]

        # Cerca la colonna con la data (formato GG/MM/AA HH:MM)
        data_ora_testo = None
        giornata = None
        casa = None
        ospite = None
        risultato = None

        for i, t in enumerate(testi):
            if re.match(r"\d{2}/\d{2}/\d{2}\s+\d{2}:\d{2}", t):
                data_ora_testo = t
                if i >= 1:
                    giornata = testi[i - 1]
                if i + 1 < len(testi):
                    casa = testi[i + 1]
                if i + 2 < len(testi):
                    ospite = testi[i + 2]
                if i + 3 < len(testi):
                    risultato = testi[i + 3]
                break

        if not data_ora_testo or not casa or not ospite:
            continue

        data_iso, ora = parse_data_ora(data_ora_testo)
        if not data_iso:
            continue

        partite.append({
            "id": f"{campionato['id']}-{len(partite)}",
            "campionato": campionato["nome"],
            "giornata": giornata,
            "data": data_iso,
            "ora": ora,
            "casa": casa,
            "ospite": ospite,
            "risultato": risultato if risultato and risultato != "-" else None,
        })

    return partite


def main():
    tutte_partite = {}

    for campionato in CAMPIONATI:
        print(f"Scarico {campionato['nome']}...", end=" ", flush=True)
        partite = fetch_campionato(campionato)
        print(f"OK ({len(partite)} partite)")
        tutte_partite[campionato["id"]] = partite

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "campionati": CAMPIONATI,
            "partite": tutte_partite,
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    totale = sum(len(v) for v in tutte_partite.values())
    print(f"\nSalvate {totale} partite in: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
