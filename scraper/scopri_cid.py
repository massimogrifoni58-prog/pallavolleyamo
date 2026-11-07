"""Diagnostica: per ogni CId legge le partite e mostra squadre (non scrive file)."""
import re, time, hashlib
from fetch_calendario_fipav import fetch_campionato

URL = ("https://umbria.portalefipav.net/risultati-classifiche.aspx"
       "?ComitatoId=30&StId=2410&DataDa=&StatoGara=&CId={cid}&SId=&PId=7323&btFiltro=CERCA")
SOC = re.compile(r"narni|orvieto|colle\s?luna|colleluna|san\s?gemini|sangemini", re.I)
visti = {}
intervalli = [range(93004, 93006), range(93238, 93239), range(93440, 93442),
              range(93500, 93560), range(93780, 93960)]
for rng in intervalli:
    for cid in rng:
        p = fetch_campionato({"id": "x", "nome": "x", "url": URL.format(cid=cid)})
        squadre = sorted({s for m in p for s in (m["casa"], m["ospite"])})
        sig = hashlib.md5("|".join(squadre).encode()).hexdigest()[:6]
        nostre = [s for s in squadre if SOC.search(s)]
        dup = visti.setdefault(sig, cid)
        tag = "" if dup == cid else f" (UGUALE a {dup})"
        print(f"cid={cid} partite={len(p)} squadre={len(squadre)} sig={sig}{tag} nostre={nostre}", flush=True)
        time.sleep(0.3)
