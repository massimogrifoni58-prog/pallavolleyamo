import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Grafica del risultato pronta per i social (Facebook, Instagram, WhatsApp).
// Disegna un'immagine con le due squadre, il punteggio e il logo PallaVolleyAmo.
// Formati: "post" (quadrato 1080x1080) e "storia" (verticale 1080x1920).

const ORO = "#d4af37";
const ORO_CHIARO = "#e8c547";
const TESTO = "#edeae0";
const SPENTO = "#8a8794";

// "SIR ITS UMBRIA ACADEMY" -> "Sir Its Umbria Academy"
const nomeBello = (s) =>
  (s || "").replace(/\s+/g, " ").trim().split(" ")
    .map((w) => (w === w.toUpperCase() || w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");

function leggiPunteggio(ris) {
  const m = String(ris || "").match(/(\d+)\s*[-–]\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
}

function caricaImmagine(src) {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
}

// Spezza un nome lungo su piu' righe, senza superare la larghezza disponibile
function righe(ctx, testo, larghezza, maxRighe) {
  const parole = testo.split(" ");
  const out = [];
  let riga = "";
  parole.forEach((p) => {
    const prova = riga ? riga + " " + p : p;
    if (ctx.measureText(prova).width <= larghezza || !riga) riga = prova;
    else { out.push(riga); riga = p; }
  });
  if (riga) out.push(riga);
  if (out.length > maxRighe) {
    const tagliate = out.slice(0, maxRighe);
    let ultima = tagliate[maxRighe - 1] + "…";
    while (ctx.measureText(ultima).width > larghezza && ultima.length > 2) ultima = ultima.slice(0, -2) + "…";
    tagliate[maxRighe - 1] = ultima;
    return tagliate;
  }
  return out;
}

// Scrive un nome di squadra centrato, rimpicciolendo il carattere se serve
function scriviSquadra(ctx, nome, cx, cy, larghezza, colore) {
  let size = 64;
  let linee;
  do {
    ctx.font = `${size}px "Bebas Neue", Impact, sans-serif`;
    linee = righe(ctx, nome.toUpperCase(), larghezza, 3);
    const troppoLarga = linee.some((l) => ctx.measureText(l).width > larghezza);
    if (!troppoLarga && linee.length <= 3) break;
    size -= 4;
  } while (size > 36);
  const alt = size * 1.02;
  const inizio = cy - ((linee.length - 1) * alt) / 2;
  ctx.fillStyle = colore;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  linee.forEach((l, i) => ctx.fillText(l, cx, inizio + i * alt));
  return { alto: inizio - alt / 2, basso: inizio + (linee.length - 1) * alt + alt / 2 };
}

function testoSpaziato(ctx, testo, x, y, spazio) {
  const larghezza = [...testo].reduce((t, c) => t + ctx.measureText(c).width + spazio, -spazio);
  let pos = x - larghezza / 2;
  ctx.textAlign = "left";
  [...testo].forEach((c) => { ctx.fillText(c, pos, y); pos += ctx.measureText(c).width + spazio; });
}

// Parte comune a tutte le grafiche: sfondo, cornice, logo e nome del sito.
// Restituisce dove finisce la testata, per sapere da dove continuare a disegnare.
async function preparaGrafica(canvas, formato, opz = {}) {
  const W = 1080;
  const H = formato === "storia" ? 1920 : 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  try {
    await Promise.all([
      document.fonts.load('80px "Bebas Neue"'),
      document.fonts.load('700 30px "DM Sans"'),
      document.fonts.load('400 30px "DM Sans"'),
    ]);
  } catch (e) { /* se i caratteri non arrivano si usano quelli di sistema */ }
  const [logo, sfondo] = await Promise.all([caricaImmagine("/logo-pva-512.png"), caricaImmagine("/palla2.jpg")]);

  // Sfondo scuro con foto sfumata
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(0, 0, W, H);
  if (sfondo) {
    const scala = Math.max(W / sfondo.width, H / sfondo.height);
    const sw = sfondo.width * scala, sh = sfondo.height * scala;
    ctx.globalAlpha = 0.16;
    ctx.drawImage(sfondo, (W - sw) / 2, (H - sh) / 2, sw, sh);
    ctx.globalAlpha = 1;
  }
  const luce = ctx.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H * 0.45, H * 0.75);
  luce.addColorStop(0, "rgba(212,175,55,0.14)");
  luce.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = luce;
  ctx.fillRect(0, 0, W, H);

  // Cornice dorata
  ctx.strokeStyle = "rgba(212,175,55,0.55)";
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  const storia = formato === "storia";
  const y0 = opz.y0 != null ? opz.y0 : (storia ? 230 : 70); // spazio in alto per le storie (barra del profilo)

  // Logo e nome del sito
  const lato = opz.lato || (storia ? 170 : 130);
  if (logo) {
    // Il PNG ha gli angoli bianchi: si ritaglia solo il cerchio del logo
    const lx = W / 2 - lato / 2;
    const k = lato / logo.width;
    const cx = lx + 263 * k, cy = y0 + 256 * k, r = 221 * k;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, lx, y0, lato, lato);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = ORO;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.textBaseline = "middle";
  ctx.font = '50px "Bebas Neue", Impact, sans-serif';
  const yNome = y0 + lato + 42;
  const parti = [["PALLA", TESTO], ["VOLLEY", ORO], ["AMO", TESTO]];
  const spazio = 6;
  const largParte = (t) => [...t].reduce((s, c) => s + ctx.measureText(c).width + spazio, 0);
  let x = W / 2 - (parti.reduce((s, [t]) => s + largParte(t), 0) - spazio) / 2;
  ctx.textAlign = "left";
  parti.forEach(([t, col]) => {
    ctx.fillStyle = col;
    [...t].forEach((c) => { ctx.fillText(c, x, yNome); x += ctx.measureText(c).width + spazio; });
  });
  return { ctx, W, H, storia, yNome };
}

// Fascia dorata in basso con l'indirizzo del sito
function disegnaFascia(ctx, W, H, storia, sottotitolo) {
  const hFascia = storia ? 150 : 110;
  const yFascia = H - 28 - hFascia - (storia ? 110 : 0);
  const g = ctx.createLinearGradient(0, yFascia, W, yFascia);
  g.addColorStop(0, ORO);
  g.addColorStop(1, ORO_CHIARO);
  ctx.fillStyle = g;
  ctx.fillRect(28, yFascia, W - 56, hFascia);
  ctx.fillStyle = "#141413";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${storia ? 58 : 50}px "Bebas Neue", Impact, sans-serif`;
  ctx.fillText("WWW.PALLAVOLLEYAMO.IT", W / 2, yFascia + hFascia * 0.4);
  ctx.font = `400 ${storia ? 28 : 24}px "DM Sans", Arial, sans-serif`;
  ctx.fillText(sottotitolo, W / 2, yFascia + hFascia * 0.76);
  return yFascia;
}

async function disegna(canvas, partita, formato) {
  const { ctx, W, H, storia, yNome } = await preparaGrafica(canvas, formato);

  // Campionato e giornata
  const yCamp = yNome + (storia ? 130 : 90);
  const campionato = (partita.campionato || "").replace(/ Girone.*$/i, "").toUpperCase();
  ctx.font = '700 34px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = ORO;
  testoSpaziato(ctx, campionato, W / 2, yCamp, 4);
  const sotto = [partita.giornata, partita.quando].filter(Boolean).join("  ·  ");
  if (sotto) {
    ctx.font = '400 28px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = SPENTO;
    ctx.textAlign = "center";
    ctx.fillText(sotto, W / 2, yCamp + 48);
  }

  // Squadre e punteggio
  const [a, b] = leggiPunteggio(partita.risultato);
  const yMatch = storia ? 1080 : yCamp + 300;
  const colCasa = a > b ? TESTO : SPENTO;
  const colOsp = b > a ? TESTO : SPENTO;

  ctx.font = '400 26px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = SPENTO;
  ctx.textAlign = "center";
  testoSpaziato(ctx, "RISULTATO FINALE", W / 2, yMatch - (storia ? 330 : 175), 6);

  if (storia) {
    // In verticale: squadra di casa sopra, punteggio al centro, ospite sotto
    scriviSquadra(ctx, nomeBello(partita.casa), W / 2, yMatch - 210, 880, colCasa);
    ctx.font = '260px "Bebas Neue", Impact, sans-serif';
    ctx.fillStyle = ORO;
    ctx.textAlign = "center";
    ctx.fillText(`${a} – ${b}`, W / 2, yMatch + 20);
    scriviSquadra(ctx, nomeBello(partita.ospite), W / 2, yMatch + 250, 880, colOsp);
  } else {
    scriviSquadra(ctx, nomeBello(partita.casa), 230, yMatch, 340, colCasa);
    scriviSquadra(ctx, nomeBello(partita.ospite), W - 230, yMatch, 340, colOsp);
    ctx.font = '210px "Bebas Neue", Impact, sans-serif';
    ctx.fillStyle = ORO;
    ctx.textAlign = "center";
    ctx.fillText(`${a}–${b}`, W / 2, yMatch + 8);
    ctx.font = '700 22px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = SPENTO;
    ctx.fillText("CASA", 230, yMatch - 140);
    ctx.fillText("OSPITI", W - 230, yMatch - 140);
  }

  disegnaFascia(ctx, W, H, storia, "Risultati e classifiche del volley umbro");
}

// Scrive un testo su una riga sola, accorciandolo con "…" se non ci sta
function scriviInRiga(ctx, testo, x, y, larghezza) {
  let t = testo;
  if (ctx.measureText(t).width > larghezza) {
    while (t.length > 2 && ctx.measureText(t + "…").width > larghezza) t = t.slice(0, -1);
    t = t.trim() + "…";
  }
  ctx.fillText(t, x, y);
}

// Copertina per il post del weekend (anteprima delle partite o risultati).
// dati = { modo: "anteprima" | "risultati", date, totale, nCampionati, evidenza: [{ campionato, casa, ospite, quando, risultato }] }
async function disegnaWeekend(canvas, dati, formato) {
  const { ctx, W, H, storia, yNome } = await preparaGrafica(canvas, formato, storia0(formato));
  const risultati = dati.modo === "risultati";

  // Titolo grande
  let y = yNome + (storia ? 150 : 95);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = TESTO;
  ctx.font = `${storia ? 120 : 96}px "Bebas Neue", Impact, sans-serif`;
  ctx.fillText(risultati ? "I RISULTATI DEL WEEKEND" : "IL WEEKEND DEL VOLLEY", W / 2, y);
  y += storia ? 100 : 78;
  ctx.fillStyle = ORO;
  ctx.font = `${storia ? 84 : 66}px "Bebas Neue", Impact, sans-serif`;
  ctx.fillText("IN UMBRIA", W / 2, y);

  // Date e numero di partite
  y += storia ? 85 : 62;
  ctx.font = `700 ${storia ? 34 : 28}px "DM Sans", Arial, sans-serif`;
  ctx.fillStyle = TESTO;
  testoSpaziato(ctx, (dati.date || "").toUpperCase(), W / 2, y, 3);
  y += storia ? 52 : 42;
  ctx.font = `400 ${storia ? 30 : 25}px "DM Sans", Arial, sans-serif`;
  ctx.fillStyle = SPENTO;
  ctx.textAlign = "center";
  const conteggio = dati.totale + (dati.totale === 1 ? (risultati ? " partita giocata" : " partita in programma") : (risultati ? " partite giocate" : " partite in programma")) +
    (dati.nCampionati > 1 ? " in " + dati.nCampionati + " campionati" : "");
  ctx.fillText(conteggio, W / 2, y);

  // Partite in evidenza
  const ev = (dati.evidenza || []).slice(0, storia ? 4 : 3);
  if (ev.length) {
    y += storia ? 95 : 62;
    ctx.font = `700 ${storia ? 24 : 21}px "DM Sans", Arial, sans-serif`;
    ctx.fillStyle = ORO;
    testoSpaziato(ctx, "IN EVIDENZA", W / 2, y, 6);
    y += storia ? 40 : 30;
    const hRiga = storia ? 150 : 118;
    const x0 = 80, x1 = W - 80;
    ev.forEach((p) => {
      // riquadro della partita
      ctx.fillStyle = "rgba(11,11,13,0.62)";
      ctx.fillRect(x0, y, x1 - x0, hRiga - 16);
      ctx.fillStyle = ORO;
      ctx.fillRect(x0, y, 5, hRiga - 16);
      const cy = y + (hRiga - 16) / 2;
      // a destra: punteggio (risultati) oppure giorno e ora (anteprima)
      const largDestra = storia ? 200 : 170;
      const xDestra = x1 - 24 - largDestra / 2;
      ctx.textAlign = "center";
      if (risultati) {
        ctx.fillStyle = ORO;
        ctx.font = `${storia ? 84 : 70}px "Bebas Neue", Impact, sans-serif`;
        ctx.fillText((p.risultato || "").replace(/\s/g, "").replace("-", "–"), xDestra, cy + 3);
      } else {
        const [giorno, ora] = (p.quando || "").split("|");
        ctx.fillStyle = ORO;
        ctx.font = `${storia ? 46 : 38}px "Bebas Neue", Impact, sans-serif`;
        ctx.fillText((giorno || "").toUpperCase(), xDestra, cy - (ora ? (storia ? 22 : 18) : 0));
        if (ora) {
          ctx.fillStyle = TESTO;
          ctx.font = `700 ${storia ? 30 : 26}px "DM Sans", Arial, sans-serif`;
          ctx.fillText(ora, xDestra, cy + (storia ? 24 : 20));
        }
      }
      // a sinistra: campionato e squadre
      const xs = x0 + 28;
      const largTesto = xDestra - largDestra / 2 - xs - 10;
      ctx.textAlign = "left";
      ctx.fillStyle = ORO;
      ctx.font = `700 ${storia ? 22 : 19}px "DM Sans", Arial, sans-serif`;
      scriviInRiga(ctx, (p.campionato || "").replace(/ Girone.*$/i, "").toUpperCase(), xs, cy - (storia ? 40 : 32), largTesto);
      const [a, b] = leggiPunteggio(p.risultato);
      ctx.font = `${storia ? 40 : 34}px "Bebas Neue", Impact, sans-serif`;
      ctx.fillStyle = risultati && b > a ? SPENTO : TESTO;
      scriviInRiga(ctx, nomeBello(p.casa).toUpperCase(), xs, cy - (storia ? 2 : 0), largTesto);
      ctx.fillStyle = risultati && a > b ? SPENTO : TESTO;
      scriviInRiga(ctx, nomeBello(p.ospite).toUpperCase(), xs, cy + (storia ? 38 : 32), largTesto);
      y += hRiga;
    });
  }

  disegnaFascia(ctx, W, H, storia, risultati ? "Tutti i risultati e le classifiche sul sito" : "Il programma completo sul sito");
}
// Grafica della Squadra della Settimana
// dati = { nome, campionato, risultato: "3-0", avversario, inCasa, senzaSetPersi, serie, vinte, giocate, periodo }
async function disegnaSquadraSettimana(canvas, dati, formato) {
  const { ctx, W, H, storia, yNome } = await preparaGrafica(canvas, formato, storia0(formato));

  // Nastro dorato con il titolo
  let y = yNome + (storia ? 120 : 78);
  const hN = storia ? 96 : 78, lN = storia ? 820 : 720;
  const g = ctx.createLinearGradient(W / 2 - lN / 2, 0, W / 2 + lN / 2, 0);
  g.addColorStop(0, ORO); g.addColorStop(1, ORO_CHIARO);
  ctx.fillStyle = g;
  ctx.fillRect(W / 2 - lN / 2, y - hN / 2, lN, hN);
  ctx.fillStyle = "#141413";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${storia ? 70 : 58}px "Bebas Neue", Impact, sans-serif`;
  testoSpaziato(ctx, "SQUADRA DELLA SETTIMANA", W / 2, y + 3, 3);
  if (dati.periodo) {
    y += hN / 2 + (storia ? 44 : 34);
    ctx.font = `700 ${storia ? 28 : 23}px "DM Sans", Arial, sans-serif`;
    ctx.fillStyle = SPENTO;
    testoSpaziato(ctx, dati.periodo.toUpperCase(), W / 2, y, 3);
  }

  // Sigla della squadra in un cerchio dorato
  y += storia ? 200 : 118;
  const r = storia ? 120 : 76;
  ctx.beginPath(); ctx.arc(W / 2, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(11,11,13,0.75)"; ctx.fill();
  ctx.lineWidth = storia ? 6 : 5; ctx.strokeStyle = ORO; ctx.stroke();
  const parole = nomeBello(dati.nome).split(/\s+/).map((w) => w.replace(/[^A-Za-zÀ-ÿ]/g, "")).filter((w) => w.length > 2);
  const sigla = (parole.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || nomeBello(dati.nome).charAt(0).toUpperCase());
  ctx.fillStyle = ORO;
  ctx.textAlign = "center";
  ctx.font = `${storia ? 130 : 92}px "Bebas Neue", Impact, sans-serif`;
  ctx.fillText(sigla, W / 2, y + 6);

  // Nome della squadra, grande (rimpicciolisce se lungo)
  y += r + (storia ? 120 : 82);
  let size = storia ? 104 : 84, linee;
  do {
    ctx.font = `${size}px "Bebas Neue", Impact, sans-serif`;
    linee = righe(ctx, nomeBello(dati.nome).toUpperCase(), W - 160, 2);
    if (!linee.some((l) => ctx.measureText(l).width > W - 160)) break;
    size -= 6;
  } while (size > 44);
  ctx.fillStyle = TESTO;
  const alt = size * 0.98;
  linee.forEach((l, i) => ctx.fillText(l, W / 2, y + i * alt));
  y += (linee.length - 1) * alt;

  // Campionato
  y += storia ? 78 : 60;
  ctx.font = `700 ${storia ? 32 : 26}px "DM Sans", Arial, sans-serif`;
  ctx.fillStyle = ORO;
  testoSpaziato(ctx, (dati.campionato || "").replace(/ Girone.*$/i, "").toUpperCase(), W / 2, y, 3);

  // Risultato della partita: punteggio grande e, sotto, l'avversaria
  y += storia ? 105 : 72;
  const ris = String(dati.risultato || "").replace(/\s/g, "").replace("-", "–");
  ctx.textAlign = "center";
  ctx.fillStyle = ORO;
  ctx.font = `${storia ? 84 : 62}px "Bebas Neue", Impact, sans-serif`;
  ctx.fillText(ris + (dati.inCasa ? " IN CASA" : " IN TRASFERTA"), W / 2, y);
  y += storia ? 62 : 46;
  ctx.fillStyle = TESTO;
  ctx.font = `400 ${storia ? 32 : 27}px "DM Sans", Arial, sans-serif`;
  scriviInRiga(ctx, "contro " + nomeBello(dati.avversario), W / 2, y, W - 160);

  // Etichette (senza set persi, vittorie di fila)
  const chip = [];
  if (dati.senzaSetPersi) chip.push("SENZA SET PERSI");
  if (dati.serie >= 2) chip.push(dati.serie + " VITTORIE DI FILA");
  if (dati.giocate) chip.push(`${dati.vinte} SU ${dati.giocate} IN STAGIONE`);
  if (chip.length) {
    y += storia ? 100 : 62;
    ctx.font = `700 ${storia ? 24 : 20}px "DM Sans", Arial, sans-serif`;
    const pad = storia ? 22 : 18, hC = storia ? 52 : 42, gap = 14;
    const larg = chip.map((c) => ctx.measureText(c).width + pad * 2);
    let x = W / 2 - (larg.reduce((t, l) => t + l, 0) + gap * (chip.length - 1)) / 2;
    chip.forEach((c, i) => {
      ctx.strokeStyle = ORO; ctx.lineWidth = 2;
      const rr = hC / 2;
      ctx.beginPath();
      ctx.moveTo(x + rr, y - rr); ctx.lineTo(x + larg[i] - rr, y - rr);
      ctx.arc(x + larg[i] - rr, y, rr, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x + rr, y + rr);
      ctx.arc(x + rr, y, rr, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = "rgba(11,11,13,0.6)"; ctx.fill(); ctx.stroke();
      ctx.fillStyle = ORO; ctx.textAlign = "center";
      ctx.fillText(c, x + larg[i] / 2, y + 1);
      x += larg[i] + gap;
    });
  }

  disegnaFascia(ctx, W, H, storia, "Ogni settimana la squadra da applaudire");
}

function storia0(formato) {
  // copertina: testata un po' piu' compatta per lasciare spazio alle partite
  return formato === "storia" ? { y0: 200, lato: 150 } : { y0: 52, lato: 104 };
}

function nomeFile(p, formato) {
  const pulisci = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `risultato-${pulisci(p.casa)}-${pulisci(p.ospite)}${formato === "storia" ? "-storia" : ""}.png`;
}

// Finestra con anteprima, scelta del formato, Scarica e Condividi
const PAGINA_FB = "https://www.facebook.com/profile.php?id=136699049531253";
const SITO_URL = "https://www.pallavolleyamo.it";

function ModaleGrafica({ titolo, disegnaSu, nomeFileDi, testo, chiave, link, onClose }) {
  const indirizzo = SITO_URL + (link || "");
  const testoConLink = `${String(testo).replace(/\s*(su\s+)?(https?:\/\/)?www\.pallavolleyamo\.it\/?$/i, "").trim()}\n${indirizzo}`;
  const canvasRef = useRef(null);
  const [formato, setFormato] = useState("post");
  const [pronta, setPronta] = useState(false);
  const [msg, setMsg] = useState("");
  const [mostraLinkFb, setMostraLinkFb] = useState(false);

  useEffect(() => {
    let attivo = true;
    setPronta(false);
    disegnaSu(canvasRef.current, formato).then(() => { if (attivo) setPronta(true); });
    return () => { attivo = false; };
  }, [chiave, formato]);

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const comeFile = () => new Promise((ok) => canvasRef.current.toBlob((b) => ok(b), "image/png"));

  async function scarica() {
    const blob = await comeFile();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeFileDi(formato);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg("Immagine scaricata: ora puoi pubblicarla sui social.");
  }

  async function condividi() {
    const blob = await comeFile();
    if (!blob) return;
    const file = new File([blob], nomeFileDi(formato), { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: testoConLink }); } catch (e) { /* annullato */ }
    } else {
      scarica();
    }
  }

  async function suFacebook() {
    // Computer: apro subito la pagina Facebook (prima di ogni attesa, altrimenti il browser la blocca):
    // il riquadro "A cosa stai pensando?" della pagina permette di aggiungere la foto
    const eTelefono = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    let finestra = null;
    if (!eTelefono) finestra = window.open(PAGINA_FB, "_blank");
    let copiato = false;
    try { await navigator.clipboard.writeText(testoConLink); copiato = true; } catch (e) { /* ignora */ }
    const blob = await comeFile();
    if (!blob) return;
    const file = new File([blob], nomeFileDi(formato), { type: "image/png" });
    if (eTelefono && navigator.canShare && navigator.canShare({ files: [file] })) {
      // Telefono: apre l'elenco delle app con l'immagine già allegata (scegli Facebook)
      try {
        await navigator.share({ files: [file], text: testoConLink });
        setMsg(copiato ? "Se nel post non compare il testo, incollalo: è già copiato, con il link." : "Se nel post manca il testo, scrivi il link " + indirizzo + ".");
      } catch (e) { /* annullato */ }
      return;
    }
    // Computer: scarica l'immagine; il riquadro di Facebook è già aperto
    await scarica();
    if (!finestra) finestra = window.open(PAGINA_FB, "_blank");
    setMostraLinkFb(true);
    setMsg((copiato ? "Testo con il link copiato: incollalo nel post (Ctrl+V). " : "Scrivi nel post il link " + indirizzo + ". ") + "L'immagine è stata scaricata: nella pagina Facebook tocca \"A cosa stai pensando?\", poi il pulsante Foto e scegli l'immagine dai Download.");
  }

  const puoCondividere = typeof navigator !== "undefined" && !!navigator.canShare;

  return createPortal(
    <div className="grafica-overlay" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClose(); }} role="dialog" aria-modal="true" aria-label={titolo}>
      <div className="grafica-box" onClick={(e) => e.stopPropagation()}>
        <button className="grafica-chiudi" onClick={onClose} aria-label="Chiudi">×</button>
        <h3 className="grafica-titolo">{titolo}</h3>
        <div className="grafica-formati">
          <button className={"filter-btn" + (formato === "post" ? " filter-btn--active" : "")} onClick={() => setFormato("post")}>Post quadrato</button>
          <button className={"filter-btn" + (formato === "storia" ? " filter-btn--active" : "")} onClick={() => setFormato("storia")}>Storia verticale</button>
        </div>
        <div className={"grafica-anteprima" + (formato === "storia" ? " grafica-anteprima--storia" : "")}>
          <canvas ref={canvasRef} style={{ opacity: pronta ? 1 : 0.3 }} />
        </div>
        <div className="grafica-azioni">
          {puoCondividere && <button className="grafica-btn grafica-btn--oro" onClick={condividi} disabled={!pronta}>Condividi</button>}
          <button className={"grafica-btn" + (puoCondividere ? "" : " grafica-btn--oro")} onClick={suFacebook} disabled={!pronta}>Pubblica su Facebook</button>
          <button className="grafica-btn" onClick={scarica} disabled={!pronta}>Scarica immagine</button>
        </div>
        {msg && <p className="grafica-msg">{msg}</p>}
        {mostraLinkFb && (
          <a className="grafica-btn" href={PAGINA_FB} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "0.5rem" }}>Apri la pagina Facebook</a>
        )}
      </div>
    </div>,
    document.body
  );
}

