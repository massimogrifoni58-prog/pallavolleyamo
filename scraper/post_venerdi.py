#!/usr/bin/env python3
"""Pubblica sulla pagina Facebook PallaVolleyAmo il programma del weekend (venerdi-domenica).
Legge FB_PAGE_TOKEN_POST2 e FB_PAGE_ID dalle variabili d'ambiente (GitHub Secrets).
Senza PUBBLICA=1 non pubblica: stampa solo il testo (prova).
Variabile opzionale DATA_RIFERIMENTO=AAAA-MM-GG per provare con un'altra data.
Testo senza icone ne' emoji.
"""
import os, re, sys
from datetime import date, timedelta

import post_weekend as pw

LINK = "https://www.pallavolleyamo.it/s/weekend-umbria/"
MAX_RIGHE = 40
GIORNI = ["Lunedi'", "Martedi'", "Mercoledi'", "Giovedi'", "Venerdi'", "Sabato", "Domenica"]
MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]


def weekend(oggi):
    # prossimo venerdi (oggi se e' venerdi) .. domenica
    ven = oggi + timedelta(days=(4 - oggi.weekday()) % 7)
    return ven, ven + timedelta(days=2)


def macro(c):
    c = (c or "").lower()
    return 0 if "serie c" in c else 1 if "serie d" in c else 2


def raccogli(ven, dom):
    da, a = ven.isoformat(), dom.isoformat()
    out = []  # (data, ora, campionato, casa, ospite, ordine)
    for lista in pw.carica("calendario_regionali.json").get("partite", {}).values():
        for p in lista:
            if not (da <= (p.get("data") or "") <= a) or p.get("risultato"):
                continue
            if macro(p["campionato"]) > 1:  # solo Serie C e D (come il generatore manuale di default)
                continue
            out.append((p["data"], (p.get("ora") or "")[:5], re.sub(r"\s*Girone.*$", "", p["campionato"]), p["casa"], p["ospite"], macro(p["campionato"]) + 10))
    for f in ("risultati_nazionali.json", "risultati_nazionali_fipav.json"):
        try:
            for m in pw.carica(f).get("matches", []):
                if m.get("status") == "disputata" or not (da <= (m.get("dataIso") or "") <= a):
                    continue
                if not any(u in pw.norm(m["home"] + " " + m["away"]) for u in pw.UMBRE):
                    continue
                out.append((m["dataIso"], (m.get("ora") or "")[:5], re.sub(r"\s*Girone.*$", "", m["competition"]), m["home"], m["away"], pw.ordine(m["competition"])))
        except FileNotFoundError:
            pass
    visti, unici = set(), []
    for r in sorted(out, key=lambda x: (x[0], x[5], x[1])):
        k = (r[0], pw.norm(r[3]), pw.norm(r[4]))
        if k not in visti:
            visti.add(k)
            unici.append(r)
    return unici


def testo(partite, ven, dom):
    righe = [f"Il weekend del volley in Umbria ({ven.day}-{dom.day} {MESI[dom.month - 1]})"]
    n = 0
    giorno = None
    for data, ora, camp, casa, osp, _ in partite:
        if data != giorno:
            giorno = data
            d = date.fromisoformat(data)
            righe += ["", f"{GIORNI[d.weekday()].upper()} {d.day} {MESI[d.month - 1].upper()}"]
        if n >= MAX_RIGHE:
            righe += ["", "...e tutte le altre partite sul sito."]
            break
        righe.append(f"{ora} {pw.titolo(casa)} - {pw.titolo(osp)} ({camp})".strip())
        n += 1
    righe += ["", "Il programma completo, con orari e campi, su pallavolleyamo.it", "#pallavolo #volleyumbria #pallavolleyamo"]
    return "\n".join(righe)


def main():
    rif = os.environ.get("DATA_RIFERIMENTO", "").strip()
    oggi = date.fromisoformat(rif) if rif else date.today()
    ven, dom = weekend(oggi)
    partite = raccogli(ven, dom)
    print(f"Weekend {ven} - {dom}: {len(partite)} partite")
    if len(partite) < 5:
        print("Troppo poche partite: non pubblico.")
        return
    msg = testo(partite, ven, dom)
    print("-----\n" + msg + "\n-----")
    if os.environ.get("PUBBLICA") == "1":
        pw.LINK = LINK
        pw.pubblica(msg)
    else:
        print("PROVA: nulla e' stato pubblicato.")


if __name__ == "__main__":
    main()
