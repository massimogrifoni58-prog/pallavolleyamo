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
ADMIN_ID = "10242406550211017"  # profilo di Massimo: i suoi commenti con l'hashtag valgono
API = "https://graph.facebook.com/v21.0"

def chiama(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)

def _estrai_foto(attachments):
    out = []
    for a in (attachments or []):
        subs = (a.get("subattachments") or {}).get("data", [])
        for x in (subs or [a]):
            src = ((x.get("media") or {}).get("image") or {}).get("src")
            if src and src not in out:
                out.append(src)
    return out

def foto_del_post(post_id, token):
    """Elenco delle foto di un post con piu' immagini (richieste separate, per non appesantire la lista)."""
    campi = "media_type,type,media,subattachments.limit(30){media,type}"
    prove = [
        (f"{API}/{post_id}?" + urllib.parse.urlencode({"fields": "attachments{" + campi + "}", "access_token": token}),
         lambda r: (r.get("attachments") or {}).get("data", [])),
        (f"{API}/{post_id}/attachments?" + urllib.parse.urlencode({"fields": campi, "access_token": token}),
         lambda r: r.get("data", [])),
    ]
    for url, estrai in prove:
        try:
            r = chiama(url)
        except Exception as e:
            print("Foto del post non lette:", post_id, "-", str(e)[:120])
            continue
        foto = _estrai_foto(estrai(r))
        if foto:
            return foto
        print("Nessuna foto in questa risposta:", json.dumps(r, ensure_ascii=False)[:400].replace(token, "***"))
    return []

def salva_foto(url, cartella, nome):
    """Scarica la foto in public/<cartella>/<nome> (i link di Facebook scadono) e ritorna il percorso sul sito."""
    if not url or not str(url).startswith("http"):
        return url
    dest = Path("public", cartella, nome)
    try:
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                dati_img = r.read()
            if len(dati_img) < 1000:
                raise ValueError("immagine troppo piccola")
            dest.write_bytes(dati_img)
        return "/" + cartella + "/" + nome
    except Exception as e:
        print("Foto non salvata:", nome, "-", str(e)[:80])
        return url

def unisci(nuovi, nome):
    """Aggiunge i nuovi elementi a quelli gia' importati (restano anche se il post viene tolto)."""
    try:
        vecchie = json.loads(Path("data", nome).read_text(encoding="utf-8")).get("posts", [])
    except Exception:
        vecchie = []
    ids = {x["id"] for x in nuovi}
    tutti = nuovi + [v for v in vecchie if v.get("id") not in ids]
    tutti.sort(key=lambda x: x.get("createdTime", ""), reverse=True)
    return tutti[:MAX_POST]

def main():
    token = os.environ.get("FB_PAGE_TOKEN", "").strip()
    page = os.environ.get("FB_PAGE_ID", "").strip()
    if not token or not page:
        print("ERRORE: mancano FB_PAGE_TOKEN o FB_PAGE_ID")
        sys.exit(1)
    # se il token e' di un utente (es. utente di sistema) ricava quello della pagina
    try:
        r = chiama(f"{API}/{page}?" + urllib.parse.urlencode({"fields": "access_token", "access_token": token}))
        if r.get("access_token"):
            token = r["access_token"]
    except Exception as e:
        print("Nota: token di pagina non ricavato, uso quello fornito")
    q = urllib.parse.urlencode({
        "fields": "id,message,created_time,full_picture,permalink_url,comments.limit(10){message,from}",
        "limit": 25,
        "access_token": token,
    })
    dati = {"data": []}
    url = f"{API}/{page}/published_posts?{q}"
    try:
        for _ in range(16):  # fino a 16 pagine da 25 post
            r = chiama(url)
            dati["data"] += r.get("data", [])
            url = (r.get("paging") or {}).get("next")
            if not url:
                break
    except urllib.error.HTTPError as e:
        print("ERRORE Facebook:", e.read().decode("utf-8", "replace")[:500])
        sys.exit(1)

    tag = HASHTAG.lower()
    codice = os.environ.get("FB_CODICE", "").strip().lower()  # parola segreta da scrivere in un commento
    n_commenti = n_validi = 0
    posts, videos, gallerie = [], [], []
    for p in dati.get("data", []):
        msg = p.get("message") or ""
        # l'hashtag puo' stare nel post oppure in un commento scritto dalla pagina stessa
        extra = ""
        for c in (p.get("comments") or {}).get("data", []):
            cm = c.get("message") or ""
            n_commenti += 1
            autore = str((c.get("from") or {}).get("id", ""))
            codice_ok = bool(codice) and codice in cm.lower()
            if (tag in cm.lower() and autore in (page, ADMIN_ID)) or codice_ok:
                extra += " " + cm + " " + tag
                n_validi += 1
        if tag not in msg.lower() and not extra:
            continue
        sezione = DEFAULT_SEZIONE
        for s in SEZIONI:
            if re.search(r"#" + s + r"\b", msg + extra, re.I):
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
        base = {
            "id": "fb" + p["id"].split("_")[-1],
            "title": titolo,
            "testo": pulito,
            "createdTime": p.get("created_time", ""),
            "permalink": p.get("permalink_url"),
            "source": "PallaVolleyAmo",
        }
        tutto = msg + extra
        if re.search(r"#galleria\b", tutto, re.I):
            foto = foto_del_post(p["id"], token) or ([p["full_picture"]] if p.get("full_picture") else [])
            gallerie.append({**base, "images": foto})
        elif re.search(r"#video\b", tutto, re.I):
            videos.append({**base, "image": p.get("full_picture")})
        else:
            base.update({
                "excerpt": (resto[:150] + "…") if len(resto) > 150 else resto,
                "image": p.get("full_picture"),
                "sezione": sezione,
            })
            posts.append(base)
    for cartella in ("news", "galleria"):  # devono esistere sempre, il workflow le aggiunge a git
        Path("public", cartella).mkdir(parents=True, exist_ok=True)
    posts = unisci(posts, "facebook_news.json")
    videos = unisci(videos, "facebook_video.json")
    gallerie = unisci(gallerie, "facebook_galleria.json")
    # salva le foto sul sito: i link delle immagini di Facebook scadono
    for p in posts + videos:
        p["image"] = salva_foto(p.get("image"), "news", p["id"] + ".jpg")
    for g in gallerie:
        g["images"] = [salva_foto(u, "galleria", f"{g['id']}-{n + 1}.jpg") for n, u in enumerate(g.get("images") or [])]
    ora = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for nome, lista in (("facebook_news.json", posts), ("facebook_video.json", videos), ("facebook_galleria.json", gallerie)):
        out = {"aggiornato": ora, "posts": lista}
        for d in ("data", "react-app/data"):
            Path(d).mkdir(parents=True, exist_ok=True)
            Path(d, nome).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Commenti letti: {n_commenti} - commenti validi: {n_validi}")
    print(f"Post letti: {len(dati.get('data', []))} - importati con {HASHTAG}: {len(posts)} notizie, {len(videos)} video, {len(gallerie)} gallerie")

if __name__ == "__main__":
    main()
