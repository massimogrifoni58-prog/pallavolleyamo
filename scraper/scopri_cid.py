"""Diagnostica v5: elenco completo CId|nome|partite (non scrive file)."""
import re, time, urllib.request
from bs4 import BeautifulSoup
URL = ("https://umbria.portalefipav.net/risultati-classifiche.aspx"
       "?ComitatoId=30&StId=2410&DataDa=&StatoGara=&CId={cid}&SId=&PId=7323&btFiltro=CERCA")
DATA = re.compile(r"\d{2}/\d{2}/\d{2}\s+\d{2}:\d{2}")
for cid in range(92890, 94300):
    try:
        html = urllib.request.urlopen(urllib.request.Request(URL.format(cid=cid), headers={"User-Agent": "Mozilla/5.0"}), timeout=40).read().decode("utf-8", "ignore")
    except Exception as e:
        print("ERR", cid, e, flush=True); continue
    m = re.search(r'<option[^>]*value="%d"[^>]*>([^<]+)</option>' % cid, html)
    n = len(DATA.findall(BeautifulSoup(html, "html.parser").get_text(" ")))
    if m and n:
        print(f"LISTA|{cid}|{m.group(1).strip()}|{n}", flush=True)
    time.sleep(0.15)
print("FINE")
