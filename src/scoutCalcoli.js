// Definizioni e calcoli dello scout partita.
//
// Ogni fondamentale ha le proprie voci contate: si registrano i tentativi e
// gli esiti, e da lì si ricavano tutte le percentuali mostrate nelle pagine.
export const FONDAMENTALI_SCOUT = [
  {
    key: "attacco",
    label: "Attacco",
    voci: [
      { key: "tentativi", label: "Tent." },
      { key: "punti", label: "Punto" },
      { key: "errori", label: "Err." },
      { key: "murati", label: "Murat." },
    ],
  },
  {
    key: "battuta",
    label: "Battuta",
    voci: [
      { key: "tentativi", label: "Tent." },
      { key: "ace", label: "Ace" },
      { key: "errori", label: "Err." },
      { key: "positive", label: "Pos." },
    ],
  },
  {
    key: "ricezione",
    label: "Ricezione",
    voci: [
      { key: "tentativi", label: "Tent." },
      { key: "positive", label: "Pos." },
      { key: "negative", label: "Neg." },
      { key: "errori", label: "Err." },
    ],
  },
  {
    key: "difesa",
    label: "Difesa",
    voci: [
      { key: "tentativi", label: "Tent." },
      { key: "positive", label: "Pos." },
      { key: "errori", label: "Err." },
    ],
  },
  {
    key: "muro",
    label: "Muro",
    voci: [
      { key: "tentativi", label: "Tent." },
      { key: "punti", label: "Punto" },
      { key: "tocchi", label: "Tocco" },
      { key: "errori", label: "Err." },
    ],
  },
];

export function vociDi(fondamentale) {
  return FONDAMENTALI_SCOUT.find((f) => f.key === fondamentale)?.voci || [];
}

// Somma i dati di più set nello stesso oggetto, per atleta.
export function sommaSet(setScelti, datiPerSet) {
  const totali = {};
  setScelti.forEach((numeroSet) => {
    const righe = datiPerSet?.[numeroSet] || {};
    Object.entries(righe).forEach(([atletaId, perFondamentale]) => {
      if (!totali[atletaId]) totali[atletaId] = {};
      FONDAMENTALI_SCOUT.forEach((f) => {
        const origine = perFondamentale?.[f.key];
        if (!origine) return;
        if (!totali[atletaId][f.key]) totali[atletaId][f.key] = {};
        f.voci.forEach((v) => {
          const valore = Number(origine[v.key] || 0);
          totali[atletaId][f.key][v.key] =
            (totali[atletaId][f.key][v.key] || 0) + valore;
        });
      });
    });
  });
  return totali;
}

// Somma i totali di tutte le atlete: dato di squadra.
export function totaleSquadra(totaliPerAtleta) {
  const squadra = {};
  FONDAMENTALI_SCOUT.forEach((f) => {
    squadra[f.key] = {};
    f.voci.forEach((v) => (squadra[f.key][v.key] = 0));
  });
  Object.values(totaliPerAtleta).forEach((perAtleta) => {
    FONDAMENTALI_SCOUT.forEach((f) => {
      f.voci.forEach((v) => {
        squadra[f.key][v.key] += Number(perAtleta?.[f.key]?.[v.key] || 0);
      });
    });
  });
  return squadra;
}

const perc = (parte, totale) =>
  totale > 0 ? Math.round((parte / totale) * 100) : null;

// Indicatori derivati, usati sia per la squadra sia per la singola atleta.
export function indicatori(d) {
  const att = d.attacco || {};
  const bat = d.battuta || {};
  const ric = d.ricezione || {};
  const dif = d.difesa || {};
  const mur = d.muro || {};

  const puntiFatti =
    Number(att.punti || 0) + Number(mur.punti || 0) + Number(bat.ace || 0);

  // Un punto "regalato" è un errore che assegna direttamente il punto
  // all'avversaria: gli attacchi murati rientrano fra questi.
  const regalati = {
    attacco: Number(att.errori || 0) + Number(att.murati || 0),
    battuta: Number(bat.errori || 0),
    ricezione: Number(ric.errori || 0),
    difesa: Number(dif.errori || 0),
    muro: Number(mur.errori || 0),
  };
  const puntiRegalati = Object.values(regalati).reduce((s, v) => s + v, 0);

  return {
    puntiFatti,
    puntiRegalati,
    regalati,
    saldo: puntiFatti - puntiRegalati,
    attaccoPositiva: perc(att.punti, att.tentativi),
    attaccoEfficienza:
      att.tentativi > 0
        ? Math.round(
            ((Number(att.punti || 0) - Number(att.errori || 0) - Number(att.murati || 0)) /
              att.tentativi) *
              100
          )
        : null,
    battutaAce: perc(bat.ace, bat.tentativi),
    battutaErrore: perc(bat.errori, bat.tentativi),
    ricezionePositiva: perc(ric.positive, ric.tentativi),
    difesaPositiva: perc(dif.positive, dif.tentativi),
    muroEfficacia:
      mur.tentativi > 0
        ? perc(Number(mur.punti || 0) + Number(mur.tocchi || 0), mur.tentativi)
        : null,
  };
}

