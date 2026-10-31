// Funzione pubblica: riceve l'articolo inviato da una societa' e lo mette in coda in data/articoli_inviati.json.
// Compare nella pagina riservata /modera, da dove la redazione lo pubblica sulle notizie con un clic.
// Usa la variabile MODERA_GITHUB_TOKEN gia' presente su Vercel.
const REPO = "massimogrifoni58-prog/pallavolleyamo";
const FILE = "data/articoli_inviati.json";
const CATEGORIE = ["Comunicato", "Risultato", "Evento", "Mercato", "Altro"];
const MAX_IN_CODA = 40;

const gh = (path, token, opts = {}) =>
  fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "pva-invia", ...(opts.headers || {}) },
  });

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ errore: "Metodo non consentito" });
  const token = process.env.MODERA_GITHUB_TOKEN;
  if (!token) return res.status(500).json({ errore: "Configurazione mancante sul server" });
  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}; } catch (e) { return res.status(400).json({ errore: "Richiesta non valida" }); }
  if (body.sito) return res.status(200).json({ ok: true }); // campo trappola per i robot

  const pulisci = (v, max) => String(v || "").replace(/\r/g, "").trim().slice(0, max);
  const societa = pulisci(body.societa, 80);
  const autore = pulisci(body.autore, 80) || societa;
  const titolo = pulisci(body.titolo, 200);
  const testo = pulisci(body.testo, 12000);
  const categoria = CATEGORIE.includes(body.categoria) ? body.categoria : "Comunicato";
  if (!societa || !titolo || testo.length < 20) return res.status(400).json({ errore: "Servono società, titolo e testo" });

  try {
    let foto = null;
    if (body.foto) {
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.foto));
      if (!m) return res.status(400).json({ errore: "La foto deve essere una JPG" });
      const bytes = Buffer.from(m[1], "base64");
      if (bytes.length > 2_000_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return res.status(400).json({ errore: "Foto non valida o troppo grande" });
      const slug = titolo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "articolo";
      const nomeFile = `${slug}-${Date.now().toString(36)}.jpg`;
      const putFoto = await gh(`contents/public/articoli/${nomeFile}`, token, {
        method: "PUT",
        body: JSON.stringify({ message: `Articolo ricevuto: foto ${nomeFile}`, content: bytes.toString("base64"), branch: "main" }),
      });
      if (!putFoto.ok) return res.status(502).json({ errore: "Salvataggio della foto non riuscito" });
      foto = `/articoli/${nomeFile}`;
    }
    for (let tentativo = 0; tentativo < 3; tentativo++) {
      const r = await gh(`contents/${FILE}?ref=main`, token);
      let dati = { ricevuti: [] };
      let sha;
      if (r.ok) {
        const f = await r.json();
        sha = f.sha;
        dati = JSON.parse(Buffer.from(f.content, "base64").toString("utf8"));
      } else if (r.status !== 404) return res.status(502).json({ errore: "Lettura non riuscita" });
      dati.ricevuti = dati.ricevuti || [];
      if (dati.ricevuti.length >= MAX_IN_CODA) return res.status(429).json({ errore: "Troppi articoli in attesa, riprova più tardi" });
      dati.ricevuti.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ricevutoIl: new Date().toISOString(), societa, autore, categoria, titolo, testo, foto });
      const put = await gh(`contents/${FILE}`, token, {
        method: "PUT",
        body: JSON.stringify({
          message: `Articolo ricevuto: ${titolo.slice(0, 60)}`,
          content: Buffer.from(JSON.stringify(dati, null, 1) + "\n").toString("base64"),
          ...(sha ? { sha } : {}),
          branch: "main",
        }),
      });
      if (put.status === 409 || put.status === 422) continue;
      if (!put.ok) return res.status(502).json({ errore: "Salvataggio non riuscito" });
      return res.status(200).json({ ok: true });
    }
    return res.status(409).json({ errore: "Riprova tra un attimo" });
  } catch (e) {
    return res.status(500).json({ errore: "Errore imprevisto" });
  }
}
