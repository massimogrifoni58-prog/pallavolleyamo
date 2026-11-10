"""Aggiorna 'ultimo' e 'prossima' delle squadre in evidenza (data/pallavolo-umbria.json)
usando i calendari gia' scaricati. Non tocca i testi della Settimana Volley.
Se non trova un dato, lascia quello che c'e'."""
import json, re, sys, datetime as dt
ROOT = __file__.rsplit("/scraper", 1)[0]
FONTI = ["data/risultati_nazionali.json", "data/risultati_nazionali_fipav.json"]
FILES = ["data/pallavolo-umbria.json", "react-app/data/pallavolo-umbria.json"]
CHIAVI = {  # id squadra -> pezzi di nome (maiuscolo) + parola del campionato
    "sir-perugia": ("SIR SUSA SCAI PERUGIA", "SUPERLEGA"),
    "marsciano": ("FAIL GROUP MARSCIANO", "B2"),
    "citta-di-castello": ("CITTA' DI CASTELLO", "B2"),
}
MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"]
oggi = dt.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else dt.date.today()

def norm(s): return re.sub(r"[^A-Z0-9]", "", s.upper())
def carica(p):
    return json.load(open(f"{ROOT}/{p}", encoding="utf-8"))
partite = []
for f in FONTI:
    try: partite += carica(f)["matches"]
    except Exception as e: print("fonte non letta", f, e)

def trova(nome, camp):
    n = norm(nome); out = []
    for m in partite:
        if camp not in m["competition"].upper().replace(" ", "") and camp not in m["competition"].upper(): continue
        if n in norm(m["home"]) or n in norm(m["away"]) or (n.replace("PALLAVOLO","") and norm(m["home"]).replace("PALLAV","") == n.replace("PALLAVOLO","")):
            out.append(m)
    return out

def mio(m, nome):
    return norm(nome) in norm(m["home"])
def quando(iso):
    d = dt.date.fromisoformat(iso); return f"{d.day} {MESI[d.month-1]}"

squadre_nome = {}
for f in FILES:
    d = carica(f); mod = False
    for s in d["squadre"]:
        if s["id"] not in CHIAVI: continue
        chiave, camp = CHIAVI[s["id"]]
        if s["id"] == "citta-di-castello": chiave = "CITTADICASTELLO"
        ms = trova(chiave, camp)
        giocate = [m for m in ms if re.fullmatch(r"\d-\d", m.get("score","")) and m["dataIso"] <= oggi.isoformat()]
        future = [m for m in ms if not re.fullmatch(r"\d-\d", m.get("score","")) and m["dataIso"] >= oggi.isoformat()]
        if giocate:
            g = max(giocate, key=lambda m: m["dataIso"])
            nuovo = {"quando": quando(g["dataIso"]), "casa": s["nome"] if mio(g, chiave) else g["home"].title(),
                     "ospite": g["away"].title() if mio(g, chiave) else s["nome"], "risultato": g["score"]}
            if s.get("ultimo") and (s["ultimo"].get("quando"), s["ultimo"].get("risultato")) != (nuovo["quando"], nuovo["risultato"]):
                # nome corretto: tengo i nomi gia' scritti a mano se la partita e' la stessa
                a, b = map(int, g["score"].split("-"))
                vinto = (a > b) == mio(g, chiave)
                avv = (g["away"] if mio(g, chiave) else g["home"]).title()
                s["commento"] = f"{'Vittoria' if vinto else 'Sconfitta'} per {g['score'] if mio(g,chiave) else g['score'][::-1]} contro {avv}."
                s["ultimo"] = nuovo; mod = True
            elif not s.get("ultimo"):
                s["ultimo"] = nuovo; mod = True
        if future:
            p = min(future, key=lambda m: (m["dataIso"], m.get("ora","")))
            nuova = {"quando": p["dataIso"], "ora": p.get("ora",""), "casa": p["home"].title() if not mio(p, chiave) else s["nome"],
                     "ospite": p["away"].title() if mio(p, chiave) else s["nome"]}
            if s.get("prossima") != nuova and (not s.get("prossima") or s["prossima"].get("quando") != nuova["quando"]):
                s["prossima"] = nuova; mod = True
        elif s.get("prossima") and s["prossima"].get("quando","") < oggi.isoformat():
            s["prossima"] = None; mod = True
    if mod:
        json.dump(d, open(f"{ROOT}/{f}", "w", encoding="utf-8"), ensure_ascii=False, indent=2); print("aggiornato", f)
    else: print("invariato", f)
