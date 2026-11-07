"""Diagnostica v3: nome del campionato (voce selezionata del menu) + squadre nostre."""
import re, time, urllib.request
from fetch_calendario_fipav import fetch_campionato

URL = ("https://umbria.portalefipav.net/risultati-classifiche.aspx"
       "?ComitatoId=30&StId=2410&DataDa=&StatoGara=&CId={cid}&SId=&PId=7323&btFiltro=CERCA")
SOC = re.compile(r"narni|orvieto|colle\s?luna|colleluna|san\s?gemini|sangemini", re.I)

def nome(cid):
    req = urllib.request.Request(URL.format(cid=cid), headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "ignore")
    m = re.search(r'<option[^>]*value="%d"[^>]*>([^<]+)</option>' % cid, html)
    if m: return m.group(1).strip()
    m = re.search(r'<option[^>]*selected[^>]*>([^<]+)</option>', html)
    return ("sel:" + m.group(1).strip()) if m else "?"

lista = list(range(93957,93960)) + list(range(94000, 94300))
for cid in lista:
    p = fetch_campionato({"id": "x", "nome": "x", "url": URL.format(cid=cid)})
    squadre = sorted({s for m in p for s in (m["casa"], m["ospite"])})
    nostre = [s for s in squadre if SOC.search(s)]
    if nostre or len(p) > 0 and cid % 10 == 0:
        print(f"cid={cid} nome={nome(cid)!r} partite={len(p)} squadre={len(squadre)} nostre={nostre}", flush=True)
    time.sleep(0.25)
print("FINE")
