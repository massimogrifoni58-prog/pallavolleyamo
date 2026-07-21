import React, { useEffect, useRef, useState } from "react";
import nazionaleData from "../data/nazionale.json";
import nazionaliData from "../data/nazionali.json";
import regionaliData from "../data/regionali.json";
import terniData from "../data/terni.json";
import perugiaData from "../data/perugia.json";
import risultatiData from "../data/risultati.json";
import allenatoriData from "../data/allenatori.json";
import articoliSocietaData from "../data/articoli-societa.json";
import pilloleData from "../data/pillole.json";
import coachNewsData from "../data/coach_news.json";
import diretteData from "../data/dirette.json";
import { Analytics } from '@vercel/analytics/react';
import videoData from "../data/video.json";
const MAX_NEWS_PER_SECTION = 15;

const SECTIONS = {
  nazionale: { title: "Nazionale", data: nazionaleData },
  nazionali: { title: "Campionati nazionali", data: nazionaliData },
  regionali: { title: "Campionati regionali", data: regionaliData },
  terni: { title: "Provincia di Terni", data: terniData },
  perugia: { title: "Provincia di Perugia", data: perugiaData },
};

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!isNaN(d.getTime())) return d.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Prova formato italiano "19 luglio 2026"
  const match = iso.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (match) {
    const mese = MESI_IT[match[2].toLowerCase()];
    if (mese !== undefined) {
      const d2 = new Date(parseInt(match[3]), mese, parseInt(match[1]));
      return d2.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
    }
  }
  return iso;
}

const MESI_IT = {
  "gennaio": 0, "febbraio": 1, "marzo": 2, "aprile": 3,
  "maggio": 4, "giugno": 5, "luglio": 6, "agosto": 7,
  "settembre": 8, "ottobre": 9, "novembre": 10, "dicembre": 11
};

function parseDate(post) {
  const str = post.createdTime || "";
  // Prova formato standard
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.getTime();
  // Prova formato italiano "19 luglio 2026"
  const match = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (match) {
    const giorno = parseInt(match[1]);
    const mese = MESI_IT[match[2].toLowerCase()];
    const anno = parseInt(match[3]);
    if (mese !== undefined) return new Date(anno, mese, giorno).getTime();
  }
  return 0;
}
const SUBSCRIBE_KEY = "pva_iscritto";
function useSubscribed() {
  const [subscribed, setSubscribed] = useState(
    () => localStorage.getItem(SUBSCRIBE_KEY) === "1"
  );

  useEffect(() => {
    const onStorage = () =>
      setSubscribed(localStorage.getItem(SUBSCRIBE_KEY) === "1");
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function subscribe() {
    localStorage.setItem(SUBSCRIBE_KEY, "1");
    setSubscribed(true);
  }

  function unsubscribe() {
    localStorage.removeItem(SUBSCRIBE_KEY);
    setSubscribed(false);
  }

  return { subscribed, subscribe, unsubscribe };
}

function useRoute() {
  const getRoute = () => window.location.hash.replace(/^#\/?/, "") || "home";
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}

function truncate(text, max) {
  if (!text) return text;
  return text.length > max ? text.slice(0, max).trim() + "…" : text;
}

function PostCard({ post, subscribed, onClick }) {
  const excerpt = subscribed ? post.excerpt : truncate(post.excerpt, 70);

  const content = (
    <>
      {post.image && (
        <img className="card__image" src={post.image} alt="" loading="lazy" />
      )}
      <div className="card__body">
        <span className="card__date">{formatDate(post.createdTime)}</span>
        {post.title && <p className="card__title">{post.title}</p>}
        {excerpt && <p className="card__message">{excerpt}</p>}
        {subscribed && post.permalink && (
          <span className="card__link">Leggi tutto &rarr;</span>
        )}
    {!subscribed && (
          <span className="card__link card__link--locked">
            &#128274; Iscriviti per leggere tutto
          </span>
        )}
        {post.permalink && (
          <div className="card__actions">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(post.permalink)}`}
              target="_blank"
              rel="noreferrer"
              className="card__action-btn card__action-btn--fb"
              onClick={e => e.stopPropagation()}
            >
              f Condividi
            </a>
            <button
              className="card__action-btn card__action-btn--copy"
              onClick={e => { e.stopPropagation(); e.preventDefault(); navigator.clipboard.writeText(post.permalink); }}
            >
               Copia link
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (subscribed && post.permalink) {
    return (
      <a className="card" href={post.permalink} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  if (!subscribed) {
    return (
      <a className="card card--locked" href="#/iscrizione">
        {content}
      </a>
    );
  }

  if (onClick) {
    return <div className="card" style={{cursor:"pointer"}} onClick={onClick}>{content}</div>;
  }

  return post.permalink ? (
    <a className="card" href={post.permalink} target="_blank" rel="noreferrer">{content}</a>
  ) : (
    <div className="card">{content}</div>
  );
}

function Ticker({ posts }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (posts.length === 0) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % posts.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(timer);
  }, [posts]);

  if (posts.length === 0) return null;
  const post = posts[idx];

  return (
    <div className="ticker">
      <span className="ticker__label">🔴 Live</span>
      <a
        className="ticker__single"
        href={post.permalink || "#"}
        target={post.permalink ? "_blank" : undefined}
        rel="noreferrer"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease" }}
      >
         {post.title || post.excerpt}
      </a>
    </div>
  );
}
function NavDropdown({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="nav-dropdown" ref={ref}>
      <button className="nav-btn nav-btn--drop" onClick={() => setOpen(!open)}>
        {label} <span className="nav-btn__arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="nav-dropdown__menu">
          {items.map((item) => (
            <a
              key={item.href}
              className="nav-dropdown__item"
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
function PillolaToast({ pillola, onClose }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400);
    }, 8000);
    return () => clearTimeout(t);
  }, []);
  if (!pillola) return null;
  const sezioneBadge = {
    "Tecnica": "#42a5f5",
    "Mentalità": "#ab47bc",
    "Esercizi": "#66bb6a",
    "Regole": "#ef5350",
    "Citazioni": "#d4af37",
  };
  const colore = sezioneBadge[pillola.sezione] || "#d4af37";
 return (
    <>
      <div 
        className="pillola-overlay" 
        style={{ opacity: visible ? 1 : 0 }} 
        onClick={() => { setVisible(false); setTimeout(onClose, 400); }} 
      />
      <div className="pillola-toast"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateX(-50%) translateY(-50%)" : "translateX(-50%) translateY(-60%)"}}>
        <div className="pillola-toast__header">
          <span className="pillola-toast__badge" style={{ color: colore }}>
            {pillola.emoji} {pillola.sezione} · {pillola.tema}
          </span>
          <button className="pillola-toast__close" onClick={() => { setVisible(false); setTimeout(onClose, 400); }}>✕</button>
        </div>
        <p className="pillola-toast__num"> Pillola #{pillola.id}</p>
        <p className="pillola-toast__testo">{pillola.consiglio}</p>
      </div>
    </>
  );
}
function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="splash">
      <div className="splash__inner">
        <img src="/logo-pva.svg" alt="PallaVolleyAmo" className="splash__logo" />
        <div className="splash__titolo">
          <span className="splash__bianco">PALLA</span>
          <span className="splash__oro">VOLLEY</span>
          <span className="splash__bianco">AMO</span>
        </div>
        <div className="splash__bar"><div className="splash__bar-fill" /></div>
        <p className="splash__sub">Volley Umbria</p>
      </div>
    </div>
  );
}


function MeteoWidget() {
  const [meteo, setMeteo] = useState(null);

  useEffect(() => {
    // Open-Meteo - gratuito, no API key - coordinate Perugia
    fetch("https://api.open-meteo.com/v1/forecast?latitude=43.11&longitude=12.39&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe/Rome&forecast_days=1")
      .then(r => r.json())
      .then(data => {
        const cur = data.current;
        const code = cur.weather_code;
        const icona =
          code === 0 ? "☀️" :
          code <= 3 ? "🌤️" :
          code <= 48 ? "🌫️" :
          code <= 67 ? "🌧️" :
          code <= 77 ? "❄️" :
          code <= 82 ? "🌦️" :
          code <= 99 ? "⛈️" : "🌡️";
        setMeteo({ temp: Math.round(cur.temperature_2m), icona, vento: Math.round(cur.wind_speed_10m) });
      })
      .catch(() => setMeteo(null));
  }, []);

  if (!meteo) return null;

  return (
    <div className="meteo-widget" title={`Vento: ${meteo.vento} km/h`}>
      <span className="meteo-widget__icona">{meteo.icona}</span>
      <span className="meteo-widget__temp">{meteo.temp}°C</span>
      <span className="meteo-widget__luogo">Perugia</span>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  const [durata, setDurata] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      setDurata(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  const data = now.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
  const ora = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  const mm = Math.floor(durata / 60).toString().padStart(2, "0");
  const ss = (durata % 60).toString().padStart(2, "0");

  return (
    <div className="live-clock">
      <span className="live-clock__data">{data} · {ora}</span>
      <span className="live-clock__data" title="Durata visita">⏱ {mm}:{ss}</span>
    </div>
  );
}

function Masthead({ latestFive, darkMode, toggleDark }) {
  return (
    <header className="masthead">
      <div className="masthead__topbar">
        <MeteoWidget />
      </div>
      <p className="masthead__eyebrow">Volley &middot; Umbria</p>
      <a href="#/" className="masthead__title-link">
        <h1 className="masthead__title">
          PALLA<span>VOLLEY</span>AMO
        </h1>
      </a>
      <p className="masthead__tagline">Notizie e aggiornamenti sul volley umbro</p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <LiveClock />
        <button onClick={toggleDark} className="dark-toggle" title={darkMode ? "Modalita scura" : "Modalita chiara"}>
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>
      <div className="net-divider">
        <span></span>
        <i></i>
        <span></span>
      </div>

      <Ticker posts={latestFive} />

      <nav className="nav-bar">
        <NavDropdown
          label="Notizie"
          items={[
            { href: "#/nazionale", label: "News Nazionali" },
            { href: "#/nazionali", label: "News Campionati Naz." },
            { href: "#/regionali", label: "News Regionali" },
            { href: "#/terni", label: "News Prov. TR" },
            { href: "#/perugia", label: "News Prov. PG" },
            { href: "#/articoli-societa", label: "Articoli Societa" },
          ]}
        />
        <NavDropdown
          label="Campionati"
          items={[
            { href: "#/dirette", label: "🔴 Dirette Live" },
            { href: "#/risultati", label: "Risultati" },
            { href: "#/calendario", label: "Calendario" },
            { href: "#/classifica", label: "Classifica" },
            { href: "#/andamento", label: "Andamento Stagione" },
            { href: "#/headtohead", label: "Head to Head" },
          ]}
        />
        <NavDropdown
          label="Foto e Video"
          items={[
            { href: "#/galleria", label: "Galleria Foto" },
            { href: "#/foto-settimana", label: "Foto del Giorno" },
            { href: "#/video", label: " Video" },
          ]}
        />
        <NavDropdown
          label="Tecnica"
          items={[
            { href: "#/fondamentali", label: "Fondamentali" },
            { href: "#/schede", label: "Schede Allenamento" },
            
          ]}
        />
        <a className="nav-btn" href="#/mercato">Mercato</a>
        <NavDropdown
          label="Allenatori"
          items={[
            { href: "#/allenatori2", label: "Cerca Allenatore" },
            { href: "#/velasco", label: "Julio Velasco" },
            { href: "#/camp", label: "Camp Estivi 2026" },
          ]}
        />
        <a className="nav-btn" href="#/chi-siamo">Chi Siamo</a>
        <a className="nav-btn nav-btn--accent" href="#/commenti">Commenti</a>
        <a className="nav-btn nav-btn--accent" href="#/iscrizione"> Iscriviti Gratis</a>
      </nav>
    </header>
  );
}

function RicercaSocieta() {
  const [query, setQuery] = useState("");
  const [cercato, setCercato] = useState("");
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  function cerca() {
    if (!query.trim()) return;
    setCercato(query.trim());
    setLoading(true);
    setNews([]);
    const rssUrl = "https://news.google.com/rss/search?q=" + encodeURIComponent(query.trim()) + "&hl=it&gl=IT&ceid=IT:it";
    fetch("https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(rssUrl))
      .then((r) => r.json())
      .then((data) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, "text/xml");
        const items = Array.from(doc.querySelectorAll("item")).slice(0, 3);
        setNews(items.map((item) => ({
          title: item.querySelector("title")?.textContent || "",
          link: item.querySelector("link")?.textContent || "",
          pubDate: item.querySelector("pubDate")?.textContent || "",
        })));
      })
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }

  return (
    <div className="ricerca-societa">
      <h3 className="ricerca-societa__titolo">Cerca una società</h3>
      <div className="ricerca-societa__bar">
        <input
          className="ricerca-societa__input"
          type="text"
          placeholder="Es. Narni Sport Academy..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && cerca()}
        />
        <button className="ricerca-societa__btn" onClick={cerca}>Cerca</button>
      </div>
      {loading && <p className="state" style={{fontSize:"0.82rem",marginTop:"1rem"}}>Caricamento...</p>}
      {!loading && cercato && news.length === 0 && (
        <p className="state" style={{fontSize:"0.82rem",marginTop:"1rem"}}>
          Nessuna notizia trovata per "{cercato}".
        </p>
      )}
      {news.length > 0 && (
        <div className="ricerca-societa__risultati">
          <p className="ricerca-societa__label">Ultime notizie su "{cercato}"</p>
          <ul className="coach-news__list">
            {news.map((n, i) => (
              <li key={i} className="coach-news__item">
                <a href={n.link} target="_blank" rel="noreferrer" className="coach-news__link">{n.title}</a>
                {n.pubDate && <span className="coach-news__date">{formatDate(n.pubDate)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HomePage() {
  const risultati = (risultatiData.matches || []).filter((m) => {
    if (m.status !== "disputata" || !m.score) return false;
    const comp = (m.competition || "").toLowerCase();
    const isRegionale = comp.includes("serie c") || comp.includes("serie d");
    const isNazionale = comp.includes("serie a") || comp.includes("serie b") ||
      comp.includes("superlega") || comp.includes("a1") || comp.includes("a2") || comp.includes("a3");
    if (isRegionale) return true;
    if (isNazionale) {
      const squadreUmbre = ["perugia","terni","narni","spoleto","foligno","orvieto","gubbio","assisi","umbertide","marsciano","sir","bartoccini","umbria"];
      const n = (m.home + " " + m.away).toLowerCase();
      return squadreUmbre.some((s) => n.includes(s));
    }
    return false;
  });

  const hasRisultati = risultati.length > 0;
  const risultatiTesto = risultati.map((m) => `${m.home}  ${m.score}  ${m.away}`).join("   ·   ");

  // Statistiche rapide
  const nCampionati = new Set((risultatiData.matches || []).map((m) => getMacroCategory(m.competition))).size;
  const nSquadre = new Set((risultatiData.matches || []).flatMap((m) => [m.home, m.away])).size;

  return (
    <main>
      <div className="hero-grafico">
        {/* Layout interno: logo + titolo */}
        <div className="hero-inner">
          <img src="/logo-pva.svg" alt="Logo PallaVolleyAmo" className="hero-logo-laterale" />
          <div className="hero-testi">
            <div className="hero-titolo">
              <span className="hero-titolo__bianco">PALLA</span>
              <span className="hero-titolo__oro">VOLLEY</span>
              <span className="hero-titolo__bianco">AMO</span>
            </div>
            <p className="hero-sub">RISULTATI NAZIONALI · CAMPIONATI UMBRI</p>
          </div>
        </div>

        {/* Testo VOLLEY enorme in trasparenza */}
        <svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" className="hero-svg-bg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="text-fade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d4af37" stopOpacity="0"/>
              <stop offset="15%" stopColor="#d4af37" stopOpacity="0.12"/>
              <stop offset="85%" stopColor="#d4af37" stopOpacity="0.12"/>
              <stop offset="100%" stopColor="#d4af37" stopOpacity="0"/>
            </linearGradient>
          </defs>

          {/* VOLLEY grande in alto */}
          <text x="450" y="160"
            fontFamily="'Bebas Neue', Impact, sans-serif"
            fontSize="140"
            fontWeight="900"
            fill="url(#text-fade)"
            textAnchor="middle"
            letterSpacing="20">
            VOLLEY
          </text>

          {/* UMBRIA piccolo sotto */}
          <text x="450" y="220"
            fontFamily="'Bebas Neue', Impact, sans-serif"
            fontSize="60"
            fill="#d4af37"
            textAnchor="middle"
            letterSpacing="30"
            opacity="0.08">
            UMBRIA
          </text>

          {/* Linee decorative laterali */}
          <line x1="30" y1="60" x2="30" y2="240" stroke="#d4af37" strokeWidth="2" opacity="0.4"/>
          <line x1="30" y1="60" x2="80" y2="60" stroke="#d4af37" strokeWidth="2" opacity="0.4"/>
          <line x1="870" y1="60" x2="870" y2="240" stroke="#d4af37" strokeWidth="2" opacity="0.4"/>
          <line x1="870" y1="240" x2="820" y2="240" stroke="#d4af37" strokeWidth="2" opacity="0.4"/>
        </svg>

        {/* Fascia risultati */}
        <div className="hero-risultati">
          {hasRisultati ? (
            <div className="hero-risultati__track-wrap">
              <div
                className="hero-risultati__track"
                style={{ "--scroll-duration": `${Math.max(20, risultati.length * 3)}s` }}
              >
                {[risultatiTesto, risultatiTesto].map((t, i) => (
                  <span key={i} className="hero-risultati__testo">{t}</span>
                ))}
              </div>
            </div>
          ) : (
            <p className="hero-risultati__placeholder"> I risultati delle squadre umbre appariranno qui · Aggiornamento automatico ogni giorno</p>
          )}
        </div>
      </div>

      {/* Riga statistiche */}
      <div className="hero-stats">
        <div className="hero-stat">
          <span className="hero-stat__num">{nCampionati || "6+"}</span>
          <span className="hero-stat__label">Campionati seguiti</span>
        </div>
        <div className="hero-stat__sep">·</div>
        <div className="hero-stat">
          <span className="hero-stat__num">{nSquadre || "50+"}</span>
          <span className="hero-stat__label">Squadre umbre</span>
        </div>
        <div className="hero-stat__sep">·</div>
        <div className="hero-stat">
          <span className="hero-stat__num">365</span>
          <span className="hero-stat__label">Giorni all'anno</span>
        </div>
        <div className="hero-stat__sep">·</div>
        <div className="hero-stat">
          <span className="hero-stat__num">19</span>
          <span className="hero-stat__label">Palazzetti in Umbria</span>
        </div>
      </div>
<div className="iscriviti-banner">
          <span className="iscriviti-banner__testo">Iscriviti gratis — Leggi tutte le notizie senza limiti</span>
          <a href="#/iscrizione" className="iscriviti-banner__btn">Iscriviti ora →</a>
        </div>
       </main>
  );
}

function FeaturedPost({ post, subscribed }) {
  const excerpt = subscribed ? post.excerpt : truncate(post.excerpt, 110);

  const content = (
    <>
      {post.image && (
        <img className="featured__image" src={post.image} alt="" loading="lazy" />
      )}
      <div className="featured__body">
        <span className="featured__tag">In evidenza</span>
        <span className="card__date">{formatDate(post.createdTime)}</span>
        {post.title && <h3 className="featured__title">{post.title}</h3>}
        {excerpt && <p className="featured__excerpt">{excerpt}</p>}
        {subscribed && post.permalink && (
          <span className="card__link">Leggi tutto &rarr;</span>
        )}
        {!subscribed && (
          <span className="card__link card__link--locked">
            &#128274; Iscriviti per leggere tutto
          </span>
        )}
      </div>
    </>
  );

  if (subscribed && post.permalink) {
    return (
      <a className="featured" href={post.permalink} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  if (!subscribed) {
    return (
      <a className="featured card--locked" href="#/iscrizione">
        {content}
      </a>
    );
  }

  return <div className="featured">{content}</div>;
}

function SectionPage({ slug, subscribed }) {
  const section = SECTIONS[slug];
  const [modalArticolo, setModalArticolo] = useState(null);

  const articoliProv = (articoliSocietaData.articoli || [])
    .filter(a => a.provincia === slug)
    .map(a => ({
      title: a.titolo,
      excerpt: a.testo?.slice(0, 150) + "...",
      createdTime: a.data,
      image: a.foto || null,
      permalink: null,
      source: a.societa,
      _articoloCompleto: a,
    }));

  const allPosts = [...(section.data.posts || []), ...articoliProv].sort(
    (a, b) => parseDate(b) - parseDate(a)
  );

  const featuredIndex = allPosts.findIndex((p) => p.image);
  const featured = allPosts[featuredIndex !== -1 ? featuredIndex : 0];
  const rest = allPosts.filter((_, i) => i !== (featuredIndex !== -1 ? featuredIndex : 0));
  const posts = rest.slice(0, MAX_NEWS_PER_SECTION - 1);

  return (
    <main>
      <section className="section">
        <h2 className="feed-heading">{section.title}</h2>

       {featured && (
          <FeaturedPost 
            post={featured} 
            subscribed={subscribed} 
            onClick={featured._articoloCompleto ? () => setModalArticolo(featured._articoloCompleto) : undefined}
          />
        )}

        <div className="grid">
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              subscribed={subscribed}
              onClick={post._articoloCompleto ? () => setModalArticolo(post._articoloCompleto) : undefined}
            />
          ))}
        </div>
      </section>
    </main>
  );
} 

function giornataNumber(giornata) {
  const match = (giornata || "").match(/\d+/);
  return match ? parseInt(match[0], 10) : 9999;
}

function MatchRow({ match }) {
  const [open, setOpen] = useState(false);
  const disputata = match.status === "disputata";

  return (
    <div className={`match ${open ? "match--open" : ""}`} onClick={() => setOpen(!open)}>
      <div className="match__teams">
        <span className="match__team">{match.home}</span>
        <span className={`match__score ${disputata ? "" : "match__score--pending"}`}>
          {match.score}
        </span>
        <span className="match__team">{match.away}</span>
      </div>
      {open && (
        <div className="match__detail">
          <span>Campionato: {match.competition}</span>
          <span>Giornata: {match.giornata}</span>
          <span>Stato: {disputata ? "Disputata" : "Da disputare"}</span>
        </div>
      )}
    </div>
  );
}

const COMPETITION_PRIORITY = [
  "serie c maschile",
  "serie c femminile",
  "serie d maschile",
  "serie d femminile",
  "1 divisione",
  "2 divisione",
];

function competitionScore(name) {
  const lower = name.toLowerCase();
  for (let i = 0; i < COMPETITION_PRIORITY.length; i++) {
    if (lower.includes(COMPETITION_PRIORITY[i])) return i;
  }
  return COMPETITION_PRIORITY.length;
}

// Estrae la "categoria principale" da un nome di campionato completo,
// togliendo i suffissi come "Girone A", "Play Off Semifinale 1", ecc.
// Es: "Serie C Maschile Play Off Quarti 1" -> "Serie C Maschile"
function getMacroCategory(name) {
  return name
    .replace(/\bgirone\b.*$/i, "")
    .replace(/\bplay\s*-?\s*off\b.*$/i, "")
    .replace(/\bplay\s*-?\s*out\b.*$/i, "")
    .replace(/\bfinale\b.*$/i, "")
    .replace(/\bfinali\b.*$/i, "")
    .replace(/\bsemifinal[ei]\b.*$/i, "")
    .replace(/\bquarti\b.*$/i, "")
    .replace(/\bottavi\b.*$/i, "")
    .replace(/\b\d+\^?\s*di finale\b.*$/i, "")
    .replace(/\belite\b.*$/i, "")
    .replace(/\bgold\b.*$/i, "")
    .replace(/\bsilver\b.*$/i, "")
    .replace(/\b3x3\b.*$/i, "")
    .trim();
}

function isAllowedCategory(name) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("under 12") || lower.includes("u12") || lower.includes("under12")) return false;
  if (lower.includes("under 13") || lower.includes("u13") || lower.includes("under13")) return false;
  return true;
}
function VideoPage() {
  const videos = videoData.video || [];
  return (
    <main className="page-content">
      <h1 className="page-title">🎬 Video</h1>
      <div className="video-grid">
        {videos.map(v => (
          <a key={v.id} href={v.url} target="_blank" rel="noreferrer" className="video-card">
            <img src={v.thumbnail} alt={v.titolo} className="video-card__thumb" />
            <div className="video-card__body">
              <p className="video-card__title">{v.titolo}</p>
              <span className="video-card__canale">{v.canale}</span>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
function CampionatiHero({ titolo }) {
  return (
    <div className="campionati-hero">
      <div className="campionati-hero__overlay">
        <h2 className="campionati-hero__titolo">{titolo}</h2>
        <p className="campionati-hero__sub">Campionati FIPAV Umbria · Aggiornamento automatico</p>
      </div>
    </div>
  );
}


function DiretteLivePage() {
  const dirette = diretteData.dirette || [];

  // Estrai l'ID video da un URL Facebook
  function getFbVideoId(url) {
    const match = url.match(/videos\/([0-9]+)/) || url.match(/v=([0-9]+)/);
    return match ? match[1] : null;
  }

  return (
    <main>
      {/* Hero */}
      <div className="dirette-hero">
        <div className="dirette-hero__pulse" />
        <div className="dirette-hero__content">
          <span className="dirette-hero__live">🔴 LIVE</span>
          <h2 className="dirette-hero__titolo">Dirette Live</h2>
          <p className="dirette-hero__sub">Segui le partite in diretta streaming dalle società umbre</p>
        </div>
      </div>

      <section className="section">
        {dirette.length === 0 ? (
          <div className="dirette-empty">
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📺</div>
            <h3 className="dirette-empty__titolo">Nessuna diretta in corso</h3>
            <p className="dirette-empty__testo">
              Le dirette appaiono qui automaticamente quando una società trasmette una partita.
              Le società possono inviare il link della diretta a{" "}
              <a href="mailto:postmaster@pallavolleyamo.it" style={{ color: "var(--gold)" }}>
                postmaster@pallavolleyamo.it
              </a>
            </p>
          </div>
        ) : (
          <div className="dirette-grid">
            {dirette.map((d, i) => (
              <div key={i} className="diretta-card">
                <div className="diretta-card__header">
                  <span className="diretta-card__live-badge">🔴 LIVE</span>
                  <span className="diretta-card__societa">{d.societa}</span>
                </div>
                <div className="diretta-card__partita">
                  <span className="diretta-card__squadra">{d.casa}</span>
                  <span className="diretta-card__vs">VS</span>
                  <span className="diretta-card__squadra">{d.ospite}</span>
                </div>
                <p className="diretta-card__info">{d.categoria} · {d.ora}</p>

                {/* Player Facebook embedded */}
                <div className="diretta-card__player">
                  <iframe
                    src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(d.url)}&show_text=false&width=560&appId=`}
                    width="100%"
                    height="315"
                    style={{ border: "none", overflow: "hidden" }}
                    scrolling="no"
                    frameBorder="0"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    title={`${d.casa} vs ${d.ospite}`}
                  />
                </div>

                {d.url.includes("youtube") || d.url.includes("youtu.be") ? (
  <a href={d.url} target="_blank" rel="noreferrer" className="diretta-card__btn-yt">
    ▶ Guarda su YouTube
  </a>
) : (
  <a href={d.url} target="_blank" rel="noreferrer" className="diretta-card__btn-fb">
    f Guarda la diretta su Facebook
  </a>
)}
              </div>
            ))}
          </div>
        )}

        {/* Istruzioni per le società */}
        <div className="dirette-info">
          <h3 className="dirette-info__titolo">Come trasmettere la tua partita</h3>
          <ol className="dirette-info__lista">
            <li>Avvia una diretta Facebook dalla pagina della tua società</li>
            <li>Copia il link della diretta</li>
            <li>Invialo a <a href="mailto:postmaster@pallavolleyamo.it" style={{ color: "var(--gold)" }}>postmaster@pallavolleyamo.it</a> con il nome delle squadre e la categoria</li>
            <li>La diretta appare su PallaVolleyAmo entro pochi minuti</li>
          </ol>
        </div>
      </section>
    </main>
  );
}

