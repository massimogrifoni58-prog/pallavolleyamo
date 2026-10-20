"""
Scraper A2 FEMMINILE + SERIE B / B2 - solo squadre umbre
========================================================
Legge la sezione "CAMPIONATI NAZIONALI" della pagina risultati del
portale FIPAV Umbria (settimana per settimana) e tiene solo le partite
di A2, B e B2 con squadre umbre.

Uso:
    python fetch_nazionali_fipav.py            (veloce: da 14 giorni fa a 21 giorni avanti)
    python fetch_nazionali_fipav.py --tutto    (tutta la stagione)
    python fetch_nazionali_fipav.py --prova file.html [...]   (test su file salvati)

Output:
    ../react-app/data/risultati_nazionali_fipav.json
"""
import json, re, sys, time, urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from bs4 import BeautifulSoup

URL = ("https://umbria.portalefipav.net/risultati-classifiche.aspx?ComitatoId=30&StId=2410"
       "&DataDa={d}&StatoGara=&SId=&PId=7323&btFiltro=CERCA")
HEADERS = {"User-Agent": "Mozilla/5.0"}
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "risultati_nazionali_fipav.json"
INIZIO_STAGIONE = date(2026, 9, 28)
FINE_STAGIONE = date(2027, 5, 31)

RE_GARA = re.compile(r"^(\d+)\s+-\s+(\S+)\s+(?:(\S+)\s+)?-\s+(.*)$")
RE_DATA = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{2,4})\s+(\d{1,2}:\d{2})")
RE_SOLO_DATA = re.compile(r"(\d{1,2})/(\d{1,2})/(\d{2,4})")
RE_SCORE = re.compile(r"^(\d+)\s*-\s*(\d+)$")
KEY_UMBRE = ["bartoccini"]


def pulisci(t):
    return re.sub(r"\s+", " ", t.replace("\xa0", " ")).strip()


