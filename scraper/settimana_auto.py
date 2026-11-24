"""Scrive da solo 'La Settimana Volley' (data/pallavolo-umbria.json) ogni lunedi, dai risultati del weekend
e dal calendario dei prossimi 7 giorni. Racconta con frasi, non con elenchi di punteggi.
- Gira solo il lunedi (o con una data data come argomento).
- Se la settimana e' gia' stata scritta a mano (senza "auto": true) NON la tocca.
- La settimana precedente passa nell'archivio.
- Le card delle squadre (ultimo/prossima) le aggiorna gia' aggiorna_squadre_evidenza.py.
Uso: python settimana_auto.py [AAAA-MM-GG] [--prova]"""
import json, re, sys, datetime as dt
ROOT = __file__.rsplit("/scraper", 1)[0]
args = [a for a in sys.argv[1:] if not a.startswith("--")]
prova = "--prova" in sys.argv
oggi = dt.date.fromisoformat(args[0]) if args else dt.date.today()
if oggi.weekday() != 0 and not args: print("Non e' lunedi: niente da fare"); sys.exit(0)
lunedi = oggi - dt.timedelta(days=oggi.weekday())
sabato = lunedi - dt.timedelta(days=2); domenica = lunedi - dt.timedelta(days=1)
fine = lunedi + dt.timedelta(days=6)
GG = {sabato.isoformat(), domenica.isoformat()}
MESI = "gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre".split()
GIORNI = "lunedì martedì mercoledì giovedì venerdì sabato domenica".split()
def L(p): return json.load(open(f"{ROOT}/{p}", encoding="utf-8"))
def bello(n):
    n = re.sub(r"\s+", " ", n.strip()).title().replace("A.S.D. ", "").replace("Asd ", "").replace(" A S D", "").replace(" Asd", "").replace("Pallav. ", "Pallavolo ")
    n = re.sub(r"Citta'\s*", "Città ", n).replace("Citta ", "Città ")
    n = re.sub(r"\bDi\b|\bDel\b|\bAi\b", lambda m: m[0].lower(), n)
    return n.replace("Sir Its", "Sir ITS").replace("Green1", "").replace("Verde", "").strip()
def punti(s):
    m = re.fullmatch(r"(\d+)\s*-\s*(\d+)", (s or "").strip()); return (int(m[1]), int(m[2])) if m else None
def breve(c):
    c = re.sub(r" Girone.*", "", c); return c.replace("Femminile", "femminile").replace("Maschile", "maschile")
def data_it(d): return f"{GIORNI[d.weekday()]} {d.day} {MESI[d.month-1]}"
def esito(casa, osp, sc, parz=None):
    a, b = punti(sc); cv = a > b
    v, p = (casa, osp) if cv else (osp, casa); ws, ls = max(a, b), min(a, b)
    rimonta = False; fin = None
    if parz and len(parz) == a + b:
        mio = []
        for x in parz:
            m = re.fullmatch(r"\s*(\d+)\s*-\s*(\d+)\s*", x)
            if not m: mio = None; break
            mio.append((int(m[1]) > int(m[2])) == cv)
        if mio:
            rimonta = (not mio[0]) and ws == 3 and ls >= 1
            if ws + ls == 5:
                m5 = re.fullmatch(r"\s*(\d+)\s*-\s*(\d+)\s*", parz[-1]); h5, o5 = int(m5[1]), int(m5[2])
                fin = f"{h5}-{o5}" if cv else f"{o5}-{h5}"
    return {"v": bello(v), "p": bello(p), "ws": ws, "ls": ls, "fuori": not cv, "rimonta": rimonta, "tie": ws + ls == 5, "netto": ls == 0, "finale": fin}
PRIORITARIE = ["amerina", "narni", "colleluna", "arrone", "terni volley", "sir ", "bartoccini +energia", "altotevere", "sirio", "marsciano", "castello"]
CARE_GIOV = ["amerina", "narni", "colleluna", "arrone"]
def cara(t): return any(k in t.lower() + " " for k in PRIORITARIE)
def racconto(e, i=0):
    v, p = e["v"], e["p"]
    if e["tie"]:
        return f"{v} ha vinto{' in trasferta' if e['fuori'] else ''} al tie-break contro {p}" + (f" (quinto set {e['finale']})" if e["finale"] else "")
    if e["rimonta"]: return f"{v} ha rimontato un set di svantaggio e ha battuto {p} per {e['ws']}-{e['ls']}"
    if e["netto"]:
        if e["fuori"]: return f"{v} ha vinto in trasferta contro {p} senza perdere set"
        return [f"{v} ha superato {p} senza concedere set", f"{v} ha chiuso i conti con {p} in tre set", f"{v} non ha lasciato scampo a {p}"][i % 3]
    return f"{v} ha avuto la meglio su {p} per {e['ws']}-{e['ls']}" + (" in trasferta" if e["fuori"] else "")

