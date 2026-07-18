"""
fetch_coach_news.py
Scarica le ultime notizie di ogni allenatore da Google News RSS
e le salva in coach_news.json per la pagina Allenatori del sito.

Uso:
    python fetch_coach_news.py

Output:
    ../react-app/data/coach_news.json
"""

import json
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timezone

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "coach_news.json"
HEADERS = {"User-Agent": "Mozilla/5.0"}
MAX_NEWS_PER_COACH = 5

COACHES = [
    {"id": "1", "name": "Marco Mencarelli"},
    {"id": "2", "name": "Daniele Santarelli"},
    {"id": "3", "name": "Fausto Polidori"},
    {"id": "4", "name": "Giuseppe Cuccarini"},
    {"id": "5", "name": "Alessandro Chiappini"},
    {"id": "6", "name": "Mauro Chiappafreddo"},
    {"id": "7", "name": "Andrea Radici"},
    {"id": "8", "name": "Giampaolo Sperandio"},
    {"id": "9", "name": "Roberto Scaccia"},
    {"id": "10", "name": "Cristiano Camardese"},
    {"id": "11", "name": "Roberto Farinelli"},
]


def fetch_news(coach_name):
    query = f"{coach_name} pallavolo"
    encoded = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={encoded}&hl=it&gl=IT&ceid=IT:it"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.read()
    except Exception as e:
        print(f"  ERRORE: {e}")
        return None


def parse_rss(xml_bytes):
    try:
        root = ET.fromstring(xml_bytes)
        channel = root.find("channel")
        posts = []
        for item in channel.findall("item")[:MAX_NEWS_PER_COACH]:
            title = item.findtext("title", "").strip()
            link = item.findtext("link", "").strip()
            pub_date = item.findtext("pubDate", "").strip()
            source_el = item.find("source")
            source = source_el.text.strip() if source_el is not None else ""
            posts.append({
                "title": title,
                "link": link,
                "pubDate": pub_date,
                "source": source,
            })
        return posts
    except Exception as e:
        print(f"  Parse error: {e}")
        return []


def main():
    result = {}

    for coach in COACHES:
        print(f"Scarico notizie per {coach['name']}...", end=" ", flush=True)
        xml_bytes = fetch_news(coach["name"])
        if not xml_bytes:
            result[coach["id"]] = []
            continue
        news = parse_rss(xml_bytes)
        result[coach["id"]] = news
        print(f"OK ({len(news)} notizie)")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "news": result
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nSalvate notizie in: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