def scarica(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", errors="ignore")


def e_umbra(nome):
    n = nome.lower()
    return bool(re.search(r"\b(pg|tr)$", n)) or any(k in n for k in KEY_UMBRE)


def pulisci_squadra(nome):
    return re.sub(r"\s+(PG|TR|AL|PE|PD|SI|PI|AN|RM|TO|MI|FI|BO|RN|PU|AR|MC|AP|TE|RI|LT|FR|VT|CH|NA|BA|CN|PN|MN|VR|VI|TV|UD|TS|GE|SV|SP|LI|LU|PT|PO|GR|MS|PR|RE|MO|FE|RA|FC|CR|BG|BS|CO|LC|VA|PV|NO|VC|BI|AT|CB|IS|KR|CZ|RC|ME|CT|PA|TP|AG|CL|EN|RG|SR|SS|CA|NU|OR|AQ|PC|LO|SO|VB|TN|BZ|BL|RO|GO|LE|BR|TA|FG|PZ|MT|SA|AV|BN|CE|RN)$", "", nome).strip()


def leggi_settimana(html):
    html = re.sub(r"<tr\*>", "<tr>", html)  # il portale a volte scrive <tr*>
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for t in soup.select("table.tbl-risultati"):
        cap = t.find("caption")
        if not cap or "NAZIONALI" not in cap.get_text().upper():
            continue
        for tr in t.find_all("tr"):
            tds = tr.find_all("td")
            testo = [pulisci(c.get_text(" ")) for c in tds]
            testo = [x for x in testo]
            md = next((RE_DATA.search(x) for x in testo if RE_DATA.search(x)), None)
            mg = next((RE_GARA.match(x) for x in testo if RE_GARA.match(x)), None)
            if not md or not mg:
                continue
            num, serie, gir, squadre = mg.group(1), mg.group(2).upper(), mg.group(3), mg.group(4)
            if serie not in ("A2", "B", "B2"):
                continue
            if " vs " not in squadre:
                continue
            casa, ospite = [pulisci(x) for x in squadre.split(" vs ", 1)]
            if not (e_umbra(casa) or e_umbra(ospite)):
                continue
            idx = testo.index(next(x for x in testo if RE_GARA.match(x)))
            ris = testo[idx + 1] if idx + 1 < len(testo) else ""
            ms = RE_SCORE.match(ris)
            giocata = bool(ms) and not (ms.group(1) == "0" and ms.group(2) == "0")
            g, m, a = int(md.group(1)), int(md.group(2)), int(md.group(3))
            if a < 100:
                a += 2000
            if serie == "A2":
                nome = "Serie A2 Femminile Girone Unico"
            else:
                nome = f"Serie {serie}" + (f" Girone {gir}" if gir and gir != "-" else "")
            out.append({
                "id": f"fp{num}",
                "competition": nome,
                "giornata": "Giornata",
                "home": pulisci_squadra(casa).upper(),
                "away": pulisci_squadra(ospite).upper(),
                "score": f"{ms.group(1)}-{ms.group(2)}" if giocata else "da disputare",
                "status": "disputata" if giocata else "in programma",
                "data": f"{g:02d}/{m:02d}/{a} ore {md.group(4)}",
                "dataIso": f"{a}-{m:02d}-{g:02d}",
                "ora": md.group(4).zfill(5),
            })
    return out


LVF_A2_URL = "https://www.legavolleyfemminile.it/risultati/?serie=2&campionato=710340&stagione=2026&giornata=tutte"


def scarica_lvf(url):
    """Scarica la pagina della Lega femminile: prima diretto, poi da un secondo percorso."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"Lega femminile: download diretto non riuscito ({e}), provo il secondo percorso")
    req = urllib.request.Request("https://r.jina.ai/" + url, headers={**HEADERS, "X-Return-Format": "html"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read().decode("utf-8", errors="ignore")


def leggi_lvf_a2(html):
    """Legge i punteggi della Serie A2 femminile dal sito della Lega.
    Restituisce solo le partite di squadre umbre ancora gia' giocate:
    [{"dataIso", "squadre": (casa, ospite), "set": (x, y)}]"""
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for t in soup.select("table.risultati"):
        ths = [pulisci(x.get_text(" ")) for x in t.select("thead th")]
        md = next((RE_SOLO_DATA.search(x) for x in ths if RE_SOLO_DATA.search(x)), None)
        righe = t.select("tbody tr")
        if not md or len(righe) != 2:
            continue
        squadre, punti = [], []
        for r in righe:
            n = r.find("th")
            a = r.find("a")
            try:
                punti.append(int(pulisci(n.get_text())))
            except Exception:
                punti.append(None)
            squadre.append(pulisci(a.get_text(" ")) if a else "")
        if None in punti or (punti[0] == 0 and punti[1] == 0):
            continue  # non ancora giocata
        if not any(e_umbra(x) for x in squadre):
            continue
        g, m, a_ = int(md.group(1)), int(md.group(2)), int(md.group(3))
        if a_ < 100:
            a_ += 2000
        ora = next((x for x in ths if re.fullmatch(r"\d{1,2}:\d{2}", x)), "")
        out.append({"id": ths[0].lstrip("#"), "dataIso": f"{a_}-{m:02d}-{g:02d}", "ora": ora,
                    "squadre": (squadre[0], squadre[1]), "set": (punti[0], punti[1])})
    return out


def applica_lvf_a2(partite, lvf):
    """Mette il punteggio sulle partite A2 gia' presenti (stessa data, squadra umbra in casa o fuori).
    Se la partita non c'e' (succede per alcune trasferte) la aggiunge."""
    n = 0
    for r in lvf:
        casa_umbra = e_umbra(r["squadre"][0])
        trovata = None
        for m in partite:
            if m.get("competition") != "Serie A2 Femminile Girone Unico" or m.get("dataIso") != r["dataIso"]:
                continue
            if (e_umbra(m["home"]) if casa_umbra else e_umbra(m["away"])):
                trovata = m
                break
        x, y = r["set"]
        if trovata is None:
            g, mm, a_ = r["dataIso"][8:], r["dataIso"][5:7], r["dataIso"][:4]
            trovata = {
                "id": f"lva2-{r['id']}",
                "competition": "Serie A2 Femminile Girone Unico",
                "giornata": "Giornata",
                "home": pulisci_squadra(r["squadre"][0]).upper(),
                "away": pulisci_squadra(r["squadre"][1]).upper(),
                "data": f"{g}/{mm}/{a_} ore {r['ora']}",
                "dataIso": r["dataIso"],
                "ora": r["ora"].zfill(5),
            }
            partite.append(trovata)
        trovata["score"] = f"{x}-{y}"
        trovata["status"] = "disputata"
        n += 1
    return n


def lunedi(d):
    return d - timedelta(days=d.weekday())


def main():
    args = sys.argv[1:]
    if args and args[0] == "--prova":
        nuove = []
        for f in args[1:]:
            nuove += leggi_settimana(open(f, encoding="utf-8").read())
        for m in nuove:
            print(m["dataIso"], m["competition"], m["home"], m["score"], m["away"])
        return
    if args and args[0] == "--prova-lvf":
        for r in leggi_lvf_a2(open(args[1], encoding="utf-8").read()):
            print(r["dataIso"], r["squadre"][0], r["set"][0], "-", r["set"][1], r["squadre"][1])
        return
    oggi = date.today()
    if "--tutto" in args:
        a, b = INIZIO_STAGIONE, FINE_STAGIONE
    else:
        a, b = oggi - timedelta(days=14), oggi + timedelta(days=21)
    a = max(lunedi(a), lunedi(INIZIO_STAGIONE))
    vecchie = []
    if OUTPUT_PATH.exists():
        try:
            vecchie = json.load(open(OUTPUT_PATH, encoding="utf-8")).get("matches", [])
        except Exception:
            vecchie = []
    nuove, ok, ko = [], 0, 0
    d = a
    while d <= b:
        try:
            html = scarica(URL.format(d=d.isoformat()))
            nuove += leggi_settimana(html)
            ok += 1
        except Exception as e:
            ko += 1
            print(f"ERRORE settimana {d}: {e}")
        d += timedelta(days=7)
        time.sleep(0.5)
    if ok == 0:
        print("Nessuna settimana scaricata: lascio il file com'e'.")
        return
    # tieni le vecchie partite fuori dalla finestra scaricata (solo se tutte le settimane sono andate bene)
    fine = b + timedelta(days=6)
    if ko == 0:
        vecchie = [m for m in vecchie if not (a.isoformat() <= (m.get("dataIso") or "") <= fine.isoformat())]
    ids = {m["id"] for m in nuove}
    tutte = [m for m in vecchie if m["id"] not in ids] + nuove
    try:
        n_lvf = applica_lvf_a2(tutte, leggi_lvf_a2(scarica_lvf(LVF_A2_URL)))
        print(f"Serie A2 femminile (Lega): {n_lvf} punteggi applicati")
    except Exception as e:
        print(f"ERRORE Serie A2 femminile (Lega): {e}: lascio i dati com'erano")
    tutte.sort(key=lambda m: (m.get("dataIso") or "", m.get("ora") or ""))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"generatedAt": datetime.now(timezone.utc).isoformat(), "matches": tutte}, f, ensure_ascii=False, indent=2)
    print(f"Settimane lette: {ok} (errori {ko}). Salvato {OUTPUT_PATH} ({len(tutte)} partite)")


if __name__ == "__main__":
    main()
