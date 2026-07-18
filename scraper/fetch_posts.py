"""
Scraper PallaVolleyAmo Feed
============================
Scarica gli ultimi post dalla pagina Facebook PallaVolleyAmo
tramite la Graph API e li salva in un file JSON, pronto per
essere letto dal sito React.

Uso:
    python fetch_posts.py

Output:
    ../react-app/data/posts.json
"""

import json
import sys
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from datetime import datetime, timezone

import config

# Numero massimo di post da scaricare
LIMIT = 30

# Campi richiesti a Facebook per ogni post
FIELDS = "id,message,created_time,full_picture,permalink_url,from,attachments{media,type,url}"

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "react-app" / "data" / "posts.json"


def build_url():
    # /tagged mostra i post pubblicati da altre persone dal proprio
    # profilo, in cui la Pagina e' stata taggata. Questo e' diverso
    # da /feed, che mostra solo cio' che appare sulla bacheca della
    # Pagina stessa (e che oggi, con la Nuova Esperienza Pagine,
    # coincide quasi sempre con i post della Pagina).
    base = f"https://graph.facebook.com/{config.GRAPH_API_VERSION}/{config.PAGE_ID}/tagged"
    params = {
        "fields": FIELDS,
        "limit": LIMIT,
        "access_token": config.PAGE_ACCESS_TOKEN,
    }
    return f"{base}?{urllib.parse.urlencode(params)}"


def fetch_posts():
    url = build_url()
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            raw = response.read()
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        print("ERRORE: Facebook ha risposto con un errore.")
        print(f"Codice HTTP: {e.code}")
        print(f"Dettagli: {body}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print("ERRORE: impossibile contattare Facebook. Controlla la connessione.")
        print(str(e))
        sys.exit(1)


def normalize_post(raw_post):
    """Trasforma un post grezzo della Graph API in una struttura
    semplice e pulita da usare nel sito React."""

    image = raw_post.get("full_picture")

    # Se non c'e' full_picture, proviamo a prenderla dagli attachments
    if not image:
        attachments = raw_post.get("attachments", {}).get("data", [])
        for att in attachments:
            media = att.get("media", {})
            img = media.get("image", {})
            if img.get("src"):
                image = img["src"]
                break

    author = raw_post.get("from", {}).get("name", "Un follower")

    return {
        "id": raw_post.get("id"),
        "message": raw_post.get("message", "").strip(),
        "createdTime": raw_post.get("created_time"),
        "image": image,
        "permalink": raw_post.get("permalink_url"),
        "author": author,
        "isFollowerPost": author != "Pallavolleyamo",
    }


def main():
    print("Scarico i post da Facebook...")
    data = fetch_posts()

    raw_posts = data.get("data", [])
    print(f"Trovati {len(raw_posts)} post.")

    posts = [normalize_post(p) for p in raw_posts]

    # NOTA: con l'endpoint /tagged, tutti i risultati sono già
    # post di altre persone che taggano la Pagina (non serve
    # filtrare per autore, anche perche' a volte il nome
    # dell'autore non e' visibile per motivi di privacy).

    # Scartiamo eventuali post senza immagine E senza testo (poco utili nel blog)
    posts = [p for p in posts if p["image"] or p["message"]]

    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "pageId": config.PAGE_ID,
        "count": len(posts),
        "posts": posts,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Salvati {len(posts)} post in: {OUTPUT_PATH}")
    print("Fatto.")


if __name__ == "__main__":
    main()
