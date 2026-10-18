// Funzione riservata: salva le scelte fatte nella pagina /modera (Pubblica / Scarta).
// Variabili da impostare su Vercel: MODERA_PASSWORD, MODERA_GITHUB_TOKEN
import { timingSafeEqual } from "node:crypto";

const REPO = "massimogrifoni58-prog/pallavolleyamo";
const FILE = "data/facebook_approvati.json";
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
