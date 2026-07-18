"""
fetch_volley_feeds.py
Nazionale: VNL + Mondiali + Europei
Campionati: Superlega + A1 + A2 + A3 + VolleyNews
"""

import json
import os
import re
import urllib.request
from datetime import datetime
from xml.etree import ElementTree as ET
from html.parser import HTMLParser

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "react-app", "data")

MAX_ITEMS = 20

FEEDS = [
    # NAZIONALE - Solo Nazionale Italiana
    {
        "url": "https://www.volleyball.it/links/rss/argomenti/vnl-maschile/rss.xml",
        "output": "nazionale.json",
        "label": "Volleyball.it - VNL Maschile",
    },
    {
        "url": "https://www.volleyball.it/links/rss/argomenti/vnl-femminile/rss.xml",
        "output": "nazionale.json",
        "label": "Volleyball.it - VNL Femminile",
    },
    {
        "url": "https://www.volleyball.it/links/rss/argomenti/mondiali/rss.xml",
        "output": "nazionale.json",
        "label": "Volleyball.it - Mondiali",
    },
    {
        "url": "https://www.volleyball.it/links/rss/argomenti/europei-maschili/rss.xml",
        "output": "nazionale.json",
        "label": "Volleyball.it - Europei Maschili",
    },
    {
        "url": "https://www.volleyball.it/links/rss/argomenti/europei-femminili/rss.xml",
        "output": "nazionale.json",
        "label": "Volleyball.it - Europei Femminili",
    },
    # CAMPIONATI NAZIONALI - Squadre di club
    {
        "url": "https://www.volleyball.it/links/rss/argomenti/superlega/rss.xml",
        "output": "nazionali.json",
        "label": "Volleyball.it - Superlega",
    },
    {
        "url": "https://www.volleyball.it/links/rss/argomenti/a1-femminile/rss.xml",
        "output": "nazionali.json",
        "label": "Volleyball.it - A1 Femminile",
    },
    {
        "url": "https://www.volleyball.it/links/rss/argomenti/a2-maschile/rss.xml",
        "output": "nazionali.json",
        "label": "Volleyball.it - A2 Maschile",
    },
    {
        "url": "https://www.volleyball.it/links/rss/argomenti/a2-femminile/rss.xml",
        "output": "nazionali.json",
        "label": "Volleyball.it - A2 Femminile",
    },
    {
        "url": "https://www.volleyball.it/links/rss/argomenti/a3-maschile/rss.xml",
        "output": "nazionali.json",
        "label": "Volleyball.it - A3 Maschile",
    },
    {
        "url": "https://www.volleynews.it/feed/",
        "output": "nazionali.json",
        "label": "VolleyNews.it",
    },
]


class OGImageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.og_image = None

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "meta":
            if attrs_dict.get("property") == "og:image":
                self.og_image = attrs_dict.get("content")
            elif attrs_dict.get("name") == "twitter:image" and not self.og_image:
                self.og_image = attrs_dict.get("content")


def fetch_url(url, timeout=8):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


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


def get_image_from_page(url):
    try:
        html = fetch_url(url, timeout=6).decode("utf-8", errors="ignore")
        parser = OGImageParser()
        parser.feed(html[:8000])
        return parser.og_image
    except Exception:
        return None


def parse_rss(xml_bytes, fetch_images=True):
    root = ET.fromstring(xml_bytes)
    channel = root.find("channel")
    posts = []
    for item in channel.findall("item")[:MAX_ITEMS]:
        title = item.findtext("title", "").strip()
        link = item.findtext("link", "").strip()
        pub_date = item.findtext("pubDate", "").strip()
        desc = item.findtext("description", "").strip()
        excerpt = re.sub(r"<[^>]+>", "", desc).strip()[:200]

        try:
            dt = datetime.strptime(pub_date, "%a, %d %b %Y %H:%M:%S %z")
            created_time = dt.strftime("%a, %d %b %Y %H:%M:%S GMT")
        except Exception:
            try:
                dt = datetime.strptime(pub_date, "%a, %d %b %Y %H:%M:%S %Z")
                created_time = dt.strftime("%a, %d %b %Y %H:%M:%S GMT")
            except Exception:
                created_time = pub_date

        image = get_image_from_item(item)
        if not image and fetch_images and link:
            image = get_image_from_page(link)

        posts.append({
            "id": re.sub(r"[^a-z0-9]", "", title.lower())[:30],
            "title": title,
            "excerpt": excerpt if excerpt else f"Leggi su {link[:40]}",
            "createdTime": created_time,
            "image": image,
            "permalink": link,
        })
    return posts


def load_json(path):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {"posts": []}


def merge_posts(existing, new_posts):
    existing_links = {p.get("permalink", "") for p in existing}
    merged = list(existing)
    added = 0
    for p in new_posts:
        if p["permalink"] not in existing_links:
            merged.append(p)
            existing_links.add(p["permalink"])
            added += 1
    merged.sort(key=lambda x: x.get("createdTime", ""), reverse=True)
    return merged[:80], added


def main():
    for feed in FEEDS:
        print(f"Scarico {feed['label']}...", end=" ", flush=True)
        try:
            xml = fetch_url(feed["url"])
            new_posts = parse_rss(xml, fetch_images=True)
            out_path = os.path.join(DATA_DIR, feed["output"])
            data = load_json(out_path)
            data["posts"], added = merge_posts(data.get("posts", []), new_posts)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            con_foto = sum(1 for p in new_posts if p.get("image"))
            print(f"OK (+{added} nuove, {con_foto}/{len(new_posts)} con foto)")
        except Exception as e:
            print(f"ERRORE: {e}")


if __name__ == "__main__":
    main()
