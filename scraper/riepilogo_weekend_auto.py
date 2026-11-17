"""Scrive da solo il riquadro 'Il weekend in sintesi' (data/riepilogo_weekend.json) dai risultati del weekend.
- Gira sabato, domenica e lunedi. Il riquadro e' visibile lunedi e martedi (data = lunedi).
- Non sovrascrive un testo scritto a mano per lo stesso lunedi (solo i testi con "auto": true vengono riscritti).
Uso: python riepilogo_weekend_auto.py [AAAA-MM-GG] [--prova]"""
import json, re, sys, datetime as dt
ROOT = __file__.rsplit("/scraper", 1)[0]
args = [a for a in sys.argv[1:] if not a.startswith("--")]
prova = "--prova" in sys.argv
oggi = dt.date.fromisoformat(args[0]) if args else dt.date.today()
wd = oggi.weekday()  # lun=0 ... dom=6
if wd in (1, 2, 3, 4): print("Giorno feriale: niente da fare"); sys.exit(0)
sabato = oggi - dt.timedelta(days=(wd - 5) % 7 if wd != 6 and wd != 5 else (0 if wd == 5 else 1))
if wd == 0: sabato = oggi - dt.timedelta(days=2)
domenica = sabato + dt.timedelta(days=1); lunedi = sabato + dt.timedelta(days=2)
MESI = "gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre".split()
def L(p): return json.load(open(f"{ROOT}/{p}", encoding="utf-8"))
def bello(n):
    n = re.sub(r"\s+", " ", n.strip()).title().replace("A.S.D. ", "").replace("Asd ", "").replace(" A S D", "").replace(" Asd", "").replace("Citta'", "Città").replace("Citta ", "Città ")
    n = re.sub(r"\bDi\b|\bDel\b|\bAi\b", lambda m: m[0].lower(), n)
    return n.replace("Sir Its", "Sir ITS").replace("Green1", "").replace("Verde", "").strip()
def punti(s):
    m = re.fullmatch(r"(\d+)\s*-\s*(\d+)", (s or "").strip()); return (int(m[1]), int(m[2])) if m else None
def esito(casa, osp, sc, parz=None):
    """Dati di una gara: chi ha vinto, risultato in set, dove, e come e' andata (rimonta, tie-break...)."""
    a, b = punti(sc)
    casa_vince = a > b
    v, p = (casa, osp) if casa_vince else (osp, casa)
    ws, ls = max(a, b), min(a, b)
    rimonta = False; set_finale = None
    if parz and len(parz) == a + b:
        mio = []  # set vinti (True) o persi (False) dalla squadra vincente, in ordine
        for x in parz:
            m = re.fullmatch(r"\s*(\d+)\s*-\s*(\d+)\s*", x)
            if not m: mio = None; break
            h, o = int(m[1]), int(m[2]); mio.append((h > o) == casa_vince)
        if mio:
            rimonta = (not mio[0]) and ls >= 1 and ws == 3 and (ls < 2 or ws + ls == 5)
            if ws + ls == 5:
                m5 = re.fullmatch(r"\s*(\d+)\s*-\s*(\d+)\s*", parz[-1]); h5, o5 = int(m5[1]), int(m5[2])
                set_finale = f"{h5}-{o5}" if casa_vince else f"{o5}-{h5}"
    return {"v": bello(v), "p": bello(p), "ws": ws, "ls": ls, "fuori": not casa_vince, "rimonta": rimonta,
            "tie": ws + ls == 5, "netto": ls == 0, "finale": set_finale, "casa": bello(casa), "ospite": bello(osp)}

PRIORITARIE = ["amerina", "narni", "colleluna", "arrone", "terni volley", "sir ", "bartoccini +energia", "altotevere", "sirio", "marsciano", "castello"]
def cara(e): return any(k in (e["v"] + " " + e["p"]).lower() + " " for k in PRIORITARIE)

def racconto(e, i=0):
    """Una frase che racconta la gara, con parole diverse a seconda di come e' andata."""
    v, p = e["v"], e["p"]
    if e["tie"]:
        fin = f" (quinto set {e['finale']})" if e["finale"] else ""
        dove = " in trasferta" if e["fuori"] else ""
        return f"{v} ha vinto{dove} al tie-break contro {p}{fin}"
    if e["rimonta"]:
        return f"{v} ha rimontato un set di svantaggio e ha battuto {p} per {e['ws']}-{e['ls']}"
    if e["netto"]:
        if e["fuori"]: return f"{v} ha vinto in trasferta contro {p} senza perdere set"
        return [f"{v} ha superato {p} senza concedere set", f"{v} ha chiuso i conti con {p} in tre set", f"{v} non ha lasciato scampo a {p}"][i % 3]
    return f"{v} ha avuto la meglio su {p} per {e['ws']}-{e['ls']}" + (" in trasferta" if e["fuori"] else "")

