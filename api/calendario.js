// Calendario di una squadra (senza risultati, di proposito: per quelli si torna sul sito) in formato ICS, che i telefoni possono "abbonare":
// si aggiorna da solo quando cambiano date, orari o risultati.
// Uso: /api/calendario?squadra=Nome%20squadra  (oppure ~parola per tutte le squadre di una societa')
//      /api/calendario?squadra=...&cat=Serie%20C%20M  (solo una categoria)
// I dati sono quelli dei file nella cartella data/ (stessa logica di tuttePartiteSquadre in src/App.jsx).
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const risultati = require("../data/risultati.json");
const calRegionali = require("../data/calendario_regionali.json");
const risNazionali = require("../data/risultati_nazionali.json");
const risNazionaliFipav = require("../data/risultati_nazionali_fipav.json");
const calSquadre = require("../data/calendario_squadre.json");

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const squadraMia = (n, nome) => (nome.startsWith("~") ? norm(n).includes(norm(nome.slice(1))) : norm(n) === norm(nome));
const categoriaBreve = (c) => (c || "").replace(/\s*Girone.*$/i, "").replace(/\s*Femminile/i, " F").replace(/\s*Maschile/i, " M").trim();

function tuttePartite() {
  const punteggi = {};
  (risultati.matches || []).forEach((m) => {
    if (m.status === "disputata" && m.score) punteggi[norm(m.competition) + "|" + norm(m.home) + "|" + norm(m.away)] = m.score;
  });
  const lista = [];
  Object.values(calRegionali.partite || {}).flat().forEach((p) => {
    if (!p.data) return;
    const ris = p.risultato || punteggi[norm(p.campionato) + "|" + norm(p.casa) + "|" + norm(p.ospite)] || null;
    lista.push({ id: p.id, camp: p.campionato, giornata: p.giornata, data: p.data, ora: (p.ora || "").slice(0, 5), casa: p.casa, ospite: p.ospite, ris });
  });
  [...(risNazionali.matches || []), ...(risNazionaliFipav.matches || [])].forEach((m) => {
    if (!m.dataIso) return;
    const ris = m.status === "disputata" && m.score && m.score !== "da disputare" ? m.score : null;
    lista.push({ id: "n" + m.id, camp: m.competition, giornata: (m.giornata || "").replace(/^Giornata\s*/i, ""), data: m.dataIso, ora: (m.ora || "").slice(0, 5), casa: m.home, ospite: m.away, ris });
  });
  (calSquadre.partite || []).forEach((p) => {
    if (!p.data) return;
    const dup = lista.some((x) => x.data === p.data && norm(x.casa) === norm(p.casa) && norm(x.ospite) === norm(p.ospite));
    if (!dup) lista.push({ id: p.id, camp: p.categoria, data: p.data, ora: (p.ora || "").slice(0, 5), casa: p.casa, ospite: p.ospite, ris: p.risultato && p.risultato !== "0-0" ? p.risultato : null, luogo: p.impianto });
  });
  return lista;
}

const esc = (t) => String(t || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Le righe ICS vanno spezzate a 75 caratteri
const piega = (riga) => {
  const out = [];
  let r = riga;
  while (r.length > 74) { out.push(r.slice(0, 74)); r = " " + r.slice(74); }
  out.push(r);
  return out.join("\r\n");
};
const ymd = (d) => d.replace(/-/g, "");
const hms = (ora) => (ora || "18:00").replace(":", "").slice(0, 4) + "00";
const fineOra = (data, ora) => {
  const [h, mi] = (ora || "18:00").split(":").map(Number);
  const tot = h * 60 + mi + 120;
  const giorni = Math.floor(tot / 1440);
  const d = new Date(data + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + giorni);
  const hh = String(Math.floor((tot % 1440) / 60)).padStart(2, "0");
  const mm = String(tot % 60).padStart(2, "0");
  return d.toISOString().slice(0, 10).replace(/-/g, "") + "T" + hh + mm + "00";
};

export default function handler(req, res) {
  const nome = String(req.query.squadra || "").trim().slice(0, 80);
  const cat = String(req.query.cat || "").trim().slice(0, 60);
  if (nome.replace(/^~/, "").length < 2) return res.status(400).send("Manca il nome della squadra (parametro 'squadra').");

  let mie = tuttePartite().filter((p) => squadraMia(p.casa, nome) || squadraMia(p.ospite, nome));
  if (cat) mie = mie.filter((p) => categoriaBreve(p.camp) === cat);
  mie.sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));

  const titolo = (nome.startsWith("~") ? nome.slice(1) + " (tutte le squadre)" : nome) + (cat ? " - " + cat : "");
  const adesso = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const righe = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PallaVolleyAmo//La mia squadra//IT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:" + esc("PallaVolleyAmo - " + titolo), "X-WR-TIMEZONE:Europe/Rome",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
  ];
  mie.forEach((p) => {
    righe.push(
      "BEGIN:VEVENT",
      "UID:" + String(p.id).replace(/[^A-Za-z0-9_-]/g, "") + "@pallavolleyamo.it",
      "DTSTAMP:" + adesso,
      "DTSTART:" + ymd(p.data) + "T" + hms(p.ora),
      "DTEND:" + fineOra(p.data, p.ora),
      "SUMMARY:" + esc(p.casa + " - " + p.ospite),
      "DESCRIPTION:" + esc((p.camp || "") + (p.giornata ? " - Giornata " + p.giornata : "") + (p.ora ? "" : " (orario da confermare)") + " - Risultati, classifica e notizie su pallavolleyamo.it"),
      "URL:https://www.pallavolleyamo.it/mia-squadra",
    );
    if (p.luogo) righe.push("LOCATION:" + esc(p.luogo));
    righe.push("END:VEVENT");
  });
  righe.push("END:VCALENDAR");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="calendario.ics"');
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=21600");
  res.status(200).send(righe.map(piega).join("\r\n") + "\r\n");
}