// Unisce due mappe di totali per atleta (usata per il consuntivo stagionale).
export function unisciTotali(a, b) {
  const out = JSON.parse(JSON.stringify(a || {}));
  Object.entries(b || {}).forEach(([atletaId, perFondamentale]) => {
    if (!out[atletaId]) out[atletaId] = {};
    FONDAMENTALI_SCOUT.forEach((f) => {
      const origine = perFondamentale?.[f.key];
      if (!origine) return;
      if (!out[atletaId][f.key]) out[atletaId][f.key] = {};
      f.voci.forEach((v) => {
        out[atletaId][f.key][v.key] =
          (out[atletaId][f.key][v.key] || 0) + Number(origine[v.key] || 0);
      });
    });
  });
  return out;
}

// --- La riga classica del foglio scout ---
//
// Interventi, punti, errori, giocati e percentuale: è come si leggono i
// fondamentali su qualunque referto, e serve perché "28 attacchi" non dice
// niente finché non sai quanti sono diventati punto e quanti errore.
//
//   interventi  tutti i palloni toccati in quel fondamentale
//   punti       quelli che hanno chiuso l'azione a nostro favore
//   errori      quelli che l'hanno chiusa a favore delle avversarie
//   giocati     gli altri: la palla è rimasta in gioco
//   perc        efficienza, (punti − errori) / interventi
//
// Battuta, ricezione e difesa non fanno punto diretto allo stesso modo
// dell'attacco: per loro "punti" vale l'esito migliore previsto dal
// fondamentale — l'ace per la battuta, il pallone positivo per le altre.
export function rigaFondamentale(dati, fondamentale) {
  const d = dati?.[fondamentale] || {};
  const n = (v) => Number(v || 0);
  const interventi = n(d.tentativi);

  let punti = 0;
  let errori = 0;
  if (fondamentale === "attacco") {
    punti = n(d.punti);
    // Un attacco murato è un punto regalato esattamente come un errore.
    errori = n(d.errori) + n(d.murati);
  } else if (fondamentale === "battuta") {
    punti = n(d.ace);
    errori = n(d.errori);
  } else if (fondamentale === "muro") {
    punti = n(d.punti);
    errori = n(d.errori);
  } else {
    // Ricezione e difesa: il "punto" è il pallone positivo.
    punti = n(d.positive);
    errori = n(d.errori);
  }

  const giocati = Math.max(0, interventi - punti - errori);
  const perc = interventi > 0 ? Math.round(((punti - errori) / interventi) * 100) : null;
  return { fondamentale, interventi, punti, errori, giocati, perc };
}

// Tutte e cinque le righe più il totale, per una singola atleta o per la
// squadra. Il totale somma le colonne: la percentuale va ricalcolata sul
// totale, non fatta come media delle percentuali — sarebbe un numero diverso
// e sbagliato, perché i fondamentali hanno quantità molto diverse fra loro.
export function prospetto(dati) {
  const righe = FONDAMENTALI_SCOUT.map((f) => ({
    ...rigaFondamentale(dati, f.key),
    etichetta: f.label,
  }));
  const somma = righe.reduce(
    (acc, r) => ({
      interventi: acc.interventi + r.interventi,
      punti: acc.punti + r.punti,
      errori: acc.errori + r.errori,
      giocati: acc.giocati + r.giocati,
    }),
    { interventi: 0, punti: 0, errori: 0, giocati: 0 }
  );
  return {
    righe,
    totale: {
      ...somma,
      etichetta: "Totale",
      perc:
        somma.interventi > 0
          ? Math.round(((somma.punti - somma.errori) / somma.interventi) * 100)
          : null,
    },
  };
}

// --- Confronto fra un'atleta e le sue compagne ---
//
// Il riferimento per capire se un numero è buono non va cercato fuori. Gli
// studi pubblicati misurano selezioni nazionali con strumenti di codifica
// propri: livello diverso e definizioni diverse, quindi un confronto che
// sembra scientifico e non lo è. Qui il paragone è con le compagne, che hanno
// giocato le stesse partite, contro le stesse avversarie, con lo stesso
// scout e gli stessi criteri. È l'unico confronto che non porta dentro
// ipotesi che non possiamo verificare.
//
// L'atleta è esclusa dalla media delle compagne: altrimenti si confronterebbe
// in parte con se stessa, e più è brava più il riferimento si alza da solo.

