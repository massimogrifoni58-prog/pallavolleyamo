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
    n = re.sub(r"\s+", " ", n.strip()).title().replace("A.S.D. ", "").replace("Asd ", "").replace("Citta'", "Città").replace("Citta ", "Città ")
    n = re.sub(r"\bDi\b|\bDel\b|\bAi\b", lambda m: m[0].lower(), n)
    return n.replace("Sir Its", "Sir ITS").replace("Green1", "").replace("Verde", "").strip()
def punti(s):
    m = re.fullmatch(r"(\d+)\s*-\s*(\d+)", (s or "").strip()); return (int(m[1]), int(m[2])) if m else None
def frase(casa, osp, sc):
    a, b = punti(sc)
    v, p, r = (casa, osp, f"{a}-{b}") if a > b else (osp, casa, f"{b}-{a}")
    return f"{bello(v)} batte {bello(p)} {r}"
GG = {sabato.isoformat(), domenica.isoformat()}
naz = []
for f in ["data/risultati_nazionali.json", "data/risultati_nazionali_fipav.json"]:
    for m in L(f)["matches"]:
        if m.get("dataIso") in GG and punti(m.get("score")):
            naz.append((m["competition"], m["home"], m["away"], m["score"]))
reg = {}
rc = L("data/calendario_regionali.json")
nomi = {c["id"]: c["nome"] for c in rc["campionati"]}
for cid, lst in rc["partite"].items():
    for m in lst:
        if m.get("data") in GG and punti(m.get("risultato")):
            reg.setdefault(nomi.get(cid, cid), []).append((m["casa"], m["ospite"], m["risultato"]))
def breve(c):
    c = re.sub(r" Girone.*", "", c); return c.replace("Femminile", "femminile").replace("Maschile", "maschile")
parti = []
if naz:
    per = {}
    for c, h, a, s in naz: per.setdefault(breve(c), []).append(frase(h, a, s))
    parti.append(" ".join(f"In {k}: " + "; ".join(v) + "." for k, v in per.items()))
# regionali: solo Serie C e D (le giovanili sono nella pagina del weekend), 2 gare per campionato
unite = {}
for c, lst in reg.items():
    if re.match(r"Serie [CD]", c): unite.setdefault(breve(c), []).extend(lst)
for c, lst in unite.items():
    extra = " e altre gare" if len(lst) > 2 else ""
    parti.append(f"In {c}: " + "; ".join(frase(*x) for x in lst[:2]) + extra + ".")
if not parti: print("Nessun risultato per il weekend", sabato); sys.exit(0)
nr = sum(len(v) for v in reg.values()) + len(naz)
g = f"{sabato.day} e {domenica.day} {MESI[domenica.month-1]}" if sabato.month == domenica.month else f"{sabato.day} {MESI[sabato.month-1]} e {domenica.day} {MESI[domenica.month-1]}"
nuovo = {"titolo": f"Weekend del {g}: i risultati dell'Umbria", "data": lunedi.isoformat(),
         "testo": " ".join(parti), "auto": True}
if prova: print(json.dumps(nuovo, ensure_ascii=False, indent=1)); sys.exit(0)
for f in ["data/riepilogo_weekend.json", "react-app/data/riepilogo_weekend.json"]:
    try: vecchio = L(f)
    except Exception: vecchio = {}
    if vecchio.get("data") == nuovo["data"] and not vecchio.get("auto"): print("testo scritto a mano, non tocco", f); continue
    json.dump(nuovo, open(f"{ROOT}/{f}", "w", encoding="utf-8"), ensure_ascii=False, indent=2); print("scritto", f)
