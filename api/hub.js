// Calendario, risultati e classifica di un campionato regionale, in JSON.
//
// Serve a far leggere questi dati ad altre applicazioni della società — oggi
// HubVolley, il gestionale della squadra — senza che qualcuno debba ribattere
// a mano i risultati di tutte le altre squadre del girone.
//
// I dati sono gli stessi che il sito mostra già a chiunque: qui cambia solo
// la forma, pensata per essere letta da un programma invece che da una
// persona. Per questo la risposta è aperta a tutti (CORS): non c'è niente di
// riservato da proteggere, e mettere una chiave significherebbe solo doverla
// custodire da qualche parte.
//
// Uso:
//   /api/hub                       elenco dei campionati disponibili
//   /api/hub?squadra=amerina       i campionati dove gioca quella squadra
//   /api/hub?camp=<id>             partite e classifica di quel campionato
//   /api/hub?camp=<id>&squadra=... come sopra, più le gare di quella squadra
//
// I nomi dei campi (casa, ospite, setCasa, setOspite, giornata, data)
// sono già quelli che usa HubVolley, così chi legge non deve tradurre niente.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const calRegionali = require("../data/calendario_regionali.json");
const risultati = require("../data/risultati.json");

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

// Il risultato arriva come testo ("3 - 0", "3-1"): qui diventa due numeri.
// Se manca o è scritto in un modo che non riconosciamo, la partita resta in
// calendario senza risultato, che è l'informazione giusta: "non ancora
// giocata" e "non riusciamo a leggerla" si vedono allo stesso modo, e
// inventare uno zero sarebbe peggio.
function leggiSet(testo) {
  const m = String(testo || "").match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
  if (!m) return { setCasa: null, setOspite: null };
  const a = Number(m[1]);
  const b = Number(m[2]);
  // In pallavolo non si pareggia: un 2-2 è un dato sbagliato, non un pari.
  if (a === b) return { setCasa: null, setOspite: null };
  return { setCasa: a, setOspite: b };
}

// Punteggio in uso nei campionati italiani:
//   3-0 e 3-1 → 3 punti a chi vince, 0 a chi perde
//   3-2       → 2 punti a chi vince, 1 a chi perde
function puntiPartita(setCasa, setOspite) {
  if (setCasa == null || setOspite == null) return null;
  const vinceCasa = setCasa > setOspite;
  const alTiebreak = Math.min(setCasa, setOspite) === 2;
  return {
    casa: vinceCasa ? (alTiebreak ? 2 : 3) : alTiebreak ? 1 : 0,
    ospite: vinceCasa ? (alTiebreak ? 1 : 0) : alTiebreak ? 2 : 3,
  };
}

// Alcuni risultati arrivano da una seconda fonte (risultati.json) prima di
// comparire nel calendario: si tengono da parte per riempire i buchi.
function punteggiDiScorta() {
  const mappa = {};
  (risultati.matches || []).forEach((m) => {
    if (m.status === "disputata" && m.score) {
      mappa[norm(m.competition) + "|" + norm(m.home) + "|" + norm(m.away)] = m.score;
    }
  });
  return mappa;
}

