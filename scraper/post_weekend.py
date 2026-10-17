#!/usr/bin/env python3
"""Pubblica sulla pagina Facebook PallaVolleyAmo i risultati del weekend (venerdi-domenica).
Legge FB_PAGE_TOKEN_POST2 e FB_PAGE_ID dalle variabili d'ambiente (GitHub Secrets).
Senza PUBBLICA=1 non pubblica: stampa solo il testo (prova).
Variabile opzionale DATA_RIFERIMENTO=AAAA-MM-GG per provare con un'altra data.
"""
import json, os, re, sys, urllib.request, urllib.parse
from datetime import date, timedelta
from pathlib import Path

API = "https://graph.facebook.com/v21.0"
LINK = "https://www.pallavolleyamo.it/s/risultati/"
UMBRE = ["perugia", "terni", "narni", "spoleto", "foligno", "orvieto", "gubbio", "assisi",
         "umbertide", "marsciano", "sir ", "bartoccini", "umbria", "altotevere", "citta di castello"]
MAX_RIGHE = 45

def carica(nome):
    return json.loads(Path("data", nome).read_text(encoding="utf-8"))

def norm(s):
    return re.sub(r"\s+", " ", (s or "").lower()).strip()

def titolo(s):
    return " ".join(w.capitalize() if w.isupper() or w.islower() else w for w in (s or "").replace("  ", " ").split())

def intervallo(oggi):
    # ultimo venerdi..domenica gia' conclusi
    giorni_da_dom = (oggi.weekday() + 1) % 7  # lun=1, dom=0
    dom = oggi - timedelta(days=giorni_da_dom if giorni_da_dom else 7)
    return dom - timedelta(days=2), dom

def punteggio(s):
    m = re.search(r"(\d+)\s*-\s*(\d+)", s or "")
    return (int(m.group(1)), int(m.group(2))) if m else None

def raccogli(da, a):
    da_s, a_s = da.isoformat(), a.isoformat()
    punti = {}
    for m in carica("risultati.json").get("matches", []):
        if m.get("status") == "disputata" and m.get("score"):
            punti[norm(m["competition"]) + "|" + norm(m["home"]) + "|" + norm(m["away"])] = m["score"]
    out = []
    for lista in carica("calendario_regionali.json").get("partite", {}).values():
        for p in lista:
            if not (da_s <= (p.get("data") or "") <= a_s):
                continue
            ris = p.get("risultato") or punti.get(norm(p["campionato"]) + "|" + norm(p["casa"]) + "|" + norm(p["ospite"]))
            sc = punteggio(ris)
            if sc:
                out.append((re.sub(r"\s*Girone.*$", "", p["campionato"]), p["casa"], p["ospite"], sc))
    for f in ("risultati_nazionali.json", "risultati_nazionali_fipav.json"):
        try:
            for m in carica(f).get("matches", []):
                if m.get("status") != "disputata" or not (da_s <= (m.get("dataIso") or "") <= a_s):
                    continue
                if not any(u in norm(m["home"] + " " + m["away"]) for u in UMBRE):
                    continue
                sc = punteggio(m.get("score"))
                if sc:
                    out.append((re.sub(r"\s*Girone.*$", "", m["competition"]), m["home"], m["away"], sc))
        except FileNotFoundError:
            pass
    visti, unici = set(), []
    for r in out:
        k = (norm(r[0]), norm(r[1]), norm(r[2]))
        if k not in visti:
            visti.add(k)
            unici.append(r)
    return unici

def ordine(c):
    c = c.lower()
    for i, k in enumerate(["superlega", "serie a", "serie b", "serie c", "serie d", "1 div", "2 div", "under 19", "under 17", "under 15", "under 14"]):
        if k in c:
            return i
    return 99

def testo(risultati, da, a):
    mesi = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
    righe = [f"🏐 I risultati del weekend ({da.day}-{a.day} {mesi[a.month - 1]})", ""]
    per = {}
    for c, h, o, sc in risultati:
        per.setdefault(c, []).append((h, o, sc))
    n = 0
    for c in sorted(per, key=lambda x: (ordine(x), x)):
        righe.append(f"▪ {c}")
        for h, o, (x, y) in per[c]:
            if n >= MAX_RIGHE:
                break
            righe.append(f"{titolo(h)} {x}-{y} {titolo(o)}")
            n += 1
        righe.append("")
        if n >= MAX_RIGHE:
            righe.append("…e tutti gli altri risultati sul sito.")
            righe.append("")
            break
    righe.append("📲 Tutti i risultati, classifiche e calendari su pallavolleyamo.it")
    righe.append("#pallavolo #volleyumbria #pallavolleyamo")
    return "\n".join(righe)

def pubblica(msg):
    token = os.environ.get("FB_PAGE_TOKEN_POST2", "").strip()
    page = os.environ.get("FB_PAGE_ID", "").strip()
    if not token or not page:
        print("ERRORE: mancano FB_PAGE_TOKEN_POST2 o FB_PAGE_ID")
        sys.exit(1)
    try:  # token utente di sistema -> token della pagina
        r = json.load(urllib.request.urlopen(f"{API}/{page}?" + urllib.parse.urlencode({"fields": "access_token", "access_token": token}), timeout=30))
        if r.get("access_token"):
            token = r["access_token"]
    except Exception:
        print("Nota: uso il token fornito cosi' com'e'")
    dati = urllib.parse.urlencode({"message": msg, "link": LINK, "access_token": token}).encode()
    try:
        r = json.load(urllib.request.urlopen(urllib.request.Request(f"{API}/{page}/feed", data=dati), timeout=30))
        print("Pubblicato, id:", r.get("id"))
    except urllib.error.HTTPError as e:
        print("ERRORE Facebook:", e.read().decode("utf-8", "replace")[:600])
        sys.exit(1)

def main():
    rif = os.environ.get("DATA_RIFERIMENTO", "").strip()
    oggi = date.fromisoformat(rif) if rif else date.today()
    da, a = intervallo(oggi)
    ris = raccogli(da, a)
    print(f"Weekend {da} - {a}: {len(ris)} risultati")
    if len(ris) < 3:
        print("Troppo pochi risultati: non pubblico.")
        return
    msg = testo(ris, da, a)
    print("-----\n" + msg + "\n-----")
    if os.environ.get("PUBBLICA") == "1":
        pubblica(msg)
    else:
        print("PROVA: nulla e' stato pubblicato.")

if __name__ == "__main__":
    main()
