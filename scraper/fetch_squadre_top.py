"""
fetch_squadre_top.py
Scarica le ultime 3 notizie per squadre umbre in categorie superiori
e allenatori umbri che allenano in nazionale/estero
Output: react-app/data/squadre_top.json
"""

import json
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "squadre_top.json"
HEADERS = {"User-Agent": "Mozilla/5.0"}
MAX_NEWS = 3

SOGGETTI = [
    # SQUADRE UMBRE IN CATEGORIE SUPERIORI
    {"id": "sir-perugia", "nome": "Sir Susa Vim Perugia", "tipo": "squadra", "categoria": "Superlega", "query": "Sir Susa Vim Perugia pallavolo 2026"},
    {"id": "bartoccini", "nome": "Bartoccini Fortinfissi Perugia", "tipo": "squadra", "categoria": "Serie A1 F", "query": "Bartoccini Perugia pallavolo 2026"},
    {"id": "tva", "nome": "Terni Volley Academy", "tipo": "squadra", "categoria": "Serie A3", "query": "Terni Volley Academy Dragons pallavolo 2026"},
    {"id": "altotevere", "nome": "Ermgroup Altotevere San Giustino", "tipo": "squadra", "categoria": "Serie A3", "query": "Altotevere San Giustino pallavolo A3 2026"},
    {"id": "citta-castello", "nome": "Pallavolo Città di Castello", "tipo": "squadra", "categoria": "Serie B M", "query": "Pallavolo Città di Castello volley 2026"},
    {"id": "marsciano", "nome": "Pallavolo Media Umbria Marsciano", "tipo": "squadra", "categoria": "Serie B F", "query": "Pallavolo Media Umbria Marsciano volley 2026"},
]


def fetch_news(query):
    encoded = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={encoded}&hl=it&gl=IT&ceid=IT:it"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.read()
    except Exception as e:
        print(f"  ERRORE: {e}")
        return None


def parse_date_safe(date_str):
    if not date_str:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        dt = parsedate_to_datetime(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.min.replace(tzinfo=timezone.utc)


def parse_rss(xml_bytes):
    try:
        root = ET.fromstring(xml_bytes)
        channel = root.find("channel")
        posts = []
        cutoff = datetime.now(timezone.utc) - timedelta(days=365)
        for item in channel.findall("item")[:10]:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            pub_date = (item.findtext("pubDate") or "").strip()
            source_el = item.find("source")
            source = source_el.text.strip() if source_el is not None else ""
            dt = parse_date_safe(pub_date)
            if dt < cutoff:
                continue
           # Prova immagine da enclosure
            image = None
            enc = item.find("enclosure")
            if enc is not None:
                image = enc.get("url")
            posts.append({
                "title": title,
                "link": link,
                "pubDate": pub_date,
                "source": source,
                "image": image,
            })
        posts.sort(key=lambda p: parse_date_safe(p["pubDate"]), reverse=True)
        return posts[:MAX_NEWS]
    except Exception as e:
        print(f"  Parse error: {e}")
        return []


def main():
    result = {}

    for s in SOGGETTI:
        print(f"Scarico notizie per {s['nome']}...", end=" ", flush=True)
        xml_bytes = fetch_news(s["query"])
        if not xml_bytes:
            result[s["id"]] = []
            continue
        news = parse_rss(xml_bytes)
        result[s["id"]] = news
        print(f"OK ({len(news)} notizie)")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "soggetti": SOGGETTI,
            "news": result
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nSalvate notizie in: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
