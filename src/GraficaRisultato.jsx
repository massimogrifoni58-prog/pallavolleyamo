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

async function disegna(canvas, partita, formato) {
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
  const y0 = storia ? 230 : 70; // spazio in alto per le storie (barra del profilo)

  // Logo e nome del sito
  const lato = storia ? 170 : 130;
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

  // Fascia in basso con l'indirizzo del sito
  const hFascia = storia ? 150 : 110;
  const yFascia = H - 28 - hFascia - (storia ? 110 : 0);
  const g = ctx.createLinearGradient(0, yFascia, W, yFascia);
  g.addColorStop(0, ORO);
  g.addColorStop(1, ORO_CHIARO);
  ctx.fillStyle = g;
  ctx.fillRect(28, yFascia, W - 56, hFascia);
  ctx.fillStyle = "#141413";
  ctx.textAlign = "center";
  ctx.font = `${storia ? 58 : 50}px "Bebas Neue", Impact, sans-serif`;
  ctx.fillText("WWW.PALLAVOLLEYAMO.IT", W / 2, yFascia + hFascia * 0.4);
  ctx.font = `400 ${storia ? 28 : 24}px "DM Sans", Arial, sans-serif`;
  ctx.fillText("Risultati e classifiche del volley umbro", W / 2, yFascia + hFascia * 0.76);
}

function nomeFile(p, formato) {
  const pulisci = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `risultato-${pulisci(p.casa)}-${pulisci(p.ospite)}${formato === "storia" ? "-storia" : ""}.png`;
}

export function GraficaRisultatoModal({ partita, onClose }) {
  const canvasRef = useRef(null);
  const [formato, setFormato] = useState("post");
  const [pronta, setPronta] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let attivo = true;
    setPronta(false);
    disegna(canvasRef.current, partita, formato).then(() => { if (attivo) setPronta(true); });
    return () => { attivo = false; };
  }, [partita, formato]);

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
    a.download = nomeFile(partita, formato);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg("Immagine scaricata: ora puoi pubblicarla sui social.");
  }

  async function condividi() {
    const blob = await comeFile();
    if (!blob) return;
    const file = new File([blob], nomeFile(partita, formato), { type: "image/png" });
    const testo = `${nomeBello(partita.casa)} ${partita.risultato.replace(/\s/g, "")} ${nomeBello(partita.ospite)} — risultati e classifiche su www.pallavolleyamo.it`;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: testo }); } catch (e) { /* annullato */ }
    } else {
      scarica();
    }
  }

  const puoCondividere = typeof navigator !== "undefined" && !!navigator.canShare;

  return createPortal(
    <div className="grafica-overlay" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClose(); }} role="dialog" aria-modal="true" aria-label="Grafica del risultato">
      <div className="grafica-box" onClick={(e) => e.stopPropagation()}>
        <button className="grafica-chiudi" onClick={onClose} aria-label="Chiudi">×</button>
        <h3 className="grafica-titolo">Grafica del risultato</h3>
        <div className="grafica-formati">
          <button className={"filter-btn" + (formato === "post" ? " filter-btn--active" : "")} onClick={() => setFormato("post")}>Post quadrato</button>
          <button className={"filter-btn" + (formato === "storia" ? " filter-btn--active" : "")} onClick={() => setFormato("storia")}>Storia verticale</button>
        </div>
        <div className={"grafica-anteprima" + (formato === "storia" ? " grafica-anteprima--storia" : "")}>
          <canvas ref={canvasRef} style={{ opacity: pronta ? 1 : 0.3 }} />
        </div>
        <div className="grafica-azioni">
          {puoCondividere && <button className="grafica-btn grafica-btn--oro" onClick={condividi} disabled={!pronta}>Condividi</button>}
          <button className={"grafica-btn" + (puoCondividere ? "" : " grafica-btn--oro")} onClick={scarica} disabled={!pronta}>Scarica immagine</button>
        </div>
        {msg && <p className="grafica-msg">{msg}</p>}
      </div>
    </div>,
    document.body
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
