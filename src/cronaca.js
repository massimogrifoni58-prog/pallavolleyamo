// Cronaca automatica delle partite: usa SOLO fatti ricavabili dai dati (punteggio in set,
// giornata, punti in classifica). Niente dettagli inventati sull'andamento della gara.
// Modulo senza dipendenze: lo usano sia il sito (Vite) sia lo script che crea le pagine per Google.

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
export const nomeBello = (s) =>
  (s || "").replace(/\s+/g, " ").trim().split(" ")
    .map((w) => (w === w.toUpperCase() || w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");

export function leggiSet(ris) {
  const m = String(ris || "").match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  if (a === b) return null;
  return { a, b };
}

// Classifica FIPAV: 3-0 e 3-1 = 3 punti; 3-2 = 2 punti al vincitore e 1 allo sconfitto
function classificaFinoA(partiteCamp, dataLimite) {
  const t = {};
  partiteCamp.forEach((m) => {
    if (!m.data || m.data > dataLimite) return;
    const s = leggiSet(m.ris);
    if (!s) return;
    [m.casa, m.ospite].forEach((n) => { t[norm(n)] ||= { nome: n, g: 0, v: 0, sv: 0, sp: 0, pts: 0 }; });
    const c = t[norm(m.casa)], o = t[norm(m.ospite)];
    c.g++; o.g++;
    c.sv += s.a; c.sp += s.b; o.sv += s.b; o.sp += s.a;
    if (s.a > s.b) { c.v++; if (s.b <= 1) c.pts += 3; else { c.pts += 2; o.pts += 1; } }
    else { o.v++; if (s.a <= 1) o.pts += 3; else { o.pts += 2; c.pts += 1; } }
  });
  return Object.values(t).sort((x, y) =>
    y.pts - x.pts || y.v - x.v || (y.sp ? y.sv / y.sp : 0) - (x.sp ? x.sv / x.sp : 0));
}

const indice = (id, n) => {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % n;
};

// p: { id, camp, giornata, data, casa, ospite, ris }   tutte: tutte le partite note (di qualsiasi campionato)
export function cronaca(p, tutte) {
  const s = leggiSet(p.ris);
  if (!s) return "";
  const casaVince = s.a > s.b;
  const V = nomeBello(casaVince ? p.casa : p.ospite);
  const P = nomeBello(casaVince ? p.ospite : p.casa);
  const setV = Math.max(s.a, s.b), setP = Math.min(s.a, s.b);
  const k = indice(p.id, 3);

  let frase;
  if (setP === 0) {
    frase = [
      `${V} batte ${P} per ${setV}-${setP}, senza concedere set.`,
      `Vittoria netta per ${V}: ${setV}-${setP} su ${P}.`,
      `${V} supera ${P} con un pulito ${setV}-${setP}.`,
    ][k];
  } else if (setP === 1) {
    frase = [
      `${V} ha la meglio su ${P} per ${setV}-${setP}.`,
      `${V} vince ${setV}-${setP} contro ${P} in quattro set.`,
      `Successo per ${V}, che supera ${P} per ${setV}-${setP}.`,
    ][k];
  } else {
    frase = [
      `${V} supera ${P} al tie-break (${setV}-${setP}): decisivo il quinto set.`,
      `Finisce ${setV}-${setP} per ${V} contro ${P}, dopo cinque set combattuti.`,
      `${V} la spunta su ${P} al quinto set, ${setV}-${setP}.`,
    ][k];
  }
  if (!casaVince) frase += ` Il successo arriva in trasferta.`;

  // classifica dopo la partita (solo se la stagione e' abbastanza avanti da avere senso)
  const stessoCamp = tutte.filter((m) => norm(m.camp) === norm(p.camp));
  const tab = classificaFinoA(stessoCamp, p.data);
  const pos = tab.findIndex((x) => norm(x.nome) === norm(casaVince ? p.casa : p.ospite));
  const riga = pos >= 0 ? tab[pos] : null;
  const giornata = parseInt(String(p.giornata || "").replace(/\D/g, ""), 10);
  if (riga && riga.g >= 2 && giornata >= 2) {
    if (pos === 0) frase += ` ${V} è al comando della classifica con ${riga.pts} punti.`;
    else frase += ` ${V} sale a ${riga.pts} punti e occupa la ${pos + 1}ª posizione.`;
  }
  if (setP === 2) frase += ` Un punto in classifica anche per ${P}.`;
  return frase;
}
