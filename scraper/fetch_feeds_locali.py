"""
fetch_feeds_locali.py
Scarica notizie di pallavolo direttamente dai siti locali umbri
senza usare Bing News o Google News.

Fonti Prov. Terni:
  - TerniInRete.it (RSS volley)
  - UmbriaON.it (RSS pallavolo)
  - Sporterni.it (RSS)
  - Pianeta Volley (RSS - notizie Terni)

Fonti Prov. Perugia:
  - PianetaVolley.net (RSS)
  - UmbriaON.it (RSS pallavolo)
  - Umbria24.it (RSS sport)

Uso:
    python fetch_feeds_locali.py

Output:
    ../react-app/data/terni.json
    ../react-app/data/perugia.json
"""

import gzip
import json
import re
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone, timedelta

OUTPUT_TERNI = Path(__file__).resolve().parent.parent / "react-app" / "data" / "terni.json"
OUTPUT_PERUGIA = Path(__file__).resolve().parent.parent / "react-app" / "data" / "perugia.json"
HEADERS = {"User-Agent": "Mozilla/5.0"}
MAX_PER_FEED = 15

# Fonti RSS per Prov. Terni
FEEDS_TERNI = [
    {
        "url": "https://terninrete.it/notizie-di-terni-category/volley/feed/",
        "label": "TerniInRete - Volley",
    },
]

# Fonti RSS per Prov. Perugia
FEEDS_PERUGIA = [
    {
        "url": "https://www.pianetavolley.net/feed/",
        "label": "PianetaVolley - Umbria",
    },
    {
        "url": "https://www.umbria24.it/feed/",
        "label": "Umbria24 - Sport",
    },
]

# Keywords per filtrare notizie Terni
KEYWORDS_TERNI = [
    "terni", "narni", "orvieto", "amelia", "acquasparta",
    "san gemini", "arrone", "bosico", "amerina", "colleluna",
    "clt terni", "guardea", "Narni sport academy","sangemini don bosco ","Pallavolo Amerina", "Pallavolo Arrone",
]

# Keywords per filtrare notizie Perugia
KEYWORDS_PERUGIA = [
    "perugia", "foligno", "assisi", "gubbio", "umbertide",
    "marsciano", "città di castello", "bastia", "corciano",
    "deruta", "magione", "san giustino", "altotevere","pallavolo","volley",
    "media umbria marsciano", "bartoccini", "italchimici","spoleto","altotevere", "san giustino", "pallavolo perugia",
    "italchimici", "foligno volley", "bartoccini",
    "cus perugia", "monini spoleto", "montefalco",
]

# Escludi notizie TVA dalla prov Terni
EXCLUDE_TERNI = [
    "terni volley academy", "dragons terni", "conad pala terni","superenalotto"
]

# Escludi Sir Safety dalla prov Perugia  
EXCLUDE_PERUGIA = [
    "sir safety", "sir susa", "block devils",
    "calcio", "basket", "tennis", "nuoto", "atletica",
    "ciclismo", "rugby", "football", "hockey",
]


def fetch_og_image(url, timeout=6):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw = response.read(60000)
            if response.headers.get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
            html = raw.decode("utf-8", errors="ignore")
    except Exception:
        return None
    match = re.search(
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        html, re.IGNORECASE,
    )
    if not match:
        match = re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
            html, re.IGNORECASE,
        )
    return match.group(1) if match else None


def fetch_rss(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as response:
            return response.read()
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


def get_image_from_item(item):
    ns = {"media": "http://search.yahoo.com/mrss/"}
    media = item.find("media:content", ns)
    if media is not None:
        url = media.get("url")
        if url:
            return url
    enc = item.find("enclosure")
    if enc is not None:
        url = enc.get("url", "")
        if url and any(url.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
            return url
    desc = item.findtext("description", "") or ""
    match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', desc)
    if match:
        src = match.group(1)
        if not src.startswith("data:"):
            return src
    return None


def parse_rss(xml_bytes):
    try:
        root = ET.fromstring(xml_bytes)
        channel = root.find("channel")
        if channel is None:
            return []
        posts = []
        for item in channel.findall("item")[:MAX_PER_FEED]:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            pub_date = (item.findtext("pubDate") or "").strip()
            desc = (item.findtext("description") or "").strip()
            excerpt = re.sub(r"<[^>]+>", "", desc).strip()[:200]

            image = get_image_from_item(item)

            posts.append({
                "title": title,
                "excerpt": excerpt if excerpt else "",
                "createdTime": pub_date,
                "image": image,
                "permalink": link,
            })
        return posts
    except Exception as e:
        print(f"  Parse error: {e}")
        return []


def is_relevant(title, excerpt, keywords, exclude):
    text = (title + " " + excerpt).lower()
    has_volley = "volley" in text or "pallavolo" in text
    has_keyword = any(k in text for k in keywords)
    is_excluded = any(k in text for k in exclude)
    return has_volley and has_keyword and not is_excluded


def fetch_all(feeds, keywords, exclude, label):
    all_posts = []
    seen_links = set()

    for feed in feeds:
        print(f"  Scarico {feed['label']}...", end=" ", flush=True)
        xml_bytes = fetch_rss(feed["url"])
        if not xml_bytes:
            continue
        posts = parse_rss(xml_bytes)
        nuove = 0
        for p in posts:
            if p["permalink"] not in seen_links:
                # Se ci sono keywords, filtra; altrimenti prendi tutto
                if keywords:
                    if not is_relevant(p["title"], p["excerpt"], keywords, exclude):
                        continue
                seen_links.add(p["permalink"])
                all_posts.append(p)
                nuove += 1
        print(f"{nuove} notizie")

    # Ordina per data decrescente
    all_posts.sort(key=lambda p: -parse_date_safe(p["createdTime"]).timestamp())
    
    # Filtra notizie più vecchie di 12 mesi
    cutoff = datetime.now(timezone.utc) - timedelta(days=365)
    all_posts = [p for p in all_posts if parse_date_safe(p["createdTime"]) > cutoff]
    
    all_posts = all_posts[:50]

    # Recupera immagini mancanti
    print(f"  Recupero immagini...")
    for p in all_posts:
        if not p["image"] and p["permalink"]:
            p["image"] = fetch_og_image(p["permalink"])

    for i, p in enumerate(all_posts):
        p["id"] = str(i + 1)

    return all_posts


def save(posts, output_path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps({
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "posts": posts
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"  Salvate {len(posts)} notizie in: {output_path}")


def main():
    print("=== Prov. Terni ===")
    posts_terni = fetch_all(FEEDS_TERNI, KEYWORDS_TERNI, EXCLUDE_TERNI, "Terni")
    save(posts_terni, OUTPUT_TERNI)

    print("\n=== Prov. Perugia ===")
    posts_perugia = fetch_all(FEEDS_PERUGIA, KEYWORDS_PERUGIA, EXCLUDE_PERUGIA, "Perugia")
    save(posts_perugia, OUTPUT_PERUGIA)


if __name__ == "__main__":
    main()
