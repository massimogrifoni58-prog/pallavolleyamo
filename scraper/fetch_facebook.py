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


STOP = {"asd", "a", "s", "d", "pallavolo", "volley", "volleyball", "pallavolistica", "sport", "sportiva", "club", "team", "academy",
        "perugia", "terni", "umbria", "sir", "its", "uisp", "polisportiva", "gruppo", "group", "libertas", "csi", "fipav",
        "serie", "di", "del", "della", "dei", "il", "la", "the", "and", "san", "santa", "citta", "castello", "f", "m"}

def norm(t):
    import unicodedata
    t = unicodedata.normalize("NFKD", str(t).lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", t).strip()

def carica_json(percorso, default):
    try:
        return json.loads(Path(percorso).read_text(encoding="utf-8"))
    except Exception:
        return default

def parole_societa():
    """Nomi delle societa' umbre (dai dati del sito) -> {nome: [parole distintive]}."""
    nomi = set()
    for x in carica_json("data/societa.json", {}).get("societa", []):
        nomi.add(x.get("nome", ""))
    isc = carica_json("data/squadre-iscritte.json", {})
    for k in ("maschile", "femminile"):
        for n in isc.get(k, []) or []:
            nomi.add(n)
    cal = carica_json("data/calendario_regionali.json", {}).get("partite", {})
    for lista in (cal.values() if isinstance(cal, dict) else []):
        for m in lista:
            for k in ("casa", "ospite"):
                if m.get(k):
                    nomi.add(m[k])
    out = {}
    for n in nomi:
        parole = [w for w in norm(n).split() if len(w) >= 4 and w not in STOP]
        if parole:
            out[n] = parole
    return out

def societa_citate(testo, elenco):
    t = " " + norm(testo) + " "
    trovate = []
    for nome, parole in elenco.items():
        if all(" " + w in t for w in parole):  # inizio parola (gestisce plurali/suffissi)
            if norm(nome) not in [norm(x) for x in trovate]:
                trovate.append(nome.title() if nome.isupper() else nome)
    return trovate[:3]

def condiviso(p):
    """True se il post e' stato condiviso da un'altra pagina (non scritto da PallaVolleyAmo)."""
    if p.get("_visitatore"):
        return True
    if "status_type" not in p and "parent_id" not in p:
        return True  # campi non disponibili: non si puo' distinguere, meglio mostrarlo
    return bool(p.get("parent_id")) or p.get("status_type") == "shared_story"

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
    base_campi = "id,message,created_time,full_picture,permalink_url,comments.limit(10){message,from}"
    extra_campi = ",status_type,parent_id,attachments.limit(1){type,url,title}"
    dati = {"data": []}
    for campi in (base_campi + extra_campi, base_campi):  # se Facebook rifiuta i campi extra, si usa la versione base
        q = urllib.parse.urlencode({"fields": campi, "limit": 25, "access_token": token})
        url = f"{API}/{page}/published_posts?{q}"
        dati = {"data": []}
        try:
            for _ in range(16):  # fino a 16 pagine da 25 post
                r = chiama(url)
                dati["data"] += r.get("data", [])
                url = (r.get("paging") or {}).get("next")
                if not url:
                    break
            break
        except urllib.error.HTTPError as e:
            print("ERRORE Facebook:", e.read().decode("utf-8", "replace")[:500])
            if campi == base_campi:
                sys.exit(1)
            print("Riprovo senza i campi extra")

    # post scritti da altri sulla pagina (societa' che pubblicano sulla pagina): elenco separato di Facebook
    try:
        qv = urllib.parse.urlencode({"fields": "id,message,created_time,full_picture,permalink_url,from", "limit": 50, "access_token": token})
        rv = chiama(f"{API}/{page}/visitor_posts?{qv}")
        vis = rv.get("data", [])
        for v in vis:
            v["_visitatore"] = True
        ids = {x["id"] for x in dati["data"]}
        dati["data"] += [v for v in vis if v["id"] not in ids]
        print("Post dei visitatori letti:", len(vis))
        for v in vis[:5]:
            print("  visitatore:", v.get("created_time", "")[:16], "|", (v.get("from") or {}).get("name"), "|", repr((v.get("message") or "")[:50]))
    except urllib.error.HTTPError as e:
        print("Post dei visitatori NON letti:", e.read().decode("utf-8", "replace")[:300].replace(token, "***"))
    except Exception as e:
        print("Post dei visitatori NON letti:", str(e)[:200].replace(token, "***"))

    tag = HASHTAG.lower()
    ap = carica_json("data/facebook_approvati.json", {})
    approvati = ap.get("approvati", {})  # id -> sezione scelta in /modera
    scartati = set(ap.get("scartati", []))
    societa = parole_societa()
    candidati = []
    limite = (__import__("datetime").datetime.now(__import__("datetime").timezone.utc) - __import__("datetime").timedelta(days=21)).strftime("%Y-%m-%d")
    # diagnostica: i 5 post piu' recenti letti (data + inizio testo)
    for q in dati.get("data", [])[:5]:
        print("  recente:", q.get("created_time", "")[:16], "|", repr((q.get("message") or "")[:50]), "| hashtag:", HASHTAG in (q.get("message") or "").lower(),
              "| tipo:", q.get("status_type"), "| parent:", bool(q.get("parent_id")), "| allegato:", ((q.get("attachments") or {}).get("data") or [{}])[0].get("type"))
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
        pid = p["id"].split("_")[-1]
        scelto = approvati.get(pid)
        if tag not in msg.lower() and not extra and scelto is None:
            # non importato: se parla di una societa' umbra va nella lista da approvare
            if pid not in scartati and msg.strip() and p.get("created_time", "")[:10] >= limite and condiviso(p):
                citate = societa_citate(msg, societa)
                if citate:
                    candidati.append({"id": pid, "testo": msg.strip()[:600], "createdTime": p.get("created_time", ""),
                                      "permalink": p.get("permalink_url"), "image": p.get("full_picture"), "societa": citate})
            continue
        sezione = scelto if scelto in SEZIONI else DEFAULT_SEZIONE
        if scelto is None:
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
    for d in ("data", "react-app/data"):
        Path(d, "facebook_candidati.json").write_text(json.dumps({"aggiornato": ora, "posts": candidati}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Candidati da approvare (societa' umbre): {len(candidati)}")
    print(f"Commenti letti: {n_commenti} - commenti validi: {n_validi}")
    print(f"Post letti: {len(dati.get('data', []))} - importati con {HASHTAG}: {len(posts)} notizie, {len(videos)} video, {len(gallerie)} gallerie")

if __name__ == "__main__":
    main()
