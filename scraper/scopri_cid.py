"""Scopre quali numeri CId del portale FIPAV corrispondono a quali campionati (solo diagnostica, non scrive file)."""
import re, sys, time, urllib.request
from bs4 import BeautifulSoup

URL = ("https://umbria.portalefipav.net/risultati-classifiche.aspx"
       "?ComitatoId=30&StId=2410&DataDa=&StatoGara=&CId={cid}&SId=&PId=7323&btFiltro=CERCA")
NOME = re.compile(r"((?:Under \d+ (?:Maschile|Femminile)(?: 4x4)?|\d Divisione Femminile|Serie [A-D]\w*(?: \w+)?)\s+(?:Girone \w+|ELITE))")
DATA = re.compile(r"\d{2}/\d{2}/\d{2}\s+\d{2}:\d{2}")
SOC = re.compile(r"narni|orvieto|colle\s?luna|san\s?gemini|sangemini", re.I)

def scarica(cid):
    req = urllib.request.Request(URL.format(cid=cid), headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", errors="ignore")

intervalli = [range(93000, 93012), range(93230, 93245), range(93410, 93420), range(93520, 93532), range(93780, 94000)]
for rng in intervalli:
    for cid in rng:
        try:
            html = scarica(cid)
        except Exception as e:
            print(cid, "ERRORE", e); continue
        testo = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
        nomi = sorted(set(m.strip() for m in NOME.findall(testo)))
        righe = len(DATA.findall(testo))
        nostre = len(SOC.findall(testo))
        if len(nomi) == 1:
            print(f"VALIDO cid={cid} | {nomi[0]} | date={righe} | nostre_squadre={nostre}", flush=True)
        else:
            print(f"scarto cid={cid} (titoli distinti: {len(nomi)})", flush=True)
        time.sleep(0.4)
