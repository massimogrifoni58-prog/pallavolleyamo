"""
fetch_google_news.py
Scarica notizie di pallavolo da Google News RSS
e le aggiunge ai JSON esistenti.
"""

import json
import os
import re
import urllib.request
import urllib.parse
from datetime import datetime
from xml.etree import ElementTree as ET

# Cartella data relativa allo scraper
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "react-app", "data")

# Query di ricerca per ogni feed
FEEDS = [
    {
        "query": "pallavolo umbria",
        "output": "regionali.json",
        "label": "Regionali (Google News)",
    },
    {
        "query": "pallavolo terni",
        "output": "terni.json",
        "label": "Terni (Google News)",
    },
    {
        "query": "pallavolo perugia",
        "output": "perugia.json",
        "label": "Perugia (Google News)",
    },
    {
        "query": "pallavolo nazionale italiana",
        "output": "nazionale.json",
        "label": "Nazionale (Google News)",
    },
]

MAX_ITEMS = 20  # Quante notizie prendere per feed


def fetch_rss(query):
    """Scarica il feed RSS di Google News per la query data."""
    encoded = urllib.parse.quote(query)
    url = f"https://news.google.com/rss/search?q={encoded}&hl=it&gl=IT&ceid=IT:it"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.read()


def parse_rss(xml_bytes):
    """Estrae i post dal feed RSS."""
    root = ET.fromstring(xml_bytes)
    channel = root.find("channel")
    posts = []
    for item in channel.findall("item")[:MAX_ITEMS]:
        title = item.findtext("title", "").strip()
        link = item.findtext("link", "").strip()
        pub_date = item.findtext("pubDate", "").strip()
        source_el = item.find("source")
        source = source_el.text.strip() if source_el is not None else ""

        # Converti data in formato ISO
        try:
            dt = datetime.strptime(pub_date, "%a, %d %b %Y %H:%M:%S %Z")
            created_time = dt.strftime("%a, %d %b %Y %H:%M:%S GMT")
        except Exception:
            created_time = pub_date

        posts.append({
            "id": re.sub(r"[^a-z0-9]", "", title.lower())[:30],
            "title": title,
            "excerpt": f"Fonte: {source}" if source else "",
            "createdTime": created_time,
            "image": None,
            "permalink": link,
        })
    return posts


def load_json(path):
    """Carica un JSON esistente o restituisce struttura vuota."""
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {"posts": []}


def merge_posts(existing, new_posts):
    """Unisce i post evitando duplicati (per permalink)."""
    existing_links = {p.get("permalink", "") for p in existing}
    merged = list(existing)
    for p in new_posts:
        if p["permalink"] not in existing_links:
            merged.append(p)
            existing_links.add(p["permalink"])
    # Ordina per data decrescente e tieni i 60 più recenti
    merged.sort(key=lambda x: x.get("createdTime", ""), reverse=True)
    return merged[:60]


def main():
    for feed in FEEDS:
        print(f"Scarico {feed['label']}...", end=" ", flush=True)
        try:
            xml = fetch_rss(feed["query"])
            new_posts = parse_rss(xml)
            out_path = os.path.join(DATA_DIR, feed["output"])
            data = load_json(out_path)
            data["posts"] = merge_posts(data.get("posts", []), new_posts)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"OK ({len(new_posts)} nuove notizie)")
        except Exception as e:
            print(f"ERRORE: {e}")


if __name__ == "__main__":
    main()