// Sotto questi tentativi il confronto non si mostra. Con dodici palloni un
// singolo errore sposta la percentuale di otto punti: un numero del genere
// non dice se un'atleta è in difficoltà, dice solo com'è andata quella sera.
export const TENTATIVI_MINIMI_CONFRONTO = { atleta: 12, compagne: 25 };

// Le voci confrontabili: per ogni fondamentale l'indicatore che conta, con il
// verso giusto. Negli errori in battuta il valore più basso è il migliore, e
// mostrarlo senza dirlo farebbe leggere al contrario tutta la riga.
const VOCI_CONFRONTO = [
  {
    chiave: "attaccoEfficienza",
    etichetta: "Attacco — efficienza",
    fondamentale: "attacco",
    piuEMeglio: true,
  },
  { chiave: "battutaAce", etichetta: "Battuta — ace", fondamentale: "battuta", piuEMeglio: true },
  {
    chiave: "battutaErrore",
    etichetta: "Battuta — errori",
    fondamentale: "battuta",
    piuEMeglio: false,
  },
  {
    chiave: "ricezionePositiva",
    etichetta: "Ricezione — positiva",
    fondamentale: "ricezione",
    piuEMeglio: true,
  },
  {
    chiave: "difesaPositiva",
    etichetta: "Difesa — positiva",
    fondamentale: "difesa",
    piuEMeglio: true,
  },
  { chiave: "muroEfficacia", etichetta: "Muro — efficacia", fondamentale: "muro", piuEMeglio: true },
];

// Somma i totali grezzi di più atlete prima di calcolare le percentuali.
// Fare la media delle percentuali darebbe lo stesso peso a chi ha giocato
// trenta palloni e a chi ne ha giocati tre.
function sommaGrezzi(elenco) {
  const fuori = {};
  elenco.forEach((perFondamentale) => {
    FONDAMENTALI_SCOUT.forEach((f) => {
      const origine = perFondamentale?.[f.key];
      if (!origine) return;
      if (!fuori[f.key]) fuori[f.key] = {};
      f.voci.forEach((v) => {
        fuori[f.key][v.key] = (fuori[f.key][v.key] || 0) + Number(origine[v.key] || 0);
      });
    });
  });
  return fuori;
}

export function confrontoCompagne(totaliPerAtleta, atletaId, opzioni = {}) {
  const minimoAtleta = opzioni.minimoAtleta ?? TENTATIVI_MINIMI_CONFRONTO.atleta;
  const minimoCompagne = opzioni.minimoCompagne ?? TENTATIVI_MINIMI_CONFRONTO.compagne;

  const suoi = totaliPerAtleta?.[atletaId];
  if (!suoi) return { righe: [], quante: 0 };

  const altre = Object.entries(totaliPerAtleta)
    .filter(([id]) => id !== atletaId)
    .map(([, d]) => d);
  if (altre.length === 0) return { righe: [], quante: 0 };

  const grezziCompagne = sommaGrezzi(altre);
  const indLei = indicatori(suoi);
  const indCompagne = indicatori(grezziCompagne);

  const righe = VOCI_CONFRONTO.map((v) => {
    const tentativiLei = Number(suoi?.[v.fondamentale]?.tentativi || 0);
    const tentativiCompagne = Number(grezziCompagne?.[v.fondamentale]?.tentativi || 0);
    const lei = indLei[v.chiave];
    const compagne = indCompagne[v.chiave];

    // Mancano i dati, oppure sono troppo pochi perché il confronto significhi
    // qualcosa: la riga resta, ma dice perché non c'è un numero. Nasconderla
    // farebbe sembrare che quel fondamentale non si misuri.
    const sufficiente =
      lei != null &&
      compagne != null &&
      tentativiLei >= minimoAtleta &&
      tentativiCompagne >= minimoCompagne;

    return {
      ...v,
      lei,
      compagne,
      tentativiLei,
      tentativiCompagne,
      sufficiente,
      scarto: sufficiente ? lei - compagne : null,
      // Il verso: positivo vuol dire "meglio delle compagne", anche dove il
      // numero più basso è quello buono.
      meglio: sufficiente ? (v.piuEMeglio ? lei > compagne : lei < compagne) : null,
    };
  });

  return { righe, quante: altre.length };
}