# ---- dati
naz_giocate, naz_prossime = [], []
for f in ["data/risultati_nazionali.json", "data/risultati_nazionali_fipav.json"]:
    for m in L(f)["matches"]:
        if m.get("dataIso") in GG and punti(m.get("score")) and m.get("status") != "in programma":
            naz_giocate.append(m)
        elif m.get("dataIso") and lunedi.isoformat() <= m["dataIso"] <= fine.isoformat() and not punti(m.get("score")):
            naz_prossime.append(m)
rc = L("data/calendario_regionali.json"); nomi = {c["id"]: c["nome"] for c in rc["campionati"]}
reg_giocate, reg_prossime = {}, []
for cid, lst in rc["partite"].items():
    for m in lst:
        n = nomi.get(cid, cid)
        if m.get("data") in GG and punti(m.get("risultato")) and re.match(r"Serie [CD]", n):
            reg_giocate.setdefault(re.sub(r" [AB]$", "", breve(n)), []).append(esito(m["casa"], m["ospite"], m["risultato"], m.get("parziali")))
        elif m.get("data") and lunedi.isoformat() <= m["data"] <= fine.isoformat() and not m.get("risultato"):
            reg_prossime.append((m["data"], m.get("ora") or "", bello(m["casa"]), bello(m["ospite"]), breve(n)))
for m in naz_prossime:
    reg_prossime.append((m["dataIso"], m.get("ora") or "", bello(m["home"]), bello(m["away"]), breve(m["competition"])))
reg_prossime = sorted(set(reg_prossime))
def evidenza(x):
    t = x[2] + " " + x[3]
    if re.match(r"Superlega|Serie A|Serie B", x[4]): return True
    if re.match(r"Serie [CD]", x[4]): return cara(t)
    return any(k in t.lower() for k in CARE_GIOV)
da_segnare = [x for x in reg_prossime if evidenza(x)]

# ---- testi
g = f"{sabato.day} e {domenica.day} {MESI[domenica.month-1]}" if sabato.month == domenica.month else f"{sabato.day} {MESI[sabato.month-1]} e {domenica.day} {MESI[domenica.month-1]}"
settimana = f"{lunedi.day} – {fine.day} {MESI[fine.month-1]} {fine.year}" if lunedi.month == fine.month else f"{lunedi.day} {MESI[lunedi.month-1]} – {fine.day} {MESI[fine.month-1]} {fine.year}"
per = {}
for m in naz_giocate: per.setdefault(breve(m["competition"]), []).append(esito(m["home"], m["away"], m["score"]))
def rango(k):
    for n, o in enumerate(["Superlega", "Serie A1", "Serie A2", "Serie A3", "Serie B1", "Serie B2", "Serie B"]):
        if k.startswith(o): return n
    return 99
sup = [k for k in per if k.startswith("Superlega")]
altre = [k for k in sorted(per, key=rango) if not k.startswith("Superlega")]
sezioni = []
tot_c_d = sum(len(v) for v in reg_giocate.values()); tie_cd = sum(1 for v in reg_giocate.values() for e in v if e["tie"])
tot = sum(len(v) for v in per.values()) + tot_c_d
if not tot: print("Nessun risultato per il weekend", sabato); sys.exit(0)
intro = [f"Il weekend del {g} in breve: {tot} gare giocate tra campionati nazionali e Serie C e D" + (f", {tie_cd} delle quali decise al quinto set." if tie_cd else ".")]
if da_segnare:
    x = da_segnare[0]; intro.append(f"La settimana che inizia ha già un appuntamento da segnare: {data_it(dt.date.fromisoformat(x[0]))}{', ore ' + x[1] if x[1] else ''}, {x[2]} – {x[3]} ({x[4]}).")
