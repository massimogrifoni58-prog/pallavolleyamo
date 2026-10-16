#!/usr/bin/env python3
"""Importa dalla pagina Facebook PallaVolleyAmo i post che contengono l'hashtag scelto.
Legge FB_PAGE_TOKEN e FB_PAGE_ID dalle variabili d'ambiente (GitHub Secrets).
Scrive data/facebook_news.json e react-app/data/facebook_news.json.
"""
import json, os, re, sys, urllib.request, urllib.parse
from pathlib import Path

HASHTAG = "#sulsito"          # i post con questo hashtag vengono importati
DEFAULT_SEZIONE = "regionali"  # se non c'e' un hashtag di sezione
SEZIONI = ["nazionale", "nazionali", "regionali", "terni", "perugia"]  # es. #terni
MAX_POST = 40
API = "https://graph.facebook.com/v21.0"

def chiama(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)

def main():
    token = os.environ.get("FB_PAGE_TOKEN", "").strip()
    page = os.environ.get("FB_PAGE_ID", "").strip()
    if not token or not page:
        print("ERRORE: mancano FB_PAGE_TOKEN o FB_PAGE_ID")
        sys.exit(1)
    q = urllib.parse.urlencode({
        "fields": "id,message,created_time,full_picture,permalink_url",
        "limit": 100,
        "access_token": token,
    })
    try:
        dati = chiama(f"{API}/{page}/published_posts?{q}")
    except urllib.error.HTTPError as e:
        print("ERRORE Facebook:", e.read().decode("utf-8", "replace")[:500])
        sys.exit(1)

    tag = HASHTAG.lower()
    posts = []
    for p in dati.get("data", []):
        msg = p.get("message") or ""
        if tag not in msg.lower():
            continue
        sezione = DEFAULT_SEZIONE
        for s in SEZIONI:
            if re.search(r"#" + s + r"\b", msg, re.I):
                sezione = s
                break
        pulito = re.sub(r"#\w+", "", msg)
        pulito = re.sub(r"[ \t]+", " ", pulito).strip()
        righe = [r.strip() for r in pulito.split("\n") if r.strip()]
        if not righe:
            continue
        titolo = righe[0]
        resto = " ".join(righe[1:]) if len(righe) > 1 else ""
        if len(titolo) > 110 and not resto:
            resto, titolo = titolo, titolo[:100].rsplit(" ", 1)[0] + "…"
        posts.append({
            "id": "fb" + p["id"].split("_")[-1],
            "title": titolo,
            "excerpt": (resto[:150] + "…") if len(resto) > 150 else resto,
            "testo": pulito,
            "createdTime": p.get("created_time", ""),
            "image": p.get("full_picture"),
            "permalink": p.get("permalink_url"),
            "source": "PallaVolleyAmo",
            "sezione": sezione,
        })
    posts.sort(key=lambda x: x["createdTime"], reverse=True)
    posts = posts[:MAX_POST]
    out = {"aggiornato": __import__("datetime").datetime.utcnow().isoformat() + "Z", "posts": posts}
    for d in ("data", "react-app/data"):
        Path(d).mkdir(parents=True, exist_ok=True)
        Path(d, "facebook_news.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Post letti: {len(dati.get('data', []))} - importati con {HASHTAG}: {len(posts)}")

if __name__ == "__main__":
    main()
