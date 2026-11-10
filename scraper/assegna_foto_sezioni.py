"""Mette una foto (solo del nostro sito) nelle card della Settimana Volley che non ne hanno.
Non cambia mai una foto gia' scelta a mano. Scarta i ritratti (foto con nome corto)."""
import json, re, datetime as dt
ROOT = __file__.rsplit("/scraper", 1)[0]
FILES = ["data/pallavolo-umbria.json", "react-app/data/pallavolo-umbria.json"]
REGOLE = [  # (parole nel titolo della card, parole cercate nel titolo della notizia)
    (r"superlega|\bsir\b", r"superlega|\bsir\b|sir susa|trento"),
    (r"\ba2\b|\ba3\b|serie b", r"\ba2\b|\ba3\b|serie b\b|serie b/|\bb2\b|\bb1\b"),
    (r"serie c", r"serie c\b"),
    (r"serie d", r"serie d\b|narni"),
]
RITRATTO = r"classe \d{4}|new entry|confermat|nuov[oa]\b|ufficiale|entra a far parte|benvenut|alla guida|staff"
MESI = {m: i+1 for i, m in enumerate("gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre".split())}
def larga(p):
    """True se la foto e' abbastanza grande (le foto piccole sono quasi sempre ritratti)."""
    try:
        from PIL import Image
        w, h = Image.open(f"{ROOT}/public{p}").size
        return w >= 600 and w >= h  # niente foto piccole ne' verticali (ritratti)
    except Exception:
        return True
def L(p): return json.load(open(f"{ROOT}/{p}", encoding="utf-8"))
def data(s):
    s = str(s)
    m = re.match(r"(\d{4})-(\d\d)-(\d\d)", s)
    if m: return dt.date(*map(int, m.groups()))
    m = re.match(r"(\d+) (\w+) (\d{4})", s)
    if m and m.group(2) in MESI: return dt.date(int(m.group(3)), MESI[m.group(2)], int(m.group(1)))
    return dt.date(2000, 1, 1)
pool = []
fb = L("data/facebook_news.json"); fb = next((v for v in fb.values() if isinstance(v, list)), []) if isinstance(fb, dict) else fb
for x in fb:
    if x.get("image") and larga(x["image"]) and not re.search(RITRATTO, x["title"].lower()):
        pool.append((x["title"].lower(), x["image"], data(x["createdTime"])))
ar = L("data/articoli-societa.json"); ar = ar if isinstance(ar, list) else next((v for v in ar.values() if isinstance(v, list)), [])
for x in ar:
    f = x.get("foto") or ""
    # foto di resoconto partita: nome lungo con codice finale (i ritratti hanno nomi corti)
    if re.search(r"-m[a-z0-9]{6,8}\.jpg$", f) and larga(f) and not re.search(RITRATTO, x["titolo"].lower()):
        pool.append((x["titolo"].lower(), f, data(x.get("data"))))
for f in FILES:
    d = L(f); mod = False
    for s in d["sezioni"]:
        if s.get("foto") or not s.get("titolo"): continue
        for chiave_card, chiave_notizia in REGOLE:
            if re.search(chiave_card, s["titolo"].lower()):
                c = sorted([p for p in pool if re.search(chiave_notizia, p[0])], key=lambda p: p[2], reverse=True)
                if c: s["foto"] = c[0][1]; mod = True; print(f, "|", s["titolo"], "->", c[0][1])
                break
    if mod: json.dump(d, open(f"{ROOT}/{f}", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
