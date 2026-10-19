"""
fetch_squadre_top.py
Scarica le ultime notizie per squadre umbre in categorie superiori
usando sia Google News che Bing News, con deduplicazione
Output: react-app/data/squadre_top.json
"""

import json
import gzip
import re
import base64
import html
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
        "match_key": 'PERUGIA', "match_comp": 'Superlega',
        "nome": "Sir Susa Vim Perugia",
        "categoria": "Superlega",
        "queries": [
            {"q": "Sir Perugia volley", "fonte": "google"},
            {"q": "Sir Block Devils Perugia pallavolo", "fonte": "bing"},
        ]
    },
    {
        "id": "bartoccini",
        "match_key": 'BARTOCCINI', "match_comp": 'Serie A2 Femminile',
        "nome": "Bartoccini MC Restauri Perugia",
        "categoria": "Serie A2 F",
        "queries": [
            {"q": "Bartoccini Perugia volley femminile", "fonte": "google"},
            {"q": "Black Angels Perugia pallavolo", "fonte": "bing"},
        ]
    },
    {
        "id": "tva",
        "match_key": 'TERNI', "match_comp": 'Serie A3',
        "nome": "Terni Volley Academy",
        "categoria": "Serie A3",
        "queries": [
            {"q": "Terni Volley Academy Dragons", "fonte": "bing"},
            {"q": "TVA Terni pallavolo A3", "fonte": "google"},
        ]
    },
    {
        "id": "altotevere",
        "match_key": 'ALTOTEVERE', "match_comp": 'Serie A3',
        "nome": "Ermgroup Altotevere San Giustino",
        "categoria": "Serie A3",
        "queries": [
            {"q": "Altotevere San Giustino pallavolo", "fonte": "bing"},
            {"q": "Ermgroup Altotevere volley", "fonte": "google"},
        ]
    },
    {
        "id": "citta-castello",
        "match_key": "CITTA'DI CASTELLO", "match_comp": 'Serie B Girone E',
        "nome": "Pallavolo Città di Castello",
        "categoria": "Serie B M",
        "queries": [
            {"q": "Pallavolo Città di Castello volley", "fonte": "bing"},
            {"q": "Città di Castello pallavolo serie B", "fonte": "google"},
        ]
    },
    {
        "id": "marsciano",
        "match_key": 'MARSCIANO', "match_comp": 'Serie B2 Girone G',
        "nome": "Pallavolo Media Umbria Marsciano",
        "categoria": "Serie B F",
        "queries": [
            {"q": "Pallavolo Media Umbria Marsciano volley", "fonte": "bing"},
            {"q": "Marsciano pallavolo femminile", "fonte": "google"},
        ]
    },
]


RISULTATI_FILES = ["risultati_nazionali.json", "risultati_nazionali_fipav.json"]


def pulisci_nome(n):
    n = re.sub(r"\b(S\.?S\.?D\.?R?\.?L?\.?|A\.?S\.?D\.?|ARL)\b", "", n, flags=re.I)
    return re.sub(r"\s+", " ", n.replace("'", "'")).strip().title()


def prossima_avversaria(s):
    """Cerca nel calendario la prossima partita della squadra e ritorna il nome dell'avversaria."""
    oggi = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    migliori = []
    for f in RISULTATI_FILES:
        try:
            d = json.loads((OUTPUT_PATH.parent / f).read_text(encoding="utf-8"))
        except Exception:
            continue
        for m in d.get("matches", []):
            if (m.get("dataIso") or "") < oggi or s["match_comp"].lower() not in (m.get("competition") or "").lower():
                continue
            h, a = m["home"].upper(), m["away"].upper()
            if s["match_key"].upper() in h:
                migliori.append((m["dataIso"], m["away"]))
            elif s["match_key"].upper() in a:
                migliori.append((m["dataIso"], m["home"]))
    return pulisci_nome(sorted(migliori)[0][1]) if migliori else None


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


def url_editore(link):
    """Ricava l'indirizzo vero dell'articolo dal link della notizia (Bing o Google News)."""
    try:
        u = urllib.parse.urlparse(link)
        if "bing.com" in u.netloc:
            v = urllib.parse.parse_qs(u.query).get("url")
            return v[0] if v else None
        if "news.google.com" in u.netloc:
            m = re.search(r"/articles/([A-Za-z0-9_-]+)", u.path)
            if not m:
                return None
            b = m.group(1)
            raw = base64.urlsafe_b64decode(b + "=" * (-len(b) % 4))
            t = re.search(rb"https?://[\x21-\x7e]+", raw)
            return t.group(0).decode("ascii") if t else url_google_nuovo(b)
        return link
    except Exception:
        return None


