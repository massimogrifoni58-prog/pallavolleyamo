"""
Scraper RISULTATI - Portale FIPAV Umbria (versione mobile)
===============================================================
Basato sull'approccio gia' testato e funzionante nel vecchio
progetto VolleyUmbriaBlog: il sito "mobile" del portale FIPAV
Umbria (umbria.portalefipav.net/mobile/risultati.asp) e' molto
piu' semplice da leggere rispetto alla versione desktop con i
filtri a tendina - basta un link diretto con CampionatoId.

Uso:
    python fetch_risultati.py --elenco   (mostra tutti i campionati disponibili)
    python fetch_risultati.py            (scarica i campionati configurati sotto)

Output:
    ../react-app/data/risultati.json
"""

import json
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime, timezone

BASE_URL = "https://umbria.portalefipav.net/mobile/risultati.asp"
HEADERS = {"User-Agent": "Mozilla/5.0"}

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "risultati.json"

# Nomi (anche parziali, case-insensitive) dei campionati che vogliamo
# scaricare. Modifica questa lista per aggiungere/togliere categorie.
CAMPIONATI_DI_INTERESSE = [
    "serie c maschile",
    "serie c femminile",
    "serie d maschile",
    "serie d femminile",
    "1 divisione",
    "prima divisione",
    "2 divisione",
    "seconda divisione",
    "under 12",
    "under 13",
    "under 14",
    "under 15",
    "under 16",
    "under 17",
    "under 18",
    "under 19",
    "coppa umbria",
]


def fetch_html(url):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.read().decode("utf-8", errors="ignore")
    except (urllib.error.HTTPError, urllib.error.URLError) as e:
        print(f"ERRORE scaricando {url}: {e}")
        sys.exit(1)


def get_indice_campionati():
    """Scarica la pagina indice e restituisce una lista di
    (campionato_id, nome_campionato)."""
    html = fetch_html(BASE_URL)
    soup = BeautifulSoup(html, "html.parser")

    campionati = []
    for link in soup.find_all("a", href=re.compile(r"CampionatoId=\d+")):
        match = re.search(r"CampionatoId=(\d+)", link["href"])
        if not match:
            continue
        campionato_id = match.group(1)
        nome = link.get_text(strip=True)
        if nome:
            campionati.append((campionato_id, nome))

    return campionati


def get_partite(campionato_id, nome_campionato):
    """Scarica e analizza le partite di un singolo campionato."""
    url = f"{BASE_URL}?CampionatoId={campionato_id}"
    html = fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")

    partite = []
    giornata_corrente = ""

    # Le partite e le intestazioni "Giornata N" sono mescolate nello
    # stesso flusso della pagina: scorriamo tutti gli elementi in
    # ordine, aggiornando la giornata corrente quando la troviamo.
    for el in soup.find_all(["a", "div", "span", "h2", "h3"]):
        text = el.get_text(strip=True)

        if text.lower().startswith("giornata"):
            giornata_corrente = text
            continue

        if el.name == "a" and "gara" in (el.get("class") or []):
            squadra_casa_el = el.find(class_="squadraCasa")
            squadra_ospite_el = el.find(class_="squadraOspite")
            set_casa_el = el.find(class_="setCasa")
            set_ospite_el = el.find(class_="setOspite")

            if not squadra_casa_el or not squadra_ospite_el:
                continue

            home_raw = squadra_casa_el.get_text(strip=True)
            away_raw = squadra_ospite_el.get_text(strip=True)
            set_casa = set_casa_el.get_text(strip=True) if set_casa_el else ""
            set_ospite = set_ospite_el.get_text(strip=True) if set_ospite_el else ""

            # Il punteggio (es. "3") e' annidato dentro lo stesso elemento
            # del nome squadra, quindi il testo finisce attaccato (es.
            # "NEW VOLLEY BORGO SANSEPOLCRO3"). Lo togliamo dalla fine.
            home = home_raw[: -len(set_casa)].strip() if set_casa and home_raw.endswith(set_casa) else home_raw
            away = away_raw[: -len(set_ospite)].strip() if set_ospite and away_raw.endswith(set_ospite) else away_raw

            if set_casa and set_ospite:
                score = f"{set_casa}-{set_ospite}"
                status = "disputata"
            else:
                score = "da disputare"
                status = "in programma"

            gara_id = None
            href = el.get("href", "")
            id_match = re.search(r"(\d{6,})", href)
            if id_match:
                gara_id = id_match.group(1)

            partite.append({
                "id": gara_id or f"{campionato_id}-{len(partite)}",
                "competition": nome_campionato,
                "giornata": giornata_corrente,
                "home": home,
                "away": away,
                "score": score,
                "status": status,
            })

    return partite


def main():
    if "--elenco" in sys.argv:
        print("Scarico l'indice dei campionati...")
        campionati = get_indice_campionati()
        for campionato_id, nome in campionati:
            print(f"   {campionato_id}\t{nome}")
        print(f"\nTotale: {len(campionati)} campionati trovati.")
        return

    print("Scarico l'indice dei campionati...")
    tutti_campionati = get_indice_campionati()

    da_scaricare = [
        (cid, nome) for cid, nome in tutti_campionati
        if any(keyword in nome.lower() for keyword in CAMPIONATI_DI_INTERESSE)
    ]

    if not da_scaricare:
        print("ATTENZIONE: nessun campionato corrisponde ai filtri configurati.")
        print("Usa --elenco per vedere i nomi esatti disponibili e aggiorna")
        print("la lista CAMPIONATI_DI_INTERESSE in questo script.")

    tutte_le_partite = []
    for campionato_id, nome in da_scaricare:
        print(f"Scarico '{nome}' (id={campionato_id})...")
        partite = get_partite(campionato_id, nome)
        print(f"    -> {len(partite)} partite trovate")
        tutte_le_partite.extend(partite)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({"generatedAt": datetime.now(timezone.utc).isoformat(), "matches": tutte_le_partite}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nSalvate {len(tutte_le_partite)} partite totali in: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
