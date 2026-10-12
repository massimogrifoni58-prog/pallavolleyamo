// Trasforma la cartella dist-demo in un unico file HTML autosufficiente.
//
// Perché serve: un'app costruita a moduli non si apre con un doppio clic.
// Aperta da file:// il browser rifiuta di caricare i file .js e .css esterni
// (è una regola di sicurezza, non un difetto dell'app) e si vede una pagina
// bianca. Un file solo, con dentro HTML, stili, codice e icona, non deve
// caricare niente da fuori e quindi si apre.
//
// Si lancia dopo la compilazione:  node strumenti/fileUnicoDemo.mjs
// Il risultato è HubVolley-demo.html, da portare su una chiavetta o da
// tenere sul portatile. Funziona anche senza internet.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const cartella = join(radice, "dist-demo");
const destinazione = join(radice, "HubVolley-demo.html");

const file = await readdir(join(cartella, "assets"));
const jsFile = file.filter((f) => f.endsWith(".js"));
const cssFile = file.filter((f) => f.endsWith(".css"));

if (jsFile.length !== 1) {
  console.error(
    `Attesi 1 file .js in dist-demo/assets, trovati ${jsFile.length}: ${jsFile.join(", ")}\n` +
      "Serve inlineDynamicImports attivo nella modalità demo (vite.config.js)."
  );
  process.exit(1);
}

// I caratteri dell'app arrivano da Google Fonts con una riga @import in cima
// al foglio di stile. In una demo che deve funzionare anche senza internet
// quella riga non serve a niente: senza rete i caratteri non arrivano e la
// pagina cambia aspetto. Qui li mettiamo dentro il file, presi dai pacchetti
// @fontsource, e togliamo l'@import.
async function caratteriIncorporati() {
  const pesi = [
    ["Sora", "sora", 400], ["Sora", "sora", 600], ["Sora", "sora", 700], ["Sora", "sora", 800],
    ["Inter", "inter", 400], ["Inter", "inter", 500], ["Inter", "inter", 600],
  ];
  const regole = [];
  for (const [famiglia, cartellaFont, peso] of pesi) {
    const percorso = join(
      radice, "node_modules", "@fontsource", cartellaFont, "files",
      `${cartellaFont}-latin-${peso}-normal.woff2`
    );
    const dati = (await readFile(percorso)).toString("base64");
    regole.push(
      `@font-face{font-family:'${famiglia}';font-style:normal;font-weight:${peso};` +
        `font-display:swap;src:url(data:font/woff2;base64,${dati}) format('woff2')}`
    );
  }
  return regole.join("\n");
}

let html = await readFile(join(cartella, "index.html"), "utf8");
const js = await readFile(join(cartella, "assets", jsFile[0]), "utf8");
const css = (
  await Promise.all(cssFile.map((f) => readFile(join(cartella, "assets", f), "utf8")))
).join("\n");

// L'icona dell'app diventa un indirizzo dati: così anche lei sta dentro il
// file, e la fascia in cima a ogni pagina non resta senza marchio.
const icona = await readFile(join(radice, "public", "icon-192.png"));
const iconaDati = `data:image/png;base64,${icona.toString("base64")}`;

const fontCss = await caratteriIncorporati();

// Il percorso dell'icona compare in tre forme diverse: fra virgolette nel
// codice, fra apici inversi dopo la minimizzazione, e dentro url() nel foglio
// di stile, dove Vite lo riscrive come ../icon-192.png. Una sola espressione
// le copre tutte, e la sostituzione passa per una funzione perché l'indirizzo
// dati contiene caratteri che altrimenti verrebbero interpretati.
function senzaIconaEsterna(testo) {
  return testo.replace(/(\.\.\/|\.\/|\/)?icon-192\.png/g, () => iconaDati);
}

// Fuori i collegamenti a file che non esistono più (manifest, icona,
// service worker): in un file solo non hanno nessun significato, e il
// browser segnalerebbe errori che sembrano guasti dell'app.
html = html
  .replace(/\s*<link[^>]*rel="(icon|apple-touch-icon|manifest)"[^>]*>/g, "")
  .replace(/\s*<link[^>]*rel="stylesheet"[^>]*>/g, "")
  .replace(/\s*<script[^>]*type="module"[^>]*><\/script>/g, "")
  .replace(/\s*<script>[\s\S]*?serviceWorker[\s\S]*?<\/script>/g, "")
  .replace("<html lang=\"en\">", '<html lang="it">')
  .replace(
    "<title>HubVolley</title>",
    "<title>HubVolley — versione dimostrativa</title>"
  )
  // Attenzione: la sostituzione passa per una funzione e non per una
  // stringa. Dentro al codice compaiono sequenze come $& e $1, che in una
  // stringa di sostituzione significherebbero "il testo trovato" e
  // verrebbero riscritte: il risultato era un file che non partiva.
  .replace(
    "</head>",
    () =>
      `  <style>\n${fontCss}\n${senzaIconaEsterna(css).replace(/@import\s*(url\()?\s*"https:\/\/fonts\.googleapis\.com[^"]*"\s*\)?\s*;?/g, "")}\n  </style>\n  </head>`
  )
  .replace(
    "</body>",
    () => `  <script type="module">\n${senzaIconaEsterna(js)}\n  </script>\n  </body>`
  );

await writeFile(destinazione, html, "utf8");

const kb = Math.round(Buffer.byteLength(html, "utf8") / 1024);
console.log(`Fatto: HubVolley-demo.html (${kb} kB), un file solo, apribile con un doppio clic.`);