sezioni.append({"titolo": "", "testo": intro})
if sup:
    sezioni.append({"titolo": "Superlega", "testo": [" ".join(racconto(e, i) + "." for i, e in enumerate(per[sup[0]]))]})
if altre:
    t = []
    for k in altre: t.append(f"{k[0].upper() + k[1:]}: " + " e ".join(racconto(e, i) for i, e in enumerate(per[k])) + ".")
    sezioni.append({"titolo": "A2 femminile, A3 e Serie B", "testo": t})
def sez_cd(lettera):
    t = []
    for k, es in reg_giocate.items():
        if not k.startswith("Serie " + lettera): continue
        sc = sorted([e for e in es if cara(e["v"] + " " + e["p"]) or e["tie"] or e["rimonta"]], key=lambda e: (not cara(e["v"] + " " + e["p"]), not e["tie"]))[:2]
        n = len(es); cv = sum(1 for e in es if not e["fuori"]); nt = sum(1 for e in es if e["netto"])
        base = f"{k[0].upper() + k[1:]}: {n} gare, {cv} vittorie in casa e {nt} successi per 3-0."
        t.append(base + (" Da ricordare: " + "; ".join(racconto(e, i) for i, e in enumerate(sc)) + "." if sc else ""))
    return t
for lettera, tit in (("C", "Serie C"), ("D", "Serie D")):
    t = sez_cd(lettera)
    if t: sezioni.append({"titolo": tit, "testo": t + ["Tutti i risultati sono nella pagina \"Il weekend in Umbria\"."]})
if reg_prossime:
    nn = len(reg_prossime); pri = [x for x in da_segnare][:3]
    t = [f"Da lunedì {lunedi.day} a domenica {fine.day} {MESI[fine.month-1]} sono in programma almeno {nn} partite tra campionati nazionali e Serie C e D."] if nn >= 6 else []
    if pri: t.append("Da tenere d'occhio: " + "; ".join(f"{data_it(dt.date.fromisoformat(x[0]))}{' alle ' + x[1] if x[1] else ''}, {x[2]} – {x[3]} ({x[4]})" for x in pri) + ".")
    sezioni.append({"titolo": "La settimana che inizia", "testo": t})
if da_segnare:
    sezioni.append({"titolo": "Da segnare in calendario", "elenco": [f"{data_it(dt.date.fromisoformat(x[0])).capitalize()}{', ore ' + x[1] if x[1] else ''}: {x[2]} – {x[3]} ({x[4]})" for x in da_segnare[:14]]})
tag = ["pallavolo umbria", "serie c pallavolo umbria", "serie d pallavolo umbria", "superlega", "serie a3", "serie a2 femminile"]
nuovo = {"aggiornamento": oggi.isoformat(), "settimana": settimana,
         "commento": f"Weekend del {g}: {tot} gare tra campionati nazionali e Serie C e D" + (f", {tie_cd} decise al quinto set." if tie_cd else "."),
         "titolo": f"Il volley umbro nel weekend del {g}: risultati e partite da segnare",
         "occhiello": f"La Settimana Volley · Umbria, {settimana}", "sezioni": sezioni,
         "seo": {"metaTitle": f"Pallavolo Umbria {lunedi.day}-{fine.day} {MESI[fine.month-1][:3]} {fine.year}: risultati e calendario | PallaVolleyAmo",
                 "metaDescription": f"La Settimana Volley in Umbria: com'è andato il weekend del {g} e le partite da segnare dal {lunedi.day} al {fine.day} {MESI[fine.month-1]}."[:160], "tag": tag},
         "auto": True}
if prova: print(json.dumps(nuovo, ensure_ascii=False, indent=1)); sys.exit(0)
for f in ["data/pallavolo-umbria.json", "react-app/data/pallavolo-umbria.json"]:
    d = L(f)
    if d.get("settimana") == settimana and not d.get("auto"): print("testo scritto a mano, non tocco", f); continue
    if d.get("settimana") != settimana and d.get("commento") and not any(a["settimana"] == d["settimana"] for a in d.get("archivio", [])):
        d.setdefault("archivio", []).insert(0, {"settimana": d["settimana"], "commento": d["commento"]})
    d.update(nuovo)
    json.dump(d, open(f"{ROOT}/{f}", "w", encoding="utf-8"), ensure_ascii=False, indent=2); open(f"{ROOT}/{f}", "a").write("\n"); print("scritto", f)