export function GraficaRisultatoModal({ partita, onClose }) {
  return (
    <ModaleGrafica
      titolo="Grafica del risultato"
      chiave={partita.casa + partita.ospite + partita.risultato}
      disegnaSu={(canvas, formato) => disegna(canvas, partita, formato)}
      nomeFileDi={(formato) => nomeFile(partita, formato)}
      link="/risultati"
      testo={`${nomeBello(partita.casa)} ${String(partita.risultato).replace(/\s/g, "")} ${nomeBello(partita.ospite)} — risultati e classifiche su www.pallavolleyamo.it`}
      onClose={onClose}
    />
  );
}

// Pulsante per la pagina "Post Facebook": copertina del post del weekend
export function PulsanteGraficaWeekend({ dati, stile }) {
  const [aperto, setAperto] = useState(false);
  if (!dati || !dati.totale) return null;
  const risultati = dati.modo === "risultati";
  return (
    <>
      <button onClick={() => setAperto(true)} style={stile}>📸 Crea grafica del post</button>
      {aperto && (
        <ModaleGrafica
          titolo={risultati ? "Grafica: risultati del weekend" : "Grafica: weekend del volley"}
          chiave={JSON.stringify(dati)}
          disegnaSu={(canvas, formato) => disegnaWeekend(canvas, dati, formato)}
          nomeFileDi={(formato) => (risultati ? "risultati-weekend" : "weekend-volley-umbria") + (formato === "storia" ? "-storia" : "") + ".png"}
          link="/weekend-umbria"
          testo={(risultati ? "I risultati del weekend in Umbria" : "Il weekend del volley in Umbria") + " su www.pallavolleyamo.it"}
          onClose={() => setAperto(false)}
        />
      )}
    </>
  );
}

