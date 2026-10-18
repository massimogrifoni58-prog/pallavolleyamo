// Genera pagine HTML statiche per Google (una per squadra e una per campionato)
// e la sitemap relativa. Si esegue prima della build (npm run build).
import fs from "node:fs";
import path from "node:path";
import { cronaca } from "../src/cronaca.js";

const SITO = "https://www.pallavolleyamo.it";
const leggi = (f) => JSON.parse(fs.readFileSync(path.join("data", f), "utf8"));
const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slug = (s) => norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const titolo = (s) => (s || "").replace(/\s+/g, " ").trim().split(" ").map((w) => (w === w.toUpperCase() || w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");
const catBreve = (c) => (c || "").replace(/\s*Girone.*$/i, "").replace(/\s*Femminile/i, " F").replace(/\s*Maschile/i, " M").trim();
const dataIt = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long" });
const oggi = new Date().toISOString().slice(0, 10);

// ---- raccolta partite (come sul sito) ----
const punteggi = {};
for (const m of leggi("risultati.json").matches || []) {
  if (m.status === "disputata" && m.score) punteggi[norm(m.competition) + "|" + norm(m.home) + "|" + norm(m.away)] = m.score;
}
const partite = [];
const campionati = leggi("calendario_regionali.json");
const nomiCamp = {};
for (const c of campionati.campionati || []) nomiCamp[c.id] = c.nome;
for (const [campId, lista] of Object.entries(campionati.partite || {})) {
  for (const p of lista) {
    if (!p.data) continue;
    const ris = p.risultato || punteggi[norm(p.campionato) + "|" + norm(p.casa) + "|" + norm(p.ospite)] || null;
    partite.push({ id: p.id, campId, camp: p.campionato, giornata: p.giornata, data: p.data, ora: (p.ora || "").slice(0, 5).replace("00:00", ""), casa: p.casa, ospite: p.ospite, ris });
  }
}
for (const f of ["risultati_nazionali.json", "risultati_nazionali_fipav.json"]) {
  try {
    for (const m of leggi(f).matches || []) {
      if (!m.dataIso) continue;
      const ris = m.status === "disputata" && m.score && m.score !== "da disputare" ? m.score : null;
      partite.push({ id: "n" + m.id, campId: null, camp: m.competition, giornata: (m.giornata || "").replace(/^Giornata\s*/i, ""), data: m.dataIso, ora: (m.ora || "").slice(0, 5).replace("00:00", ""), casa: m.home, ospite: m.away, ris });
    }
  } catch (e) {}
}

// ---- scheletro pagina ----
function pagina({ url, titoloPag, descr, h1, corpo }) {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titoloPag)}</title>
<meta name="description" content="${esc(descr)}">
<link rel="canonical" href="${SITO}${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PallaVolleyAmo">
<meta property="og:locale" content="it_IT">
<meta property="og:title" content="${esc(titoloPag)}">
<meta property="og:description" content="${esc(descr)}">
<meta property="og:url" content="${SITO}${url}">
<meta property="og:image" content="${SITO}/og-image-quadrata.jpg">
<style>
body{margin:0;background:#121214;color:#eee;font:16px/1.5 system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:1.5rem 1rem 3rem}
a{color:#d4af37}h1{color:#d4af37;font-size:1.6rem;margin:.5rem 0}h2{font-size:1.05rem;color:#d4af37;margin:1.6rem 0 .5rem}
.top{background:#0b0b0c;border-bottom:2px solid #d4af37;padding:.8rem 1rem}.top a{text-decoration:none;font-weight:800;letter-spacing:.05em;color:#fff}.top span{color:#d4af37}
table{width:100%;border-collapse:collapse;font-size:.92rem}td,th{padding:.45rem .3rem;border-bottom:1px solid #2a2a2e;text-align:left;vertical-align:top}th{color:#aaa;font-size:.75rem;text-transform:uppercase}
.p{color:#aaa;font-size:.85rem}
</style>
</head>
<body>
<div class="top"><a href="/">PALLA<span>VOLLEY</span>AMO</a></div>
<main>
<p class="p"><a href="/">Home</a> › <a href="/risultati">Risultati</a></p>
<h1>${esc(h1)}</h1>
${corpo}
<h2>Continua sul sito</h2>
<p><a href="/risultati">Tutti i risultati</a> · <a href="/classifica">Classifiche</a> · <a href="/weekend-umbria">Il weekend in Umbria</a> · <a href="/mia-squadra">La mia squadra</a></p>
</main>
</body>
</html>
`;
}

function tabella(righe, evidenzia) {
  const e = (n) => {
    if (evidenzia && norm(n) === norm(evidenzia)) return `<strong>${esc(titolo(n))}</strong>`;
    const sl = slugSquadra[norm(n)];
    return sl ? `<a href="/squadra/${sl}/">${esc(titolo(n))}</a>` : esc(titolo(n));
  };
  return `<table><tr><th>Data</th><th>Partita</th><th>Risultato</th></tr>${righe
    .map((p) => `<tr><td>${esc(dataIt(p.data))}${p.ora ? " · " + esc(p.ora) : ""}<br><span class="p">${esc(catBreve(p.camp))}${p.giornata ? " · G." + esc(p.giornata) : ""}</span></td><td>${e(p.casa)} – ${e(p.ospite)}</td><td>${p.ris ? "<strong>" + esc(p.ris) + "</strong>" : "—"}</td></tr>`)
    .join("")}</table>`;
}

// slug di ogni squadra (serve per collegare le pagine tra loro)
const slugSquadra = {};
{
  const usatiTmp = new Set();
  for (const p of partite) for (const n of [p.casa, p.ospite]) {
    if (!n || slugSquadra[norm(n)]) continue;
    const sl = slug(n);
    if (!sl || usatiTmp.has(sl)) continue;
    usatiTmp.add(sl);
    slugSquadra[norm(n)] = sl;
  }
}
const sitemap = [];
const scrivi = (url, html) => {
  const dir = path.join("public", url.replace(/^\//, ""));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  sitemap.push(url);
};
for (const d of ["public/squadra", "public/campionato"]) fs.rmSync(d, { recursive: true, force: true });

// ---- pagine squadra ----
const squadre = {};
for (const p of partite) for (const n of [p.casa, p.ospite]) if (n) (squadre[norm(n)] ||= { nome: n, partite: [] }).partite.push(p);
let nSq = 0;
const usati = new Set();
for (const s of Object.values(squadre)) {
  let sl = slug(s.nome);
  if (!sl || usati.has(sl)) continue;
  usati.add(sl);
  const nome = titolo(s.nome);
  const cats = [...new Set(s.partite.map((p) => catBreve(p.camp)))];
  const prossime = s.partite.filter((p) => !p.ris && p.data >= oggi).sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora)).slice(0, 12);
  const giocate = s.partite.filter((p) => p.ris).sort((a, b) => (b.data + b.ora).localeCompare(a.data + a.ora)).slice(0, 12);
  let corpo = `<p>${esc(nome)} gioca in: ${esc(cats.join(", "))}.</p>`;
  corpo += `<p style="margin:1rem 0"><a href="/mia-squadra?squadra=${encodeURIComponent(s.nome)}" style="display:inline-block;background:#d4af37;color:#121214;padding:.6rem 1rem;border-radius:8px;font-weight:700;text-decoration:none">Segui ${esc(nome)} su PallaVolleyAmo</a><br><span class="p">Calendario sul telefono e notizie della tua squadra. Iscrizione gratuita.</span></p>`;
  corpo += prossime.length ? `<h2>Prossime partite</h2>${tabella(prossime, s.nome)}` : "<p>Nessuna partita in programma al momento.</p>";
  const cron = giocate.slice(0, 3).map((g) => cronaca(g, partite)).filter(Boolean);
  if (cron.length) corpo += `<h2>La cronaca delle ultime partite</h2>` + cron.map((c) => `<p>${esc(c)}</p>`).join("");
  if (giocate.length) corpo += `<h2>Ultimi risultati</h2>${tabella(giocate, s.nome)}`;
  // altre squadre dei campionati in cui gioca (collegamenti interni utili a Google)
  const campSlug = [...new Set(s.partite.map((p) => slug(p.camp)).filter(Boolean))];
  const avversari = new Set();
  for (const p of partite) if (campSlug.includes(slug(p.camp))) for (const n of [p.casa, p.ospite]) if (n && norm(n) !== norm(s.nome) && slugSquadra[norm(n)]) avversari.add(norm(n));
  const nomiAvv = partite.flatMap((p) => [p.casa, p.ospite]).filter((n) => n && avversari.has(norm(n)));
  const unici = [...new Map(nomiAvv.map((n) => [norm(n), n])).values()].sort((a, b) => a.localeCompare(b, "it")).slice(0, 24);
  if (unici.length) corpo += `<h2>Altre squadre dello stesso campionato</h2><p>${unici.map((n) => `<a href="/squadra/${slugSquadra[norm(n)]}/">${esc(titolo(n))}</a>`).join(" · ")}</p>` + (campSlug.length ? `<p class="p">Campionato: ${campSlug.map((c) => `<a href="/campionato/${c}/">${esc(c.replace(/-/g, " "))}</a>`).join(" · ")}</p>` : "");
  const prima = prossime[0];
  const descr = prima
    ? `${nome}: prossima partita ${dataIt(prima.data)}${prima.ora ? " ore " + prima.ora : ""} (${titolo(prima.casa)} – ${titolo(prima.ospite)}). Calendario e risultati ${cats[0]}.`
    : `${nome}: calendario e risultati ${cats.join(", ")} su PallaVolleyAmo.`;
  scrivi(`/squadra/${sl}/`, pagina({ url: `/squadra/${sl}/`, titoloPag: `${nome} — calendario e risultati | PallaVolleyAmo`, descr, h1: `${nome}: calendario e risultati`, corpo }));
  nSq++;
}

// ---- pagine campionato ----
let nCa = 0;
const perCamp = {};
for (const p of partite) (perCamp[slug(p.camp)] ||= { nome: p.camp, partite: [] }).partite.push(p);
for (const [sl, c] of Object.entries(perCamp)) {
  if (!sl) continue;
  const ord = [...c.partite].sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));
  const giornate = {};
  for (const p of ord) (giornate[p.giornata || "—"] ||= []).push(p);
  let corpo = `<p>Calendario e risultati del campionato ${esc(c.nome)}, aggiornati dalla FIPAV.</p>`;
  for (const [g, l] of Object.entries(giornate)) {
    corpo += `<h2>${g === "—" ? "Partite" : "Giornata " + esc(g)}</h2>${tabella(l)}`;
    const cr = l.filter((x) => x.ris).map((x) => cronaca(x, partite)).filter(Boolean);
    if (cr.length) corpo += `<h3 style="font-size:.9rem;color:#aaa;margin:1rem 0 .3rem">La cronaca</h3>` + cr.map((x) => `<p class="p" style="color:#ddd">${esc(x)}</p>`).join("");
  }
  scrivi(`/campionato/${sl}/`, pagina({ url: `/campionato/${sl}/`, titoloPag: `${c.nome} — calendario e risultati | PallaVolleyAmo`, descr: `Calendario, orari e risultati del campionato ${c.nome}: tutte le giornate aggiornate.`, h1: c.nome, corpo }));
  nCa++;
}

// ---- sitemap delle pagine generate ----
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
  .map((u) => `  <url><loc>${SITO}${u}</loc><lastmod>${oggi}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`)
  .join("\n")}\n</urlset>\n`;
fs.writeFileSync("public/sitemap-partite.xml", xml);
console.log(`SEO: ${nSq} pagine squadra, ${nCa} pagine campionato`);
