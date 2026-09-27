"""
fetch_merge_regionali_giovanili.py
Dopo che fetch_calendario_fipav.py ha rigenerato calendario_regionali.json
(con solo Serie C M/F e Serie D F, sovrascrivendo tutto), questo script
reinserisce le partite dei campionati giovanili (Under 17, Under 19,
1 Divisione) che erano state aggiunte manualmente da Excel, leggendole
da un backup separato mantenuto in data/giovanili_backup.json.

Se il backup non esiste ancora, lo crea dal file attuale (prima esecuzione).

Uso:
    python fetch_merge_regionali_giovanili.py
"""

import json
from pathlib import Path

REGIONALI_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "calendario_regionali.json"
GIOVANILI_BACKUP_PATH = Path(__file__).resolve().parent.parent / "data" / "giovanili_backup.json"

CATEGORIE_GIOVANILI = [
    "Under 17",
    "Under 19",
    "1 Divisione Femminile",
]


def main():
    with open(REGIONALI_PATH, "r", encoding="utf-8") as f:
        regionali_data = json.load(f)

    campionati = regionali_data.get("campionati", [])
    partite = regionali_data.get("partite", {})

    # Se esiste un backup dei giovanili, lo ripristiniamo (fetch_calendario_fipav.py
    # sovrascrive tutto il file, quindi le categorie giovanili vengono perse)
    if GIOVANILI_BACKUP_PATH.exists():
        with open(GIOVANILI_BACKUP_PATH, "r", encoding="utf-8") as f:
            backup = json.load(f)

        backup_campionati = backup.get("campionati", [])
        backup_partite = backup.get("partite", {})

        id_esistenti = {c["id"] for c in campionati}
        for c in backup_campionati:
            if c["id"] not in id_esistenti:
                campionati.append(c)
                id_esistenti.add(c["id"])

        for cat_id, lista in backup_partite.items():
            partite[cat_id] = lista

        print(f"Ripristinate {len(backup_partite)} categorie giovanili dal backup")
    else:
        print("Nessun backup giovanili trovato - niente da ripristinare")

    # Salva sempre un backup aggiornato delle categorie giovanili attualmente
    # presenti (cosi' se in futuro aggiungi altre categorie manualmente,
    # il backup si aggiorna da solo)
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
