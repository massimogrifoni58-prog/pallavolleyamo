"""
fetch_squadre_top.py
Scarica le ultime notizie per squadre umbre in categorie superiori
usando sia Google News che Bing News, con deduplicazione
Output: react-app/data/squadre_top.json
"""

import json
import gzip
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "squadre_top.json"
HEADERS = {"User-Agent": "Mozilla/5.0"}
MAX_NEWS = 5

SOGGETTI = [
    {
        "id": "sir-perugia",
        "nome": "Sir Susa Vim Perugia",
        "categoria": "Superlega",
        "queries": [
            {"q": "Sir Perugia volley", "fonte": "google"},
            {"q": "Sir Block Devils Perugia pallavolo", "fonte": "bing"},
        ]
    },
    {
        "id": "bartoccini",
        "nome": "Bartoccini MC Restauri Perugia",
        "categoria": "Serie A1 F",
        "queries": [
            {"q": "Bartoccini Perugia volley femminile", "fonte": "google"},
            {"q": "Black Angels Perugia pallavolo", "fonte": "bing"},
        ]
    },
    {
        "id": "tva",
        "nome": "Terni Volley Academy",
        "categoria": "Serie A3",
        "queries": [
            {"q": "Terni Volley Academy Dragons", "fonte": "bing"},
            {"q": "TVA Terni pallavolo A3", "fonte": "google"},
        ]
    },
    {
        "id": "altotevere",
        "nome": "Ermgroup Altotevere San Giustino",
        "categoria": "Serie A3",
        "queries": [
            {"q": "Altotevere San Giustino pallavolo", "fonte": "bing"},
            {"q": "Ermgroup Altotevere volley", "fonte": "google"},
        ]
    },
    {
        "id": "citta-castello",
        "nome": "Pallavolo Città di Castello",
        "categoria": "Serie B M",
        "queries": [
            {"q": "Pallavolo Città di Castello volley", "fonte": "bing"},
            {"q": "Città di Castello pallavolo serie B", "fonte": "google"},
        ]
    },
    {
        "id": "marsciano",
        "nome": "Pallavolo Media Umbria Marsciano",
        "categoria": "Serie B F",
        "queries": [
            {"q": "Pallavolo Media Umbria Marsciano volley", "fonte": "bing"},
            {"q": "Marsciano pallavolo femminile", "fonte": "google"},
        ]
    },
]


def fetch_news(query, fonte="bing"):
    encoded = urllib.parse.quote(query)
    if fonte == "google":
        url = f"https://news.google.com/rss/search?q={encoded}&hl=it&gl=IT&ceid=IT:it"
    else:
        url = f"https://www.bing.com/news/search?q={encoded}&format=RSS&setlang=it-IT&cc=IT"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.read()
    except Exception as e:
        print(f"    ERRORE ({fonte}): {e}")
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
            posts.append({
                "title": title,
                "link": link,
                "pubDate": pub_date,
                "source": source,
                "image": None,
            })
        posts.sort(key=lambda p: parse_date_safe(p["pubDate"]), reverse=True)
        return posts
    except Exception as e:
        print(f"    Parse error: {e}")
        return []


def main():
    result = {}

    for s in SOGGETTI:
        print(f"Scarico notizie per {s['nome']}...")
        all_posts = []
        seen_titles = set()

        for q_info in s["queries"]:
            print(f"  [{q_info['fonte']}] {q_info['q']}", end=" ", flush=True)
            xml_bytes = fetch_news(q_info["q"], q_info["fonte"])
            if not xml_bytes:
                continue
            posts = parse_rss(xml_bytes)
            nuovi = 0
            for p in posts:
                # Deduplica per titolo (primi 50 caratteri)
                key = p["title"][:50].lower()
                if key not in seen_titles:
                    seen_titles.add(key)
                    all_posts.append(p)
                    nuovi += 1
            print(f"(+{nuovi})")

        # Ordina per data e taglia a MAX_NEWS
        all_posts.sort(key=lambda p: parse_date_safe(p["pubDate"]), reverse=True)
        all_posts = all_posts[:MAX_NEWS]
        result[s["id"]] = all_posts
        print(f"  → {len(all_posts)} notizie totali")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "soggetti": [{k: v for k, v in s.items() if k != "queries"} for s in SOGGETTI],
            "news": result
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nSalvate notizie in: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