// Pulsante per la pagina "Squadra della Settimana"
export function PulsanteGraficaSquadra({ dati }) {
  const [aperto, setAperto] = useState(false);
  if (!dati || !dati.nome) return null;
  const pulisci = (t) => (t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return (
    <>
      <span role="button" tabIndex={0} className="grafica-apri" onClick={() => setAperto(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setAperto(true); }}
        title="Crea l'immagine della Squadra della Settimana da pubblicare sui social">
        📸 Crea grafica social
      </span>
      {aperto && (
        <ModaleGrafica
          titolo="Grafica: Squadra della Settimana"
          chiave={JSON.stringify(dati)}
          disegnaSu={(canvas, formato) => disegnaSquadraSettimana(canvas, dati, formato)}
          nomeFileDi={(formato) => "squadra-della-settimana-" + pulisci(dati.nome) + (formato === "storia" ? "-storia" : "") + ".png"}
          link="/squadra-settimana"
          testo={`🏆 Squadra della Settimana: ${nomeBello(dati.nome)}! Tutti i risultati su www.pallavolleyamo.it`}
          onClose={() => setAperto(false)}
        />
      )}
    </>
  );
}

// Pulsantino da mettere sotto (o dentro) una partita giocata
export function PulsanteGrafica({ partita, piccolo }) {
  const [aperto, setAperto] = useState(false);
  const [a, b] = leggiPunteggio(partita.risultato);
  if (a === b) return null; // partita non ancora giocata
  const apri = (e) => { e.preventDefault(); e.stopPropagation(); setAperto(true); };
  return (
    <>
      <span
        role="button"
        tabIndex={0}
        className={"grafica-apri" + (piccolo ? " grafica-apri--piccolo" : "")}
        onClick={apri}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") apri(e); }}
        title="Crea l'immagine del risultato da pubblicare sui social"
      >
        📸 {piccolo ? "Grafica" : "Crea grafica social"}
      </span>
      {aperto && <GraficaRisultatoModal partita={partita} onClose={() => setAperto(false)} />}
    </>
  );
}