function RisultatiPage() {
  const matches = (risultatiData.matches || []).filter((m) => isAllowedCategory(m.competition));

  const byMacro = {};
  matches.forEach((m) => {
    const macro = getMacroCategory(m.competition) || m.competition;
    byMacro[macro] = byMacro[macro] || {};
    byMacro[macro][m.competition] = byMacro[macro][m.competition] || {};
    byMacro[macro][m.competition][m.giornata] = byMacro[macro][m.competition][m.giornata] || [];
    byMacro[macro][m.competition][m.giornata].push(m);
  });

  const macroCategories = Object.keys(byMacro).sort(
    (a, b) => competitionScore(a) - competitionScore(b)
  );

  const [selMacro, setSelMacro] = useState("");
  const [selComp, setSelComp] = useState("");
  const [selGiornata, setSelGiornata] = useState("");

  const compNames = selMacro ? Object.keys(byMacro[selMacro]) : [];
  const giornate = selMacro && selComp
    ? Object.keys(byMacro[selMacro][selComp]).sort((a, b) => giornataNumber(a) - giornataNumber(b))
    : [];
  const matchesToShow = selMacro && selComp && selGiornata
    ? byMacro[selMacro][selComp][selGiornata]
    : null;

  useEffect(() => {
    setSelComp("");
    setSelGiornata("");
    if (selMacro) {
      const comps = Object.keys(byMacro[selMacro]);
      if (comps.length === 1) setSelComp(comps[0]);
    }
  }, [selMacro]);

  useEffect(() => {
    setSelGiornata("");
    if (selMacro && selComp) {
      const gs = Object.keys(byMacro[selMacro][selComp]).sort((a, b) => giornataNumber(a) - giornataNumber(b));
      if (gs.length > 0) setSelGiornata(gs[gs.length - 1]);
    }
  }, [selComp]);

  return (
    <main>
      <CampionatiHero titolo="Risultati" />
      <section className="section">

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <select className="all2-select" style={{ flex: 1, minWidth: "160px" }}
            value={selMacro} onChange={(e) => setSelMacro(e.target.value)}>
            <option value="">-- Categoria --</option>
            {macroCategories.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <select className="all2-select" style={{ flex: 1, minWidth: "160px" }}
            value={selComp} onChange={(e) => setSelComp(e.target.value)}
            disabled={!selMacro || compNames.length <= 1}>
            <option value="">-- Girone/Fase --</option>
            {compNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select className="all2-select" style={{ flex: 1, minWidth: "130px" }}
            value={selGiornata} onChange={(e) => setSelGiornata(e.target.value)}
            disabled={!selComp}>
            <option value="">-- Giornata --</option>
            {giornate.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {matchesToShow && (
          <div className="competition-block">
            {matchesToShow.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </div>
        )}

        {selMacro && selComp && selGiornata && !matchesToShow && (
          <p className="state">Nessuna partita trovata.</p>
        )}
      </section>
    </main>
  );
}

function CalendarioPage() {
  const allMatches = risultatiData.matches || [];
  const matches = allMatches.filter((m) => m.status !== "disputata");

  const byMacro = {};
  matches.forEach((m) => {
    const macro = getMacroCategory(m.competition) || m.competition;
    byMacro[macro] = byMacro[macro] || {};
    byMacro[macro][m.competition] = byMacro[macro][m.competition] || {};
    byMacro[macro][m.competition][m.giornata] = byMacro[macro][m.competition][m.giornata] || [];
    byMacro[macro][m.competition][m.giornata].push(m);
  });

  const macroCategories = Object.keys(byMacro).sort(
    (a, b) => competitionScore(a) - competitionScore(b)
  );

  const [selectedMacro, setSelectedMacro] = useState(null);
  const [selectedComp, setSelectedComp] = useState(null);

  const compNames = selectedMacro ? Object.keys(byMacro[selectedMacro]) : [];

  function pickMacro(macro) {
    setSelectedMacro(macro);
    if (macro) {
      const comps = Object.keys(byMacro[macro]);
      setSelectedComp(comps.length === 1 ? comps[0] : null);
    } else {
      setSelectedComp(null);
    }
  }

  return (
    <main>
      <CampionatiHero titolo="Calendario" />
      <section className="section">

        {macroCategories.length === 0 && (
          <p className="state">Nessuna partita in programma trovata al momento.</p>
        )}

        {(selectedMacro || selectedComp) && (
          <div className="results-breadcrumb">
            <button className="results-back" onClick={() => pickMacro(null)}>
              &larr; Tutti i campionati
            </button>
            {selectedMacro && <span> / {selectedMacro}</span>}
            {selectedComp && selectedComp !== selectedMacro && <span> / {selectedComp}</span>}
          </div>
        )}

        {!selectedMacro && (
          <div className="category-tabs">
            {macroCategories.map((macro) => (
              <button key={macro} className="category-tab" onClick={() => pickMacro(macro)}>
                {macro}
              </button>
            ))}
          </div>
        )}

        {selectedMacro && !selectedComp && (
          <div className="category-tabs">
            {compNames.map((comp) => (
              <button key={comp} className="category-tab" onClick={() => setSelectedComp(comp)}>
                {comp}
              </button>
            ))}
          </div>
        )}

        {selectedMacro && selectedComp && (
          <div className="competition-block">
            {Object.keys(byMacro[selectedMacro][selectedComp])
              .sort((a, b) => giornataNumber(a) - giornataNumber(b))
              .map((g) => (
                <div key={g}>
                  <p className="giornata-heading">{g}</p>
                  {byMacro[selectedMacro][selectedComp][g].map((m) => (
                    <MatchRow key={m.id} match={m} />
                  ))}
                </div>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}

function CoachCard({ coach }) {
  return (
    <div className="coach-card">
      {coach.photo ? (
        <img className="coach-card__photo" src={coach.photo} alt={coach.name} />
      ) : (
        <div className="coach-card__photo coach-card__photo--placeholder">🏐</div>
      )}
      <div className="coach-card__body">
        <h3 className="coach-card__name">{coach.name}</h3>
        <p className="coach-card__team">{coach.team}{coach.category ? ` · ${coach.category}` : ""}</p>
        {coach.bio && <p className="coach-card__bio">{coach.bio}</p>}
      </div>
    </div>
  );
}

function AllenatoriPage() {
  const coaches = allenatoriData.coaches || [];
  const [selected, setSelected] = useState(null);
  const [showNews, setShowNews] = useState(false);
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);

  const coach = coaches.find((c) => c.id === selected);

  useEffect(() => {
  if (!coach || !showNews) { setNews([]); return; }
  const coachNews = (coachNewsData.news || {})[coach.id] || [];
  setNews(coachNews.map(n => ({
    title: n.title,
    link: n.link,
    pubDate: n.pubDate,
  })));
}, [selected, showNews]);

  return (
    <main>
      <section className="section">
        <h2 className="feed-heading">Allenatori in vista</h2>

        {coaches.length === 0 && (
          <p className="state">Nessun allenatore inserito al momento.</p>
        )}

        {/* Vista elenco */}
        {!selected && (
          <ul className="coach-list">
            {coaches.map((c) => (
              <li key={c.id} className="coach-list__item">
                <div className="coach-list__info">
                  <span className="coach-list__name">{c.name}</span>
                  <span className="coach-list__meta">{c.team}{c.category ? ` · ${c.category}` : ""}</span>
                </div>
                <div className="coach-list__actions">
                  <button className="coach-list__btn" onClick={() => { setSelected(c.id); setShowNews(false); }}>
                    Curriculum
                  </button>
                  <button className="coach-list__btn coach-list__btn--news" onClick={() => { setSelected(c.id); setShowNews(true); }}>
                    Notizie
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Vista curriculum + news */}
        {coach && (
          <div className="coach-detail">
            <button className="coach-detail__back" onClick={() => { setSelected(null); setShowNews(false); }}>
              ← Torna all'elenco
            </button>

            <div className="coach-detail__header">
              {coach.photo ? (
                <img className="coach-detail__photo" src={coach.photo} alt={coach.name} />
              ) : (
                <div className="coach-detail__photo coach-detail__photo--placeholder">🏐</div>
              )}
              <div>
                <h3 className="coach-detail__name">{coach.name}</h3>
                <p className="coach-detail__team">{coach.team}{coach.category ? ` · ${coach.category}` : ""}</p>
                <div className="coach-detail__tabs">
                  <button
                    className={`coach-detail__tab ${!showNews ? "coach-detail__tab--active" : ""}`}
                    onClick={() => setShowNews(false)}
                  >Curriculum</button>
                  <button
                    className={`coach-detail__tab ${showNews ? "coach-detail__tab--active" : ""}`}
                    onClick={() => setShowNews(true)}
                  >Notizie</button>
                </div>
              </div>
            </div>

            {!showNews && coach.bio && <p className="coach-detail__bio">{coach.bio}</p>}

            {showNews && (
              <div className="coach-news">
                {loadingNews && <p className="state" style={{fontSize:"0.82rem"}}>Caricamento notizie...</p>}
                {!loadingNews && news.length === 0 && (
                  <p className="state" style={{fontSize:"0.82rem"}}>Nessuna notizia trovata.</p>
                )}
                <ul className="coach-news__list">
                  {news.map((n, i) => (
                    <li key={i} className="coach-news__item">
                      <a href={n.link} target="_blank" rel="noreferrer" className="coach-news__link">
                        {n.title}
                      </a>
                      {n.pubDate && <span className="coach-news__date">{formatDate(n.pubDate)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function encodeFormData(data) {
  return Object.keys(data)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join("&");
}

function Allenatori2Page() {
  const elenco = (allenatoriData.coaches || []).map((c) => ({
    id: c.id,
    nome: c.name,
    squadra: c.team,
    categoria: c.category,
    foto: c.photo,
    bio: c.bio,
  }));

  const [selectedId, setSelectedId] = useState("");
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);

  const coach = elenco.find((c) => c.id === selectedId);

 useEffect(() => {
  if (!coach) { setNews([]); return; }
  const coachNews = (coachNewsData.news || {})[coach.id] || [];
  setNews(coachNews.map(n => ({
    title: n.title,
    link: n.link,
    pubDate: n.pubDate,
  })));
}, [selectedId]);

  return (
    <main>
      <section className="section">
        <h2 className="feed-heading">Cerca Allenatore</h2>

        <div className="all2-select-wrap">
          <select
            className="all2-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">-- Scegli un allenatore --</option>
            {elenco.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} — {c.squadra}</option>
            ))}
          </select>
        </div>

        {coach && (
          <div className="coach-detail" style={{ marginTop: "1.5rem" }}>
            <div className="coach-detail__header">
              {coach.foto ? (
                <img className="coach-detail__photo" src={coach.foto} alt={coach.nome} />
              ) : (
                <div className="coach-detail__photo coach-detail__photo--placeholder">🏐</div>
              )}
              <div>
                <h3 className="coach-detail__name">{coach.nome}</h3>
                <p className="coach-detail__team">{coach.squadra} · {coach.categoria}</p>
              </div>
            </div>

            {coach.bio && <p className="coach-detail__bio">{coach.bio}</p>}

            <div className="coach-news" style={{ marginTop: "1rem" }}>
              <h4 className="coach-news__title">Ultime notizie su {coach.nome}</h4>
              {loadingNews && <p className="state" style={{fontSize:"0.82rem"}}>Caricamento...</p>}
              {!loadingNews && news.length === 0 && (
                <p className="state" style={{fontSize:"0.82rem"}}>Nessuna notizia trovata.</p>
              )}
              <ul className="coach-news__list">
                {news.map((n, i) => (
                  <li key={i} className="coach-news__item">
                    <a href={n.link} target="_blank" rel="noreferrer" className="coach-news__link">{n.title}</a>
                    {n.pubDate && <span className="coach-news__date">{formatDate(n.pubDate)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function ArtArchivio({ articoli, onApri, categorieBadge }) {
  const [aperto, setAperto] = useState(false);
  return (
    <div className="art-elenco">
      <button className="art-elenco__header" onClick={() => setAperto(a => !a)}>
        <span>Archivio precedente ({articoli.length} articoli)</span>
        <span style={{ fontSize: "0.85rem", transition: "transform 0.2s", display: "inline-block", transform: aperto ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </button>
      {aperto && articoli.map(a => (
        <div key={a.id} className="art-elenco__row" onClick={() => onApri(a.id)}>
          <span className="art-card__badge"
            style={{ background: (categorieBadge[a.categoria] || "#888") + "22",
                     color: categorieBadge[a.categoria] || "#888",
                     border: `1px solid ${(categorieBadge[a.categoria] || "#888")}55`,
                     flexShrink: 0 }}>
            {a.categoria}
          </span>
          <div className="art-elenco__info">
            <span className="art-elenco__titolo-art">{a.titolo}</span>
            <span className="art-elenco__meta">{a.societa} · {a.data}</span>
          </div>
          <span className="art-elenco__arrow">→</span>
        </div>
      ))}
    </div>
  );
}


function ArticoliSocietaPage({ subscribed }) {
  const [filtroSocieta, setFiltroSocieta] = useState("Tutte");
  const [filtroMese, setFiltroMese] = useState("Tutti");
  const [tab, setTab] = useState("archivio");
  const [form, setForm] = useState({ societa: "", autore: "", titolo: "", testo: "", categoria: "" });
  const [status, setStatus] = useState("idle");
  const [aperto, setAperto] = useState(null);

  // Articoli caricati da data/articoli-societa.json
  const articoli = articoliSocietaData.articoli || [];

  const societa = ["Tutte", ...new Set(articoli.map(a => a.societa))].sort();
  const mesi = ["Tutti", ...new Set(articoli.map(a => a.mese))];

  const artFiltrati = articoli.filter(a => {
    if (filtroSocieta !== "Tutte" && a.societa !== filtroSocieta) return false;
    if (filtroMese !== "Tutti" && a.mese !== filtroMese) return false;
    return true;
  });

  const articoloAperto = articoli.find(a => a.id === aperto);

  function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
  fetch("https://formspree.io/f/xqerqbbz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form }),
    }).then(() => setStatus("done")).catch(() => setStatus("error"));
  }

  const categorieBadge = {
    "Comunicato": "#d4af37",
    "Evento": "#42a5f5",
    "Risultato": "#66bb6a",
    "Mercato": "#ef5350",
    "Altro": "#888",
  };

  return (
    <main>
      {/* Hero */}
      <div className="art-hero">
        <div className="art-hero__content">
          <p className="art-hero__label">Spazio alle societa</p>
          <h2 className="art-hero__titolo">Articoli delle Societa</h2>
          <p className="art-hero__sub">
            Comunicati, eventi, risultati e notizie direttamente dalle societa umbre
          </p>
        </div>
        <svg className="art-hero__svg" viewBox="0 0 900 200" preserveAspectRatio="xMidYMid slice">
          <text x="450" y="160" fontFamily="'Bebas Neue',sans-serif" fontSize="180" fontWeight="900"
            fill="#d4af37" textAnchor="middle" opacity="0.06" letterSpacing="10">NEWS</text>
          <line x1="30" y1="50" x2="30" y2="170" stroke="#d4af37" strokeWidth="2" opacity="0.4"/>
          <line x1="870" y1="50" x2="870" y2="170" stroke="#d4af37" strokeWidth="2" opacity="0.4"/>
        </svg>
      </div>

      <section className="section">
        {/* Tab */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <button className={`lavagna-btn ${tab === "archivio" ? "lavagna-btn--active" : ""}`}
            style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}
            onClick={() => setTab("archivio")}>
            Archivio ({articoli.length})
          </button>
          <button className={`lavagna-btn ${tab === "invia" ? "lavagna-btn--active" : ""}`}
            style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}
            onClick={() => setTab("invia")}>
            + Invia il tuo articolo
          </button>
        </div>

        {/* ARCHIVIO */}
        {tab === "archivio" && !articoloAperto && (
          <>
            {/* Filtri */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
              <select className="all2-select" style={{ minWidth: "180px" }}
                value={filtroSocieta} onChange={e => setFiltroSocieta(e.target.value)}>
                {societa.map(s => <option key={s} value={s}>{s === "Tutte" ? "Tutte le societa" : s}</option>)}
              </select>
              <select className="all2-select" style={{ minWidth: "150px" }}
                value={filtroMese} onChange={e => setFiltroMese(e.target.value)}>
                {mesi.map(m => <option key={m} value={m}>{m === "Tutti" ? "Tutti i mesi" : m}</option>)}
              </select>
            </div>

            {artFiltrati.length === 0 && <p className="state">Nessun articolo trovato.</p>}

            <div className="art-grid">
              {artFiltrati.map(a => (
                <div key={a.id} className="art-card" onClick={() => setAperto(a.id)}>
                  <div className="art-card__top">
                    <span className="art-card__badge"
                      style={{ background: (categorieBadge[a.categoria] || "#888") + "22",
                               color: categorieBadge[a.categoria] || "#888",
                               border: `1px solid ${(categorieBadge[a.categoria] || "#888")}55` }}>
                      {a.categoria}
                    </span>
                    <span className="art-card__data">{a.data}</span>
                  </div>
                  <div className="art-card__img-wrap">
                    {a.foto ? (
                      <img src={a.foto} alt={a.titolo} className="art-card__img" />
                    ) : a.logo ? (
                      <img src={a.logo} alt={a.societa} className="art-card__img art-card__img--logo" />
                    ) : (
                      <div className="art-card__img-placeholder">🏐</div>
                    )}
                  </div>
                  <h3 className="art-card__titolo">{a.titolo}</h3>
                  <p className="art-card__societa">{a.societa}</p>
                  <p className="art-card__preview">{a.testo.slice(0, 120)}...</p>
                  <span className="art-card__leggi">Leggi tutto →</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ARTICOLO APERTO */}
        {tab === "archivio" && articoloAperto && (
          <div className="art-full">
            <button className="coach-detail__back" onClick={() => setAperto(null)}>
              ← Torna all archivio
            </button>
            {articoloAperto.foto && (
              <img src={articoloAperto.foto} alt={articoloAperto.titolo}
                className="art-full__foto" />
            )}
            {!articoloAperto.foto && articoloAperto.logo && (
              <div className="art-full__logo-wrap">
                <img src={articoloAperto.logo} alt={articoloAperto.societa}
                  className="art-full__logo" />
              </div>
            )}
            <div className="art-full__header">
              <span className="art-card__badge"
                style={{ background: (categorieBadge[articoloAperto.categoria] || "#888") + "22",
                         color: categorieBadge[articoloAperto.categoria] || "#888",
                         border: `1px solid ${(categorieBadge[articoloAperto.categoria] || "#888")}55` }}>
                {articoloAperto.categoria}
              </span>
              <span className="art-card__data">{articoloAperto.data}</span>
            </div>
            <h2 className="art-full__titolo">{articoloAperto.titolo}</h2>
            <p className="art-full__societa">
              {articoloAperto.societa} — {articoloAperto.autore}
            </p>
            <div className="art-full__testo">
              {articoloAperto.testo.split("\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}

        {/* FORM INVIO */}
        {tab === "invia" && (
          <div>
            <div className="art-info-box">
              <h3 className="art-info-box__titolo">Come funziona</h3>
              <p className="art-info-box__testo">
                Invia il tuo comunicato, evento o notizia. La redazione lo revisiona e lo pubblica
                entro 24-48 ore. Il contenuto deve riguardare la pallavolo umbra.
                Sono accettati: comunicati societari, eventi, convocazioni, risultati commentati,
                annunci di mercato.
              </p>
            </div>

            {!subscribed ? (
              <div className="commenti-locked" style={{ marginTop: "1rem" }}>
                <p>Per inviare un articolo devi essere iscritto al sito.</p>
                <a href="#/iscrizione" className="sponsor-cta" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
                  Iscriviti ora →
                </a>
              </div>
            ) : status === "done" ? (
              <p className="state" style={{ color: "var(--gold)", marginTop: "1rem" }}>
                Articolo inviato! La redazione lo pubblichera entro 48 ore.
              </p>
            ) : (
              <form name="articoli-societa" method="POST" data-netlify="true" onSubmit={handleSubmit}
                style={{ marginTop: "1rem" }}>
                <input type="hidden" name="form-name" value="articoli-societa" />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "560px" }}>
                  <input className="coach-ai-input" type="text" name="societa"
                    placeholder="Nome della societa sportiva" value={form.societa}
                    onChange={e => setForm({...form, societa: e.target.value})} required />
                  <input className="coach-ai-input" type="text" name="autore"
                    placeholder="Nome e cognome autore" value={form.autore}
                    onChange={e => setForm({...form, autore: e.target.value})} required />
                  <select className="all2-select" name="categoria" value={form.categoria}
                    onChange={e => setForm({...form, categoria: e.target.value})} required>
                    <option value="">-- Tipo di contenuto --</option>
                    <option value="Comunicato">Comunicato</option>
                    <option value="Evento">Evento</option>
                    <option value="Risultato">Risultato commentato</option>
                    <option value="Mercato">Mercato</option>
                    <option value="Altro">Altro</option>
                  </select>
                  <input className="coach-ai-input" type="text" name="titolo"
                    placeholder="Titolo dell articolo" value={form.titolo}
                    onChange={e => setForm({...form, titolo: e.target.value})} required />
                  <textarea className="redazione-textarea" rows={8} name="testo"
                    placeholder="Testo dell articolo (minimo 100 caratteri)..."
                    value={form.testo}
                    onChange={e => setForm({...form, testo: e.target.value})} required />
                  <button type="submit" className="coach-ai-btn" style={{ alignSelf: "flex-start" }}
                    disabled={status === "sending"}>
                    {status === "sending" ? "Invio..." : "Invia articolo"}
                  </button>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                    La redazione si riserva il diritto di modificare o non pubblicare i contenuti
                    non conformi alle linee editoriali del sito.
                  </p>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function FotoSettimanaPage() {
  const [lightbox, setLightbox] = useState(null);

  // Raccoglie tutte le foto da tutte le fonti di notizie
  const tutteLeNotizie = [
    ...(nazionaleData.posts || []),
    ...(nazionaliData.posts || []),
    ...(regionaliData.posts || []),
    ...(terniData.posts || []),
    ...(perugiaData.posts || []),
  ].filter(p => p.image || p.img || p.thumbnail || p.foto);

  // Ordina per data decrescente
  const notizieConFoto = tutteLeNotizie.sort((a, b) => {
    const da = new Date(a.createdTime || a.date || 0);
    const db = new Date(b.createdTime || b.date || 0);
    return db - da;
  });

  const fotoGiorno = notizieConFoto[0] || null;
  const fotoPrecedenti = notizieConFoto.slice(1, 5);

  const getImg = (p) => p.image || p.img || p.thumbnail || p.foto || null;
  const getTitolo = (p) => p.title || p.excerpt?.slice(0, 80) || "Notizia";
  const getData = (p) => p.createdTime ? formatDate(p.createdTime) : (p.date || "");

  if (!fotoGiorno) {
    return (
      <main>
        <section className="section" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📸</div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "var(--gold)", margin: "0 0 0.5rem" }}>
            Foto del Giorno
          </h2>
          <p style={{ color: "var(--text-dim)" }}>
            Nessuna foto disponibile. Le foto vengono aggiornate automaticamente con le notizie.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="section">
        <h2 className="feed-heading">Foto del Giorno</h2>
        <p className="state" style={{ marginBottom: "1.5rem", fontSize: "0.82rem" }}>
          Aggiornata automaticamente con le ultime notizie di pallavolo.
        </p>

        {/* Foto principale */}
        <div className="foto-sett-main" onClick={() => setLightbox(getImg(fotoGiorno))}>
          <img src={getImg(fotoGiorno)} alt={getTitolo(fotoGiorno)} className="foto-sett-main__img" />
          <div className="foto-sett-main__overlay">
            <span className="foto-sett-main__badge">Foto del giorno</span>
            <p className="foto-sett-main__didascalia">{getTitolo(fotoGiorno)}</p>
            <div className="foto-sett-main__meta">
              <span>{getData(fotoGiorno)}</span>
              {fotoGiorno.permalink && (
                <a href={fotoGiorno.permalink} target="_blank" rel="noreferrer"
                  style={{ color: "var(--gold)", fontSize: "0.72rem" }}
                  onClick={e => e.stopPropagation()}>
                  Leggi l'articolo →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Foto precedenti */}
        {fotoPrecedenti.length > 0 && (
          <>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: "0.05em", color: "var(--gold-bright)", margin: "2rem 0 1rem" }}>
              Altre foto recenti
            </h3>
            <div className="foto-sett-griglia">
              {fotoPrecedenti.map((foto, i) => (
                <div key={i} className="foto-sett-card" onClick={() => setLightbox(getImg(foto))}>
                  <img src={getImg(foto)} alt={getTitolo(foto)} className="foto-sett-card__img" />
                  <div className="foto-sett-card__info">
                    <p className="foto-sett-card__didascalia">{getTitolo(foto).slice(0, 60)}...</p>
                    <span className="foto-sett-card__data">{getData(foto)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {lightbox && (
          <div className="lightbox" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="Foto ingrandita" className="lightbox__img" />
            <button className="lightbox__close" onClick={() => setLightbox(null)}>✕</button>
          </div>
        )}
      </section>
    </main>
  );
}

function GalleriaPage() {
  // Raccoglie tutte le immagini dai dati news già scaricati
  // (nazionali + regionali + terni + perugia + nazionale)
  const allPosts = [
    ...(nazionaleData.posts || []),
    ...(nazionaliData.posts || []),
    ...(regionaliData.posts || []),
    ...(terniData.posts || []),
    ...(perugiaData.posts || []),
  ];

  // Prende solo i post con immagine, elimina i duplicati, massimo 20
  const seen = new Set();
  const foto = allPosts
    .filter((p) => p.image && !seen.has(p.image) && seen.add(p.image))
    .slice(0, 20);

  const [selected, setSelected] = useState(null);

  return (
    <main>
      <section className="section">
        <h2 className="feed-heading">Galleria Foto</h2>
        <p className="state" style={{ marginBottom: "1.25rem", fontSize: "0.82rem" }}>
          {foto.length} foto — si aggiornano automaticamente con le notizie.
        </p>

        {foto.length === 0 && (
          <p className="state">Nessuna foto disponibile. Lancia prima gli script di aggiornamento.</p>
        )}

        <div className="galleria-grid">
          {foto.map((p, i) => (
            <div key={i} className="galleria-item" onClick={() => setSelected(p)}>
              <img src={p.image} alt={p.title || ""} loading="lazy" />
              {p.title && <div className="galleria-item__overlay">{p.title}</div>}
            </div>
          ))}
        </div>

        {/* Lightbox */}
        {selected && (
          <div className="galleria-lightbox" onClick={() => setSelected(null)}>
            <div className="galleria-lightbox__inner" onClick={(e) => e.stopPropagation()}>
              <button className="galleria-lightbox__close" onClick={() => setSelected(null)}>✕</button>
              <img src={selected.image} alt={selected.title || ""} />
              {selected.title && <p className="galleria-lightbox__titolo">{selected.title}</p>}
              {selected.permalink && (
                <a href={selected.permalink} target="_blank" rel="noreferrer" className="galleria-lightbox__link">
                  Leggi l'articolo →
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

const ANTHROPIC_API_KEY = "INSERISCI_QUI_LA_TUA_API_KEY";

function RedazionePage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function elabora() {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setOutput("");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `Sei un giornalista sportivo specializzato in pallavolo italiana. 
Prendi queste note grezze su una partita o evento di pallavolo e trasformale in un breve articolo giornalistico in italiano, 
stile Gazzetta dello Sport. Massimo 200 parole. Usa un tono entusiasta e tecnico. 
Non inventare dettagli che non ci sono nelle note.

Note del redattore:
${input}

Scrivi solo l'articolo, senza titolo e senza commenti aggiuntivi.`,
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.content && data.content[0]) {
        setOutput(data.content[0].text);
      } else {
        setError("Risposta non valida dall'AI.");
      }
    } catch (e) {
      setError("Errore di connessione. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <section className="section">
        <h2 className="feed-heading">Redazione</h2>
        <p className="state" style={{ marginBottom: "1.25rem", fontSize: "0.85rem" }}>
          Scrivi le tue note sulla partita e l'AI le trasforma in un articolo giornalistico.
        </p>

        <div className="redazione-layout">
          <div className="redazione-col">
            <label className="redazione-label">Le tue note</label>
            <textarea
              className="redazione-textarea"
              placeholder="Es. Narni batte Terni 3-1. Bella rimonta nel 4° set dopo essere stati sotto 10-18. MVP Colarieti con 22 punti..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={8}
            />
            <button
              className="redazione-btn"
              onClick={elabora}
              disabled={loading || !input.trim()}
            >
              {loading ? "Elaborazione in corso..." : "✍️ Elabora con AI"}
            </button>
          </div>

          <div className="redazione-col">
            <label className="redazione-label">Articolo generato</label>
            {error && <p className="state" style={{ color: "red", fontSize: "0.82rem" }}>{error}</p>}
            {loading && <p className="state" style={{ fontSize: "0.82rem" }}>L'AI sta scrivendo l'articolo...</p>}
            {output && (
              <div className="redazione-output">
                <p>{output}</p>
                <button
                  className="redazione-copy"
                  onClick={() => navigator.clipboard.writeText(output)}
                >
                  Copia testo
                </button>
              </div>
            )}
            {!output && !loading && !error && (
              <div className="redazione-placeholder">
                L'articolo apparirà qui dopo l'elaborazione.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function CampEstiviPage() {
  const [filtroRegione, setFiltroRegione] = useState("Tutti");
  const [filtroMese, setFiltroMese] = useState("Tutti");

  const camps = [
    {
      nome: "EuroCamp Volley",
      luogo: "Cesenatico (FC)",
      regione: "Emilia-Romagna",
      tipo: "Mare",
      eta: "6-18 anni",
      allenatori: ["Micelli", "Dall'Olio", "Marchesi", "Kantor", "Bonitta", "Caprara", "Guidetti", "Serniotti"],
      turni: [
        { nome: "Turno Azzurro", date: "14-20 giugno 2026" },
        { nome: "Turno Blu", date: "21-27 giugno 2026" },
        { nome: "Turno Verde", date: "28 giu - 4 lug 2026" },
        { nome: "Turno Arancio", date: "5-11 luglio 2026" },
        { nome: "Turno Rosa", date: "12-18 luglio 2026" },
        { nome: "Turno Rosso", date: "26 lug - 1 ago 2026" },
      ],
      mesi: ["Giugno", "Luglio", "Agosto"],
      sito: "https://www.eurocamp.it/summer-camp/summer-camp-volley-eurocamp/",
      desc: "Uno dei camp più storici e rinomati d'Italia. Palestra, spiaggia privata, allenamenti con grandi tecnici di Serie A. Specializzazioni per ruolo ogni giovedì.",
    },
    {
      nome: "Your Energy Volley Camp — Sestriere",
      luogo: "Sestriere (TO)",
      regione: "Piemonte",
      tipo: "Montagna",
      eta: "10-17 anni",
      allenatori: ["Matteo Antonucci", "Luciano Pedullà", "Alessandro Fei", "Yasmina Akrari"],
      turni: [
        { nome: "1° Turno", date: "14-20 giugno 2026" },
        { nome: "2° Turno", date: "21-27 giugno 2026" },
      ],
      mesi: ["Giugno"],
      sito: "https://www.legavolley.it/2026/sono-quattro-i-camp-estivi-in-programma/",
      desc: "Camp di Gas Sales Bluenergy Piacenza a 2.035m di altitudine. Tecnica, tattica e preparazione mentale con campioni di Serie A e nazionali.",
    },
    {
      nome: "Your Energy Volley Camp — Andora",
      luogo: "Andora (SV)",
      regione: "Liguria",
      tipo: "Mare",
      eta: "10-17 anni",
      allenatori: ["Alessandro Fei", "Matteo Antonucci"],
      turni: [
        { nome: "1° Turno", date: "28 giu - 4 lug 2026" },
        { nome: "2° Turno", date: "5-12 luglio 2026" },
      ],
      mesi: ["Giugno", "Luglio"],
      sito: "https://www.legavolley.it/2026/sono-quattro-i-camp-estivi-in-programma/",
      desc: "Camp sulla riviera ligure. Sport e mare, allenamenti con tecnici qualificati di Gas Sales Piacenza. Mare e pallavolo in un contesto di grande bellezza.",
    },
    {
      nome: "Summit Volley Camp",
      luogo: "Sestriere (TO)",
      regione: "Piemonte",
      tipo: "Montagna",
      eta: "Giovani atleti",
      allenatori: ["Luciano Pedullà (DT)", "Staff qualificato FIPAV"],
      turni: [
        { nome: "Più settimane disponibili", date: "Luglio 2026" },
      ],
      mesi: ["Luglio"],
      sito: "https://www.summitvolleycamp.it/",
      desc: "Il camp di pallavolo più alto d'Italia e d'Europa. Gruppi da 12-15 atleti per età e livello tecnico. 2 allenamenti giornalieri da 1h30 in palestra.",
    },
    {
      nome: "Volleyrò Summer Camp",
      luogo: "Lignano Sabbiadoro / Formia",
      regione: "Multi",
      tipo: "Mare",
      eta: "8-19 anni",
      allenatori: ["Staff Volleyrò Casal de Pazzi", "Tecnici settore giovanile nazionale"],
      turni: [
        { nome: "Camp Volley & Sport", date: "Estate 2026" },
        { nome: "Camp Alta Qualificazione", date: "Estate 2026" },
      ],
      mesi: ["Luglio", "Agosto"],
      sito: "https://www.experiencecamp.it/camp-tecnici/volleyro-summer-camp/",
      desc: "Camp del Volleyrò, club con 15 scudetti giovanili. Due formule: sport generale (8-17 anni) e alta qualificazione (13-19 anni). A Lignano e al CPO di Formia.",
    },
    {
      nome: "Da Campioni Volley Summer Camp",
      luogo: "Cesenatico (FC)",
      regione: "Emilia-Romagna",
      tipo: "Mare",
      eta: "7-17 anni",
      allenatori: ["Paola Paggi", "Darina Mifkova", "Staff Da Campioni"],
      turni: [
        { nome: "1° Turno Verde", date: "28 giu - 4 lug 2026" },
        { nome: "2° Turno Arancio", date: "5-11 luglio 2026" },
        { nome: "3° Turno Rosa", date: "12-18 luglio 2026" },
        { nome: "4° Turno Grigio", date: "19-25 luglio 2026" },
        { nome: "5° Turno Rosso", date: "26 lug - 1 ago 2026" },
      ],
      mesi: ["Giugno", "Luglio", "Agosto"],
      sito: "https://www.dacampioniasd.it/camp-volley",
      desc: "5 settimane di pallavolo a Cesenatico con campioni professionisti. Villaggio sportivo con campi indoor e beach. Gita all'Acquapark inclusa.",
    },
    {
      nome: "Eco Fun Volley Camp",
      luogo: "Florenz Open Air Resort",
      regione: "Multi",
      tipo: "Mare",
      eta: "Nati 2009-2015",
      allenatori: ["Simone Buti (medaglia olimpica)", "Fabio Fanuli (Serie A)", "Staff FIPAV"],
      turni: [
        { nome: "Estate 2026", date: "Luglio/Agosto 2026" },
      ],
      mesi: ["Luglio", "Agosto"],
      sito: "https://ecofuncamp.it/volley-camp-campo-estivo-pallavolo/",
      desc: "Camp con la medaglia olimpica Simone Buti. Pallavolo, beach volley e attività ambientali. Convenzioni per società sportive disponibili.",
    },
    {
      nome: "Volley Jam Camp",
      luogo: "Varie locations Italia",
      regione: "Multi",
      tipo: "Vario",
      eta: "Nati 1979-2010",
      allenatori: ["Grandi coaches e campioni italiani e internazionali"],
      turni: [
        { nome: "Più turni estate 2026", date: "Estate 2026" },
      ],
      mesi: ["Luglio", "Agosto"],
      sito: "https://volley.jamcamp.it/",
      desc: "Da 20 anni il camp numero 1 in Italia. Partecipanti da 20 regioni e 11 paesi stranieri. Campioni e coaches di fama internazionale presenti da sempre.",
    },
  ];

  const regioni = ["Tutti", ...new Set(camps.map(c => c.regione))].sort();
  const mesi = ["Tutti", "Giugno", "Luglio", "Agosto"];

  const campsFiltrati = camps.filter(c => {
    if (filtroRegione !== "Tutti" && c.regione !== filtroRegione) return false;
    if (filtroMese !== "Tutti" && !c.mesi.includes(filtroMese)) return false;
    return true;
  });

  return (
    <main>
      <div className="campionati-hero">
        <div className="campionati-hero__overlay">
          <h2 className="campionati-hero__titolo">Camp Estivi Pallavolo 2026</h2>
          <p className="campionati-hero__sub">I migliori camp italiani con date, allenatori e info</p>
        </div>
      </div>

      <section className="section">
        <p className="state" style={{ marginBottom: "1.25rem", fontSize: "0.82rem" }}>
          Aggiornato a luglio 2026. Clicca "Vai al sito" per informazioni aggiornate e iscrizioni.
        </p>

        {/* Filtri */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <select className="all2-select" style={{ minWidth: "180px" }}
            value={filtroRegione} onChange={(e) => setFiltroRegione(e.target.value)}>
            {regioni.map(r => <option key={r} value={r}>{r === "Tutti" ? "Tutte le regioni" : r}</option>)}
          </select>
          <select className="all2-select" style={{ minWidth: "140px" }}
            value={filtroMese} onChange={(e) => setFiltroMese(e.target.value)}>
            {mesi.map(m => <option key={m} value={m}>{m === "Tutti" ? "Tutti i mesi" : m}</option>)}
          </select>
        </div>

        <div className="camp-lista">
          {campsFiltrati.map((camp, i) => (
            <div key={i} className="camp-card">
              <div className="camp-card__header">
                <div>
                  <h3 className="camp-card__nome">{camp.nome}</h3>
                  <div className="camp-card__meta">
                    <span className="camp-card__luogo">{camp.luogo}</span>
                    <span className={`camp-card__tipo camp-card__tipo--${camp.tipo.toLowerCase()}`}>{camp.tipo}</span>
                    <span className="camp-card__eta">Età: {camp.eta}</span>
                  </div>
                </div>
                <a href={camp.sito} target="_blank" rel="noreferrer" className="camp-card__cta">
                  Vai al sito →
                </a>
              </div>

              <p className="camp-card__desc">{camp.desc}</p>

              <div className="camp-card__body">
                <div className="camp-card__col">
                  <div className="camp-card__label">Allenatori / Staff</div>
                  <ul className="camp-card__list">
                    {camp.allenatori.map((a, j) => <li key={j}>{a}</li>)}
                  </ul>
                </div>
                <div className="camp-card__col">
                  <div className="camp-card__label">Turni disponibili</div>
                  <ul className="camp-card__list">
                    {camp.turni.map((t, j) => (
                      <li key={j}><strong>{t.nome}</strong> — {t.date}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {campsFiltrati.length === 0 && (
          <p className="state">Nessun camp trovato con i filtri selezionati.</p>
        )}
      </section>
    </main>
  );
}

function VelascoPage() {
  const videos = [
    { id: "Vd5alII7iFQ", titolo: "Il discorso memorabile — da ascoltare almeno una volta" },
    { id: "5RXX-PiifXY", titolo: "Gli schiacciatori non parlano dell'alzata, la risolvono" },
    { id: "Occ1zQ7n55U", titolo: "Non conta ciò che dici, ma ciò che fai" },
    { id: "0CAV3TP8NSk", titolo: "La tua motivazione è diversa da quella degli altri" },
    { id: "nWHnCLI9P7I", titolo: "Mondiali 2025 — dopo Italia-Brasile 3-2" },
    { id: "4ljGdMuFOT0", titolo: "Intervista esclusiva Eurosport 2025" },
    { id: "NcQqQfZRHOM", titolo: "Dopo l'oro Olimpico di Parigi 2024" },
    { id: "4GdHsqlaNQs", titolo: "Italvolley oro Olimpiadi Parigi 2024 — intervista" },
    { id: "mg8UY8bTql4", titolo: "Dall'esordio all'oro — il cammino delle Azzurre" },
    { id: "RZJzd_wVnLU", titolo: "VNL Finals 2024 — dopo il trionfo in Nations League" },
    { id: "ZV9THw63-tg", titolo: "Potrei smettere ora, sarebbe il momento giusto" },
    { id: "1ewsi9FlXac", titolo: "Il mio gioco, il mio mondo — Festival dello Sport 2024" },
    { id: "o54JhxmKkdw", titolo: "Abbraccio di Modena a Velasco — festivalfilosofia 2024" },
    { id: "35WO8Qn86L4", titolo: "Conferenza stampa post medaglia d'oro Parigi 2024" },
  ];

  const [selectedId, setSelectedId] = useState("");
  const selected = videos.find((v) => v.id === selectedId);

  return (
    <main>
      <section className="section">
        <h2 className="feed-heading">Julio Velasco</h2>
        <p className="velasco-bio">
          Julio Velasco (Buenos Aires, 1952) è il più grande allenatore di pallavolo della storia italiana.
          Con la Nazionale maschile ha vinto 3 Mondiali, 3 Europei e una World League tra il 1989 e il 1996.
          Dal 2023 è CT della Nazionale femminile italiana, con cui ha conquistato la medaglia d'oro alle Olimpiadi di Parigi 2024.
        </p>

        <div className="all2-select-wrap" style={{ marginBottom: "1.25rem" }}>
          <select
            className="all2-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">-- Scegli un video --</option>
            {videos.map((v) => (
              <option key={v.id} value={v.id}>{v.titolo}</option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="velasco-player">
            <div className="velasco-player__video">
              <iframe
                key={selected.id}
                src={`https://www.youtube.com/embed/${selected.id}?autoplay=1`}
                title={selected.titolo}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="velasco-player__titolo">{selected.titolo}</p>
          </div>
        )}
      </section>
    </main>
  );
}

const COACH_API_KEY = "INSERISCI_QUI_LA_TUA_API_KEY";

const ESEMPI = [
  "Cos'è il side out nel volley?",
  "Come si esegue la battuta float?",
  "Qual è la differenza tra pipe e fast?",
  "Come si imposta la difesa in cambio palla?",
  "Cosa significa rotazione in pallavolo?",
  "Come si costruisce un attacco in seconda linea?",
  "Quando si usa il time-out?",
  "Cosa fa il libero in campo?",
  "Come si legge il muro avversario?",
  "Cos'è il bagher e come si esegue?",
];

function CoachAiPage() {
  const [domanda, setDomanda] = useState("");
  const [risposta, setRisposta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [storia, setStoria] = useState([]);

  async function chiedi(testo) {
    const q = testo || domanda;
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setRisposta("");

    const nuovaStoria = [...storia, { role: "user", content: q }];

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": COACH_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: `Sei un esperto allenatore di pallavolo italiano con 20 anni di esperienza. 
Rispondi SOLO a domande sulla pallavolo: fondamentali, tattiche, regole, ruoli, fasi di gioco, allenamento.
Se la domanda non riguarda la pallavolo, rispondi gentilmente che puoi aiutare solo su argomenti di pallavolo.
Usa un linguaggio chiaro, tecnico ma accessibile anche per giocatori amatoriali.
Rispondi in italiano, in modo conciso (massimo 200 parole), con elenchi puntati quando utile.`,
          messages: nuovaStoria,
        }),
      });

      const data = await res.json();
      const testo = data.content?.[0]?.text || "Nessuna risposta ricevuta.";
      setRisposta(testo);
      setStoria([...nuovaStoria, { role: "assistant", content: testo }]);
      setDomanda("");
    } catch (e) {
      setError("Errore di connessione. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      {/* Hero grafico */}
      <div className="coach-ai-hero">
        <div className="coach-ai-hero__content">
          <div className="coach-ai-hero__icon">🏐</div>
          <h2 className="coach-ai-hero__titolo">Chiedi al Coach</h2>
          <p className="coach-ai-hero__sub">
            Fai qualsiasi domanda sulla pallavolo — fondamentali, tattiche, regole, ruoli.<br />
            Il tuo allenatore virtuale risponde in italiano.
          </p>
        </div>
        <svg className="coach-ai-hero__svg" viewBox="0 0 900 200" preserveAspectRatio="xMidYMid slice">
          <g stroke="#d4af37" strokeWidth="0.4" opacity="0.1">
            {[0,80,160,240,320,400,480,560,640,720,800,900].map((x,i) => (
              <line key={i} x1={x} y1="0" x2={x} y2="200" />
            ))}
            {[0,50,100,150,200].map((y,i) => (
              <line key={i} x1="0" y1={y} x2="900" y2={y} />
            ))}
          </g>
          <circle cx="800" cy="100" r="120" fill="none" stroke="#d4af37" strokeWidth="0.8" opacity="0.07" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="#d4af37" strokeWidth="0.5" opacity="0.05" />
        </svg>
      </div>

      <section className="section">
        {/* Domande esempio */}
        <div className="coach-ai-esempi">
          <p className="coach-ai-esempi__label">Prova a chiedere:</p>
          <div className="coach-ai-esempi__chips">
            {ESEMPI.map((e, i) => (
              <button key={i} className="coach-ai-chip" onClick={() => { setDomanda(e); chiedi(e); }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Storico conversazione */}
        {storia.length > 0 && (
          <div className="coach-ai-storia">
            {storia.map((msg, i) => (
              <div key={i} className={`coach-ai-msg coach-ai-msg--${msg.role}`}>
                <span className="coach-ai-msg__label">{msg.role === "user" ? "Tu" : " Coach"}</span>
                <p className="coach-ai-msg__testo">{msg.content}</p>
              </div>
            ))}
            {loading && (
              <div className="coach-ai-msg coach-ai-msg--assistant">
                <span className="coach-ai-msg__label">Coach</span>
                <p className="coach-ai-msg__testo coach-ai-loading">Sto elaborando la risposta...</p>
              </div>
            )}
          </div>
        )}

        {/* Input domanda */}
        <div className="coach-ai-input-wrap">
          <input
            className="coach-ai-input"
            type="text"
            placeholder="Scrivi la tua domanda sul volley..."
            value={domanda}
            onChange={(e) => setDomanda(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && chiedi()}
          />
          <button
            className="coach-ai-btn"
            onClick={() => chiedi()}
            disabled={loading || !domanda.trim()}
          >
            {loading ? "..." : "Chiedi"}
          </button>
        </div>

        {error && <p style={{ color: "red", fontSize: "0.82rem", marginTop: "0.5rem" }}>{error}</p>}

        {storia.length > 0 && (
          <button
            className="coach-ai-reset"
            onClick={() => { setStoria([]); setRisposta(""); setDomanda(""); }}
          >
            Nuova conversazione
          </button>
        )}
      </section>
    </main>
  );
}
function PillolePage() {
  const pillole = pilloleData.pillole || [];
  const firma = pilloleData.firma || "";
  const oggi = new Date();
  const idx = (oggi.getDate() - 1) % pillole.length;
  const pillola = pillole[idx];
  const sezioneBadge = {
    "Tecnica": "#42a5f5",
    "Mentalità": "#ab47bc",
    "Esercizi": "#66bb6a",
    "Regole": "#ef5350",
    "Citazioni": "#d4af37",
    "Statistiche": "#26c6da",
    "Errori comuni": "#ff7043",
    "Allenatori": "#8d6e63",
  };
  const colore = sezioneBadge[pillola?.sezione] || "#888";
  return (
    <main>
      <div className="campionati-hero">
        <div className="campionati-hero__overlay">
          <h2 className="campionati-hero__titolo">Pillola del Giorno</h2>
          <p className="campionati-hero__sub">Consigli tecnici, citazioni, esercizi e regole — un contenuto al giorno per allenatori e atlete</p>
        </div>
      </div>
      <section className="section">
        <div className="pillola-intro">
          <p>Ogni giorno PallaVolleyAmo pubblica una pillola formativa dedicata al mondo della pallavolo. Consigli tecnici, citazioni dei grandi allenatori, esercizi pratici e regole spiegate in modo semplice.</p>
          <p>Pensata per allenatori, giocatrici e appassionati che vogliono crescere ogni giorno, anche solo di un piccolo passo.</p>
        </div>
        {pillola && (
          <div className="pillola-card">
            <div className="pillola-card__header">
              <span className="pillola-card__num">🟦 PALLAVOLLEYAMO – Pillola #{pillola.id}</span>
              <span className="pillola-card__badge"
                style={{ background: colore + "22", color: colore, border: `1px solid ${colore}55` }}>
                {pillola.emoji} {pillola.sezione} · {pillola.tema}
              </span>
            </div>
            <div className="pillola-card__blocco">
              <span className="pillola-card__label"> Il consiglio</span>
              <p className="pillola-card__testo">{pillola.consiglio}</p>
            </div>
            <div className="pillola-card__blocco">
              <span className="pillola-card__label"> In palestra</span>
              <p className="pillola-card__testo">{pillola.in_palestra}</p>
            </div>
            <div className="pillola-card__blocco pillola-card__blocco--domanda">
              <span className="pillola-card__label"> Domanda del giorno</span>
              <p className="pillola-card__testo pillola-card__testo--domanda">{pillola.domanda}</p>
            </div>
            <p className="pillola-card__firma">"{firma}"</p>
          </div>
        )}
      </section>
    </main>
  );
}
function SchedePage() {
  const sezioni = [
    "Allenamento Tecnico",
    "Sedute Tipo",
    "SIDE OUT",
    "BREAK POINT",
    "Esercizi Fisici",
  ];

  const [sezione, setSezione] = useState("Esercizi Fisici");
  const [sotto, setSotto] = useState(0);

  const contenuti = {
    "Esercizi Fisici": {
      sottosezioni: ["Core", "Forza Base", "Elastici - Spalle e Petto", "Elastici - Schiena e Braccia", "Elastici - Gambe e Glutei", "Pliometria e Agilita"],
      schede: [
        {
          titolo: "Core Training",
          descrizione: "Il core e il centro di trasmissione della forza in tutti i gesti del volley. Stabilita, prevenzione infortuni, potenza nei colpi: tutto passa dal core. Frequenza consigliata: 2 volte a settimana, anche 5 minuti a fine allenamento sono utili.",
          esercizi: [
            { nome: "Plank frontale", desc: "Appoggio su gomiti e punte dei piedi. Corpo in linea retta. 3x30-45 sec. Variante avanzata: sollevamento alternato delle gambe.", serie: "3x45'" },
            { nome: "Side Plank", desc: "Posizione laterale appoggiata sull'avambraccio. Il corpo forma una linea retta. 3x30 sec per lato. Variante: sollevamento anca o gamba sopra.", serie: "3x30' per lato" },
            { nome: "Bird Dog", desc: "Da quadrupedica, estendi braccio destro e gamba sinistra contemporaneamente. Mantieni 3-5 secondi. Evita rotazioni del bacino. 3x12 per lato.", serie: "3x12 per lato" },
            { nome: "Dead Bug", desc: "Sdraiata supina, gambe a 90°, braccia verso soffitto. Abbassa braccio + gamba opposta senza toccare terra. La zona lombare resta aderente al pavimento. 3x10 per lato.", serie: "3x10 per lato" },
            { nome: "Russian Twist", desc: "Seduta con busto inclinato indietro, piedi sollevati o a terra. Ruota il busto da un lato all'altro lentamente. Con peso o palla medica per aumentare difficolta. 3x20 rotazioni.", serie: "3x20" },
            { nome: "Glute Bridge", desc: "Sdraiata supina, ginocchia piegate. Solleva i glutei formando una linea retta ginocchia-bacino-spalle. Mantieni 1-2 sec in alto. Variante monogamba per difficolta maggiore. 3x15.", serie: "3x15" },
            { nome: "Superman", desc: "Prona, braccia distese in avanti. Solleva simultaneamente braccia, petto e gambe. Mantieni 2-5 sec. Evita di inarcare troppo. 3x12.", serie: "3x12" },
            { nome: "Progressione Core Stability", desc: "Progressione graduale dal plank base al plank con gomito sollevato, poi con gamba sollevata, poi combinato. Ogni posizione 3-10 secondi. Ideale per principianti che devono costruire la base.", serie: "Progressiva" },
          ],
        },
        {
          titolo: "Forza Base Arti Inferiori",
          descrizione: "Gambe forti = salti piu alti, spostamenti piu rapidi, posizione difensiva piu solida. Durata consigliata: 15-20 minuti, 2 volte a settimana.",
          esercizi: [
            { nome: "Squat a carico naturale", desc: "Piedi alla larghezza delle spalle. Scendi come per sederti su una sedia immaginaria. Ginocchia in linea con le punte dei piedi. Su elemento propriocettivo per difficolta aggiuntiva. 3x10.", serie: "3x10" },
            { nome: "Affondi avanti/indietro", desc: "Con palla medica o a corpo libero. Passo avanti o indietro, ginocchio posteriore vicino al pavimento. Busto dritto, core contratto. 3x10 per gamba.", serie: "3x10 per gamba" },
            { nome: "Affondi laterali", desc: "Molto specifico per spostamenti difensivi. Passo laterale lungo, ginocchio piegato, ritorno lento. 8-10 per lato.", serie: "3x8 per lato" },
            { nome: "Step up monogamba", desc: "Su gradino o panca. Sali con una gamba senza appoggiare l'altra. Variante avanzata: partenza e arrivo su elemento instabile. 2x10.", serie: "2x10 per gamba" },
            { nome: "Salti tipo muro a rete", desc: "Spostamenti laterali con salti simulando il muro. 8 ripetizioni. Specifico per il volley: replica il gesto del muratore.", serie: "3x8" },
            { nome: "Balzi laterali monogamba", desc: "Balzo laterale su una gamba sola. Con palla medica in mano per difficolta aggiuntiva. Sviluppa l'esplosivita laterale specifica del volley.", serie: "3x8 per lato" },
          ],
        },
        {
          titolo: "Elastici - Spalle e Petto",
          descrizione: "Potenziamento spalle, petto e tricipiti con elastici. Fondamentale per attaccanti e battitori. 3 allenamenti a settimana alternati (A, B, C). Recupero 30-45 sec tra esercizi, 90 sec tra giri.",
          esercizi: [
            { nome: "Chest Press con elastico", desc: "Elastico dietro di te, gomiti a 90°. Spingi in avanti le mani fino a braccia quasi distese. Ritorno lento. Varianti: unilaterale, incline press, decline press. 3x12-15.", serie: "3x12-15" },
            { nome: "Shoulder Press con elastico", desc: "Elastico sotto i piedi. Mani all'altezza delle spalle, spingi verso l'alto distendendo le braccia. Non inarcare la schiena. Variante un braccio alla volta. 3x12.", serie: "3x12" },
            { nome: "Pec Fly con elastico", desc: "Elastico dietro all'altezza del petto. Braccia leggermente piegate, chiudi in avanti come ad abbracciare un albero. Avvicina le mani contraendo il petto. 3x12-15.", serie: "3x12-15" },
            { nome: "Alzate Laterali con elastico", desc: "Elastico sotto i piedi. Solleva le braccia lateralmente fino all'altezza delle spalle. Movimento lento e controllato, spalle basse. 3x12-15.", serie: "3x12-15" },
          ],
        },
        {
          titolo: "Elastici - Schiena e Braccia",
          descrizione: "Potenziamento dorso, bicipiti e tricipiti. Fondamentale per prevenire infortuni alla spalla e migliorare la forza nei colpi.",
          esercizi: [
            { nome: "Rematore con elastico", desc: "Elastico a un punto stabile all'altezza del busto. Busto leggermente inclinato, tira i gomiti indietro vicino al corpo. Scapole che si avvicinano. 3x12-15.", serie: "3x12-15" },
            { nome: "Lat Pulldown con elastico", desc: "Elastico in alto. Presa prona, tira verso il petto portando i gomiti verso il basso. Scapole addotte. Non oscillare il busto. 3x12.", serie: "3x12" },
            { nome: "Pull Apart con elastico", desc: "Braccia distese davanti al petto. Apri le braccia lateralmente avvicinando le scapole. Movimento fluido, non forzare le spalle. 3x15.", serie: "3x15" },
            { nome: "Curl Bicipiti con elastico", desc: "Elastico sotto i piedi, presa supina. Fletti i gomiti portando le mani alle spalle. Gomiti fermi e vicini al busto. 3x12-15.", serie: "3x12-15" },
            { nome: "Curl a Martello con elastico", desc: "Come il curl ma con presa neutra (pollici in avanti). Lavora brachiale e brachioradiale oltre al bicipite. 3x12.", serie: "3x12" },
            { nome: "Estensioni Tricipiti sopra la testa", desc: "Elastico sotto i piedi, mani sopra la testa. Gomiti piegati verso l'alto, estendi le braccia. Gomiti fermi, vicini alla testa. 3x12-15.", serie: "3x12-15" },
            { nome: "Kickback Tricipiti", desc: "Elastico dietro o sotto un piede. Busto inclinato, gomito a 90°. Estendi il braccio indietro. Gomito fermo, solo l'avambraccio si muove. 3x12.", serie: "3x12" },
          ],
        },
        {
          titolo: "Elastici - Gambe e Glutei",
          descrizione: "Glutei, quadricipiti, femorali: i muscoli che saltano, si spostano e proteggono le ginocchia. Routine preventiva 5 minuti da fare prima di ogni allenamento.",
          esercizi: [
            { nome: "Monster Walk avanti/indietro", desc: "Elastico sopra le ginocchia. 6-8 passi avanti + 6-8 indietro. Ginocchia fuori, movimento lento. Attivazione glutei e prevenzione LCA. 2 giri.", serie: "2x16 passi" },
            { nome: "Lateral Squat Walk", desc: "Elastico alle caviglie, posizione difesa pallavolo (semi-squat). Passi laterali mantenendo l'altezza costante. Specifico per spostamenti difensivi. 2x10-12 passi per lato.", serie: "2x10-12 per lato" },
            { nome: "Hip Thrust con elastico", desc: "Schiena su panca, piedi a terra. Elastico sopra le ginocchia. Solleva i glutei formando una linea retta. Mantieni 1-2 sec in alto. 3x15.", serie: "3x15" },
            { nome: "Squat con elastico", desc: "Elastico sotto i piedi, tenuto all'altezza delle spalle. Scendi mantenendo le ginocchia in linea con le punte dei piedi. Spingi sui talloni in salita. 3x12.", serie: "3x12" },
            { nome: "Affondi con elastico", desc: "Elastico aumenta la resistenza durante il passo. Ginocchio anteriore in linea con la punta del piede. 3x10 per gamba.", serie: "3x10 per gamba" },
            { nome: "Clamshell a terra", desc: "Sdraiata su un fianco, ginocchia piegate, elastico sopra le ginocchia. Apri il ginocchio superiore come una conchiglia. Preventivo e specifico per il gluteo. 2x15 per lato.", serie: "2x15 per lato" },
          ],
        },
        {
          titolo: "Pliometria e Agilita",
          descrizione: "La pliometria si basa su cicli di allungamento-accorciamento muscolare. Sviluppa esplosivita, velocita di reazione e agilita. Max 2 sessioni settimanali di 20-25 minuti. Progressione graduale obbligatoria.",
          esercizi: [
            { nome: "Squat Jump", desc: "Scendi in squat e salta il piu in alto possibile a ogni ripetizione. Atterraggio morbido sui metatarsi con ginocchia leggermente flesse. Mai atterrare a gambe dritte. 3x10.", serie: "3x10" },
            { nome: "Balzi laterali monopodalici", desc: "Balzo laterale su una gamba sola. Atterraggio stabile prima di ripartire. Sviluppa l'esplosivita laterale specifica del volley. 3x8 per lato.", serie: "3x8 per lato" },
            { nome: "Salti su cassetta (box jump)", desc: "Salta sulla cassetta con entrambi i piedi. Atterraggio con ginocchia flesse. Scendi dal bordo laterale, non saltare giu all'indietro. Altezza progressiva. 3x8.", serie: "3x8" },
            { nome: "Arrow Drill", desc: "Percorso a forma di freccia con coni. Sprint al cono centrale, giro sul laterale, cono piu lontano, ritorno. Non valido se si passa sopra un cono. Sviluppa lettura degli spazi e rapidita.", serie: "5 ripetizioni" },
            { nome: "Shuttle 5-10-5", desc: "Sprint 5m a destra, 10m a sinistra, 5m a destra. Velocita e capacita di frenata. Uno degli esercizi di agilita piu usati nel volley professionistico.", serie: "6 ripetizioni" },
            { nome: "Specchio a coppie", desc: "A coppie, uno guida e l'altro segue replicando i movimenti. Sviluppa reattivita visiva e cambi di direzione. 30 sec di lavoro, poi si scambiano. 3 serie.", serie: "3x30'" },
          ],
        },
      ],
    },
    "SIDE OUT": {
      sottosezioni: ["Ricezione", "Palleggio", "Attacco", "Sistema Completo", "Allenamento 90 min"],
      schede: [
        {
          titolo: "Blocco Ricezione",
          descrizione: "Il side-out inizia dalla ricezione. Ogni pallone perso in ricezione e un punto avversario o un attacco limitato. Obiettivo: ricezione alta, precisa, in zona 3.",
          esercizi: [
            { nome: "Ricezione su battuta reale", desc: "6 battitori a turno verso 2 ricevitori. Ricezione deve arrivare in zona 3 entro un metro dall'alzatore. Si contano le ricezioni perfette su 10. Cambio ogni 10 battute.", serie: "3 giri" },
            { nome: "Ricezione a 6 stazioni", desc: "6 battitori in posizioni diverse lungo la linea di fondo. Il ricevitore lavora contro tutti in sequenza. Ogni ricevitore deve mandare la palla sempre nello stesso punto. 3 giri completi.", serie: "3 giri" },
            { nome: "Ricezione con comunicazione", desc: "Coach lancia palle da diverse posizioni senza chiamare. I giocatori devono comunicare autonomamente chi riceve. Sviluppa comunicazione e lettura del campo. 15 palloni.", serie: "3 serie da 15" },
            { nome: "Ricezione competitiva (21 punti)", desc: "Un batte, uno riceve. Ricezione perfetta = punto ricevitore. Errore = punto battitore. A 21 punti si cambia. Sviluppa pressione e concentrazione nelle situazioni decisive.", serie: "A 21 punti" },
          ],
        },
        {
          titolo: "Blocco Palleggio",
          descrizione: "Il palleggiatore e il cervello del side-out. Deve leggere il muro avversario, conoscere lo stato dei propri attaccanti e scegliere in meno di un secondo.",
          esercizi: [
            { nome: "Alzata su palla facile + spostamento", desc: "Coach bagher al palleggiatore che deve spostarsi: verso la rete, verso il centro campo, lateralmente. Alza dopo ogni spostamento. 15 palloni per posizione.", serie: "3 posizioni" },
            { nome: "Gioco dei numeri ad alta pressione", desc: "Coach mostra 1, 2 o 3 dita un istante prima che l'alzatore tocchi la palla. Alza verso il posto corrispondente in meno di mezzo secondo. 15 ripetizioni.", serie: "3 serie da 15" },
            { nome: "Fast 1T dal palleggiatore", desc: "Centrale gia in rincorsa mentre la palla e in mano al palleggiatore. Palla davanti alla rincorsa del centrale. Sincronizzazione totale: il muro non ha tempo di spostarsi.", serie: "20 ripetizioni" },
            { nome: "Alzata dopo bagher di emergenza", desc: "Coach lancia palle basse o scomode. Il palleggiatore usa il bagher di alzata e serve comunque un'alzata utilizzabile. Si valuta non la perfezione ma la soluzione.", serie: "20 palloni" },
          ],
        },
        {
          titolo: "Blocco Attacco",
          descrizione: "L'attaccante legge il muro mentre e in volo. Variare e fondamentale: chi attacca sempre nello stesso modo e facile da difendere.",
          esercizi: [
            { nome: "Attacco su alzata fissa con target", desc: "Alzata costante, coach indica cono bersaglio (zona 1, 5, 6). Attacca verso il cono indicato. Si tengono statistiche: quante volte colpita la zona corretta su 10. Variante: con muratore passivo.", serie: "3 serie da 10" },
            { nome: "Attacco variato 4 colpi in sequenza", desc: "4 palle consecutive: diagonale, parallelo, pallonetto, scelta libera. L'attaccante non sa in anticipo la sequenza. Sviluppa la capacita di cambiare colpo mantenendo la stessa preparazione.", serie: "3 sequenze" },
            { nome: "6 attacchi vs difesa completa", desc: "Attaccante vs libero + 2 difensori. 6 alzate consecutive. Ogni punto conquistato vale 1, ogni difesa vale 1 per la difesa. A 6 punti si scambiano. Situazione di gioco reale.", serie: "A 6 punti" },
            { nome: "Wipe-out e pallonetto vs muro", desc: "Muratore copre la diagonale. L'attaccante allena wipe-out (sul braccio esterno) e pallonetto (sopra il muro). Sviluppa la lettura della posizione delle mani del muro.", serie: "20 ripetizioni" },
          ],
        },
        {
          titolo: "Sistema Side-Out Completo",
          descrizione: "Integrazione di ricezione, palleggio e attacco in situazione di gioco. Obiettivo: costruire il punto dal primo tocco.",
          esercizi: [
            { nome: "3 vs 3 con vincoli", desc: "Primo tocco obbligatorio in bagher. Secondo tocco obbligatorio in palleggio. Terzo tocco: attacco libero. Punto solo se si rispettano i vincoli. Sviluppa la sequenza corretta sotto pressione.", serie: "A 15 punti" },
            { nome: "Side-out su schema da battuta", desc: "La battuta avversaria arriva sempre nella stessa zona. La squadra esegue uno schema predefinito (es. fast centrale + parallelo da posto 4). Ripetere 10 volte e valutare l'efficacia.", serie: "3 schemi x10" },
            { nome: "Battuta vs side-out (gioco reale)", desc: "6 vs 6. La squadra che riceve deve costruire il punto dal primo tocco. Chi batte cerca di mettere in difficolta la ricezione. Rotazioni ogni 3 punti consecutivi.", serie: "A 15 punti" },
            { nome: "Side-out contro muro organizzato", desc: "La squadra che attacca deve vincere contro un muro a due organizzato (copertura diagonale dichiarata). Sviluppa la capacita di leggere e battere un muro che si conosce.", serie: "20 palloni" },
          ],
        },
        {
          titolo: "Allenamento Completo Side-Out 90 min",
          descrizione: "Seduta completa dedicata al sistema side-out. Strutturata in 5 blocchi progressivi dal lavoro individuale al gioco di squadra.",
          esercizi: [
            { nome: "Blocco 1 - Riscaldamento tecnico (15 min)", desc: "Palleggio a coppie in movimento. Bagher su lanci del coach. Battute libere per attivazione. Mobilita spalle e caviglie.", serie: "15 min" },
            { nome: "Blocco 2 - Ricezione individuale (20 min)", desc: "Ricezione su battuta reale x10. Ricezione a 6 stazioni x3 giri. Focus: palla alta in zona 3 entro 1 metro dall'alzatore.", serie: "20 min" },
            { nome: "Blocco 3 - Palleggio + Attacco (20 min)", desc: "Gioco dei numeri x15. Fast 1T x10. Attacco variato 4 colpi x3 sequenze. Alzatore e attaccanti lavorano insieme.", serie: "20 min" },
            { nome: "Blocco 4 - Sistema completo (25 min)", desc: "3 vs 3 con vincoli x2 games. Battuta vs side-out 6 vs 6. Rotazioni ogni 3 punti consecutivi.", serie: "25 min" },
            { nome: "Blocco 5 - Defaticamento (10 min)", desc: "Core: plank 3x30 sec, bird dog 2x12. Stretching guidato spalle, anche, cosce. Foam roller se disponibile.", serie: "10 min" },
          ],
        },
      ],
    },
    "BREAK POINT": {
      sottosezioni: ["Battuta", "Muro", "Difesa e Ricostruzione", "Transizione", "Allenamento 90 min"],
      schede: [
        {
          titolo: "Blocco Battuta",
          descrizione: "La battuta e il punto di partenza del break point. Una battuta efficace mette pressione al ricevitore e limita le opzioni d'attacco avversario.",
          esercizi: [
            { nome: "Battuta a zona con pressione mentale", desc: "Ogni atleta: 5 battute verso zona target. Errore = -1 punto, bersaglio = +2 punti. Sfida a squadre: primo team a 20 punti. Sviluppa concentrazione sotto pressione.", serie: "Sfida a 20" },
            { nome: "Battuta + rientro difensivo", desc: "Dopo ogni battuta, sprint laterale di 3 metri simulando il rientro in posizione difensiva. Sviluppa la transizione mentale da battitore a difensore.", serie: "3 serie da 10" },
            { nome: "Battuta su schema (zona 6 vs zona 1)", desc: "La squadra decide dove battere in base alla posizione dell'alzatore avversario. Zona 6 se l'alzatore e lontano dalla rete, zona 1 se e vicino. 15 battute con lettura della posizione.", serie: "15 battute" },
            { nome: "Battuta + Ricostruzione Obbligata", desc: "Se la battuta non mette in difficolta (ricezione perfetta avversaria), la propria squadra deve difendere una situazione svantaggiosa. Chi batte impara che la battuta ha conseguenze dirette.", serie: "20 palloni" },
          ],
        },
        {
          titolo: "Blocco Muro",
          descrizione: "Il muro e la prima difesa dopo la battuta. Deve coordinarsi con la difesa per canalizzare l'attacco avversario in una zona specifica.",
          esercizi: [
            { nome: "Lettura dell'attaccante (esercizio visivo)", desc: "Compagno simula rincorsa e salto senza palla. Il muratore legge le spalle: aperte = diagonale, chiuse = parallelo. Anticipa alzando le mani nel lato corretto. Prima lento, poi veloce.", serie: "3 serie da 15" },
            { nome: "Muro + difesa coordinata", desc: "Muratore comunica con cenno se copre diagonale o parallelo. Difesa si posiziona sull'altra zona. Attaccante libero. Punteggio: muro/difesa x2, attacco x1. A 10 punti.", serie: "A 10 punti" },
            { nome: "Muro vs attacco progressivo", desc: "Fase 1: attaccante mostra dove colpira. Fase 2: scelta tra 2 zone. Fase 3: attaccante libero. 5-8 palloni per fase. Si contano i punti del muro.", serie: "3 fasi" },
            { nome: "Salti ritmici a rete", desc: "10 salti consecutivi toccando la rete con entrambe le mani alla massima estensione. Focus: massima altezza, mani aperte e rigide oltre la rete, atterraggio morbido. 3 serie.", serie: "3x10" },
          ],
        },
        {
          titolo: "Difesa e Ricostruzione",
          descrizione: "Nel break point la difesa non basta: la palla difesa deve diventare attacco. Difesa + e la fondamenta della ricostruzione.",
          esercizi: [
            { nome: "Difesa vs attacco vero", desc: "Attaccante riceve alzate e attacca liberamente vs difensore + libero. Si contano le difese positive (palla alzata in zona utile). 10 palloni, poi si scambia. Il piu realistico.", serie: "3 serie da 10" },
            { nome: "Difesa + ricostruzione", desc: "Difesa della palla attaccata, poi ricostruzione immediata con 3 tocchi verso una nuova zona d'attacco. Sviluppa la transizione difesa-attacco che e il cuore del break point.", serie: "15 palloni" },
            { nome: "Reazione ai lanci del coach", desc: "Coach lancia in direzioni diverse senza preavviso. Difendi ogni palla. Non importa la perfezione, importa non far cadere. Si contano le palle salvate su 10 lanci.", serie: "3 serie da 10" },
            { nome: "Difesa + (attacco dopo difesa)", desc: "La difesa deve essere abbastanza alta da permettere al palleggiatore di costruire un attacco. Si valuta non solo la difesa ma la qualita della ricostruzione successiva.", serie: "20 palloni" },
          ],
        },
        {
          titolo: "Transizione e Rigiocata",
          descrizione: "La transizione e il momento piu difficile: dopo aver difeso, riorganizzarsi velocemente per attaccare. Richiede comunicazione, velocita di spostamento e lucidita.",
          esercizi: [
            { nome: "Transizione muro-difesa-attacco", desc: "Il muratore salta, atterrа, si riposiziona in difesa. Il difensore salva la palla. Il palleggiatore costruisce l'attacco. Ciclo completo ripetuto 15 volte.", serie: "15 cicli" },
            { nome: "Punto 23-23 (pressione massima)", desc: "Si gioca come se il punteggio fosse 23-23 nel set decisivo. Ogni punto conta doppio psicologicamente. Sviluppa la gestione dell'ansia e la concentrazione nei momenti decisivi.", serie: "5 punti" },
            { nome: "Killer Instinct (serie di 3)", desc: "La squadra deve vincere 3 punti consecutivi partendo da ogni situazione di gioco. Se sbaglia, ricomincia da 0. Sviluppa la mentalita di chiudere il vantaggio.", serie: "3 punti di fila" },
            { nome: "6 vs 6 con rotazioni complete", desc: "Gioco reale con rotazioni. Bonus se la battuta mette in difficolta la ricezione. Punti extra se difesa ricostruisce l'attacco in meno di 3 secondi.", serie: "A 25 punti" },
          ],
        },
        {
          titolo: "Allenamento Completo Break Point 90 min",
          descrizione: "Seduta completa dedicata al sistema break point. Dal lavoro sulla battuta alla transizione completa.",
          esercizi: [
            { nome: "Blocco 1 - Attivazione (15 min)", desc: "Riscaldamento dinamico. Battute libere x5 per giocatrice. Salti a rete x10. Mobilita spalle e caviglie.", serie: "15 min" },
            { nome: "Blocco 2 - Battuta + Muro (20 min)", desc: "Battuta a zona con pressione mentale. Lettura dell'attaccante x15. Muro vs attacco progressivo x3 fasi.", serie: "20 min" },
            { nome: "Blocco 3 - Difesa + Ricostruzione (20 min)", desc: "Difesa vs attacco vero x10. Difesa + ricostruzione x15. Reazione lanci del coach x10.", serie: "20 min" },
            { nome: "Blocco 4 - Transizione completa (25 min)", desc: "Transizione muro-difesa-attacco x15. Punto 23-23 x5 punti. 6 vs 6 con rotazioni.", serie: "25 min" },
            { nome: "Blocco 5 - Defaticamento (10 min)", desc: "Core leggero: plank e bird dog. Stretching guidato. Feedback di squadra.", serie: "10 min" },
          ],
        },
      ],
    },
    "Sedute Tipo": {
      sottosezioni: ["Seduta 1 - Controllo e Precisione", "Seduta 2 - Movimento e Lettura", "Seduta 3 - Tecnica in Pressione"],
      schede: [
        {
          titolo: "Seduta 1 - Controllo e Precisione (90-105 min)",
          descrizione: "Focus sulla tecnica individuale di base. Palleggio e bagher in condizioni controllate. Obiettivo: automatizzare i gesti tecnici fondamentali prima di aumentare la pressione.",
          esercizi: [
            { nome: "1. Riscaldamento attivo (10 min)", desc: "Corse leggere, mobilita braccia e spalle. Attivazione core + piccoli balzi. Skip, corsa laterale, corsa calciata.", serie: "10 min" },
            { nome: "2a. Palleggio tecnico (12 min)", desc: "A coppie statico (3 m) 3 min. A coppie in movimento 4 min. Triangolo a 3 giocatrici 5 min. Focus: posizione delle mani, altezza costante, piedi sotto la palla.", serie: "12 min" },
            { nome: "2b. Bagher tecnico (13 min)", desc: "A coppie con variazione altezza 3 min. Su pallone lanciato preciso in zona 5 min. Bagher + spostamento su lanci del coach 5 min. Focus: piattaforma, orientamento verso l'alzatore.", serie: "13 min" },
            { nome: "3. Battuta + combinazione (25 min)", desc: "5 battute verso zona 5 + recupero + bagher + palleggio. 3 circuiti. Variante: battuta + rientro difensivo + palleggio di emergenza. Obiettivo: concentrazione e continuita.", serie: "25 min" },
            { nome: "4. Gioco condizionato (25 min)", desc: "4 vs 4 o 5 vs 5. Regole: battuta obbligatoria zona 6, primo tocco in bagher, palleggio obbligatorio per il terzo tocco. Punto solo se si rispettano le regole.", serie: "25 min" },
            { nome: "5. Core + stretching (10 min)", desc: "Plank 3x30 sec. Bird dog 2x12. Mobilita spalle e gambe. Foam roller se disponibile.", serie: "10 min" },
          ],
        },
        {
          titolo: "Seduta 2 - Movimento e Lettura (90-105 min)",
          descrizione: "Focus sul gioco in movimento e sulla lettura delle situazioni. I gesti tecnici devono essere eseguiti in condizioni dinamiche, simulando la partita reale.",
          esercizi: [
            { nome: "1. Riscaldamento + reattivita (10 min)", desc: "Skip + mobilita. Scaletta + lanci palloni. Esercizi di risposta rapida su segnale visivo.", serie: "10 min" },
            { nome: "2a. Palleggio dinamico (14 min)", desc: "In corsa + rotazione 180° 4 min. Palleggio su ricezione da coach 6 min. Alzata in salto 4 min. L'alzatore non sa in anticipo da dove arrivera la palla.", serie: "14 min" },
            { nome: "2b. Bagher in movimento (11 min)", desc: "Bagher in corsa dx/sx + bersaglio 5 min. Difesa su attacco controllato 6 min. Focus: spostamento prima delle braccia.", serie: "11 min" },
            { nome: "3. Battuta + ritmo (25 min)", desc: "Battuta x5 + spostamento laterale + ricezione in bagher. Circuito continuo 3 volte. Variante: battuta float o salto + transizione difensiva immediata.", serie: "25 min" },
            { nome: "4. Gioco reale - focus battuta (25 min)", desc: "6 vs 6 con rotazioni complete. Bonus se la battuta mette in difficolta la ricezione. Punti extra se il primo tocco arriva in zona 3.", serie: "25 min" },
            { nome: "5. Defaticamento + mobilita (10 min)", desc: "Stretching guidato. Foam roller lombari, polpacci, spalle. Commento tecnico della seduta.", serie: "10 min" },
          ],
        },
        {
          titolo: "Seduta 3 - Tecnica in Pressione (90-105 min)",
          descrizione: "Focus sulla gestione della pressione. La tecnica deve tenere quando la situazione e difficile: punteggio in parita, ultima palla del set, sfida a squadre. Chi regge la pressione vince.",
          esercizi: [
            { nome: "1. Attivazione + giochi reattivi (10 min)", desc: "2 vs 2 mini campo per attivazione rapida. Risposte rapide su fischio/colore/palla. Corse con cambi di direzione su segnale.", serie: "10 min" },
            { nome: "2a. Palleggio con vincolo competitivo (14 min)", desc: "A coppie: 10 palleggi perfetti = punto, sfida a squadre 5 min. Palleggio su ricezione instabile 5 min. Palleggio zona 2 + attacco fittizio 4 min.", serie: "14 min" },
            { nome: "2b. Bagher sotto pressione (11 min)", desc: "Ricezione su battuta reale 6 min. Bagher + alzata di emergenza 5 min. Si conta solo se la palla arriva in zona utile.", serie: "11 min" },
            { nome: "3. Battuta + pressione mentale (25 min)", desc: "Ogni atleta: 5 battute. Punti solo su bersaglio. Errore = -1, bersaglio = +2. Sfida a squadre: primo team a 20. Sviluppa la concentrazione sulla battuta decisiva.", serie: "25 min" },
            { nome: "4. Gioco condizionato a ritmo alto (25 min)", desc: "5 vs 5. Battuta obbligatoria, ricezione in bagher, costruzione veloce. Rotazioni ogni 3 azioni. Punteggio 23-23 per ultime 5 azioni.", serie: "25 min" },
            { nome: "5. Defaticamento + feedback (10 min)", desc: "Core leggero 5 min. Stretching 3 min. Feedback collettivo: cosa ha funzionato, cosa migliorare. 2 min.", serie: "10 min" },
          ],
        },
      ],
    },
    "Allenamento Tecnico": {
      sottosezioni: ["Battuta", "Ricezione", "Alzata", "Attacco", "Muro", "Difesa"],
      schede: [
        {
          titolo: "Allenamento Tecnico - Battuta",
          descrizione: "Seduta specifica per la battuta. Dalla tecnica base alla gestione della pressione. Durata: 45-60 minuti come parte di un allenamento completo.",
          esercizi: [
            { nome: "Riscaldamento spalle (5 min)", desc: "Rotazioni delle braccia avanti e indietro. Stretching dinamico dei pettorali. 10 lanci leggeri di attivazione.", serie: "5 min" },
            { nome: "Automatizzare il lancio (10 min)", desc: "Lancia la palla in aria 20 volte senza colpirla. La palla deve cadere sempre nello stesso punto davanti a te. Poi aggiungi il colpo. 3 serie da 15 battute.", serie: "3x15" },
            { nome: "Battuta a zona con chiamata (15 min)", desc: "Coach divide il campo in 6 zone. Chiama il numero prima di ogni battuta. Obiettivo: 3 su 5 vicino al bersaglio. Prima zone grandi (1,5,6) poi zone intermedie (2,3,4).", serie: "3 serie da 10" },
            { nome: "Float vs jump float (10 min)", desc: "5 battute float + 5 jump float in alternanza. Confronto delle traiettorie. Il ricevitore segnala quale e piu difficile. Sviluppa la consapevolezza dell'efficacia dei propri colpi.", serie: "3 cicli" },
            { nome: "Serie di pressione (10 min)", desc: "10 battute di fila senza sbagliare. Se sbagli, ricominci da zero. Progressione: le ultime 3 devono essere nella stessa zona. Resistenza mentale e concentrazione.", serie: "3 tentativi" },
            { nome: "Battuta vs ricezione 3 vs 1 (10 min)", desc: "3 battitori verso 1 ricevitore. Ricezione perfetta = punto ricevitore. Battuta in zona = punto battitore. A 5 punti. Pressione competitiva reale.", serie: "A 5 punti" },
          ],
        },
        {
          titolo: "Allenamento Tecnico - Ricezione",
          descrizione: "Seduta specifica per la ricezione. Dal gesto individuale alla ricezione in sistema. La ricezione si fa con i piedi prima che con le braccia.",
          esercizi: [
            { nome: "Posizione e mobilita (5 min)", desc: "Posizione di attesa corretta: piedi larghi, ginocchia flesse, peso sui metatarsi. Spostamenti rapidi su segnale del coach. Shuffle laterale, avanti, indietro.", serie: "5 min" },
            { nome: "Ricezione al muro (10 min)", desc: "4 metri dal muro. Batti contro il muro con forza controllata, ricevi il rimbalzo verso un punto preciso. Obiettivo: sempre nello stesso punto come se fosse l'alzatore. 3 serie da 15.", serie: "3x15" },
            { nome: "Ricezione su battute reali (15 min)", desc: "Coach batte da diverse posizioni. Il ricevitore deve: spostarsi prima delle braccia, orientarsi verso zona 3, mantenere la piattaforma ferma. 10 battute per serie.", serie: "3 serie da 10" },
            { nome: "Ricezione con comunicazione (10 min)", desc: "2 ricevitori, coach lancia senza chiamare. I giocatori devono comunicare autonomamente. Poi con chiamata del coach. 15 palloni per variante.", serie: "2 varianti x15" },
            { nome: "Ricezione in tuffo (10 min)", desc: "Palle intenzionalmente basse o rasoterra. Il giocatore si lancia e controlla la palla prima di cadere. Prima su tappetino, poi su parquet. Solo per chi conosce la tecnica di caduta.", serie: "10 ripetizioni" },
            { nome: "Ricezione competitiva (10 min)", desc: "A coppie: uno batte, uno riceve. Ricezione perfetta = punto. A 21 punti. Poi cambia. Crea pressione reale e sviluppa concentrazione.", serie: "A 21 punti" },
          ],
        },
        {
          titolo: "Allenamento Tecnico - Alzata",
          descrizione: "Seduta specifica per l'alzatore. La tecnica si allena, la scelta si sviluppa con l'esperienza. L'alzatore deve lavorare il doppio delle altre.",
          esercizi: [
            { nome: "Alzate a muro serie lunga (10 min)", desc: "50 cm dal muro. Alza continuamente senza far cadere. Obiettivo: 50 alzate consecutive. Poi 1m, poi 2m. Poi con una mano. Poi all'indietro. Sensibilita delle mani.", serie: "3 serie da 50" },
            { nome: "Posizionamento sotto la palla (10 min)", desc: "Coach bagher all'alzatore che deve spostarsi: verso la rete, verso il centro, lateralmente. Alza dopo ogni spostamento. Ricorda: l'alzata si fa prima con i piedi.", serie: "15 spostamenti" },
            { nome: "Gioco dei numeri ad alta pressione (10 min)", desc: "Coach mostra 1, 2 o 3 dita un istante prima che l'alzatore tocchi la palla. Alza verso il posto corrispondente in meno di mezzo secondo. Decisione rapidissima.", serie: "3 serie da 15" },
            { nome: "Fast 1T con centrale (10 min)", desc: "Il centrale inizia la rincorsa mentre la palla e ancora in mano al palleggiatore. Sincronizzazione totale. La palla deve essere davanti alla rincorsa del centrale. 20 ripetizioni.", serie: "20 ripetizioni" },
            { nome: "Alzata dall'emergenza (10 min)", desc: "Coach lancia palle basse, veloci, lontane. L'alzatore usa il bagher. Si valuta non la perfezione ma se l'attaccante riesce ad attaccare. 20 palloni.", serie: "20 palloni" },
            { nome: "Alzata in coppia 2 palleggiatori (10 min)", desc: "I due alzatori si sfiдano: A alza per B che poi alza per A. 2 min continui x3. Sviluppa rapidita e precisione competitiva. La stanchezza rivela i limiti tecnici.", serie: "3x2 min" },
          ],
        },
        {
          titolo: "Allenamento Tecnico - Attacco",
          descrizione: "Seduta specifica per gli attaccanti. Prima impara a mettere la palla dove vuoi, poi aggiungi la potenza. La rincorsa e il 70% del colpo.",
          esercizi: [
            { nome: "Rincorsa tecnica senza palla (8 min)", desc: "30 rincorse complete senza palla. Per i destri: DX-SX-DX. Ultimi due passi veloci, salto verticale. Registra l'altezza di tocco sul muro. Focus sul ritmo, non sulla velocita.", serie: "3 serie da 10" },
            { nome: "Attacco con piedi a terra (5 min)", desc: "Rete piu bassa o col braccio. Colpo con piedi a terra, poi con un passo, poi con due passi. Progressione della rincorsa. Prima colpo lungolinea, poi diagonale.", serie: "Progressiva" },
            { nome: "Attacco su alzata fissa con target (15 min)", desc: "Alzata costante. Coach indica cono bersaglio prima del salto. Statistiche: quante volte colpita la zona su 10. Prima senza muro, poi con muratore passivo.", serie: "3 serie da 10" },
            { nome: "Attacco variato 4 colpi (10 min)", desc: "4 palle consecutive: diagonale, parallelo, pallonetto, scelta libera. Stessa preparazione per tutti e 4 i colpi. Il muro non deve capire quale colpo arriva.", serie: "3 sequenze" },
            { nome: "Pallonetto e wipe-out vs muro (10 min)", desc: "Muratore copre diagonale dichiarata. Attaccante allena il pallonetto sopra il muro e il wipe-out sul braccio esterno. 10 pallonetti + 10 wipe-out.", serie: "20 ripetizioni" },
            { nome: "6 attacchi vs difesa completa (12 min)", desc: "Attaccante vs libero + 2 difensori. 6 alzate consecutive. Punto attaccante se palla a terra, punto difesa se salvano. A 6 punti si scambiano.", serie: "A 6 punti" },
          ],
        },
        {
          titolo: "Allenamento Tecnico - Muro",
          descrizione: "Seduta specifica per il muro. Il muro inizia dalla lettura, non dal salto. Chi legge bene l'attaccante salta sempre al momento giusto.",
          esercizi: [
            { nome: "Salti ritmici a rete (8 min)", desc: "10 salti consecutivi toccando la rete con entrambe le mani alla massima estensione. Focus: massima altezza, mani aperte e rigide oltre la rete, atterraggio morbido. 3 serie.", serie: "3x10" },
            { nome: "Lettura dell'attaccante (10 min)", desc: "Compagno simula rincorsa e salto senza palla. Varia la posizione delle spalle. Muratore anticipa alzando le mani nel lato corretto. Prima lento, poi a velocita reale. 15 ripetizioni.", serie: "3 serie da 15" },
            { nome: "Spostamento + muro (10 min)", desc: "Centrale si sposta verso post 4 o posto 2 su segnale dell'alzatore. Forma il muro a due con il laterale. Focus: arrivare in tempo, non aprire spazi tra le mani.", serie: "20 spostamenti" },
            { nome: "Muro vs attacco progressivo (15 min)", desc: "Fase 1: attaccante mostra dove colpira (5 palloni). Fase 2: scelta tra 2 zone (5 palloni). Fase 3: attaccante libero (5 palloni). Si contano i punti del muro.", serie: "3 fasi x5" },
            { nome: "Muro + difesa coordinata (12 min)", desc: "Muratore comunica con cenno: copre diagonale o parallelo. Difesa si posiziona sull'altra zona. Attaccante libero. Punteggio x2 per muro/difesa, x1 per attacco. A 10 punti.", serie: "A 10 punti" },
          ],
        },
        {
          titolo: "Allenamento Tecnico - Difesa",
          descrizione: "Seduta specifica per la difesa. I grandi difensori non reagiscono, anticipano. La posizione di attesa e il 70% della difesa.",
          esercizi: [
            { nome: "Posizione e resistenza (8 min)", desc: "Posizione di attesa corretta per 45 secondi continui. 15 secondi di riposo. 5 serie. Progressione: aggiungi spostamenti laterali di 1 metro mentre mantieni la posizione.", serie: "5x45'" },
            { nome: "Reazione direzionale a cascata (10 min)", desc: "Coach a rete con cesta. Lancia palle in direzioni diverse con ritmo variabile. Non far cadere nessuna. Si contano le palle salvate su 10 lanci. 3 serie.", serie: "3 serie da 10" },
            { nome: "Rolling progressivo (10 min)", desc: "Prima senza palla: caduta laterale, rotolamento, rialzata in posizione di attesa (max 3 secondi). Poi con palla: tocca e rolling. 20 ripetizioni per lato.", serie: "20 per lato" },
            { nome: "Difesa vs attacco vero (15 min)", desc: "Attaccante vs difensore solo + libero. 10 palloni a serie, poi si scambiano. Si contano le difese positive (palla alzata in zona utile). Il piu realistico.", serie: "3 serie da 10" },
            { nome: "Difesa + ricostruzione (12 min)", desc: "Dopo ogni difesa, il giocatore deve alzarsi rapidamente e rientrare in posizione per la palla successiva. Il coach non aspetta. Replica la stanchezza reale del terzo set.", serie: "15 palloni" },
          ],
        },
      ],
    },
  };

  const sez = contenuti[sezione];

  return (
    <main>
      <section className="section">
        <h2 className="feed-heading">Schede Allenamento</h2>
        <p className="state" style={{ marginBottom: "1.25rem", fontSize: "0.82rem" }}>
          Schede tecniche e fisiche. Scegli la sezione e la sottosezione.
        </p>

        {/* Tendina principale */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <select className="all2-select" style={{ flex: 1, minWidth: "200px" }}
            value={sezione}
            onChange={(e) => { setSezione(e.target.value); setSotto(0); }}>
            {sezioni.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="all2-select" style={{ flex: 1, minWidth: "200px" }}
            value={sotto}
            onChange={(e) => setSotto(parseInt(e.target.value))}>
            {sez.sottosezioni.map((s, i) => <option key={i} value={i}>{s}</option>)}
          </select>
        </div>

        {/* Contenuto */}
        {sez.schede[sotto] && (
          <div className="fond-rivista" style={{ userSelect: "none" }}>
            <div className="fond-rivista__header">
              <div className="fond-rivista__numero">{String(sotto + 1).padStart(2, "0")}</div>
              <div>
                <p className="fond-rivista__tagline">{sezione}</p>
                <h2 className="fond-rivista__titolo">{sez.schede[sotto].titolo}</h2>
              </div>
            </div>

            <p className="fond-rivista__intro">{sez.schede[sotto].descrizione}</p>

            <div className="fond-rivista__tipi" style={{ marginBottom: "1rem" }}>
              {sez.schede[sotto].esercizi.map((e, i) => (
                <div key={i} className="fond-rivista__tipo">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                    <div className="fond-rivista__tipo-nome">{e.nome}</div>
                    <span style={{ fontSize: "0.7rem", color: "var(--gold)", flexShrink: 0, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}>{e.serie}</span>
                  </div>
                  <div className="fond-rivista__tipo-desc">{e.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function FondamentaliPage() {
  const fondamentali = [
    {
      id: "battuta", nome: "Battuta", tagline: "Il colpo che dà inizio a tutto",
      descrizione: "La battuta è il fondamentale più sottovalutato dai principianti e più studiato dagli esperti. È l'unico momento della partita in cui un giocatore ha il controllo assoluto della palla: nessuna pressione avversaria diretta, nessun imprevisto. Una battuta ben eseguita non serve solo a mettere la palla in gioco — serve a creare difficoltà al ricevitore, a spostare il libero, a forzare una ricezione scomoda che limita le opzioni d'attacco avversario. I migliori servitori del mondo costruiscono punti diretti o creano le condizioni per il punto successivo. La battuta si esegue da dietro la linea di fondocampo e deve superare la rete finendo nel campo avversario senza toccare le antenne. Il giocatore ha 8 secondi dal fischio dell'arbitro per eseguirla.",
      tipi: [
        { nome: "Battuta dal basso", desc: "La tecnica base per i principianti. La palla viene tenuta davanti al corpo all'altezza della vita, si oscilla il braccio e si colpisce con il palmo della mano aperta spingendola verso l'alto e in avanti. È la battuta più sicura ma anche la più facile da ricevere: la traiettoria è prevedibile e la velocità è limitata. Si usa principalmente nelle categorie giovanili e nei momenti in cui si ha bisogno di non sbagliare." },
        { nome: "Battuta float (flottante)", desc: "La battuta più usata nel volley moderno a ogni livello. Si colpisce la palla dall'alto con il palmo della mano aperta e rigida, senza imprimere rotazione al pallone. Il risultato è una traiettoria fluttuante e imprevedibile — come una foglia che cade. Il vento delle palestre o le imperfezioni della superficie di contatto creano movimenti laterali e verticali impossibili da prevedere per il ricevitore. Tecnica: lancia la palla leggermente davanti e in alto, impugna rigidamente il polso, colpisci al centro del pallone con una mano ferma. Il follow-through (continuazione del movimento) va bloccato subito dopo il contatto." },
        { nome: "Jump Serve (battuta in salto con topspin)", desc: "La battuta più potente e difficile. Si esegue con una rincorsa di 2-3 passi come per una schiacciata, si lancia la palla in alto davanti a sé, si salta e si colpisce con il polso chiuso verso il basso imprimendo un forte topspin. La palla viaggia ad alta velocità seguendo una traiettoria curva verso il basso — è difficilissima da ricevere perché arriva con forza e affossa. Il rischio di errore è alto, ma la pressione che crea è enorme. Usata dai migliori battitori del mondo in situazioni decisive." },
        { nome: "Jump Float (battuta float in salto)", desc: "La versione moderna ed evoluta della float. Combina il vantaggio dell'altezza di contatto (si salta) con la traiettoria imprevedibile della float (senza topspin). Si esegue con una rincorsa breve (1-2 passi), si lancia la palla in avanti, si salta e si colpisce con la mano aperta e rigida senza imprimere rotazione. Risultato: una palla veloce, alta e imprevedibile. Oggi è la battuta più usata nel volley d'alto livello, sia maschile che femminile." },
      ],
      esercizi: [
        { titolo: "Automatizzare il lancio", desc: "Il 90% degli errori di battuta nasce da un lancio irregolare. Esercizio: lancia la palla in aria 20 volte di fila senza colpirla, cercando che cada sempre nello stesso punto davanti a te. Quando il lancio è costante, aggiungi il colpo. Ripeti 3 serie da 15 battute consecutive concentrandoti solo sul lancio, non sulla direzione." },
        { titolo: "Battuta a zona", desc: "Dividi il campo avversario in 6 zone (come i numeri delle posizioni). Il coach o un compagno chiama il numero della zona bersaglio prima che tu batta. L'obiettivo è colpire la zona indicata 3 volte su 5. Progressione: inizia con zone grandi (1, 5, 6), poi passa alle zone intermedie (2, 3, 4). Questo esercizio sviluppa la capacità di dosare forza e direzione." },
        { titolo: "Serie di pressione", desc: "Simula la pressione di gara: devi battere 10 volte di fila senza sbagliare. Se sbagli, ricominci da zero. Aumenta la difficoltà aggiungendo un obiettivo: le ultime 3 devono essere nella stessa zona. Questo esercizio sviluppa la resistenza mentale e la concentrazione sotto pressione." },
        { titolo: "Battuta vs ricezione (3 vs 1)", desc: "Tre battitori a turno battono verso un solo ricevitore. Il ricevitore deve riuscire a fare ricezione perfetta (alta, vicina all'alzatore). Ogni battuta in zona vince un punto per il battitore, ogni ricezione perfetta vale un punto per il ricevitore. Si gioca a 5 punti. Questo esercizio è realistico perché crea vera pressione competitiva." },
      ],
      consigli: "La battuta non è un gesto atletico — è un gesto tecnico. Puoi essere il giocatore meno fisico della squadra e battere meglio di tutti se sei costante e intelligente. Scegli sempre la battuta che sai fare meglio, non quella più spettacolare.",
    },
    {
      id: "ricezione", nome: "Ricezione", tagline: "La fondamenta di ogni attacco",
      descrizione: "Si dice che nel volley moderno chi riceve bene vince, e non è un'esagerazione. La ricezione è il primo contatto dopo la battuta avversaria e determina tutto ciò che viene dopo: se la ricezione è precisa, l'alzatore può costruire qualsiasi attacco; se è imprecisa, le opzioni si riducono drasticamente; se la palla cade, è punto avversario diretto. La ricezione è un fondamentale che si lavora per anni: non basta la tecnica, serve anche la lettura della battuta avversaria, la capacità di anticipare la traiettoria ancora prima che la palla attraversi la rete, e la comunicazione con i compagni per evitare i conflitti (due giocatori che cercano di ricevere la stessa palla). Il ricevitore ideale deve essere capace di ricevere da qualsiasi posizione e inviare la palla in un'area precisa che permette all'alzatore di lavorare al meglio.",
      tipi: [
        { nome: "Bagher in piattaforma (ricezione bassa)", desc: "La tecnica fondamentale per la ricezione. Le braccia vengono tese e unite davanti al corpo, formando una superficie piatta (la 'piattaforma') con i polsi. Il contatto con la palla avviene sugli avambracci, il più lontano possibile dalle mani. Non si colpisce la palla — si offre una superficie su cui la palla rimbalza verso l'alzatore. Le braccia si muovono il meno possibile: è il corpo che ruota verso la direzione dove si vuole mandare la palla. Errore comune: 'rubare' la palla muovendo le braccia verso l'alto invece di lasciare che sia la palla a rimbalzare." },
        { nome: "Ricezione alta (con le dita)", desc: "Usata quando la battuta arriva alta e morbida. La tecnica è simile all'alzata: le mani si avvicinano sopra la testa, le dita toccano la palla da tutti i lati e la respingono verso l'alzatore. È vietato tenere la palla (doppio tocco), quindi il contatto deve essere morbido e fluido. Questa tecnica offre più precisione ma richiede timing perfetto e buona sensibilità delle dita." },
        { nome: "Ricezione in tuffo", desc: "Per palle basse o rasoterra che il giocatore non riesce a raggiungere in posizione eretta. Il giocatore si lancia in avanti o di lato, estende le braccia verso il suolo e colpisce la palla prima di cadere. Il corpo rimbalza a terra (con protezioni adeguate) dopo il contatto. Tecnica avanzata che richiede coraggio fisico e buona tecnica di caduta per evitare infortuni." },
        { nome: "Ricezione laterale e in movimento", desc: "La ricezione reale raramente avviene da fermi. Il giocatore deve spostarsi rapidamente verso la palla, mantenendo una posizione bilanciata anche in movimento. I piedi si muovono per primo (non le braccia), poi il corpo si posiziona dietro la palla e infine le braccia si aprono per ricevere. Un errore comune è muovere prima le braccia e poi i piedi — questo crea posizioni scomode e ricezioni imprecise." },
      ],
      esercizi: [
        { titolo: "Ricezione al muro", desc: "Posizionati a circa 4 metri dal muro. Batti la palla contro il muro con forza controllata e ricevi il rimbalzo verso un punto preciso (un segno sul muro o un'area segnata sul pavimento). L'obiettivo è mandare la palla sempre nello stesso punto, come se fosse l'alzatore. Inizia lentamente, aumenta progressivamente la velocità. 3 serie da 15 ripetizioni." },
        { titolo: "Ricezione a 6 stazioni", desc: "6 battitori si dispongono lungo la linea di fondocampo in posizioni diverse (angoli, centro). Il ricevitore lavora in campo: ogni battitore lancia una palla da posizione diversa, il ricevitore deve riceverle tutte verso lo stesso punto (zona 3, davanti alla rete). Si fanno 3 giri completi. Sviluppa la capacità di adattarsi a traiettorie diverse mantenendo la costanza dell'arrivo." },
        { titolo: "Ricezione competitiva (21 punti)", desc: "A coppie: un batte, uno riceve. Se la ricezione è perfetta (entro un metro dall'alzatore immaginario in zona 2-3) il ricevitore guadagna un punto. Se sbaglia o la palla non arriva nella zona, punto al battitore. Si gioca a 21 punti. Cambia ogni game. Crea pressione reale e sviluppa concentrazione nelle situazioni difficili." },
        { titolo: "Ricezione in serie con chiamata", desc: "Il coach lancia palle da diverse posizioni. Prima di ogni lancio chiama il nome del ricevitore che deve intervenire. Gli altri giocatori devono fare un passo verso la palla per poi fermarsi. Sviluppa la comunicazione, la prontezza di reazione e la lettura del campo. Variante: senza chiamata, i giocatori devono comunicare autonomamente chi riceve." },
      ],
      consigli: "La ricezione si fa con i piedi, non con le braccia. I piedi si muovono per posizionarsi dietro la palla, le braccia offrono solo la superficie di rimbalzo. Un ricevitore che non si muove e allunga le braccia sbaglia quasi sempre.",
    },
    {
      id: "alzata", nome: "Alzata", tagline: "Il cervello del gioco",
      descrizione: "L'alzatore è il regista della squadra. Il suo compito è trasformare ogni ricezione — perfetta o imperfetta — in un'opportunità d'attacco efficace. Non è solo una questione tecnica: l'alzatore deve leggere la difesa avversaria, conoscere lo stato fisico e psicologico di ogni attaccante della propria squadra, scegliere il momento giusto, la direzione giusta e il tipo di palla giusta — tutto in meno di un secondo. Un grande alzatore semplifica il lavoro degli attaccanti e complica la vita al muro avversario. La tecnica dell'alzata richiede anni di lavoro: le mani devono essere morbide ma precise, il contatto rapido ma controllato. L'alzata con le dita (sovraman) è la tecnica standard; il bagher (sottomano) si usa in emergenza. Il punto di contatto ideale è sopra la testa, leggermente davanti al viso, con i gomiti a 90 gradi.",
      tipi: [
        { nome: "Alzata in avanti (alta e lenta)", desc: "La più comune, usata per gli attaccanti di posto 4 o posto 2. La palla viene spinta in avanti e in alto, descrivendo una parabola morbida che permette all'attaccante di avere il massimo del tempo per la rincorsa. È la più facile da eseguire ma anche la più prevedibile per il muro avversario, che ha tempo di spostarsi e prepararsi." },
        { nome: "Alzata all'indietro (back set)", desc: "Tecnica di inganno fondamentale nel volley moderno. L'alzatore si posiziona con le spalle verso l'attaccante e alza la palla all'indietro verso il lato opposto a quello in cui sembrava voler giocare. Il muro avversario deve cambiare direzione all'ultimo momento, spesso in ritardo. Richiede ottima tecnica di polsi e capacità di mascherare l'intenzione fino all'ultimo istante." },
        { nome: "Alzata veloce (fast / primo tempo)", desc: "Alzata bassa e tesa verso il centro, destinata al centrale che si trova già in rincorsa. La palla arriva quasi contemporaneamente all'alzatore e all'attaccante — il muro non ha tempo di spostarsi. È la più difficile da alzare (richiede timing perfetto) ma crea la massima difficoltà alla difesa avversaria. Nel volley d'alto livello il fast è la pietra angolare dell'attacco." },
        { nome: "Alzata di secondo tempo (attacco dell'alzatore)", desc: "Quando la palla arriva vicino alla rete e in buona posizione, l'alzatore può scegliere di attaccare direttamente invece di alzare. È una scelta tattica imprevedibile che spiazza la difesa. L'alzatore colpisce la palla con il palmo verso il basso, scegliendo la zona della difesa avversaria più scoperta. Si usa raramente ma con grande efficacia nei momenti decisivi." },
        { nome: "Alzata di emergenza con bagher", desc: "Quando la palla arriva troppo in basso, troppo veloce o in posizione impossibile per usare le dita, l'alzatore ricorre al bagher. La precisione è inferiore ma permette di mantenere la palla in gioco e offrire comunque un'opzione d'attacco. Nel volley moderno anche il bagher di alzata può essere preciso se l'alzatore lo lavora specificatamente in allenamento." },
      ],
      esercizi: [
        { titolo: "Alzata contro il muro (serie lunga)", desc: "Posizionati a 50 cm dal muro. Alza la palla contro il muro continuamente, senza farla cadere, cercando di mantenere sempre lo stesso punto di contatto e la stessa traiettoria. Obiettivo: 50 alzate consecutive senza interruzione. Progressione: aumenta la distanza dal muro (1m, 2m), alzata con una mano sola, alzata all'indietro contro il muro. Sviluppa la sensibilità delle mani e la consistenza del gesto." },
        { titolo: "Alzata in serie con attaccante", desc: "Un compagno riceve palle lanciate dal coach e passa all'alzatore in posizione. L'alzatore alza verso 3 posizioni diverse in sequenza (4-3-2-4-3-2), alternando altezza e velocità. L'attaccante osserva senza attaccare e segnala se la palla era nella posizione ideale per lui. Poi si scambiano i ruoli. Sviluppa la comunicazione alzatore-attaccante e la precisione direzionale." },
        { titolo: "Gioco dei numeri ad alta pressione", desc: "Il coach si posiziona davanti all'alzatore con le mani alzate: mostra 1, 2 o 3 dita un istante prima che l'alzatore tocchi la palla. L'alzatore deve alzare verso il posto corrispondente (1 = posto 4, 2 = fast centrale, 3 = posto 2). Il giocatore non sa in anticipo la scelta — deve decidere in meno di mezzo secondo. Sviluppa la capacità di prendere decisioni rapide sotto pressione." },
        { titolo: "Alzata dal bagher (emergenza)", desc: "Il coach lancia palle intenzionalmente basse, veloci o lontane dalla posizione ideale. L'alzatore deve riuscire a servire comunque un'alzata utilizzabile all'attaccante. Si valuta non la perfezione tecnica ma la capacità di trovare soluzioni creative in condizioni difficili. Alterna con alzate in condizioni normali per mantenere il contrasto." },
      ],
      consigli: "Il segreto dell'alzata non è nelle mani — è nei piedi. Un alzatore che arriva in equilibrio sotto la palla con i piedi nella posizione giusta può alzare bene anche con una tecnica mediocre. Lavora sempre prima sul posizionamento, poi sulla tecnica.",
    },
    {
      id: "attacco", nome: "Attacco", tagline: "Potenza, precisione e intelligenza",
      descrizione: "La schiacciata è il gesto più spettacolare del volley e quello che i principianti vogliono imparare per primo — e spesso per questo viene trascurato nello sviluppo tecnico. Un attaccante completo non è chi colpisce più forte, ma chi sa variare: potenza e controllo, diagonale e parallelo, schiacciata e pallonetto. Il muro avversario si adatta a chi attacca sempre nello stesso modo. L'attacco si compone di tre fasi fondamentali: la rincorsa (che determina la posizione di salto), il salto (che deve essere verticale ed esplosivo), e il colpo (che deve avvenire al massimo dell'estensione). La rincorsa standard è a 3 passi: per i destri destra-sinistra-destra (o DXS), gli ultimi due passi sono veloci e servono per trasformare la velocità orizzontale in salto verticale. L'attaccante deve leggere l'alzata, il muro avversario e lo spazio libero in difesa — tutto mentre è in volo.",
      tipi: [
        { nome: "Schiacciata in diagonale", desc: "Il colpo più usato nel volley a qualsiasi livello. L'attaccante colpisce la palla con il braccio aperto verso l'angolo opposto del campo rispetto alla propria posizione (da posto 4, diagonale verso zona 1 avversaria). La traiettoria è lunga, la palla attraversa tutto il campo e cade nell'angolo — difficile da difendere. Il difensore più scomodo da battere è il libero, che di solito copre questa zona. È il colpo di riferimento da imparare prima." },
        { nome: "Schiacciata in parallelo (lungo linea)", desc: "La palla viene colpita lungo la linea laterale del campo, restando nel corridoio tra la propria posizione e la riga. È più corto da percorrere rispetto alla diagonale, quindi richiede più potenza per farla cadere prima che il difensore intervenga. Il vantaggio è che è difficile da murare perché il muro avversario tende a coprire la diagonale. Il rischio è il muro singolo del giocatore di posto 4 avversario." },
        { nome: "Pallonetto (tip)", desc: "Il colpo a sorpresa per eccellenza. Invece di colpire forte, l'attaccante tocca la palla delicatamente con le dita appena sopra il muro, facendola cadere nel campo avversario vicino alla rete (zona 2, 3 o 4). Si usa quando il muro è vicino e alto, quando il difensore copre gli angoli, o dopo aver condizionato la difesa con molte schiacciate potenti. Richiede coordinazione e un ottimo senso del ritmo — se eseguito troppo presto, il muro lo intercetta." },
        { nome: "Wipe-out (murare fuori)", desc: "Tecnica avanzata che sfrutta il muro avversario come alleato. L'attaccante punta deliberatamente il braccio esterno del muratore per far rimbalzare la palla fuori dal campo avversario — punto. Si usa quando il muro è chiuso e non ci sono zone libere. Richiede ottima lettura della posizione delle mani del muro e la capacità di indirizzare la palla con precisione laterale." },
        { nome: "Pipe (attacco da zona 6)", desc: "Attacco di secondo tempo dalla zona 6 (centro-fondo campo). Il giocatore di seconda linea (spesso il centrale o un laterale) entra in rincorsa dal fondo del campo e attacca su una alzata bassa e veloce verso il centro. Il muro avversario non si aspetta l'attacco dal centro e di solito è posizionato sui lati — il pipe sfrutta questo spazio. Richiede timing perfetto tra l'alzatore e l'attaccante." },
        { nome: "Fast / Primo tempo", desc: "L'attacco più rapido possibile: il centrale inizia la rincorsa prima ancora che l'alzatore tocchi la palla, e colpisce la palla quasi contemporaneamente all'alzata. Il muro avversario non ha tempo di leggere la direzione e posizionarsi. Esistono diverse varianti di primo tempo: la Fast alta, la Fast bassa, la Fast tesa. Tutte richiedono sincronizzazione perfetta e grande fiducia tra alzatore e centrale." },
      ],
      esercizi: [
        { titolo: "Rincorsa tecnica senza palla", desc: "Esegui 30 rincorse complete senza palla concentrandoti esclusivamente sul ritmo dei passi e il salto. Per i destri: passo destro (lungo, di apertura), passo sinistro (veloce, di chiusura), passo destro (brevissimo, di propulsione). I piedi si chiudono trasversalmente rispetto alla rete, non paralleli. Il salto deve essere verticale — non in avanti. Registra l'altezza di tocco sul muro per monitorare i progressi." },
        { titolo: "Attacco su alzata fissa con target", desc: "Un compagno alza sempre nello stesso punto (stabilità). Il coach posiziona 3 coni in zone diverse del campo avversario. Prima di ogni attacco, indica il cono da colpire. Il giocatore attacca verso il cono nel più breve tempo possibile. Si tengono le statistiche: quante volte ha colpito la zona corretta su 10 tentativi. Progressione: aggiungi un muratore passivo, poi un muratore attivo." },
        { titolo: "Attacco variato (4 colpi in sequenza)", desc: "L'alzatore dà 4 palle consecutive: la prima è alta per la diagonale, la seconda per il parallelo, la terza per il pallonetto, la quarta a sorpresa (scelta libera dell'attaccante). Il giocatore deve eseguire il colpo richiesto senza sbagliare. Sviluppa la versatilità e la capacità di cambiare tipo di colpo mantenendo la stessa preparazione esteriore (per non essere prevedibile)." },
        { titolo: "6 attacchi vs difesa completa", desc: "Situazione di gioco reale: l'attaccante riceve 6 alzate consecutive contro una difesa completa (libero + 2 difensori posizionati). Ogni punto conquistato vale 1, ogni difesa dell'avversario vale 1 per la difesa. Si gioca a 6 punti alternando. Questo esercizio sviluppa la lettura della difesa, la capacità di scegliere il colpo giusto in tempo reale e la resistenza mentale." },
      ],
      consigli: "Non cercare di colpire forte prima di colpire preciso. Un attaccante prevedibile ma impreciso è facile da difendere. Un attaccante variato e preciso è impossibile da difendere anche se non è potentissimo. Prima impara a mettere la palla dove vuoi, poi aggiungi la potenza.",
    },
    {
      id: "muro", nome: "Muro", tagline: "La prima linea di difesa",
      descrizione: "Il muro è il fondamentale più complesso da insegnare e da apprendere perché richiede la combinazione di tre elementi difficili da sviluppare insieme: tecnica delle mani, lettura dell'attaccante e timing del salto. Un muro ben eseguito può essere il fondamentale più spettacolare del volley — blocca un attacco potente e restituisce il punto. Ma un muro mal eseguito è peggio di non saltare: si va fuori tempo, si lascia scoperta la difesa, si ottiene un punto avversario. Il muro non serve solo a fare punto diretto: spesso la funzione principale è quella di canalizzare l'attacco avversario in una zona specifica del campo dove la propria difesa è posizionata. Per questo il coordinamento tra il muro e la difesa è fondamentale — non si può lavorare il muro senza studiare anche i sistemi difensivi. I principi fondamentali del muro sono: posizionarsi sulla linea d'attacco avversaria, saltare leggermente dopo l'attaccante (non insieme), penetrare con le mani oltre la rete, guardare le mani dell'attaccante non la palla.",
      tipi: [
        { nome: "Muro individuale (singolo)", desc: "Un solo giocatore salta per murare l'attacco avversario. Si usa quando il tempo non permette di formare il muro a due, quando l'attacco è velocissimo (fast), o come scelta tattica deliberata per lasciare la difesa libera di coprire l'intero campo. Il muratore singolo deve scegliere una zona da coprire (diagonale o parallelo) invece di cercare di coprire tutto. L'errore più comune è cercare di coprire entrambe le direzioni e non coprirne nessuna." },
        { nome: "Muro a due", desc: "Il muro standard del gioco organizzato. Due giocatori (solitamente un laterale e il centrale) saltano insieme per formare un blocco compatto. Il giocatore esterno si posiziona sulla linea del pallone, quello interno si avvicina fino a toccarsi con il compagno senza lasciare spazi tra le mani. La coordinazione è fondamentale: devono saltare insieme, altrimenti si lascia un varco. Il capitano del muro è il giocatore esterno, che determina dove il muro si posiziona." },
        { nome: "Muro a tre", desc: "Tutti e tre i giocatori di rete saltano insieme, coprendo tutta la larghezza della rete. Si usa contro gli attaccanti più forti o nei momenti decisivi della partita quando si vuole garantire la massima copertura. Il rischio è che la difesa rimane scoperta — se il muro non tocca la palla, i difensori devono coprire un campo intero. Si usa soprattutto nel finale di set in situazioni di vantaggio dell'avversario." },
        { nome: "Muro di chiusura (centrale che chiude)", desc: "Il centrale non mura sulla propria posizione ma si sposta rapidamente verso il laterale per formare il muro a due. È la situazione standard in cui l'alzatore manda la palla verso posto 4 o posto 2: il centrale deve leggere la direzione dell'alzata, spostarsi nella direzione giusta e arrivare in tempo per saltare con il compagno. Richiede ottima lettura del gioco e velocità di spostamento." },
        { nome: "Muro di controllo (deviazione)", desc: "Invece di bloccare la palla nel campo avversario, il muratore devia deliberatamente la palla verso il centro del proprio campo dove sono posizionati i difensori. Si usa quando il muro chiuso è impossibile (l'attaccante è troppo potente o ha già scelto bene l'angolo), ma si vuole comunque rallentare la palla e darla alla propria difesa. Richiede tecnica delle mani molto sviluppata — le mani vanno orientate verso l'interno invece che in avanti." },
      ],
      esercizi: [
        { titolo: "Salti ritmici a rete (esplosività)", desc: "Posizionati a circa 30 cm dalla rete. Esegui 10 salti consecutivi toccando la rete con entrambe le mani aperte al momento del massimo dell'altezza. Concentrati su: massima altezza di tocco, braccia completamente estese, mani aperte e rigide oltre la rete, atterraggio morbido sui metatarsi. Tra una serie e l'altra, cammina lungo la rete spostandoti di 2 passi. 3 serie da 10. Cronometra il tempo di contatto a terra (deve essere minimo — rimbalzo esplosivo)." },
        { titolo: "Lettura dell'attaccante (esercizio visivo)", desc: "Un compagno simula la rincorsa e il salto senza palla, variando la posizione delle spalle all'ultimo momento (aperte per la diagonale, chiuse per il parallelo, braccio alto per il pallonetto). Il muratore deve anticipare la direzione dell'attacco alzando le mani verso il lato corretto prima ancora che il compagno 'colpisca'. Si lavora in modo lento inizialmente, poi si aumenta la velocità. Sviluppa la lettura delle intenzioni dell'attaccante dal suo body language." },
        { titolo: "Muro vs attacco progressivo", desc: "Si lavora in tre fasi: (1) attaccante mostra dove colpirà (nessun inganno), il muratore si posiziona e mura; (2) attaccante può scegliere tra due zone, il muratore legge e reagisce; (3) attaccante libero di fare qualsiasi colpo, il muratore usa tutte le letture imparate. Ogni fase dura 5-8 palloni. Si contano i punti del muro vs i punti dell'attacco per creare competizione." },
        { titolo: "Muro + difesa coordinata", desc: "Il muratore e 2 difensori lavorano insieme contro un attacco. Il muratore comunica (con un cenno della mano o a voce) se copre la diagonale o il parallelo — la difesa si posiziona di conseguenza sull'altra zona. L'attaccante attacca liberamente. Si tiene il punteggio: ogni punto del muro/difesa vale 2 (per incentivare il lavoro di squadra), ogni attacco che cade vale 1. Si gioca a 10 punti." },
      ],
      consigli: "Il muro inizia molto prima del salto. Inizia dalla lettura dell'alzatore (capire dove manderà la palla), poi dalla lettura dell'attaccante (come si sta preparando). Chi salta sempre al momento giusto non è più reattivo degli altri — ha imparato a leggere il gioco in anticipo.",
    },
    {
      id: "difesa", nome: "Difesa", tagline: "Cuore, tecnica e intelligenza del campo",
      descrizione: "La difesa è il fondamentale che distingue le squadre che vogliono vincere da quelle che vogliono sembrare belle. Ogni punto salvato dalla difesa vale esattamente come un punto vinto in attacco — ma psicologicamente può valere di più, perché demoralizza l'avversario e carica la propria squadra. Il difensore ideale combina tre qualità: posizione di attesa corretta (che permette reazioni rapide), lettura del gioco (capire in anticipo dove andrà la palla), e tecnica di recupero (eseguire il gesto giusto in ogni situazione). La posizione di attesa è la chiave di tutto: piedi più larghi delle spalle, ginocchia flesse al 90 gradi, peso distribuito sui metatarsi (non sui talloni), busto leggermente inclinato in avanti, braccia rilassate davanti al corpo. Da questa posizione, il difensore può spostarsi in qualsiasi direzione in meno di mezzo secondo. Un difensore che aspetta in piedi con le gambe dritte avrà sempre un secondo di ritardo — e in difesa un secondo è un'eternità.",
      tipi: [
        { nome: "Bagher in piedi (difesa alta)", desc: "La tecnica base per palle che arrivano all'altezza della vita o più alte. Le braccia si uniscono davanti al corpo formando la piattaforma, il bagher indirizza la palla verso il centro del campo dove l'alzatore può lavorare. Non si colpisce la palla — si offre una superficie orientata verso l'alzatore. Il corpo ruota verso la destinazione della palla, non verso di essa. Errore comune: guardare la palla invece di guardare dove si vuole mandarla." },
        { nome: "Difesa bassa (tuffo frontale)", desc: "Per palle che finiscono vicino al suolo davanti al difensore. Il giocatore si abbassa rapidamente, allunga le braccia verso la palla e la tocca prima che tocchi terra. La caduta avviene con il corpo che scivola in avanti controllato — non si cade sulle ginocchia o sulla pancia. Il momento critico è il contatto: deve avvenire prima che il corpo tocchi terra. Tecnica avanzata che richiede coraggio fisico e allenamento specifico per le cadute." },
        { nome: "Rolling laterale (difesa di lato)", desc: "Per palle che arrivano di lato e troppo in basso per il bagher in piedi. Il giocatore si sposta lateralmente, tocca la palla con il bagher e poi cade su un fianco eseguendo un rotolamento (roll). Il rotolamento ammortizza la caduta e — fondamentale — permette di rialzarsi immediatamente per continuare a giocare. Un difensore che rimane a terra dopo la difesa è inutile per la continuazione del gioco. Il rolling si allena separatamente prima di unirlo alla difesa." },
        { nome: "Pancata / Difesa di emergenza", desc: "L'ultima spiaggia: la palla è a pochi centimetri dal suolo e non c'è tempo per nessun'altra tecnica. Il giocatore colpisce la palla con il dorso della mano (o anche con un pugno) appena prima che tocchi terra. L'obiettivo non è fare una bella difesa ma tenere la palla in gioco comunque. Si usa raramente ma in partita può fare la differenza tra vincere e perdere un punto." },
      ],
      esercizi: [
        { titolo: "Posizione e resistenza", desc: "Mantieni la posizione di attesa corretta (ginocchia flesse, peso in avanti, braccia davanti) per 45 secondi consecutivi, poi 15 secondi di riposo. 5 serie. Progressione: aggiungi piccoli spostamenti laterali di 1 metro mentre mantieni la posizione. Questo esercizio sviluppa la resistenza muscolare specifica del difensore — le cosce e i glutei che mantengono la posizione bassa durante tutta la durata del set." },
        { titolo: "Reazione direzionale (difesa a cascata)", desc: "Il coach si posiziona a rete con una cesta di palloni. Lancia le palle in direzioni diverse, con ritmo variabile (a volte due veloci, a volte una lenta). Il difensore deve raggiungere ogni palla e mandarla verso una zona precisa (zona 3 o dove si trova un compagno che raccoglie). Non importa la perfezione — importa non far cadere nessuna palla. Si contano le palle salvate su 10 lanci. Sviluppa la reattività, la lettura del volo della palla e la gestione del recupero tra una difesa e l'altra." },
        { titolo: "Difesa vs attacco vero", desc: "Situazione di gioco reale: un attaccante riceve alzate e attacca liberamente contro un difensore solo più il libero. Si contano le difese positive (palla alzata in zona utile per il compagno) non le difese imperfette. Si gioca a 10 palloni e si scambiano i ruoli. Variante avanzata: aggiungere un muro che lavora coordinato con i difensori. Questo è l'esercizio più realistico e sviluppa tutte le qualità del difensore contemporaneamente." },
        { titolo: "Rolling progressivo", desc: "Si lavora separatamente sulla tecnica di caduta e rialzata. Prima senza palla: caduta laterale controllata su un fianco, rotolamento, rialzata in posizione di attesa (3 secondi al massimo). Poi con palla: un compagno lancia la palla di lato, il difensore la tocca e poi esegue il rolling. Infine in situazione di gioco: il difensore reagisce a un attacco reale e usa il rolling quando necessario. 20 ripetizioni per lato." },
      ],
      consigli: "I difensori migliori non sono quelli con i riflessi più veloci — sono quelli che si muovono prima che la palla parta. La lettura del gioco (capire dove andrà la palla osservando l'attaccante, il muro, la difesa avversaria) vale più di qualsiasi tecnica. Allena la testa, non solo il corpo.",
    },
    {
      id: "preparazione", nome: "Preparazione Fisica", tagline: "Il motore di tutto il resto",
      descrizione: "La preparazione fisica nel volley è spesso sottovalutata rispetto ai fondamentali tecnici — un errore che si paga caro nelle fasi finali dei set e delle partite. Un giocatore tecnicamente eccellente ma fisicamente impreparato inizia a sbagliare dal terzo set in poi: le gambe non reggono più, i salti si abbassano, la concentrazione cala. La preparazione fisica per la pallavolo è specifica: non si tratta di diventare maratoneti o sollevatori di pesi, ma di sviluppare le qualità che il volley richiede realmente. Le principali sono: esplosività (per saltare in alto e spostarsi rapidamente), resistenza muscolare (per mantenere la posizione bassa durante tutto il match), reattività (per reagire in frazioni di secondo), coordinazione (per eseguire gesti tecnici complessi ad alta velocità) e flessibilità (per prevenire infortuni e migliorare l'ampiezza dei movimenti). Un programma di preparazione fisica completo lavora tutte queste qualità in modo equilibrato, con sessioni specifiche integrate nell'allenamento tecnico.",
      tipi: [
        { nome: "Esplosività e salto verticale", desc: "La capacità di saltare in alto è fondamentale per muratori e attaccanti. Si sviluppa con esercizi pliometrici: salti su cassetta, squat jump, balzi monopodalici. La progressione deve essere graduale — troppo volume di pliometria aumenta il rischio di infortuni a ginocchia e caviglie. Ideale: 2 sessioni settimanali di 20-25 minuti di pliometria, separate dagli allenamenti tecnici pesanti." },
        { nome: "Resistenza muscolare specifica", desc: "Il volley richiede di mantenere la posizione di attesa (ginocchia flesse, peso avanti) per periodi prolungati. I muscoli che lavorano di più sono quadricipiti, glutei e core. Esercizi specifici: wall sit (seduta a muro), squat isometrici, plank laterale. Non si tratta di forza massimale ma di resistenza — la capacità di mantenere la forza nel tempo." },
        { nome: "Reattività e velocità di spostamento", desc: "Nel volley si percorrono pochi metri per volta ma bisogna farlo velocissimamente e in qualsiasi direzione. La reattività si allena con esercizi di cambi di direzione: scala agilità, coni a T, esercizi di risposta a segnali visivi o acustici. È fondamentale includere anche spostamenti laterali (shuffle) e in avanti/indietro che replicano i movimenti reali di gioco." },
        { nome: "Core e stabilità", desc: "Il core (addome, lombari, fianchi) è il centro di trasmissione della forza in tutti i gesti del volley: dall'alzata alla schiacciata, dalla ricezione al muro. Un core debole significa perdita di potenza e aumento del rischio di infortuni alla schiena. Esercizi fondamentali: plank, hollow body, russian twist, bird dog. Si lavora il core in ogni sessione di allenamento, non solo in palestra." },
        { nome: "Flessibilità e mobilità", desc: "La flessibilità previene gli infortuni e migliora l'efficacia tecnica. Le zone più importanti per il volley: spalle (per attacco e battuta), anche e cosce (per la posizione bassa), caviglie (per la stabilità nei salti). Si distingue tra stretching statico (dopo l'allenamento, per migliorare la flessibilità nel tempo) e stretching dinamico (prima dell'allenamento, per preparare i muscoli all'attività)." },
        { nome: "Prevenzione degli infortuni", desc: "Gli infortuni più comuni nel volley sono: distorsioni alla caviglia (atterraggio su piede del compagno dopo un muro), tendiniti al ginocchio (jumper\'s knee), problemi alla spalla (per i battitori e attaccanti). La prevenzione passa per: riscaldamento adeguato prima di ogni allenamento, rafforzamento muscolare specifico (soprattutto manciotto rotatori per la spalla), tecnica corretta di atterraggio dopo il salto (mai atterrare con le ginocchia bloccate)." },
      ],
      esercizi: [
        { titolo: "Circuito esplosività (3 giri)", desc: "Esegui in sequenza senza riposo: 10 squat jump (salta il più in alto possibile a ogni ripetizione), 10 balzi laterali su una gamba per lato, 10 salti su cassetta (o gradino), 10 sprint di 5 metri (avanti e indietro). Riposo 90 secondi tra i giri. Progressione: aumenta l'altezza della cassetta, aggiungi un quarto giro, riduci il riposo a 60 secondi. Effettua questo circuito 2 volte a settimana, non consecutive." },
        { titolo: "Scala agilità per il volley", desc: "Usa una scala agilità (o disegna i riquadri per terra con nastro adesivo). Esegui: passi laterali (shuffle) avanti e indietro, corsa con ginocchia alte, passi incrociati (crossover), uscita laterale + rientro. 5 passaggi per ogni schema, 3 serie totali. Finalizza ogni serie con uno sprint di 3 metri e un salto simulando un muro o un attacco. Sviluppa coordinazione, velocità di piedi e reattività specifica per il gioco." },
        { titolo: "Programma core settimanale", desc: "Lunedì/Giovedì: Plank frontale 3x45 secondi, Plank laterale 3x30 secondi per lato, Hollow body 3x20 secondi. Martedì/Venerdì: Bird dog 3x12 per lato, Russian twist con pallone medicinale 3x20, Superman 3x15. Questo programma richiede 15-20 minuti ed è compatibile con qualsiasi allenamento tecnico. Dopo 4 settimane, aumenta i tempi del 20%." },
        { titolo: "Riscaldamento specifico pre-allenamento", desc: "Un riscaldamento adeguato riduce del 60% il rischio di infortuni. Protocollo: 5 minuti di jogging leggero, 2 minuti di skip e calcio al sedere, mobilità articolare delle caviglie (10 rotazioni per lato), mobilità delle anche (10 lunges con rotazione), rotazioni delle spalle (10 avanti + 10 indietro), stretching dinamico delle cosce (leg swing frontale e laterale). Poi 5 minuti di palleggio leggero prima di iniziare l'allenamento vero." },
      ],
      consigli: "La preparazione fisica non sostituisce l'allenamento tecnico — lo potenzia. Un giocatore che lavora 20 minuti di preparazione fisica specifica 3 volte a settimana vedrà miglioramenti tecnici che sembravano impossibili: salterà più in alto, si sposterà più velocemente, manterrà la concentrazione fino all'ultimo punto del quinto set.",
    },
  ];

  const [selected, setSelected] = useState("battuta");
  const fond = fondamentali.find((f) => f.id === selected);

  return (
    <main>
      <section className="section">
        <h2 className="feed-heading">Fondamentali del Volley</h2>

        <div className="all2-select-wrap" style={{ marginBottom: "2rem", maxWidth: "320px" }}>
          <select className="all2-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {fondamentali.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>

        {fond && (
          <div className="fond-rivista" style={{ userSelect: "none" }}>
            <div className="fond-rivista__header">
              <div className="fond-rivista__numero">{String(fondamentali.findIndex(f => f.id === selected) + 1).padStart(2, "0")}</div>
              <div>
                <p className="fond-rivista__tagline">{fond.tagline}</p>
                <h2 className="fond-rivista__titolo">{fond.nome}</h2>
              </div>
            </div>

            <p className="fond-rivista__intro">{fond.descrizione}</p>

            <div className="fond-rivista__columns">
              <div className="fond-rivista__col">
                <h3 className="fond-rivista__col-title">Varianti e tecniche</h3>
                <div className="fond-rivista__tipi">
                  {fond.tipi.map((t, i) => (
                    <div key={i} className="fond-rivista__tipo">
                      <div className="fond-rivista__tipo-nome">{t.nome}</div>
                      <div className="fond-rivista__tipo-desc">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fond-rivista__col">
                <h3 className="fond-rivista__col-title">Esercizi pratici</h3>
                <div className="fond-rivista__esercizi">
                  {fond.esercizi.map((e, i) => (
                    <div key={i} className="fond-rivista__esercizio">
                      <div className="fond-rivista__esercizio-header">
                        <span className="fond-rivista__esercizio-num">{i + 1}</span>
                        <span className="fond-rivista__esercizio-titolo">{e.titolo}</span>
                      </div>
                      <p className="fond-rivista__esercizio-desc">{e.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="fond-rivista__consiglio">
              <div className="fond-rivista__consiglio-label">CONSIGLIO DELL'ALLENATORE</div>
              <p className="fond-rivista__consiglio-testo">{fond.consigli}</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function AndamentoPage() {
  const matches = (risultatiData.matches || []).filter((m) => m.status === "disputata" && isAllowedCategory(m.competition));

  // Raggruppa per categoria (competition)
  const byCategory = {};
  matches.forEach((m) => {
    byCategory[m.competition] = byCategory[m.competition] || [];
    byCategory[m.competition].push(m);
  });

  const categories = Object.keys(byCategory).sort((a, b) => competitionScore(a) - competitionScore(b));

  const [selCat, setSelCat] = useState("");
  const [selSquadra, setSelSquadra] = useState("");

  // Squadre nella categoria selezionata
  const squadreSet = new Set();
  (byCategory[selCat] || []).forEach((m) => {
    squadreSet.add(m.home);
    squadreSet.add(m.away);
  });
  const squadre = Array.from(squadreSet).sort();

  // Reset squadra quando cambia categoria
  useEffect(() => { setSelSquadra(""); }, [selCat]);

  // Calcola andamento posizione in classifica della squadra selezionata
  // Ordina per giornata (es. "Giornata 1", "Giornata 2"...)
  function numGiornata(m) {
    const match = (m.giornata || "").match(/\d+/);
    return match ? parseInt(match[0], 10) : 999;
  }

  const tuttePartite = (byCategory[selCat] || [])
    .filter((m) => m.score && m.score.includes("-"))
    .sort((a, b) => numGiornata(a) - numGiornata(b));

  const partiteSquadra = tuttePartite.filter(
    (m) => m.home === selSquadra || m.away === selSquadra
  );

  // Calcola classifica dopo ogni giornata della squadra selezionata
  function calcStandings(matchesUpTo) {
    const sq = {};
    matchesUpTo.forEach((m) => {
      const parts = (m.score || "").split("-");
      if (parts.length !== 2) return;
      const sc = parseInt(parts[0], 10);
      const so = parseInt(parts[1], 10);
      if (isNaN(sc) || isNaN(so)) return;
      [m.home, m.away].forEach((s) => { if (!sq[s]) sq[s] = { pts: 0, v: 0 }; });
      if (sc > so) {
        sq[m.home].v++; sq[m.home].pts += so <= 1 ? 3 : 2;
        sq[m.away].pts += sc <= 1 ? 0 : 1;
      } else {
        sq[m.away].v++; sq[m.away].pts += sc <= 1 ? 3 : 2;
        sq[m.home].pts += so <= 1 ? 0 : 1;
      }
    });
    return Object.entries(sq)
      .sort((a, b) => b[1].pts - a[1].pts || b[1].v - a[1].v)
      .map(([nome], i) => ({ nome, pos: i + 1 }));
  }

  const puntiCumulativi = [];
  let totPunti = 0;

  partiteSquadra.forEach((m) => {
    const parts = (m.score || "").split("-");
    if (parts.length !== 2) return;
    const setCasa = parseInt(parts[0], 10);
    const setOspite = parseInt(parts[1], 10);
    if (isNaN(setCasa) || isNaN(setOspite)) return;

    const isCasa = m.home === selSquadra;
    const miei = isCasa ? setCasa : setOspite;
    const avv = isCasa ? setOspite : setCasa;

    let pts = 0;
    if (miei > avv) pts = avv <= 1 ? 3 : 2;
    else pts = miei >= 2 ? 1 : 0;
    totPunti += pts;

    // Partite di tutte le squadre fino a questa giornata inclusa
    const gior = numGiornata(m);
    const matchesFinoAd = tuttePartite.filter((x) => numGiornata(x) <= gior);
    const standings = calcStandings(matchesFinoAd);
    const posizione = (standings.find((s) => s.nome === selSquadra) || {}).pos || standings.length;
    const totSquadre = standings.length;

    puntiCumulativi.push({
      label: m.giornata || `G${puntiCumulativi.length + 1}`,
      avversario: isCasa ? m.away : m.home,
      risultato: `${miei}-${avv}`,
      dettaglioSet: m.setScores || "",
      pts,
      totale: totPunti,
      posizione,
      totSquadre,
      vinta: miei > avv,
    });
  });

  // Grafico SVG basato sulla posizione in classifica
  const W = 560, H = 200, PAD = 30;
  const maxPos = Math.max(...puntiCumulativi.map((p) => p.totSquadre), 1);
  const n = puntiCumulativi.length;

  function xPos(i) { return PAD + (i / Math.max(n - 1, 1)) * (W - PAD * 2); }
  // Y invertito: posizione 1 = in alto
  function yPos(pos) { return PAD + ((pos - 1) / Math.max(maxPos - 1, 1)) * (H - PAD * 2); }

  const polyline = puntiCumulativi.map((p, i) => `${xPos(i)},${yPos(p.posizione)}`).join(" ");
  const area = n > 0
    ? `${xPos(0)},${H - PAD} ` + puntiCumulativi.map((p, i) => `${xPos(i)},${yPos(p.posizione)}`).join(" ") + ` ${xPos(n - 1)},${H - PAD}`
    : "";

  return (
    <main>
      <CampionatiHero titolo="Andamento Stagione" />
      <section className="section">
        <p className="state" style={{ marginBottom: "1rem", fontSize: "0.82rem" }}>
          Seleziona categoria e squadra per vedere l'andamento punti nel corso della stagione.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <select className="all2-select" style={{ flex: 1, minWidth: "200px" }}
            value={selCat} onChange={(e) => setSelCat(e.target.value)}>
            <option value="">-- Categoria --</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select className="all2-select" style={{ flex: 1, minWidth: "200px" }}
            value={selSquadra} onChange={(e) => setSelSquadra(e.target.value)}
            disabled={!selCat}>
            <option value="">-- Squadra --</option>
            {squadre.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {selSquadra && puntiCumulativi.length === 0 && (
          <p className="state">Nessuna partita disponibile per questa squadra.</p>
        )}

        {puntiCumulativi.length > 0 && (
          <>
            {/* Grafico SVG */}
            <div className="andamento-chart-wrap">
              <svg viewBox={`0 0 ${W} ${H}`} className="andamento-chart">
                {/* Griglia orizzontale */}
                {[1, Math.ceil(maxPos / 2), maxPos].map((pos) => {
                  const y = yPos(pos);
                  return (
                    <g key={pos}>
                      <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#333" strokeWidth="0.5" />
                      <text x={PAD - 5} y={y + 4} fontSize="8" fill="#888" textAnchor="end">{pos}°</text>
                    </g>
                  );
                })}

                {/* Area */}
                {area && <polygon points={area} fill="rgba(212,175,55,0.12)" />}

                {/* Linea */}
                <polyline points={polyline} fill="none" stroke="#d4af37" strokeWidth="2" strokeLinejoin="round" />

                {/* Punti */}
                {puntiCumulativi.map((p, i) => (
                  <circle key={i} cx={xPos(i)} cy={yPos(p.posizione)}
                    r="4" fill={p.vinta ? "#d4af37" : "#555"} stroke="#0b0b0c" strokeWidth="1.5">
                    <title>{p.label} vs {p.avversario} ({p.risultato}) → {p.posizione}° su {p.totSquadre}</title>
                  </circle>
                ))}
              </svg>
            </div>

            {/* Elenco partite */}
            <table className="classifica-table" style={{ marginTop: "1.25rem" }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th className="classifica-table__nome">Avversario</th>
                  <th>Set</th>
                  <th>Dettaglio</th>
                  <th>+Pt</th>
                  <th>Tot. Pt</th>
                  <th>Pos.</th>
                </tr>
              </thead>
              <tbody>
                {puntiCumulativi.map((p, i) => (
                  <tr key={i}>
                    <td className="classifica-table__pos">{i + 1}</td>
                    <td className="classifica-table__nome">{p.avversario}</td>
                    <td style={{ color: p.vinta ? "#d4af37" : "var(--text-dim)", whiteSpace: "nowrap" }}>{p.risultato}</td>
                    <td style={{ fontSize: "0.75rem", color: "var(--text-dim)", whiteSpace: "nowrap" }}>{p.dettaglioSet}</td>
                    <td style={{ color: p.vinta ? "#d4af37" : "var(--text-dim)", whiteSpace: "nowrap" }}>+{p.pts}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{p.totale}</td>
                    <td className="classifica-table__pts" style={{ whiteSpace: "nowrap" }}>{p.posizione}° / {p.totSquadre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </main>
  );
}

function ClassificaPage() {
  const matches = (risultatiData.matches || []).filter((m) => m.status === "disputata" && isAllowedCategory(m.competition));

  const byMacro = {};
  matches.forEach((m) => {
    const macro = getMacroCategory(m.competition) || m.competition;
    byMacro[macro] = byMacro[macro] || {};
    byMacro[macro][m.competition] = byMacro[macro][m.competition] || [];
    byMacro[macro][m.competition].push(m);
  });

  const macroCategories = Object.keys(byMacro).sort(
    (a, b) => competitionScore(a) - competitionScore(b)
  );

  const [selMacro, setSelMacro] = useState("");
  const [selComp, setSelComp] = useState("");

  const compNames = selMacro ? Object.keys(byMacro[selMacro]) : [];

  useEffect(() => {
    setSelComp("");
    if (selMacro) {
      const comps = Object.keys(byMacro[selMacro]);
      if (comps.length === 1) setSelComp(comps[0]);
    }
  }, [selMacro]);

  function calcClassifica(partite) {
    const squadre = {};
    partite.forEach((m) => {
      const parts = (m.score || "").split("-");
      if (parts.length !== 2) return;
      const setCasa = parseInt(parts[0], 10);
      const setOspite = parseInt(parts[1], 10);
      if (isNaN(setCasa) || isNaN(setOspite)) return;
      [m.home, m.away].forEach((sq) => {
        if (!squadre[sq]) squadre[sq] = { nome: sq, g: 0, v: 0, p: 0, sv: 0, sp: 0, pts: 0 };
      });
      const home = squadre[m.home];
      const away = squadre[m.away];
      home.g++; away.g++;
      home.sv += setCasa; home.sp += setOspite;
      away.sv += setOspite; away.sp += setCasa;
      if (setCasa > setOspite) {
        home.v++; away.p++;
        if (setOspite <= 1) { home.pts += 3; away.pts += 0; }
        else { home.pts += 2; away.pts += 1; }
      } else {
        away.v++; home.p++;
        if (setCasa <= 1) { away.pts += 3; home.pts += 0; }
        else { away.pts += 2; home.pts += 1; }
      }
    });
    return Object.values(squadre).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.v !== a.v) return b.v - a.v;
      const ratioA = a.sp ? a.sv / a.sp : 0;
      const ratioB = b.sp ? b.sv / b.sp : 0;
      return ratioB - ratioA;
    });
  }

  // Gironi da mostrare
  const gironiDaMostrare = selMacro && selComp
    ? { [selComp]: byMacro[selMacro][selComp] }
    : selMacro && !selComp
    ? byMacro[selMacro]
    : {};

  const gironeNames = Object.keys(gironiDaMostrare);

  return (
    <main>
      <CampionatiHero titolo="Classifica" />
      <section className="section">
        <p className="state" style={{ marginBottom: "1rem", fontSize: "0.82rem" }}>
          Calcolata automaticamente dai risultati disponibili.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <select className="all2-select" style={{ flex: 1, minWidth: "160px" }}
            value={selMacro} onChange={(e) => setSelMacro(e.target.value)}>
            <option value="">-- Categoria --</option>
            {macroCategories.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <select className="all2-select" style={{ flex: 1, minWidth: "160px" }}
            value={selComp} onChange={(e) => setSelComp(e.target.value)}
            disabled={!selMacro || compNames.length <= 1}>
            <option value="">-- Tutti i gironi --</option>
            {compNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {selMacro && gironeNames.length === 0 && (
          <p className="state">Nessun risultato disponibile.</p>
        )}

        {gironeNames.map((girone) => {
          const classifica = calcClassifica(gironiDaMostrare[girone]);
          return (
            <div key={girone} style={{ marginBottom: "2rem" }}>
              {gironeNames.length > 1 && (
                <h3 className="competition-block__title">{girone}</h3>
              )}
              <table className="classifica-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="classifica-table__nome">Squadra</th>
                    <th title="Partite giocate">G</th>
                    <th title="Vittorie">V</th>
                    <th title="Sconfitte">P</th>
                    <th title="Set vinti">SV</th>
                    <th title="Set persi">SP</th>
                    <th title="Punti">Pt</th>
                  </tr>
                </thead>
                <tbody>
                  {classifica.map((sq, i) => (
                    <tr key={sq.nome} className={i === 0 ? "classifica-table__first" : ""}>
                      <td className="classifica-table__pos">{i + 1}</td>
                      <td className="classifica-table__nome">{sq.nome}</td>
                      <td>{sq.g}</td>
                      <td>{sq.v}</td>
                      <td>{sq.p}</td>
                      <td>{sq.sv}</td>
                      <td>{sq.sp}</td>
                      <td className="classifica-table__pts">{sq.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </section>
    </main>
  );
}

function CampiPage() {
  const campi = [
    { nome: "PalaTerni", citta: "Terni", lat: 42.560307, lng: 12.634431, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZNJ-DjGW-HFS7DlBb87jCeFLLsOFH9dswSUGLIbTDi-MfCxTgbPYHW2r70fa_R2zz2z5Zra8wCnjX4dvNMz0nVwnxYOmc5NeDaN20GylYhEzRN0O51W6rV20qnlTMsV5l3NK3QFTvNS1n2TrA=s200-w200-h150" },
    { nome: "Palazzetto Narni Scalo", citta: "Narni Scalo", lat: 42.537069, lng: 12.518616, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZM0GrM-FCir8_xCeFJQ0BNb6cax9DTIwIV3IxDHaDFbsrra87Oi0vCERYKOEciRDGf0OICe76f7OocGKn_I3PINMmEG8i6rG47G3l5UNbaLfnNW_blo8A86cQwC0QaVyk7lj9nkvjgGIzQw1lCGXzvWAQ=s200-w200-h150" },
    { nome: "Palazzetto Orvieto", citta: "Orvieto", lat: 42.72703, lng: 12.135012, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZNDwM_7T9RFegG-kUwc4gGkzoEqqW7WyNE9mSsKQCcu1TkKmOFH66dZYFzJRtWHV-pV139ipmgDDpV1NSgEmMIsXQCLGAhjH0iGk0P7FsDG9QzP3u3XKeMnEhbrpIHGmcnw2_PM0BKCtKwQ=s200-w200-h150" },
    { nome: "Palazzetto Trevi", citta: "Trevi", lat: 42.878906, lng: 12.753154, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZOt41DZeSbjgGDTeDe_i89IkoSnHC-43mLm-pKllHDdqN9qCfT0VOWd2x1kK1Q1lAzepVAlELDuu_WtZGyQxaqmJ9vt3thF1CCEy2neZ5HkhS84KYAktoQoJMypA6tRYkCrYw0pUfseSXAWlhs=s200-w200-h150" },
    { nome: "Palazzetto Marsciano", citta: "Marsciano", lat: 42.903978, lng: 12.337209, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZMTIXfaL9c6iedTBBahgFAv_4cSQz7mUmI84sKbHrEwmGE2ds3f65fkmbVFoT8DNa79wuipsL6K_G4K5QYxxqHdPdVRMbKd1Jxu-kelqgpdBhWWnYVyTdLrSMky3OA9dpROTWghqwqciGwYMg=s200-w200-h150" },
    { nome: "Palazzetto Città di Castello", citta: "Città di Castello", lat: 43.467502, lng: 12.249479, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZPbwK8z1ljpyrYcYqEW0PBkOXC9ssWxN-nj4hwpRRwHi72t3Aw4AWuSrSLfrUfK0ZwZ6iEscKIhdIJceaW8y5ho6j0kLSFpCq92VkAaHTXVsZTBzq-DUb7jINKQosiwGDfyK13n19P_u5JUXPNRMWOD=s200-w200-h150" },
    { nome: "Palarota - Spoleto", citta: "Spoleto", lat: 42.750896, lng: 12.733584, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZPPra324b8Pv-z6LR2tEfDdPBruSNm14lsgRERqaU49URQJwdeDlgic7APlEWL9yJa45FWzEPzBtJcdnIW3GOvSEwiaxcNNg3W32VeXPMVkSZl5-WGfaZ3saQbDOThC1omToRV3msktvmrRNr0=s200-w200-h150" },
    { nome: "Palazzetto Spello", citta: "Spello", lat: 42.984894, lng: 12.670096, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZOIm0ZCxJKx3SRPDPekqJCD1JT1Z-n6ndeNp-6PtbNYMtFrZUwkHyaTpSsNQ9516D0FlzM5DAtGEVi1NOWD_SNcsVvZWwJ_JrB26OykxpgkYPMey9PQMLsXJ4EHMObx4pomyFU-AlcpE5iNIA=s200-w200-h150" },
    { nome: "Pala Staccini - Umbertide", citta: "Umbertide", lat: 43.30172, lng: 12.343321, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZOaAWXODVVRPrXP72gZYZSXPwXJwAmrj5AjSrY-Vyr50uZLF9144zLIwul9Ah_WLkEUmNJ5Jmr2iHKIiNs6nbEFfGVTgUq-uc3rfYgcyXnQup0eH4N5O-3qENuPgcpQ-37eys0bcY-KqiTbgQ=s200-w200-h150" },
    { nome: "Palazzetto San Gemini", citta: "San Gemini", lat: 42.611422, lng: 12.548669, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZO5NasyHJaEHySZNAoh0slmTW7qrNaWNZgAXcyS05UvIbvd7Y85biigkKzrFlOIZcBeDVXRDxWM29sgVEcKLVFsyKFCiIIFX1lh_CTW5Yzo7J8SRJyMri3vSnVbTI8lOTkFrv4jo_65flo-yVc=s200-w200-h150" },
    { nome: "Palazzetto San Mariano", citta: "San Mariano", lat: 43.083763, lng: 12.306061, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZNkPsHYQNbmgKZo7saDsEK9kU_u00-RbhaXSJuwdcCndhKbnr3qdkJ9_EnS2fyS6A16v-4GH8XtdaNEHmASQ1cHV6zl6Qxof0USVFcNmzH4r7L2ENGXIpjco8xKkXEpuzatoCem2sW7Xy8r9gQy4LS4Ww=s200-w200-h150" },
    { nome: "Palazzetto Deruta", citta: "Deruta", lat: 42.97851, lng: 12.415747, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZOMWDaOIV_tSekbmrt7VriMucq44IU8rNce7Sy6vor1LmSoEy3Lrdm0FtQyCUPlaFHVJ0ssxdWBLqSKYA_ID4OvxktEX8o-Lu7FCmIw_f7-J3JYkqzHOFNVDnnK0fwiERI2phE3rp76n19bbg=s200-w200-h150" },
    { nome: "Palazzetto Chiusi", citta: "Chiusi", lat: 42.985252, lng: 11.947817, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZOUDQaStc2fjRZ5j8Q5ssrZ-OJ1VUqfVzWZGcN-mFDGnAuL9IM9ngC1tquwJTexIQc2XfFpjikaVhhoeZh26fYRXw0fk8RG_Sjk_93_RigaNz-804aS71lwzeQMUXfwYbYPNO5cWtgg_fnj4A=s200-w200-h150" },
    { nome: "Polisportiva Tavernelle", citta: "Tavernelle", lat: 43.001182, lng: 12.15236, foto: null },
    { nome: "PalaSIR - S. Maria degli Angeli", citta: "S. Maria degli Angeli", lat: 43.057608, lng: 12.572572, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZN6wG-5QDk5bDtr0_-4Kxf5O4wmlIQsZkIbX57Bfcq8CjElFY4LTH7g7FjEIGMCMd_wI9NSGh-QKXS7igCb0XeFwPPwr_lb8njVHn70GX1-OOLdUjwVnWTMVxglBnnoCNmSzUFVV2HCg2br=s200-w200-h150" },
    { nome: "Palazzetto Magione", citta: "Magione", lat: 43.134102, lng: 12.205094, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZO7e73STiZOsg_pshbipXRaIWUBZ12i18C9F026-PpWyscJ4Tyslp1f1vBWtTCPiz-wmwvRpBKjxfKylgDc-Kr1MWlMavoZf6y7KAgoHYKUK_bkpp8XcnR96I8vAiuDR3a38JBbPU_vmXQW4zw=s200-w200-h150" },
    { nome: "Palazzetto Corciano", citta: "Corciano", lat: 43.129739, lng: 12.284854, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZNj0r7hbsEsVZhjijPlOlkxzbr-IfFEHVAsZKBQJEw62r8PotacnqvLYXi5V2mnXb5TN8rurs9GGCVAO28dgLTHdrxGLrmZtGdIrBR2YORbYSa7kjOXStLd8HEuJZFUx0kNVmTrTvHFCNmg9eh05wOhew=s200-w200-h150" },
    { nome: "Palazzetto Fossato di Vico", citta: "Fossato di Vico", lat: 43.29342, lng: 12.755487, foto: "https://lh3.googleusercontent.com/place-photos/AJRVUZPyrN5haDqjSgdonWzybgztRtiamMyUs8yWq5bX_sJ8ni0pyreXfhvaYSF_6tfRBRSjT46DMRCVHUjzpqlsPCzbO18D_IGTKi9XA4gq5jFqinegP8XvcFUW4DrrG3mX48ExV4o1StTeQn1DwQ=s200-w200-h150" },
  ];

  return (
    <main>
      <section className="section">
        <h2 className="feed-heading">Campi in Umbria</h2>
        <p className="state" style={{ marginBottom: "1rem", fontSize: "0.82rem" }}>
          {campi.length} palazzetti dove si gioca a pallavolo in Umbria.
        </p>
        <ul className="campi-list" style={{ marginTop: "1.5rem" }}>
          {campi.map((c, i) => (
            <li key={i} className="campi-item">
              {c.foto ? (
                <img className="campi-item__foto" src={c.foto} alt={c.nome} loading="lazy" />
              ) : (
                <div className="campi-item__foto campi-item__foto--placeholder">🏐</div>
              )}
              <div className="campi-item__info">
                <span className="campi-item__nome">{c.nome}</span>
                <span className="campi-item__citta">{c.citta}</span>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`}
                target="_blank"
                rel="noreferrer"
                className="campi-maps-link"
              >
                Maps →
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main>
      <section className="section" style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🏐</div>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", color: "var(--gold)", letterSpacing: "0.06em", margin: "0 0 0.5rem" }}>
          Pagina non trovata
        </h2>
        <p style={{ color: "var(--text-dim)", marginBottom: "1.5rem" }}>
          La pagina che cerchi non esiste o è stata spostata.
        </p>
        <a href="#/" className="sponsor-cta" style={{ fontSize: "0.9rem" }}>
          Torna alla homepage →
        </a>
      </section>
    </main>
  );
}

function HeadToHeadPage() {
  const matches = (risultatiData.matches || []).filter(
    (m) => m.status === "disputata" && m.score
  );

  // Categorie disponibili (escludi solo U12 e U13)
  const categorieSet = new Set();
  matches.forEach((m) => {
    const lower = (m.competition || "").toLowerCase();
    if (lower.includes("under 12") || lower.includes("u12") || lower.includes("under12")) return;
    if (lower.includes("under 13") || lower.includes("u13") || lower.includes("under13")) return;
    categorieSet.add(getMacroCategory(m.competition));
  });
  const categorie = Array.from(categorieSet).sort((a, b) => competitionScore(a) - competitionScore(b));

  const [selCat, setSelCat] = useState("");
  const [squadra1, setSquadra1] = useState("");
  const [squadra2, setSquadra2] = useState("");

  const matchesFiltrati = matches.filter((m) => {
    const lower = (m.competition || "").toLowerCase();
    if (lower.includes("under 12") || lower.includes("u12")) return false;
    if (lower.includes("under 13") || lower.includes("u13")) return false;
    if (selCat && getMacroCategory(m.competition) !== selCat) return false;
    return true;
  });

  const squadreSet = new Set();
  matchesFiltrati.forEach((m) => { squadreSet.add(m.home); squadreSet.add(m.away); });
  const squadre = Array.from(squadreSet).sort();

  useEffect(() => { setSquadra1(""); setSquadra2(""); }, [selCat]);

  const scontri = matchesFiltrati.filter(
    (m) =>
      (m.home === squadra1 && m.away === squadra2) ||
      (m.home === squadra2 && m.away === squadra1)
  );

  let v1 = 0, v2 = 0, set1 = 0, set2 = 0;
  scontri.forEach((m) => {
    const parts = (m.score || "").split("-");
    if (parts.length !== 2) return;
    const s1 = parseInt(parts[0]), s2 = parseInt(parts[1]);
    if (isNaN(s1) || isNaN(s2)) return;
    const home1 = m.home === squadra1;
    const ms1 = home1 ? s1 : s2;
    const ms2 = home1 ? s2 : s1;
    set1 += ms1; set2 += ms2;
    if (ms1 > ms2) v1++; else v2++;
  });

  return (
    <main>
      <CampionatiHero titolo="Head to Head" />
      <section className="section">
        <h2 className="feed-heading">Head to Head</h2>
        <p className="state" style={{ marginBottom: "1.25rem", fontSize: "0.82rem" }}>
          Confronta i precedenti tra due squadre. Filtra per categoria per risultati più precisi.
        </p>

        {/* Filtri */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
          <select className="all2-select" style={{ flex: 1, minWidth: "160px" }}
            value={selCat} onChange={(e) => setSelCat(e.target.value)}>
            <option value="">-- Tutte le categorie --</option>
            {categorie.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="all2-select" style={{ flex: 1, minWidth: "180px" }}
            value={squadra1} onChange={(e) => setSquadra1(e.target.value)}>
            <option value="">-- Prima squadra --</option>
            {squadre.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", color: "var(--gold)" }}>VS</span>
          <select className="all2-select" style={{ flex: 1, minWidth: "180px" }}
            value={squadra2} onChange={(e) => setSquadra2(e.target.value)}>
            <option value="">-- Seconda squadra --</option>
            {squadre.filter((s) => s !== squadra1).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {squadra1 && squadra2 && (
          <>
            {scontri.length === 0 ? (
              <p className="state">Nessun precedente tra queste due squadre nei dati disponibili.</p>
            ) : (
              <>
                <div className="h2h-summary">
                  <div className="h2h-summary__team">
                    <span className="h2h-summary__nome">{squadra1}</span>
                    <span className="h2h-summary__vittorie">{v1}</span>
                    <span className="h2h-summary__label">vittorie</span>
                    <span className="h2h-summary__set">{set1} set</span>
                  </div>
                  <div className="h2h-summary__center">
                    <span className="h2h-summary__totale">{scontri.length} incontri</span>
                  </div>
                  <div className="h2h-summary__team h2h-summary__team--right">
                    <span className="h2h-summary__nome">{squadra2}</span>
                    <span className="h2h-summary__vittorie">{v2}</span>
                    <span className="h2h-summary__label">vittorie</span>
                    <span className="h2h-summary__set">{set2} set</span>
                  </div>
                </div>

                <div className="h2h-bar">
                  <div className="h2h-bar__fill h2h-bar__fill--left"
                    style={{ width: `${scontri.length > 0 ? (v1 / scontri.length) * 100 : 50}%` }} />
                  <div className="h2h-bar__fill h2h-bar__fill--right"
                    style={{ width: `${scontri.length > 0 ? (v2 / scontri.length) * 100 : 50}%` }} />
                </div>

                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: "0.05em", color: "var(--gold-bright)", margin: "1.5rem 0 0.75rem" }}>
                  Tutti gli incontri
                </h3>
                <table className="classifica-table">
                  <thead>
                    <tr>
                      <th className="classifica-table__nome">Campionato</th>
                      <th>Giornata</th>
                      <th className="classifica-table__nome">Casa</th>
                      <th>Risultato</th>
                      <th className="classifica-table__nome">Ospite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scontri.map((m, i) => {
                      const parts = (m.score || "").split("-");
                      const s1p = parseInt(parts[0]), s2p = parseInt(parts[1]);
                      const homeVince = s1p > s2p;
                      return (
                        <tr key={i}>
                          <td className="classifica-table__nome" style={{ fontSize: "0.75rem" }}>
                            {getMacroCategory(m.competition)}
                          </td>
                          <td style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{m.giornata}</td>
                          <td className="classifica-table__nome" style={{ fontWeight: homeVince ? 700 : 400 }}>
                            {m.home}
                          </td>
                          <td className="classifica-table__pts" style={{ whiteSpace: "nowrap" }}>{m.score}</td>
                          <td className="classifica-table__nome" style={{ fontWeight: !homeVince ? 700 : 400 }}>
                            {m.away}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function ChiSiamoPage() {
  return (
    <main>
      {/* Hero */}
      <div className="chi-siamo-hero">
        <div className="chi-siamo-hero__content">
          <p className="chi-siamo-hero__label">La nostra storia</p>
          <h2 className="chi-siamo-hero__titolo">Chi siamo</h2>
          <p className="chi-siamo-hero__sub">Il volley umbro ha finalmente il suo punto di riferimento</p>
        </div>
      </div>

      <section className="section">
        <div className="chi-siamo-layout">

          {/* Storia */}
          <div className="chi-siamo-blocco">
            <h3 className="chi-siamo-blocco__titolo">Come è nato PallaVolleyAmo</h3>
            <p className="chi-siamo-blocco__testo">
              PallaVolleyAmo nasce da una passione semplice e concreta: quella di un allenatore umbro
              che sentiva il bisogno di avere uno spazio dedicato alla pallavolo della propria regione.
              Tutto è cominciato da una pagina Facebook, un luogo informale dove condividere notizie,
              risultati e aggiornamenti sul volley umbro con chi, come noi, vive questo sport ogni giorno.
            </p>
            <p className="chi-siamo-blocco__testo">
              Con il tempo è cresciuta l'idea di fare qualcosa di più strutturato: un sito vero,
              accessibile a tutti, che raccogliesse in un unico posto tutto quello che un appassionato
              di pallavolo umbra potrebbe cercare — dai risultati dei campionati regionali alle schede
              tecniche per gli allenatori, dal mercato giocatori alle notizie nazionali.
            </p>
          </div>

          {/* Missione */}
          <div className="chi-siamo-blocco chi-siamo-blocco--gold">
            <h3 className="chi-siamo-blocco__titolo">La nostra missione</h3>
            <p className="chi-siamo-blocco__testo">
              Vogliamo diventare il punto di riferimento per allenatori, giocatori, dirigenti e
              appassionati di pallavolo in Umbria e non solo. Un sito che aggiorni automaticamente
              ogni giorno, che offra contenuti tecnici di qualità, che metta in contatto chi cerca
              squadra con chi cerca giocatori, e che racconti il volley umbro con la stessa passione
              con cui lo viviamo noi in palestra.
            </p>
          </div>

          {/* Cosa offriamo */}
          <div className="chi-siamo-blocco">
            <h3 className="chi-siamo-blocco__titolo">Cosa trovi su PallaVolleyAmo</h3>
            <div className="chi-siamo-grid">
              {[
                { titolo: "Notizie", desc: "Aggiornamenti quotidiani sulla pallavolo nazionale e umbra" },
                { titolo: "Risultati e classifiche", desc: "Tutti i campionati FIPAV Umbria aggiornati automaticamente ogni giorno" },
                { titolo: "Schede tecniche", desc: "Fondamentali, esercizi, sedute tipo e sistemi di gioco per allenatori" },
                { titolo: "Mercato Umbria", desc: "Bacheca per giocatori che cercano squadra e società che cercano giocatori" },
                { titolo: "Allenatori", desc: "Curriculum e notizie sui grandi allenatori del volley italiano" },
                { titolo: "Statistiche", desc: "Andamento stagione, head to head e analisi dei campionati regionali" },
              ].map((item, i) => (
                <div key={i} className="chi-siamo-feature">
                  <div>
                    <div className="chi-siamo-feature__titolo">{item.titolo}</div>
                    <div className="chi-siamo-feature__desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contatti */}
          <div className="chi-siamo-blocco">
            <h3 className="chi-siamo-blocco__titolo">Contattaci</h3>
            <p className="chi-siamo-blocco__testo">
              Hai suggerimenti, vuoi segnalare un risultato, proporre una collaborazione o
              diventare sponsor? Siamo qui.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
              <a href="mailto:postmaster@pallavolleyamo.it" className="sponsor-cta" style={{ fontSize: "0.85rem" }}>
                ✉️ Scrivici
              </a>
              <a href="https://www.facebook.com/pallavolleyamo" target="_blank" rel="noreferrer"
                className="sponsor-cta" style={{ fontSize: "0.85rem", background: "#1877f2" }}>
                Facebook PallaVolleyAmo
              </a>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}

function MercatoPage({ subscribed }) {
  const [tab, setTab] = useState("giocatori");
  const [filtroRuolo, setFiltroRuolo] = useState("Tutti");
  const [tipoAnnuncio, setTipoAnnuncio] = useState("giocatore");
  const [form, setForm] = useState({ nome: "", ruolo: "", categoria: "", provincia: "", contatto: "", note: "" });
  const [status, setStatus] = useState("idle");

  // Annunci approvati - aggiungi qui quelli che arrivano via email
  const annunciGiocatori = [
    { nome: "Giulia B.", ruolo: "Palleggiatrice", eta: "22 anni", categoria: "Serie D / Prima Div.", provincia: "Terni", note: "Disponibile per allenamenti serali, esperienza 8 anni.", data: "luglio 2026" },
    { nome: "Marco V.", ruolo: "Schiacciatore", eta: "26 anni", categoria: "Serie C / D", provincia: "Perugia", note: "Cerco squadra zona Perugia nord. Disponibile weekend.", data: "luglio 2026" },
    { nome: "Sara T.", ruolo: "Libero", eta: "19 anni", categoria: "Serie D / U20", provincia: "Terni", note: "Ex settore giovanile, cerco prima squadra.", data: "giugno 2026" },
  ];

  const annunciSocieta = [
    { squadra: "ASD Volley (esempio)", categoria: "Serie D Femminile", ruolo: "Centrale", provincia: "Terni", note: "Cerchiamo centrale con esperienza per la stagione 2026/27. Allenamenti lun-mer-ven.", data: "luglio 2026" },
    { squadra: "Pallavolo (esempio)", categoria: "Prima Divisione M", ruolo: "Palleggiatore", provincia: "Perugia", note: "Gruppo consolidato cerca palleggiatore. Ambiente serio e amichevole.", data: "luglio 2026" },
  ];

  const ruoli = ["Tutti", "Palleggiatore", "Schiacciatore", "Centrale", "Opposto", "Libero"];

  function matchRuolo(r) {
    if (filtroRuolo === "Tutti") return true;
    return (r || "").toLowerCase().includes(filtroRuolo.toLowerCase().slice(0, 6));
  }

  const giocatoriFiltrati = annunciGiocatori.filter((a) => matchRuolo(a.ruolo));
  const societaFiltrate = annunciSocieta.filter((a) => matchRuolo(a.ruolo));

  function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
fetch("https://formspree.io/f/xjgnwrwd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: tipoAnnuncio, ...form }),
    })
      .then(() => setStatus("done"))
      .catch(() => setStatus("error"));
  }

  return (
    <main>
      <section className="section">
        <h2 className="feed-heading">Mercato Umbria</h2>
        <p className="state" style={{ marginBottom: "1.25rem", fontSize: "0.82rem" }}>
          La bacheca del volley umbro: giocatori che cercano squadra e societa che cercano giocatori.
        </p>

        {/* Tab */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <button
            className={`lavagna-btn ${tab === "giocatori" ? "lavagna-btn--active" : ""}`}
            style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}
            onClick={() => setTab("giocatori")}
          >
            Giocatori disponibili ({annunciGiocatori.length})
          </button>
          <button
            className={`lavagna-btn ${tab === "societa" ? "lavagna-btn--active" : ""}`}
            style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}
            onClick={() => setTab("societa")}
          >
            Societa che cercano ({annunciSocieta.length})
          </button>
          <button
            className={`lavagna-btn ${tab === "pubblica" ? "lavagna-btn--active" : ""}`}
            style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}
            onClick={() => setTab("pubblica")}
          >
            + Pubblica annuncio
          </button>
        </div>

        {/* Filtro ruolo */}
        {tab !== "pubblica" && (
          <div className="all2-select-wrap" style={{ marginBottom: "1.25rem", maxWidth: "260px" }}>
            <select className="all2-select" value={filtroRuolo} onChange={(e) => setFiltroRuolo(e.target.value)}>
              {ruoli.map((r) => <option key={r} value={r}>{r === "Tutti" ? "Tutti i ruoli" : r}</option>)}
            </select>
          </div>
        )}

        {/* Tab Giocatori */}
        {tab === "giocatori" && (
          <div className="mercato-lista">
            {giocatoriFiltrati.length === 0 && <p className="state">Nessun annuncio per questo ruolo.</p>}
            {giocatoriFiltrati.map((a, i) => (
              <div key={i} className="mercato-card">
                <div className="mercato-card__header">
                  <span className="mercato-card__nome">{a.nome}</span>
                  <span className="mercato-card__badge mercato-card__badge--oro">{a.ruolo}</span>
                  <span className="mercato-card__data">{a.data}</span>
                </div>
                <div className="mercato-card__dettagli">
                  <span>{a.eta}</span> · <span>{a.categoria}</span> · <span>{a.provincia}</span>
                </div>
                <p className="mercato-card__note">{a.note}</p>
                <a
                  href="mailto:postmaster@pallavolleyamo.it?subject=Contatto%20annuncio%20mercato"
                  className="mercato-card__contatto"
                >
                  Contatta tramite la redazione →
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Tab Societa */}
        {tab === "societa" && (
          <div className="mercato-lista">
            {societaFiltrate.length === 0 && <p className="state">Nessun annuncio per questo ruolo.</p>}
            {societaFiltrate.map((a, i) => (
              <div key={i} className="mercato-card">
                <div className="mercato-card__header">
                  <span className="mercato-card__nome">{a.squadra}</span>
                  <span className="mercato-card__badge mercato-card__badge--rosso">Cerca: {a.ruolo}</span>
                  <span className="mercato-card__data">{a.data}</span>
                </div>
                <div className="mercato-card__dettagli">
                  <span>{a.categoria}</span> · <span>{a.provincia}</span>
                </div>
                <p className="mercato-card__note">{a.note}</p>
                <a
                  href="mailto:postmaster@pallavolleyamo.it?subject=Contatto%20annuncio%20mercato"
                  className="mercato-card__contatto"
                >
                  Contatta tramite la redazione →
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Tab Pubblica */}
        {tab === "pubblica" && (
          <div>
            {!subscribed ? (
              <div className="commenti-locked">
                <p>Per pubblicare un annuncio devi essere iscritto al sito.</p>
                <a href="#/iscrizione" className="sponsor-cta" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
                  Iscriviti ora →
                </a>
              </div>
            ) : status === "done" ? (
              <p className="state" style={{ color: "var(--gold)" }}>
                Annuncio inviato! Sara pubblicato dopo la verifica della redazione.
              </p>
            ) : (
              <form name="mercato" method="POST" data-netlify="true" onSubmit={handleSubmit}>
                <input type="hidden" name="form-name" value="mercato" />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "480px" }}>
                  <div className="all2-select-wrap">
                    <select className="all2-select" value={tipoAnnuncio} onChange={(e) => setTipoAnnuncio(e.target.value)}>
                      <option value="giocatore">Sono un giocatore / giocatrice — cerco squadra</option>
                      <option value="societa">Siamo una societa — cerchiamo giocatori</option>
                    </select>
                  </div>
                  <input className="coach-ai-input" type="text" placeholder={tipoAnnuncio === "giocatore" ? "Nome (es. Giulia B.)" : "Nome societa"}
                    value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                  <input className="coach-ai-input" type="text" placeholder={tipoAnnuncio === "giocatore" ? "Ruolo (es. Palleggiatrice)" : "Ruolo cercato"}
                    value={form.ruolo} onChange={(e) => setForm({ ...form, ruolo: e.target.value })} required />
                  <input className="coach-ai-input" type="text" placeholder="Categoria (es. Serie D)"
                    value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required />
                  <input className="coach-ai-input" type="text" placeholder="Provincia (Perugia / Terni)"
                    value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} required />
                  <input className="coach-ai-input" type="text" placeholder="Contatto (email o telefono - non sara pubblicato)"
                    value={form.contatto} onChange={(e) => setForm({ ...form, contatto: e.target.value })} required />
                  <textarea className="redazione-textarea" rows={3} placeholder="Note (disponibilita, esperienza...)"
                    value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                  <button type="submit" className="coach-ai-btn" style={{ alignSelf: "flex-start" }}
                    disabled={status === "sending"}>
                    {status === "sending" ? "Invio..." : "Invia annuncio"}
                  </button>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                    Il contatto non viene pubblicato: chi risponde all'annuncio scrive alla redazione, che inoltra il messaggio.
                  </p>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function CommentiPage({ subscribed }) {
  const [nome, setNome] = useState("");
  const [testo, setTesto] = useState("");
  const [status, setStatus] = useState("idle");
  const [filtro, setFiltro] = useState("");

  // Commenti approvati (aggiunti manualmente nel file)
  const commentiApprovati = [
    { nome: "Marco R.", data: "2 luglio 2026", testo: "Sito fantastico! Finalmente un riferimento per il volley umbro. Complimenti per l'aggiornamento quotidiano.", categoria: "Complimento" },
    { nome: "Laura M.", data: "5 luglio 2026", testo: "Ottima la sezione fondamentali, molto utile per gli allenatori. Aggiungete anche video dimostrativi!", categoria: "Suggerimento" },
    { nome: "Andrea T.", data: "8 luglio 2026", testo: "Bello vedere i risultati della serie D in tempo reale. Continuate così!", categoria: "Complimento" },
  ];

  const categorie = ["Tutti", ...new Set(commentiApprovati.map((c) => c.categoria))];
  const commentiFiltrati = filtro && filtro !== "Tutti"
    ? commentiApprovati.filter((c) => c.categoria === filtro)
    : commentiApprovati;

  function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim() || !testo.trim()) return;
    setStatus("sending");
   fetch("https://formspree.io/f/xbdnoyow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, testo }),
    })
      .then(() => setStatus("done"))
      .catch(() => setStatus("error"));
  }

  return (
    <main>
      <section className="section">
        <h2 className="feed-heading">Commenti e Suggerimenti</h2>

        {/* Elenco commenti approvati */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: "0.05em", color: "var(--gold-bright)", margin: 0 }}>
              Commenti ({commentiApprovati.length})
            </h3>
            <select className="all2-select" style={{ maxWidth: "180px" }}
              value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              {categorie.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="commenti-lista">
            {commentiFiltrati.map((c, i) => (
              <div key={i} className="commento-card">
                <div className="commento-card__header">
                  <span className="commento-card__nome">{c.nome}</span>
                  <span className="commento-card__badge">{c.categoria}</span>
                  <span className="commento-card__data">{c.data}</span>
                </div>
                <p className="commento-card__testo">{c.testo}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form invio commento (solo iscritti) */}
        <div className="commenti-form-wrap">
          <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: "0.05em", color: "var(--gold-bright)", margin: "0 0 1rem" }}>
            Lascia un commento
          </h3>

          {!subscribed ? (
            <div className="commenti-locked">
              <p>Per lasciare un commento devi essere iscritto al sito.</p>
              <a href="#/iscrizione" className="sponsor-cta" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
                Iscriviti ora →
              </a>
            </div>
          ) : status === "done" ? (
            <p className="state" style={{ color: "var(--gold)" }}>
              Grazie! Il tuo commento è stato inviato e sarà pubblicato dopo approvazione.
            </p>
          ) : (
            <form name="commenti" method="POST" data-netlify="true" onSubmit={handleSubmit}>
              <input type="hidden" name="form-name" value="commenti" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "480px" }}>
                <input
                  className="coach-ai-input"
                  type="text"
                  name="nome"
                  placeholder="Il tuo nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
                <textarea
                  className="redazione-textarea"
                  name="testo"
                  placeholder="Scrivi il tuo commento o suggerimento..."
                  value={testo}
                  onChange={(e) => setTesto(e.target.value)}
                  rows={4}
                  required
                />
                <button type="submit" className="coach-ai-btn" style={{ alignSelf: "flex-start" }}
                  disabled={status === "sending"}>
                  {status === "sending" ? "Invio..." : "Invia commento"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function NostriSponsorPage() {
  const sponsorAttivi = [
    {
      nome: "Fisiolab Terni",
      logo: "/sponsor-fisiolab.png",
      url: "https://fisiolabterni.it/",
      desc: "Centro di fisioterapia e riabilitazione a Terni. Specializzato nel trattamento degli infortuni sportivi e nella preparazione atletica.",
      categoria: "Salute e Sport",
    },
    {
      nome: "Enertoscana",
      logo: "/sponsor-enertoscana.png",
      url: "https://enertoscana.it/",
      desc: "Soluzioni energetiche per privati e aziende. Partner affidabile per la gestione dell'energia in Toscana e Umbria.",
      categoria: "Energia",
    },
  ];

  return (
    <main>
      <div className="campionati-hero">
        <div className="campionati-hero__overlay">
          <h2 className="campionati-hero__titolo">I Nostri Sponsor</h2>
          <p className="campionati-hero__sub">I partner che sostengono il volley umbro</p>
        </div>
      </div>

      <section className="section">
        <div className="sponsor-attivi-grid" style={{ maxWidth: "800px" }}>
          {sponsorAttivi.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noreferrer" className="sponsor-attivo-card">
              <div className="sponsor-attivo-card__logo-wrap">
                <img src={s.logo} alt={s.nome} className="sponsor-attivo-card__logo" />
              </div>
              <div className="sponsor-attivo-card__body">
                <div className="sponsor-attivo-card__categoria">{s.categoria}</div>
                <h4 className="sponsor-attivo-card__nome">{s.nome}</h4>
                <p className="sponsor-attivo-card__desc">{s.desc}</p>
                <span className="sponsor-attivo-card__cta">Visita il sito →</span>
              </div>
            </a>
          ))}
        </div>

        <div className="sponsor-vuoi-wrap">
          <p className="sponsor-vuoi__testo">Vuoi comparire qui?</p>
          <a href="#/sponsor" className="sponsor-cta">
             Diventa sponsor
          </a>
        </div>
      </section>
    </main>
  );
}

function SponsorPage() {
  const sponsorAttivi = [
    {
      nome: "Fisiolab Terni",
      logo: "/sponsor-fisiolab.png",
      url: "https://fisiolabterni.it/",
      desc: "Centro di fisioterapia e riabilitazione a Terni. Specializzato nel trattamento degli infortuni sportivi e nella preparazione atletica.",
      categoria: "Salute e Sport",
    },
    {
      nome: "Enertoscana",
      logo: "/sponsor-enertoscana.png",
      url: "https://enertoscana.it/",
      desc: "Soluzioni energetiche per privati e aziende. Partner affidabile per la gestione dell'energia in Toscana e Umbria.",
      categoria: "Energia",
    },
  ];

  const vantaggi = [
    { titolo: "Visibilità regionale", testo: "Il tuo logo raggiunge tutti gli appassionati di pallavolo in Umbria, aggiornati quotidianamente sulle notizie e i risultati dei campionati regionali." },
    { titolo: "Target specifico", testo: "Il nostro pubblico è composto da giocatori, allenatori, famiglie e dirigenti sportivi — il target ideale per attività legate allo sport e al territorio." },
    { titolo: "Aggiornamenti giornalieri", testo: "Il sito si aggiorna ogni giorno automaticamente, portando nuovi visitatori continuamente nel corso della stagione." },
    { titolo: "Presenza duratura", testo: "Il tuo banner o logo è presente su tutte le pagine del sito per tutta la durata del contratto, con link diretto al tuo sito o profilo social." },
  ];

  return (
    <main>
      {/* Hero immagine */}
      <div className="sponsor-hero">
        <div className="sponsor-hero__overlay">
          <h2 className="sponsor-hero__titolo">Sponsor</h2>
          <p className="sponsor-hero__sub">
            I partner che sostengono il volley umbro
          </p>
        </div>
      </div>

      <section className="section">

        <p className="sponsor-intro">
          <strong>PallaVolleyAmo</strong> è il punto di riferimento per la pallavolo in Umbria —
          notizie, risultati, classifiche e calendario di tutti i campionati regionali, dalla Serie C
          fino all'Under 14. Ogni giorno nuovi aggiornamenti, ogni giorno nuovi lettori.
          Associa il tuo brand a questo progetto e raggiungi un pubblico appassionato e fidelizzato.
        </p>

        {/* Vantaggi */}
        <div className="sponsor-grid">
          {vantaggi.map((v, i) => (
            <div key={i} className="sponsor-card">
              <h4 className="sponsor-card__titolo">{v.titolo}</h4>
              <p className="sponsor-card__testo">{v.testo}</p>
            </div>
          ))}
        </div>

        {/* Pacchetti */}
        <h3 className="sponsor-section-title">Pacchetti disponibili</h3>
        <div className="sponsor-pacchetti">
          <div className="sponsor-pacco">
            <div className="sponsor-pacco__nome">Base</div>
            <ul className="sponsor-pacco__lista">
              <li>Logo nella sidebar</li>
              <li>Link al tuo sito</li>
              <li>Visibile su tutte le pagine</li>
            </ul>
          </div>
          <div className="sponsor-pacco sponsor-pacco--gold">
            <div className="sponsor-pacco__badge">Più scelto</div>
            <div className="sponsor-pacco__nome">Premium</div>
            <ul className="sponsor-pacco__lista">
              <li>Banner in homepage</li>
              <li>Logo nella sidebar</li>
              <li>Link al tuo sito</li>
              <li>Menzione nelle news</li>
            </ul>
          </div>
          <div className="sponsor-pacco">
            <div className="sponsor-pacco__nome">Partner</div>
            <ul className="sponsor-pacco__lista">
              <li>Logo in header</li>
              <li>Pagina dedicata</li>
              <li>Banner in homepage</li>
              <li>Post Facebook incluso</li>
            </ul>
          </div>
        </div>

        {/* Contatto */}
        <h3 className="sponsor-section-title">Contattaci</h3>
        <p className="sponsor-intro" style={{ marginBottom: "1.25rem" }}>
          Scrivici per ricevere il media kit completo o per accordare una soluzione personalizzata.
        </p>
        <a
          href="mailto:postmaster@pallavolleyamo.it?subject=Richiesta%20sponsorizzazione%20PallaVolleyAmo"
          className="sponsor-cta"
        >
          Scrivici a postmaster@pallavolleyamo.it
        </a>
      </section>
    </main>
  );
}

function IscrizionePage({ subscribed, subscribe, unsubscribe }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error

  function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");

   fetch("https://formspree.io/f/xrenqkbd", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nome, email }),
})
      .then(() => {
        setStatus("done");
        subscribe();
      })
      .catch(() => setStatus("error"));
  }

  return (
    <main>
      <section className="section home-intro">
        <h2 className="feed-heading">Iscrizione</h2>

        {status === "done" ? (
          <p className="state home-intro__text">
            Grazie {nome}! La tua iscrizione e' stata registrata. Ora puoi
            leggere tutte le notizie per intero.
          </p>
        ) : (
          <>
            <p className="state home-intro__text">
              L'iscrizione è completamente gratuita! Accedi a tutte le notizie senza limiti, segui i campionati umbri e resta sempre aggiornato sul volley della tua regione.
            </p>

            <form
              name="iscrizione"
              onSubmit={handleSubmit}
              className="signup-form"
            >
              <input type="hidden" name="form-name" value="iscrizione" />
              <label className="signup-form__field">
                Nome
                <input
                  type="text"
                  name="nome"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </label>
              <label className="signup-form__field">
                Email
                <input
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className="nav-btn nav-btn--accent"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Invio in corso..." : "Iscriviti"}
              </button>
              {status === "error" && (
                <p className="signup-form__error">
                  Si e' verificato un errore. Riprova piu' tardi.
                </p>
              )}
            </form>
          </>
        )}

        {subscribed && (
          <div className="subscribe-demo">
            <p className="subscribe-demo__note">
              Sei iscritto su questo browser.
            </p>
            <button className="nav-btn" onClick={unsubscribe}>
              Annulla iscrizione su questo browser
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function SidebarLeft() {
  return (
    <aside className="sidebar sidebar--left">
      <div className="sidebar__box sidebar__box--pillola">
        <a href="#/pillole" className="pillola-sidebar-link">
          <span className="pillola-sidebar-link__pulse" />
          <span className="pillola-sidebar-link__content">
            <span className="pillola-sidebar-link__label"> Pillola del Giorno</span>
            <span className="pillola-sidebar-link__sub">Un consiglio ogni giorno per crescere</span>
          </span>
          <span className="pillola-sidebar-link__arrow">→</span>
        </a>
      </div>
      <div className="sidebar__box">
        <h4 className="sidebar__title">Link utili</h4>
        <ul className="sidebar__links">
          <li><a href="https://www.fipavumbria.it" target="_blank" rel="noreferrer">FIPAV Umbria</a></li>
          <li><a href="https://www.federvolley.it" target="_blank" rel="noreferrer">FIPAV Nazionale</a></li>
          <li><a href="https://www.legavolley.it" target="_blank" rel="noreferrer">SuperLega</a></li>
          <li><a href="https://www.legavolley.it/category/serie-a3/" target="_blank" rel="noreferrer">Serie A3 Maschile</a></li>
          <li><a href="https://www.legavolleyfemminile.it" target="_blank" rel="noreferrer">Serie A1 Femminile</a></li>
          <li><a href="https://www.facebook.com/profile.php?id=136699049531253" target="_blank" rel="noreferrer">PallaVolleyAmo su Facebook</a></li>
        </ul>
      </div>
    </aside>
  );
}

function SponsorBanner() {
  const sponsors = [
    { nome: "Fisiolab Terni", logo: "/sponsor-fisiolab.png", url: "https://fisiolabterni.it/" },
  ];

  return (
    <div className="sponsor-banner">
      <span className="sponsor-banner__label">Sponsor</span>
      {sponsors.map((s, i) => (
        <a key={i} href={s.url} target="_blank" rel="noreferrer" className="sponsor-banner__item">
          <img src={s.logo} alt={s.nome} className="sponsor-banner__logo" />
        </a>
      ))}
      <a
        href="mailto:postmaster@pallavolleyamo.it?subject=Proposta%20sponsorizzazione%20PallaVolleyAmo"
        className="sponsor-banner__cta"
      >
        + Diventa sponsor
      </a>
    </div>
  );
}

const SPONSORS = [
  { nome: "Fisiolab Terni", logo: "/sponsor-fisiolab.png", url: "https://fisiolabterni.it/" },
  { nome: "Enertoscana", logo: "/sponsor-enertoscana.png", url: "https://enertoscana.it/" },
];

function SidebarRight() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (SPONSORS.length <= 1) return;
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % SPONSORS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const current = SPONSORS[idx];

  return (
    <aside className="sidebar sidebar--right">
      <div className="sidebar__box sidebar__box--sponsor-pro">
        <p className="sponsor__label">Sponsor</p>
        <a href={current.url} target="_blank" rel="noreferrer">
          <img
            src={current.logo}
            alt={current.nome}
            style={{ width: "100%", borderRadius: "4px", display: "block" }}
          />
        </a>
        <p className="sponsor__name">{current.nome}</p>
        <a href={current.url} target="_blank" rel="noreferrer" className="sponsor__cta">
          Visita il sito →
        </a>
        {SPONSORS.length > 1 && (
          <div className="sponsor__dots">
            {SPONSORS.map((_, i) => (
              <button
                key={i}
                className={`sponsor__dot ${i === idx ? "sponsor__dot--active" : ""}`}
                onClick={() => setIdx(i)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="sidebar__box sidebar__box--vuoi" style={{ textAlign: "center" }}>
        <p className="sponsor__label" style={{ marginBottom: "0.4rem", fontSize: "0.8rem", color: "var(--gold-bright)" }}>
          Vuoi comparire qui?
        </p>
        <p style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "0.75rem", lineHeight: "1.4" }}>
          Porta il tuo brand nel volley umbro
        </p>
        <a href="#/nostri-sponsor" className="sponsor__cta sponsor__cta--outline" style={{ display: "block", textAlign: "center", marginBottom: "0.5rem" }}>
          I nostri Sponsor
        </a>
        <a href="#/sponsor" className="sponsor__cta" style={{ display: "block", textAlign: "center" }}>
          Diventa sponsor →
        </a>
      </div>
    </aside>
  );
}

export default function App() {
  const route = useRoute();
  const { subscribed, subscribe, unsubscribe } = useSubscribed();
  const [showSplash, setShowSplash] = useState(true);
  const [showPillola, setShowPillola] = useState(true);
  const pilloleList = pilloleData.pillole || [];
  const pillolaDiOggi = pilloleList[(new Date().getDate() - 1) % pilloleList.length];
  const [darkMode, setDarkMode] = useState(false);

  const allPosts = [
    ...(nazionaleData.posts || []),
    ...(nazionaliData.posts || []),
    ...(regionaliData.posts || []),
  ];

  const latestFive = [...allPosts]
    .sort((a, b) => parseDate(b) - parseDate(a))
    .slice(0, 5);

  useEffect(() => {
    document.body.classList.toggle("light-mode", darkMode);
  }, [darkMode]);

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;

  return (
    <>
    {showPillola && <PillolaToast pillola={pillolaDiOggi} onClose={() => setShowPillola(false)} />}
      <Masthead latestFive={latestFive} darkMode={darkMode} toggleDark={() => setDarkMode((d) => !d)} />

      <div className="page-layout">
        <SidebarLeft />

        <div className="page-content">
          {route === "home" && <HomePage />}
          {route === "mercato" && <MercatoPage subscribed={subscribed} />}
          {route === "chi-siamo" && <ChiSiamoPage />}
          {route === "commenti" && <CommentiPage subscribed={subscribed} />}
          {!["home","nazionale","nazionali","regionali","terni","perugia","galleria","risultati","calendario","classifica","andamento","headtohead","campi","fondamentali","pillole","schede","velasco","camp","allenatori2","sponsor","commenti","mercato","chi-siamo","nostri-sponsor","foto-settimana","articoli-societa","dirette","video","iscrizione"].includes(route) && <NotFoundPage />}
          {route === "nostri-sponsor" && <NostriSponsorPage />}
          {route === "sponsor" && <SponsorPage />}
          {route === "iscrizione" && (
            <IscrizionePage subscribed={subscribed} subscribe={subscribe} unsubscribe={unsubscribe} />
          )}
          {route === "redazione" && <RedazionePage />}
          {route === "velasco" && <VelascoPage />}
          {route === "video" && <VideoPage />}
          {route === "camp" && <CampEstiviPage />}
          {route === "coach-ai" && <CoachAiPage />}
          {route === "schede" && <SchedePage />}
          {route === "pillole" && <PillolePage />}
          {route === "fondamentali" && <FondamentaliPage />}
          {route === "galleria" && <GalleriaPage />}
          {route === "foto-settimana" && <FotoSettimanaPage />}
          {route === "articoli-societa" && <ArticoliSocietaPage subscribed={subscribed} />}
          {route === "allenatori2" && <Allenatori2Page />}
          {route === "campi" && <CampiPage />}
          {route === "andamento" && <AndamentoPage />}
          {route === "headtohead" && <HeadToHeadPage />}
          {route === "classifica" && <ClassificaPage />}
          {route === "dirette" && <DiretteLivePage />}
          {route === "risultati" && <RisultatiPage />}
          {route === "calendario" && <CalendarioPage />}
          {route === "allenatori" && <AllenatoriPage />}
          {SECTIONS[route] && <SectionPage slug={route} subscribed={subscribed} />}
        </div>

        <SidebarRight />
      </div>

      <footer className="footer">
        PallaVolleyAmo &mdash; volley umbro
        <LastUpdated />
        <VisitCounter />
      </footer>
      <Analytics />
    </>
  );
}

function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("it-IT", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LastUpdated() {
  const timestamps = [
    nazionaleData.generatedAt,
    nazionaliData.generatedAt,
    regionaliData.generatedAt,
    terniData.generatedAt,
    perugiaData.generatedAt,
    risultatiData.generatedAt,
  ].filter(Boolean);

  if (timestamps.length === 0) return null;

  const latest = timestamps.sort().slice(-1)[0];
  const formatted = formatDateTime(latest);
  if (!formatted) return null;

  return (
    <p className="visit-counter">
      Dati aggiornati il: <strong>{formatted}</strong>
    </p>
  );
}

function VisitCounter() {
  // Contatore visite tramite badge immagine (servizio gratuito
  // hits.sh) - non genera errori in console anche se il servizio
  // esterno e' irraggiungibile, perche' un'immagine che non carica
  // semplicemente non appare, senza interrompere il resto del sito.
  return (
    <p className="visit-counter">
      <img
        src="https://hits.sh/pallavolleyamo.it.svg?style=flat-square&label=visite&color=d4af37&labelColor=0b0b0c"
        alt="Contatore visite"
        className="visit-counter__badge"
      />
    </p>
  );
}