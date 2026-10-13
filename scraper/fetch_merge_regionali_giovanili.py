"""
fetch_merge_regionali_giovanili.py
Dopo che fetch_calendario_fipav.py ha rigenerato calendario_regionali.json
(Serie C e D), questo script aggiunge i campionati giovanili (Under 17,
Under 19, 1 Divisione) leggendoli DIRETTAMENTE dal portale FIPAV Umbria,
con date e risultati ufficiali.
Se il sito FIPAV non risponde o i dati sono incompleti, usa come riserva
il backup data/giovanili_backup.json. Il backup viene aggiornato a ogni
esecuzione.

Uso:
    python fetch_merge_regionali_giovanili.py
"""

import json
from pathlib import Path

from fetch_calendario_fipav import fetch_campionato

BASE_DIR = Path(__file__).resolve().parent.parent
REGIONALI_PATH = BASE_DIR / "react-app" / "data" / "calendario_regionali.json"
GIOVANILI_BACKUP_PATH = BASE_DIR / "data" / "giovanili_backup.json"

URL_FIPAV = (
    "https://umbria.portalefipav.net/risultati-classifiche.aspx"
    "?ComitatoId=30&StId=2410&DataDa=&StatoGara=&CId={cid}&SId=&PId=7323&btFiltro=CERCA"
)

CATEGORIE_GIOVANILI = [
    "Under 17",
    "Under 19",
    "1 Divisione Femminile",
]

# (id nel sito, nome, numero campionato FIPAV)
GIOVANILI = [
    ("giov-under-17-femminile-elite", "Under 17 Femminile ELITE", 93441),
    ("giov-under-17-femminile-girone-a", "Under 17 Femminile Girone A", 93442),
    ("giov-under-17-femminile-girone-b", "Under 17 Femminile Girone B", 93443),
    ("giov-under-17-femminile-girone-c", "Under 17 Femminile Girone C", 93444),
    ("giov-under-17-femminile-girone-d", "Under 17 Femminile Girone D", 93445),
    ("giov-under-17-femminile-girone-e", "Under 17 Femminile Girone E", 93446),
    ("giov-under-17-femminile-girone-f", "Under 17 Femminile Girone F", 93447),
    ("giov-under-17-femminile-girone-g", "Under 17 Femminile Girone G", 93448),
    ("giov-under-19-femminile-elite", "Under 19 Femminile ELITE", 93238),
    ("giov-under-19-femminile-girone-a", "Under 19 Femminile Girone A", 93415),
    ("giov-under-19-femminile-girone-b", "Under 19 Femminile Girone B", 93416),
    ("giov-under-19-maschile-girone-a", "Under 19 Maschile Girone A", 93524),
    ("giov-under-19-maschile-girone-b", "Under 19 Maschile Girone B", 93525),
    ("giov-1-divisione-femminile-girone-a", "1 Divisione Femminile Girone A", 93004),
    ("giov-1-divisione-femminile-girone-b", "1 Divisione Femminile Girone B", 93005),
]


def carica_json(path):
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def main():
    regionali_data = carica_json(REGIONALI_PATH)
    campionati = regionali_data.get("campionati", [])
    partite = regionali_data.get("partite", {})

    backup = carica_json(GIOVANILI_BACKUP_PATH)
    backup_campionati = backup.get("campionati", [])
    backup_partite = backup.get("partite", {})

    id_esistenti = {c["id"] for c in campionati}

    # 1) Ripristina dal backup (riserva)
    for c in backup_campionati:
        if c["id"] not in id_esistenti:
            campionati.append(c)
            id_esistenti.add(c["id"])
    for cat_id, lista in backup_partite.items():
        partite[cat_id] = lista
    print(f"Backup giovanili: {len(backup_partite)} categorie")

    # 2) Aggiorna dal portale FIPAV
    aggiornati = 0
    da_riserva = 0
    for gid, nome, cid in GIOVANILI:
        url = URL_FIPAV.format(cid=cid)
        print(f"Scarico {nome}...", end=" ", flush=True)
        fresche = fetch_campionato({"id": gid, "nome": nome, "url": url})
        vecchie = partite.get(gid, [])
        if fresche and len(fresche) >= 0.8 * len(vecchie):
            partite[gid] = fresche
            giocate = sum(1 for p in fresche if p.get("risultato"))
            print(f"OK ({len(fresche)} partite, {giocate} con risultato)")
            aggiornati += 1
        else:
            print(f"ATTENZIONE: dati FIPAV incompleti ({len(fresche)} contro {len(vecchie)}), uso il backup")
            da_riserva += 1
        if gid not in id_esistenti:
            campionati.append({"id": gid, "nome": nome, "url": url})
            id_esistenti.add(gid)

    print(f"Giovanili aggiornati dalla FIPAV: {aggiornati}, dal backup: {da_riserva}")

    # 3) Salva il backup aggiornato
    giovanili_da_salvare = {
        "campionati": [c for c in campionati if any(cat in c["nome"] for cat in CATEGORIE_GIOVANILI)],
        "partite": {k: v for k, v in partite.items() if k.startswith("giov-")},
    }
    GIOVANILI_BACKUP_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(GIOVANILI_BACKUP_PATH, "w", encoding="utf-8") as f:
        json.dump(giovanili_da_salvare, f, ensure_ascii=False, indent=2)

    regionali_data["campionati"] = campionati
    regionali_data["partite"] = partite

    with open(REGIONALI_PATH, "w", encoding="utf-8") as f:
        json.dump(regionali_data, f, ensure_ascii=False, indent=2)

    totale = sum(len(v) for v in partite.values())
    print(f"Salvato calendario_regionali.json con {len(campionati)} campionati, {totale} partite totali")


if __name__ == "__main__":
    main()