def url_google_nuovo(articolo_id):
    """Link Google News di tipo nuovo: si chiede a Google l'indirizzo vero (se non risponde, si lascia senza foto)."""
    try:
        req = urllib.request.Request(f"https://news.google.com/rss/articles/{articolo_id}?hl=it&gl=IT&ceid=IT:it", headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as resp:
            pagina = resp.read().decode("utf-8", errors="ignore")
        sg = re.search(r'data-n-a-sg="([^"]+)"', pagina).group(1)
        ts = re.search(r'data-n-a-ts="([^"]+)"', pagina).group(1)
        inner = json.dumps(["garturlreq", [["it", "IT", ["FINANCE_TOP_INDICES", "WEB_TEST_1_0_0"], None, None, 1, 1, "IT:it", None, 180, None, None, None, None, None, 0, None, None, [1608992183, 723341000]], "it", "IT", 1, [2, 4, 8], 1, 1, None, 0, 0, None, 0], articolo_id, int(ts), sg])
        corpo = urllib.parse.urlencode({"f.req": json.dumps([[["Fbv4je", inner]]])}).encode()
        r2 = urllib.request.Request("https://news.google.com/_/DotsSplashUi/data/batchexecute", data=corpo,
                                    headers={**HEADERS, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"})
        with urllib.request.urlopen(r2, timeout=8) as resp:
            testo = resp.read().decode("utf-8", errors="ignore")
        blocco = json.loads(testo.split("\n\n", 1)[1])
        url = json.loads(blocco[0][2])[1]
        return url if url.startswith("http") else None
    except Exception:
        return None


def trova_immagine(pagina_url):
    """Scarica solo l'inizio della pagina e cerca l'immagine di anteprima (og:image)."""
    try:
        req = urllib.request.Request(pagina_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as resp:
            testo = resp.read(300000).decode("utf-8", errors="ignore")
        for pat in (
            r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]*content=["\']([^"\']+)',
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\'](?:og:image|twitter:image)["\']',
        ):
            m = re.search(pat, testo, re.I)
            if m:
                img = urllib.parse.urljoin(pagina_url, html.unescape(m.group(1)).strip())
                if img.startswith("http") and "google" not in urllib.parse.urlparse(img).netloc:
                    return img
    except Exception:
        pass
    return None


def carica_immagini_precedenti():
    """Riusa le immagini gia' trovate nei giorni scorsi, per non riscaricare tutto."""
    try:
        vecchio = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        return {n["link"]: n.get("image") for lst in vecchio.get("news", {}).values() for n in lst if n.get("image")}
    except Exception:
        return {}


def main():
    result = {}
    gia = carica_immagini_precedenti()
    try:
        vecchie = json.loads(OUTPUT_PATH.read_text(encoding="utf-8")).get("news", {})
    except Exception:
        vecchie = {}

    for s in SOGGETTI:
        print(f"Scarico notizie per {s['nome']}...")
        all_posts = []
        seen_titles = set()

        queries = list(s["queries"])
        avv = prossima_avversaria(s)
        if avv:
            print(f"  Prossima avversaria: {avv}")
            queries += [{"q": f"{avv} pallavolo", "fonte": "google", "avv": avv},
                        {"q": f"{avv} volley", "fonte": "bing", "avv": avv}]
        for q_info in queries:
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
                    if q_info.get("avv"):
                        p["avversaria"] = q_info["avv"]
                    all_posts.append(p)
                    nuovi += 1
            print(f"(+{nuovi})")

        # Ordina per data e taglia a MAX_NEWS
        all_posts.sort(key=lambda p: parse_date_safe(p["pubDate"]), reverse=True)
        proprie = [p for p in all_posts if not p.get("avversaria")][:MAX_NEWS]
        altre = [p for p in all_posts if p.get("avversaria")][:3]
        all_posts = sorted(proprie + altre, key=lambda p: parse_date_safe(p["pubDate"]), reverse=True)
        for p in all_posts:
            if p["link"] in gia:
                p["image"] = gia[p["link"]]
                continue
            pagina = url_editore(p["link"])
            if pagina:
                p["image"] = trova_immagine(pagina)
        if not all_posts and s["id"] in vecchie:
            print("  nessuna notizia scaricata: tengo quelle precedenti")
            all_posts = vecchie[s["id"]]
        result[s["id"]] = all_posts
        print(f"  → {len(all_posts)} notizie totali")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps({
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "soggetti": [{k: v for k, v in s.items() if k not in ("queries", "match_key", "match_comp")} for s in SOGGETTI],
            "news": result
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nSalvate notizie in: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
