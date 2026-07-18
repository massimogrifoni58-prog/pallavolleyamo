"""
fetch_video.py
Scarica gli ultimi video da canali YouTube di pallavolo
e li salva in video.json per la pagina Video del sito.
"""

import json
import os
import urllib.request
import urllib.parse
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "react-app", "data")

API_KEY = "AIzaSyCwgBEqKTB_Xz0v-YLfvBU5OFs6byjSekI"

# 2 video per canale = 6 video totali
CANALI = [
    {
        "id": "UCaTF1soVKjGtdhizgLJVydg",
        "nome": "Volleyball World Italia",
        "max": 3,
    },
]

# Ricerche per parola chiave (per integrare i canali con pochi video)
RICERCHE = [
    {
        "query": "pallavolo italia highlights 2026",
        "max": 3,
    },
]


def fetch_videos(channel_id, max_results, api_key):
    """Scarica gli ultimi video di un canale YouTube."""
    params = urllib.parse.urlencode({
        "key": api_key,
        "channelId": channel_id,
        "part": "snippet",
        "order": "date",
        "maxResults": max_results,
        "type": "video",
    })
    url = f"https://www.googleapis.com/youtube/v3/search?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def fetch_by_keyword(query, max_results, api_key):
    """Cerca video YouTube per parola chiave."""
    params = urllib.parse.urlencode({
        "key": api_key,
        "q": query,
        "part": "snippet",
        "order": "date",
        "maxResults": max_results,
        "type": "video",
        "relevanceLanguage": "it",
    })
    url = f"https://www.googleapis.com/youtube/v3/search?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def main():
    tutti_video = []
    ids_visti = set()

    # Da canali
    for canale in CANALI:
        print(f"Scarico {canale['nome']}...", end=" ", flush=True)
        try:
            data = fetch_videos(canale["id"], canale["max"], API_KEY)
            items = data.get("items", [])
            for item in items:
                snippet = item.get("snippet", {})
                video_id = item.get("id", {}).get("videoId", "")
                if not video_id or video_id in ids_visti:
                    continue
                ids_visti.add(video_id)
                thumbnail = (
                    snippet.get("thumbnails", {}).get("high", {}).get("url", "")
                    or snippet.get("thumbnails", {}).get("medium", {}).get("url", "")
                )
                tutti_video.append({
                    "id": video_id,
                    "titolo": snippet.get("title", ""),
                    "canale": canale["nome"],
                    "thumbnail": thumbnail,
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "embed": f"https://www.youtube.com/embed/{video_id}",
                    "data": snippet.get("publishedAt", ""),
                })
            print(f"OK ({len(items)} video)")
        except Exception as e:
            print(f"ERRORE: {e}")

    # Da ricerche per keyword
    for ricerca in RICERCHE:
        print(f"Cerco '{ricerca['query']}'...", end=" ", flush=True)
        try:
            data = fetch_by_keyword(ricerca["query"], ricerca["max"], API_KEY)
            items = data.get("items", [])
            aggiunti = 0
            for item in items:
                snippet = item.get("snippet", {})
                video_id = item.get("id", {}).get("videoId", "")
                if not video_id or video_id in ids_visti:
                    continue
                ids_visti.add(video_id)
                thumbnail = (
                    snippet.get("thumbnails", {}).get("high", {}).get("url", "")
                    or snippet.get("thumbnails", {}).get("medium", {}).get("url", "")
                )
                tutti_video.append({
                    "id": video_id,
                    "titolo": snippet.get("title", ""),
                    "canale": snippet.get("channelTitle", "YouTube"),
                    "thumbnail": thumbnail,
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "embed": f"https://www.youtube.com/embed/{video_id}",
                    "data": snippet.get("publishedAt", ""),
                })
                aggiunti += 1
            print(f"OK (+{aggiunti} video)")
        except Exception as e:
            print(f"ERRORE: {e}")

    tutti_video.sort(key=lambda x: x.get("data", ""), reverse=True)

    out_path = os.path.join(DATA_DIR, "video.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"video": tutti_video}, f, ensure_ascii=False, indent=2)

    print(f"\nTotale: {len(tutti_video)} video salvati in video.json")


if __name__ == "__main__":
    main()
