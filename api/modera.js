// Funzione riservata: salva le scelte fatte nella pagina /modera (Pubblica / Scarta).
// Variabili da impostare su Vercel: MODERA_PASSWORD, MODERA_GITHUB_TOKEN
import { timingSafeEqual } from "node:crypto";

const REPO = "massimogrifoni58-prog/pallavolleyamo";
const FILE = "data/facebook_approvati.json";
const FILE_ART = "data/articoli-societa.json";
const CATEGORIE_ART = ["Comunicato", "Risultato", "Evento", "Conferma", "Rinnovo", "Nuovo Acquisto"];
const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const SEZIONI = ["regionali", "nazionali", "nazionale", "terni", "perugia"];

const gh = (path, token, opts = {}) =>
  fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "pva-modera", ...(opts.headers || {}) },
  });

function passwordOk(data, vera) {
  const a = Buffer.from(String(data || ""));
  const b = Buffer.from(String(vera || ""));
  return a.length === b.length && b.length > 0 && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ errore: "Metodo non consentito" });
  const { MODERA_PASSWORD, MODERA_GITHUB_TOKEN } = process.env;
  if (!MODERA_PASSWORD || !MODERA_GITHUB_TOKEN) return res.status(500).json({ errore: "Configurazione mancante sul server" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (!passwordOk(body.password, MODERA_PASSWORD)) return res.status(401).json({ errore: "Password sbagliata" });
  if (body.azione === "verifica") return res.status(200).json({ ok: true });
  if (body.azione === "articolo") return pubblicaArticolo(body, MODERA_GITHUB_TOKEN, res);
  const { azione, id, sezione } = body;
  if (!["approva", "scarta"].includes(azione) || !/^\d{5,30}$/.test(String(id))) return res.status(400).json({ errore: "Richiesta non valida" });
  const sez = SEZIONI.includes(sezione) ? sezione : "regionali";
  try {
    for (let tentativo = 0; tentativo < 3; tentativo++) {
      const r = await gh(`contents/${FILE}?ref=main`, MODERA_GITHUB_TOKEN);
      if (!r.ok) return res.status(502).json({ errore: "Lettura da GitHub non riuscita" });
      const f = await r.json();
      const dati = JSON.parse(Buffer.from(f.content, "base64").toString("utf8"));
      dati.approvati = dati.approvati || {};
      dati.scartati = dati.scartati || [];
      if (azione === "approva") {
        dati.approvati[id] = sez;
        dati.scartati = dati.scartati.filter((x) => x !== id);
      } else {
        delete dati.approvati[id];
        if (!dati.scartati.includes(id)) dati.scartati.push(id);
      }
      const put = await gh(`contents/${FILE}`, MODERA_GITHUB_TOKEN, {
        method: "PUT",
        body: JSON.stringify({
          message: `Moderazione: ${azione} post ${id}`,
          content: Buffer.from(JSON.stringify(dati, null, 1) + "\n").toString("base64"),
          sha: f.sha,
          branch: "main",
        }),
      });
      if (put.status === 409 || put.status === 422) continue; // qualcuno ha modificato nel frattempo: riprova
      if (!put.ok) return res.status(502).json({ errore: "Salvataggio su GitHub non riuscito" });
      if (azione === "approva") {
        // avvia subito l'importazione cosi' il post compare in pochi minuti
        await gh("actions/workflows/facebook.yml/dispatches", MODERA_GITHUB_TOKEN, { method: "POST", body: JSON.stringify({ ref: "main" }) });
      }
      return res.status(200).json({ ok: true });
    }
    return res.status(409).json({ errore: "Riprova tra un attimo" });
  } catch (e) {
    return res.status(500).json({ errore: "Errore imprevisto" });
  }
}


// Nuovo articolo di una societa': salva la foto in public/articoli e aggiunge la voce in data/articoli-societa.json
async function pubblicaArticolo(body, token, res) {
  const pulisci = (v, max) => String(v || "").replace(/\r/g, "").trim().slice(0, max);
  const societa = pulisci(body.societa, 80);
  const autore = pulisci(body.autore, 80) || societa;
  const titolo = pulisci(body.titolo, 200);
  const testo = pulisci(body.testo, 12000);
  const categoria = CATEGORIE_ART.includes(body.categoria) ? body.categoria : "Comunicato";
  const provincia = body.provincia === "terni" ? "terni" : "perugia";
  if (!societa || !titolo || testo.length < 20) return res.status(400).json({ errore: "Servono società, titolo e testo" });

  // data in ora italiana
  const ora = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const mese = MESI[ora.getMonth()];
  const data = `${ora.getDate()} ${mese} ${ora.getFullYear()}`;

  try {
    let foto = null;
    if (body.foto) {
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.foto));
      if (!m) return res.status(400).json({ errore: "La foto deve essere una JPG" });
      const bytes = Buffer.from(m[1], "base64");
      if (bytes.length > 2_500_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return res.status(400).json({ errore: "Foto non valida o troppo grande" });
      const slug = titolo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "articolo";
      const nomeFile = `${slug}-${Date.now().toString(36)}.jpg`;
      const putFoto = await gh(`contents/public/articoli/${nomeFile}`, token, {
        method: "PUT",
        body: JSON.stringify({ message: `Articolo: foto ${nomeFile}`, content: bytes.toString("base64"), branch: "main" }),
      });
      if (!putFoto.ok) return res.status(502).json({ errore: "Salvataggio della foto su GitHub non riuscito" });
      foto = `/articoli/${nomeFile}`;
    }
    for (let tentativo = 0; tentativo < 3; tentativo++) {
      const r = await gh(`contents/${FILE_ART}?ref=main`, token);
      if (!r.ok) return res.status(502).json({ errore: "Lettura da GitHub non riuscita" });
      const f = await r.json();
      const dati = JSON.parse(Buffer.from(f.content, "base64").toString("utf8"));
      const articoli = dati.articoli || [];
      const nuovoId = String(articoli.reduce((mx, a) => Math.max(mx, parseInt(a.id, 10) || 0), 0) + 1);
      articoli.push({ id: nuovoId, societa, autore, categoria, titolo, testo, data, mese, provincia, foto, logo: null });
      dati.articoli = articoli;
      const put = await gh(`contents/${FILE_ART}`, token, {
        method: "PUT",
        body: JSON.stringify({
          message: `Articolo: ${titolo.slice(0, 60)}`,
          content: Buffer.from(JSON.stringify(dati, null, 2) + "\n").toString("base64"),
          sha: f.sha,
          branch: "main",
        }),
      });
      if (put.status === 409 || put.status === 422) continue;
      if (!put.ok) return res.status(502).json({ errore: "Salvataggio dell'articolo su GitHub non riuscito" });
      return res.status(200).json({ ok: true, id: nuovoId });
    }
    return res.status(409).json({ errore: "Riprova tra un attimo" });
  } catch (e) {
    return res.status(500).json({ errore: "Errore imprevisto" });
  }
}