function partiteDi(campId) {
  const scorta = punteggiDiScorta();
  const lista = (calRegionali.partite || {})[campId] || [];
  return lista
    .filter((p) => p.data)
    .map((p) => {
      const testo = p.risultato || scorta[norm(p.campionato) + "|" + norm(p.casa) + "|" + norm(p.ospite)] || null;
      const { setCasa, setOspite } = leggiSet(testo);
      return {
        id: p.id,
        giornata: p.giornata != null && p.giornata !== "" ? Number(p.giornata) : null,
        data: p.data,
        ora: (p.ora || "").slice(0, 5) || null,
        casa: p.casa,
        ospite: p.ospite,
        setCasa,
        setOspite,
      };
    })
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

function squadreDi(partite) {
  const nomi = new Set();
  partite.forEach((p) => {
    if (p.casa) nomi.add(p.casa);
    if (p.ospite) nomi.add(p.ospite);
  });
  return [...nomi].sort((a, b) => a.localeCompare(b, "it"));
}

function classificaDi(partite) {
  const righe = new Map();
  const assicura = (nome) => {
    if (!righe.has(nome)) {
      righe.set(nome, { squadra: nome, giocate: 0, vinte: 0, perse: 0, punti: 0, setVinti: 0, setPersi: 0 });
    }
    return righe.get(nome);
  };
  squadreDi(partite).forEach(assicura);

  partite.forEach((p) => {
    const punti = puntiPartita(p.setCasa, p.setOspite);
    if (!punti) return;
    const casa = assicura(p.casa);
    const ospite = assicura(p.ospite);
    casa.giocate += 1;
    ospite.giocate += 1;
    casa.setVinti += p.setCasa;
    casa.setPersi += p.setOspite;
    ospite.setVinti += p.setOspite;
    ospite.setPersi += p.setCasa;
    casa.punti += punti.casa;
    ospite.punti += punti.ospite;
    if (p.setCasa > p.setOspite) {
      casa.vinte += 1;
      ospite.perse += 1;
    } else {
      ospite.vinte += 1;
      casa.perse += 1;
    }
  });

  return [...righe.values()]
    .map((r) => ({
      ...r,
      // Senza set persi il quoziente sarebbe infinito: si lascia vuoto e
      // chi mostra la classifica decide come dirlo.
      quoziente: r.setPersi > 0 ? Math.round((r.setVinti / r.setPersi) * 100) / 100 : null,
    }))
    .sort(
      (a, b) =>
        b.punti - a.punti ||
        (b.quoziente ?? 99) - (a.quoziente ?? 99) ||
        b.setVinti - a.setVinti ||
        a.squadra.localeCompare(b.squadra, "it")
    )
    .map((r, i) => ({ posizione: i + 1, ...r }));
}

function elencoCampionati() {
  return (calRegionali.campionati || []).map((c) => {
    const partite = (calRegionali.partite || {})[c.id] || [];
    return { id: c.id, nome: c.nome, partite: partite.length };
  });
}

// Cerca una squadra per pezzi di nome: "amerina" trova
// "AMERINA PALLAVOLO A S D" senza doverlo scrivere tutto.
function campionatiDellaSquadra(cerca) {
  const c = norm(cerca);
  const trovati = [];
  (calRegionali.campionati || []).forEach((camp) => {
    const lista = (calRegionali.partite || {})[camp.id] || [];
    const mie = lista.filter((p) => norm(p.casa).includes(c) || norm(p.ospite).includes(c));
    if (mie.length) {
      const nomi = new Set();
      mie.forEach((p) => {
        if (norm(p.casa).includes(c)) nomi.add(p.casa);
        if (norm(p.ospite).includes(c)) nomi.add(p.ospite);
      });
      trovati.push({ id: camp.id, nome: camp.nome, partite: mie.length, squadra: [...nomi][0] });
    }
  });
  return trovati;
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  // Mezz'ora di cache: i dati si aggiornano ogni due ore, chiedere più
  // spesso non porta niente di nuovo e carica il server per niente.
  res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=1800");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ errore: "Metodo non consentito" });

  const q = req.query || {};
  const camp = typeof q.camp === "string" ? q.camp.trim() : "";
  const squadra = typeof q.squadra === "string" ? q.squadra.trim() : "";
  const aggiornato = calRegionali.generatedAt || null;

  if (!camp) {
    if (squadra) {
      const trovati = campionatiDellaSquadra(squadra);
      return res.status(200).json({ aggiornato, cercata: squadra, campionati: trovati });
    }
    return res.status(200).json({ aggiornato, campionati: elencoCampionati() });
  }

  const scheda = (calRegionali.campionati || []).find((c) => c.id === camp);
  if (!scheda) {
    return res.status(404).json({
      errore: "Campionato non trovato",
      // Chi sbaglia l'id deve poter capire da solo quali esistono.
      campionati: elencoCampionati().map((c) => c.id),
    });
  }

  const partite = partiteDi(camp);
  const risposta = {
    aggiornato,
    campionato: { id: scheda.id, nome: scheda.nome },
    squadre: squadreDi(partite),
    classifica: classificaDi(partite),
    partite,
  };

  if (squadra) {
    const c = norm(squadra);
    risposta.squadraCercata = squadra;
    risposta.suePartite = partite.filter((p) => norm(p.casa).includes(c) || norm(p.ospite).includes(c));
  }

  return res.status(200).json(risposta);
}