GG = {sabato.isoformat(), domenica.isoformat()}
ORDINE = ["Serie A1", "Serie A2", "Serie A3", "Serie B1", "Serie B2", "Serie B"]
naz = []
for f in ["data/risultati_nazionali.json", "data/risultati_nazionali_fipav.json"]:
    for m in L(f)["matches"]:
        if m.get("dataIso") in GG and punti(m.get("score")) and m.get("status") != "in programma":
            naz.append((m["competition"], m["home"], m["away"], m["score"]))
reg = {}
rc = L("data/calendario_regionali.json")
nomi = {c["id"]: c["nome"] for c in rc["campionati"]}
for cid, lst in rc["partite"].items():
    for m in lst:
        if m.get("data") in GG and punti(m.get("risultato")):
            reg.setdefault(nomi.get(cid, cid), []).append((m["casa"], m["ospite"], m["risultato"], m.get("parziali")))
def breve(c):
    c = re.sub(r" Girone.*", "", c); return c.replace("Femminile", "femminile").replace("Maschile", "maschile")
def rango(k):
    for n, o in enumerate(ORDINE):
        if k.startswith(o): return n
    return 99
parti = []
# 1) campionati nazionali: una frase per gara, dalle categorie piu' alte
per = {}
for c, h, a, s_ in naz: per.setdefault(breve(c), []).append(esito(h, a, s_))
for k in sorted(per, key=rango):
    parti.append(f"In {k}: " + " e ".join(racconto(e, n) for n, e in enumerate(per[k])) + ".")
# 2) Serie C e D: solo i fatti piu' interessanti, poi un quadro d'insieme
unite = {}
for c, lst in reg.items():
    if re.match(r"Serie [CD]", c):
        unite.setdefault(re.sub(r" [AB]$", "", breve(c)), []).extend(esito(m[0], m[1], m[2], m[3]) for m in lst)
tutti = []
for k, es in unite.items():
    tutti += es
    scelte = sorted([e for e in es if cara(e) or e["tie"] or e["rimonta"]], key=lambda e: (not cara(e), not e["tie"], not e["rimonta"]))[:1]
    if scelte: parti.append(f"In {k}: " + "; ".join(racconto(e, i) for i, e in enumerate(scelte)) + ".")
if tutti:
    n = len(tutti); cv = sum(1 for e in tutti if not e["fuori"]); nt = sum(1 for e in tutti if e["netto"]); tb = sum(1 for e in tutti if e["tie"])
    q = f"Nelle serie C e D si sono giocate {n} gare: {cv} vittorie in casa su {n}"
    if nt: q += f", {nt} successi per 3-0"
    if tb: q += f" e {tb} " + ("partita" if tb == 1 else "partite") + " decise al quinto set"
    parti.append(q + ".")
    if tb >= 4: apertura = "Un weekend di partite combattute nei campionati umbri, con tanti set decisivi."
    elif nt * 2 >= n: apertura = "Un weekend di vittorie nette nei campionati umbri."
    else: apertura = "Un weekend vario nei campionati umbri."
    parti.insert(0, apertura)
if not parti: print("Nessun risultato per il weekend", sabato); sys.exit(0)
g = f"{sabato.day} e {domenica.day} {MESI[domenica.month-1]}" if sabato.month == domenica.month else f"{sabato.day} {MESI[sabato.month-1]} e {domenica.day} {MESI[domenica.month-1]}"
nuovo = {"titolo": f"Weekend del {g}: com'è andata in Umbria", "data": lunedi.isoformat(),
         "testo": " ".join(parti), "auto": True}
if prova: print(json.dumps(nuovo, ensure_ascii=False, indent=1)); sys.exit(0)
for f in ["data/riepilogo_weekend.json", "react-app/data/riepilogo_weekend.json"]:
    try: vecchio = L(f)
    except Exception: vecchio = {}
    if vecchio.get("data") == nuovo["data"] and not vecchio.get("auto"): print("testo scritto a mano, non tocco", f); continue
    json.dump(nuovo, open(f"{ROOT}/{f}", "w", encoding="utf-8"), ensure_ascii=False, indent=2); print("scritto", f)
