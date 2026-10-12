// La stagione inventata della versione dimostrativa.
//
// Tutto quello che c'è qui dentro è finto: la società, le atlete, i nomi, le
// date di nascita, i contatti. Nessun dato di una persona reale, e in
// particolare nessun dato delle atlete vere — sono minorenni, e una
// dimostrazione si fa davanti a estranei.
//
// I numeri però sono costruiti per essere plausibili: le presenze calano a
// gennaio come succede davvero, le percentuali dello scout stanno nei valori
// che si vedono in una giovanile, le rate delle quote sono pagate a metà.
// Dati casuali si riconoscono subito e la dimostrazione perde credibilità.
//
// Le date sono calcolate a partire da oggi, così la demo non invecchia: le
// gare passate restano passate e le prossime restano future anche fra un anno.

const SOCIETA = "Pallavolo Valle Verde";

// Uno stemma inventato per la società inventata: un pallone disegnato, niente
// che somigli al marchio di una società vera.
const LOGO_INVENTATO =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5NiA5NiI+CjxyZWN0IHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgcng9IjIwIiBmaWxsPSIjMmY1ZDFmIi8+CjxjaXJjbGUgY3g9IjQ4IiBjeT0iNDgiIHI9IjI2IiBmaWxsPSJub25lIiBzdHJva2U9IiNkZmYyYjgiIHN0cm9rZS13aWR0aD0iMyIvPgo8cGF0aCBkPSJNMjIgNDggQzM0IDM4IDYyIDM4IDc0IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNkZmYyYjgiIHN0cm9rZS13aWR0aD0iMyIvPgo8cGF0aCBkPSJNMzYgMjUgQzQ1IDQyIDQ1IDU2IDMyIDcwIiBmaWxsPSJub25lIiBzdHJva2U9IiNkZmYyYjgiIHN0cm9rZS13aWR0aD0iMyIvPgo8cGF0aCBkPSJNNjIgMjQgQzU1IDQyIDU4IDU3IDY4IDY4IiBmaWxsPSJub25lIiBzdHJva2U9IiNkZmYyYjgiIHN0cm9rZS13aWR0aD0iMyIvPgo8L3N2Zz4=";
const CATEGORIA = "U16";
const PALESTRA = "Palestra comunale — via dei Tigli";

// ---------- calendario ----------

function iso(data) {
  return data.toISOString().slice(0, 10);
}
function giornoRelativo(giorni) {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + giorni);
  return d;
}
function dataRelativa(giorni) {
  return iso(giornoRelativo(giorni));
}
// Indice del giorno della settimana con lunedì = 0, come lo usa l'app.
function indiceGiorno(dataIso) {
  const [a, m, g] = dataIso.split("-").map(Number);
  return (new Date(Date.UTC(a, m - 1, g)).getUTCDay() + 6) % 7;
}

// Quanti giorni fa è cominciata la stagione: il 1° settembre, o quello
// dell'anno prima se siamo nei primi mesi dell'anno. Serve perché la demo
// resti credibile in qualunque mese la si apra: sedute e gare non devono
// cadere a luglio, quando le palestre sono chiuse.
function giorniDallInizioStagione() {
  const oggi = new Date();
  oggi.setUTCHours(12, 0, 0, 0);
  const anno = oggi.getUTCMonth() >= 7 ? oggi.getUTCFullYear() : oggi.getUTCFullYear() - 1;
  const inizio = new Date(Date.UTC(anno, 8, 1, 12, 0, 0));
  return Math.round((oggi - inizio) / 86400000);
}

// La finestra su cui si distribuisce tutto: mai prima dell'inizio stagione e
// mai più indietro di quattro mesi, altrimenti le tabelle diventano enormi.
function finestraStagione() {
  return Math.min(Math.max(giorniDallInizioStagione(), 21), 120);
}

// Un generatore con seme fisso: la demo deve essere identica ogni volta che
// si apre, altrimenti due persone che la guardano vedono numeri diversi e
// non si può raccontare niente di preciso.
function generatore(seme) {
  let stato = seme;
  return function prossimo() {
    stato = (stato * 1103515245 + 12345) & 0x7fffffff;
    return stato / 0x7fffffff;
  };
}

// ---------- la rosa ----------
// Venti atlete, nomi inventati, ruoli e numeri coerenti: due palleggiatrici,
// due opposti, quattro centrali, otto schiacciatrici, due liberi, più due
// fuori quota che si allenano con la prima squadra.

const ROSA = [
  { id: "at01", nome: "Giulia", cognome: "Baldini", maglia: "1", ruolo: "Palleggiatrice", nascita: "2010-03-14" },
  { id: "at02", nome: "Sofia", cognome: "Benedetti", maglia: "2", ruolo: "Schiacciatrice", nascita: "2010-07-02" },
  { id: "at03", nome: "Alice", cognome: "Carboni", maglia: "4", ruolo: "Centrale", nascita: "2009-11-21" },
  { id: "at04", nome: "Matilde", cognome: "Donati", maglia: "5", ruolo: "Schiacciatrice", nascita: "2010-01-09" },
  { id: "at05", nome: "Emma", cognome: "Fabbri", maglia: "6", ruolo: "Opposto", nascita: "2009-09-30" },
  { id: "at06", nome: "Chiara", cognome: "Gentili", maglia: "7", ruolo: "Libero", nascita: "2010-05-18" },
  { id: "at07", nome: "Viola", cognome: "Lanzi", maglia: "8", ruolo: "Centrale", nascita: "2010-02-27" },
  { id: "at08", nome: "Noemi", cognome: "Marchetti", maglia: "9", ruolo: "Schiacciatrice", nascita: "2009-12-05" },
  { id: "at09", nome: "Sara", cognome: "Nardi", maglia: "10", ruolo: "Schiacciatrice", nascita: "2010-08-23" },
  { id: "at10", nome: "Beatrice", cognome: "Orsini", maglia: "11", ruolo: "Palleggiatrice", nascita: "2010-04-11" },
  { id: "at11", nome: "Ludovica", cognome: "Pazzaglia", maglia: "12", ruolo: "Centrale", nascita: "2009-10-16" },
  { id: "at12", nome: "Greta", cognome: "Rinaldi", maglia: "13", ruolo: "Schiacciatrice", nascita: "2010-06-07" },
  { id: "at13", nome: "Aurora", cognome: "Sabatini", maglia: "14", ruolo: "Opposto", nascita: "2009-08-29" },
  { id: "at14", nome: "Martina", cognome: "Tenti", maglia: "15", ruolo: "Schiacciatrice", nascita: "2010-09-12" },
  { id: "at15", nome: "Elisa", cognome: "Valentini", maglia: "16", ruolo: "Centrale", nascita: "2010-11-03" },
  { id: "at16", nome: "Camilla", cognome: "Zanetti", maglia: "17", ruolo: "Libero", nascita: "2010-12-19" },
  { id: "at17", nome: "Nicole", cognome: "Barbieri", maglia: "18", ruolo: "Schiacciatrice", nascita: "2011-01-25" },
  { id: "at18", nome: "Asia", cognome: "Cecchini", maglia: "19", ruolo: "Schiacciatrice", nascita: "2011-02-08" },
  { id: "at19", nome: "Rebecca", cognome: "Fiorini", maglia: "3", ruolo: "Palleggiatrice", nascita: "2011-03-30" },
  { id: "at20", nome: "Linda", cognome: "Gasperini", maglia: "20", ruolo: "Centrale", nascita: "2011-05-14" },
];

// Chi si allena con regolarità e chi no. Serve perché le presenze abbiano un
// senso: la pagina "chi sta calando" non dice niente se tutte sono al 90%.
const COSTANZA = {
  at01: 0.96, at02: 0.92, at03: 0.88, at04: 0.94, at05: 0.9,
  at06: 0.97, at07: 0.72, at08: 0.86, at09: 0.93, at10: 0.91,
  at11: 0.84, at12: 0.58, at13: 0.89, at14: 0.95, at15: 0.8,
  at16: 0.9, at17: 0.76, at18: 0.87, at19: 0.92, at20: 0.69,
};

// Le due atlete che hanno cominciato a mancare: nelle ultime sei sedute sono
// state presenti solo in quelle elencate (contate da fondo, 0 = l'ultima).
// Prima erano intorno al 60 e al 70 per cento: il salto è quello che il
// pannello "da tenere d'occhio" deve riconoscere.
const CALO_DICHIARATO = {
  at12: [4],
  at20: [0, 3],
};

// Chi è brava in cosa, da 0.8 a 1.2: moltiplica i numeri dello scout, così
// l'opposto attacca più della palleggiatrice e il libero riceve meglio.
const BRAVURA = {
  at01: { palleggio: 1.2 }, at05: { attacco: 1.15 }, at13: { attacco: 1.1 },
  at06: { ricezione: 1.2, difesa: 1.15 }, at16: { ricezione: 1.15, difesa: 1.1 },
  at03: { muro: 1.15 }, at11: { muro: 1.1 }, at09: { attacco: 1.08, battuta: 1.1 },
};

const AVVERSARIE = [
  "Volley Colle San Marco",
  "Pallavolo Ponte Nuovo",
  "ASD Rocca Alta",
  "Virtus Torremare",
  "Libertas Fonteluna",
  "Pallavolo Castelbruno",
  "Olimpia Valdichiara",
];

// ---------- gli accessi ----------

export const ACCOUNT_DEMO = [
  {
    uid: "u-allenatore",
    email: "allenatore@demo.it",
    nome: "Marta",
    cognome: "Ferraris",
    etichetta: "Allenatrice",
    descrizione: "Vede e modifica tutto il lavoro tecnico, le presenze e le gare",
  },
  {
    uid: "u-dirigente",
    email: "dirigente@demo.it",
    nome: "Paolo",
    cognome: "Riva",
    etichetta: "Amministratore",
    descrizione: "Quote, scadenze e comunicazioni; non entra nell'area tecnica",
  },
  {
    uid: "u-atleta",
    email: "atleta@demo.it",
    nome: "Giulia",
    cognome: "Baldini",
    etichetta: "Atleta",
    descrizione: "Vede soltanto i propri dati: impegni, presenze, test, programma",
  },
  {
    uid: "u-genitore",
    email: "genitore@demo.it",
    nome: "Genitore",
    cognome: "Baldini",
    etichetta: "Genitore",
    descrizione: "Come l'atleta collegata, per la propria figlia",
  },
];

// ---------- costruzione ----------

export function costruisciStagione() {
  const casuale = generatore(20260412);
  const doc = {};
  const stagione = (() => {
    const oggi = new Date();
    const anno = oggi.getFullYear();
    return oggi.getMonth() >= 7 ? `${anno}/${anno + 1}` : `${anno - 1}/${anno}`;
  })();

  // --- impostazioni ---
  doc["impostazioni/generale"] = {
    nomeSocieta: SOCIETA,
    logoDataUrl: LOGO_INVENTATO,
    sfondoAreaTecnica: "",
    inquadraturaSfondo: "center",
  };

  // --- account ---
  doc["users/u-allenatore"] = {
    nome: "Marta", cognome: "Ferraris", email: "allenatore@demo.it",
    ruolo: "allenatore", schemaRuoli: 2, amministratore: false,
    categorie: [], atletaId: null,
  };
  doc["users/u-dirigente"] = {
    nome: "Paolo", cognome: "Riva", email: "dirigente@demo.it",
    ruolo: "amministratore", schemaRuoli: 2, amministratore: false,
    categorie: [], atletaId: null,
  };
  doc["users/u-atleta"] = {
    nome: "Giulia", cognome: "Baldini", email: "atleta@demo.it",
    ruolo: "atleta", schemaRuoli: 2, categorie: [], atletaId: "at01",
  };
  doc["users/u-genitore"] = {
    nome: "Genitore", cognome: "Baldini", email: "genitore@demo.it",
    ruolo: "genitore", schemaRuoli: 2, categorie: [], atletaId: "at01",
  };
  // Qualche atleta con un accesso proprio: serve alla pagina Gestione utenti
  // per non mostrare una tabella con quattro righe.
  ROSA.slice(1, 9).forEach((a, i) => {
    doc[`users/u-${a.id}`] = {
      nome: a.nome, cognome: a.cognome,
      email: `${a.nome.toLowerCase()}.${a.cognome.toLowerCase()}@demo.it`,
      ruolo: "atleta", schemaRuoli: 2, categorie: [], atletaId: a.id,
    };
    // Chi è entrato di recente e chi non è mai entrata.
    if (i < 6) {
      doc[`loginLog/u-${a.id}`] = {
        ultimoAccesso: dataConOra(-(i + 1), 19, 30),
        email: `${a.nome.toLowerCase()}.${a.cognome.toLowerCase()}@demo.it`,
      };
    }
  });
  doc["loginLog/u-allenatore"] = { ultimoAccesso: dataConOra(0, 8, 15), email: "allenatore@demo.it" };
  doc["loginLog/u-atleta"] = { ultimoAccesso: dataConOra(-1, 21, 5), email: "atleta@demo.it" };

  // Notifiche attivate su alcuni dispositivi: così la colonna in Gestione
  // utenti non è tutta vuota.
  ["u-allenatore", "u-atleta", "u-at02", "u-at04", "u-at09"].forEach((uid, i) => {
    doc[`pushTokens/gettone-demo-${i}`] = {
      uid, ruolo: uid === "u-allenatore" ? "allenatore" : "atleta",
      atletaId: null, aggiornato: giornoRelativo(-20 + i),
    };
  });

  // --- schede atleta ---
  ROSA.forEach((a, indice) => {
    // Certificati medici: la maggior parte in regola, due in scadenza nel
    // mese e una scaduta. È la situazione reale di ogni squadra, ed è quello
    // che la pagina deve saper mostrare.
    let scadenzaCertificato;
    if (indice === 11) scadenzaCertificato = dataRelativa(-9);
    else if (indice === 6) scadenzaCertificato = dataRelativa(12);
    else if (indice === 14) scadenzaCertificato = dataRelativa(24);
    else scadenzaCertificato = dataRelativa(90 + indice * 7);

    doc[`atlete/${a.id}`] = {
      nome: a.nome,
      cognome: a.cognome,
      dataNascita: a.nascita,
      codiceFiscale: "",
      numeroTessera: `${480000 + indice * 13}`,
      enteAffiliazione: "FIPAV",
      categoria: CATEGORIA,
      ruoloCampo: a.ruolo,
      numeroMaglia: a.maglia,
      telefono: "",
      emailAtleta: `${a.nome.toLowerCase()}.${a.cognome.toLowerCase()}@demo.it`,
      emailGenitore: `famiglia.${a.cognome.toLowerCase()}@demo.it`,
      note: indice === 11 ? "Studia fuori il martedì: arriva in ritardo." : "",
      noteTecniche: notaTecnica(a),
      storicoCategorie: [{ categoria: "U14", dal: "2024-09-01" }],
      infortuni:
        indice === 6
          ? [{ tipo: "Distorsione caviglia destra", dal: dataRelativa(-48), al: dataRelativa(-20), note: "Rientrata gradualmente." }]
          : [],
      scadenze: [{ tipo: "Certificato medico agonistico", data: scadenzaCertificato }],
      rateQuota: rate(a.id, stagione, indice),
    };
    // L'elenco leggero che vedono anche le atlete.
    doc[`rosa/${a.id}`] = {
      nome: a.nome, cognome: a.cognome, categoria: CATEGORIA,
      ruoloCampo: a.ruolo, numeroMaglia: a.maglia,
    };
  });

  // --- campi e orari ---
  // Martedì e giovedì sera, più il sabato mattina per il lavoro individuale.
  doc["orariCampi/slot-mar"] = { giornoIndice: 1, oraInizio: "18:30", oraFine: "20:30", categoria: CATEGORIA, campo: PALESTRA };
  doc["orariCampi/slot-gio"] = { giornoIndice: 3, oraInizio: "18:30", oraFine: "20:30", categoria: CATEGORIA, campo: PALESTRA };
  doc["orariCampi/slot-sab"] = { giornoIndice: 5, oraInizio: "10:00", oraFine: "11:30", categoria: CATEGORIA, campo: PALESTRA };

  // --- presenze: tre mesi di sedute, martedì e giovedì ---
  const finestra = finestraStagione();
  const sedute = [];
  for (let indietro = finestra; indietro >= 0; indietro -= 1) {
    const data = dataRelativa(-indietro);
    const giorno = indiceGiorno(data);
    // Martedì, giovedì e sabato: gli stessi giorni della griglia in
    // "Campi e orari", altrimenti le due pagine si contraddicono.
    if (giorno !== 1 && giorno !== 3 && giorno !== 5) continue;
    sedute.push(data);
  }

  sedute.forEach((data, i) => {
    const presenze = {};
    // Le ultime sei sedute sono la finestra che l'app confronta col periodo
    // precedente per dire chi sta calando. Per due atlete la frequenza di
    // quelle sei è fissata a mano e non lasciata al caso: con sei valori il
    // tiro casuale può cadere appena sotto la soglia e il pannello resterebbe
    // muto proprio nella pagina che si mostra per prima.
    const indiceDaFondo = sedute.length - 1 - i;
    const nellaFinestra = indiceDaFondo < 6;

    ROSA.forEach((a) => {
      const calo = CALO_DICHIARATO[a.id];
      if (nellaFinestra && calo) {
        presenze[a.id] = calo.includes(indiceDaFondo) ? "presente" : "assente";
        return;
      }
      const base = COSTANZA[a.id];
      const tiro = casuale();
      if (tiro < base - 0.08) presenze[a.id] = "presente";
      else if (tiro < base) presenze[a.id] = "parziale";
      else if (tiro < base + 0.12) presenze[a.id] = "giustificata";
      else presenze[a.id] = "assente";
    });
    doc[`allenamenti/all-${i}`] = { data, categoria: CATEGORIA, presenze };
  });

  // --- assenze annunciate dalle atlete ---
  doc[`assenze/at12_${dataRelativa(2)}`] = {
    atletaId: "at12", data: dataRelativa(2), motivo: "Verifica di matematica il giorno dopo.", creatoIl: giornoRelativo(-1),
  };
  doc[`assenze/at07_${dataRelativa(4)}`] = {
    atletaId: "at07", data: dataRelativa(4), motivo: "Visita medica.", creatoIl: giornoRelativo(0),
  };

  // --- sensazioni dopo la seduta ---
  const ultimeSedute = sedute.slice(-6);
  ultimeSedute.forEach((data, i) => {
    const ultime3 = i >= ultimeSedute.length - 3;
    ["at01", "at04", "at06", "at09", "at14"].forEach((id, j) => {
      // Una sola atleta esce tre sedute di fila come "molto duro" e "così
      // così": è il caso che il pannello del carico deve segnalare, e serve
      // che ci sia, altrimenti quella parte della pagina sembra non fare
      // niente.
      const carico = id === "at09" && ultime3 ? 4 : 2 + Math.round(casuale() * 1);
      doc[`sensazioni/${id}_${data}`] = {
        atletaId: id, data, carico,
        sensazione: carico >= 4 ? 2 : 3,
        nota:
          id === "at09" && i === ultimeSedute.length - 1
            ? "Gambe pesanti, faccio fatica a saltare."
            : i === ultimeSedute.length - 1 && j === 0
              ? "Spalla un po' affaticata in battuta."
              : "",
        creatoIl: giornoRelativo(-((ultimeSedute.length - i) * 2)),
      };
    });
  });

  // --- gare: otto giocate, quattro da giocare ---
  // Otto gare già giocate, distribuite nella finestra della stagione: a
  // ottobre stanno più fitte, da dicembre in poi vanno a cadenza settimanale.
  // L'ultima è di pochi giorni fa, così la pagina Gare si apre sul risultato
  // più fresco.
  const ESITI = [
    { avv: 0, casa: true, noi: 3, loro: 1 },
    { avv: 1, casa: false, noi: 1, loro: 3 },
    { avv: 2, casa: true, noi: 3, loro: 0 },
    { avv: 3, casa: false, noi: 2, loro: 3 },
    { avv: 4, casa: true, noi: 3, loro: 2 },
    { avv: 5, casa: false, noi: 3, loro: 1 },
    { avv: 6, casa: true, noi: 3, loro: 0 },
    { avv: 0, casa: false, noi: 2, loro: 3 },
  ];
  const passo = Math.max(4, Math.floor((finestra - 9) / (ESITI.length - 1)));
  const giocate = ESITI.map((e, i) => ({
    ...e,
    g: -(4 + (ESITI.length - 1 - i) * passo),
  }));
  const prossime = [
    { g: 4, avv: 1, casa: true },
    { g: 11, avv: 2, casa: false },
    { g: 18, avv: 3, casa: true },
    { g: 25, avv: 4, casa: false },
  ];

  const convocabili = ROSA.slice(0, 14).map((a) => a.id);
  giocate.forEach((p, i) => {
    const convocate = {};
    convocabili.forEach((id) => (convocate[id] = true));
    doc[`partite/gara-${i}`] = {
      data: dataRelativa(p.g),
      ora: p.casa ? "18:00" : "17:30",
      avversario: AVVERSARIE[p.avv],
      casaFuori: p.casa ? "casa" : "fuori",
      luogo: p.casa ? PALESTRA : `Palestra di ${AVVERSARIE[p.avv].split(" ").slice(-2).join(" ")}`,
      convocate,
      risultatoNoi: p.noi,
      risultatoAvversario: p.loro,
    };
    // Sulle gare già giocate le conferme sono arrivate tutte: lasciarle "in
    // attesa" farebbe sembrare che nessuna abbia mai risposto.
    convocabili.forEach((id, j) => {
      const assente = i === giocate.length - 1 && j >= convocabili.length - 1;
      doc[`partite/gara-${i}/risposte/${id}`] = {
        stato: assente ? "no" : "si",
        aggiornato: dataRelativa(p.g - 2),
      };
    });
  });
  prossime.forEach((p, i) => {
    const convocate = {};
    // Solo la prossima ha la convocazione già compilata: le altre no, come
    // succede davvero.
    if (i === 0) convocabili.slice(0, 13).forEach((id) => (convocate[id] = true));
    doc[`partite/futura-${i}`] = {
      data: dataRelativa(p.g),
      ora: p.casa ? "18:00" : "17:30",
      avversario: AVVERSARIE[p.avv],
      casaFuori: p.casa ? "casa" : "fuori",
      luogo: p.casa ? PALESTRA : `Palestra di ${AVVERSARIE[p.avv].split(" ").slice(-2).join(" ")}`,
      convocate,
      risultatoNoi: null,
      risultatoAvversario: null,
    };
  });

  // Risposte alla convocazione della prossima gara: qualcuna ha confermato,
  // una ha detto che non c'è, le altre non hanno ancora risposto.
  doc["partite/futura-0/risposte/at01"] = { stato: "si", aggiornato: giornoRelativo(-1).toISOString() };
  doc["partite/futura-0/risposte/at04"] = { stato: "si", aggiornato: giornoRelativo(-1).toISOString() };
  doc["partite/futura-0/risposte/at06"] = { stato: "si", aggiornato: giornoRelativo(0).toISOString() };
  doc["partite/futura-0/risposte/at12"] = { stato: "no", nota: "Sono in gita con la scuola.", aggiornato: giornoRelativo(0).toISOString() };

  // --- campionato ---
  const nostre = SOCIETA;
  let idRis = 0;
  giocate.forEach((p, i) => {
    doc[`risultatiCampionato/ris-${idRis++}`] = {
      giornata: i + 1,
      data: dataRelativa(p.g),
      ora: p.casa ? "18:00" : "17:30",
      casa: p.casa ? nostre : AVVERSARIE[p.avv],
      ospite: p.casa ? AVVERSARIE[p.avv] : nostre,
      setCasa: p.casa ? p.noi : p.loro,
      setOspite: p.casa ? p.loro : p.noi,
    };
  });
  // Le altre partite del girone, così la classifica non abbia solo noi.
  const incroci = [
    [1, 2, 3, 1], [3, 4, 3, 2], [5, 6, 0, 3], [2, 4, 3, 0],
    [6, 1, 1, 3], [3, 5, 3, 1], [4, 6, 2, 3], [2, 5, 3, 2],
    [1, 3, 3, 0], [6, 2, 1, 3], [5, 4, 3, 1], [1, 4, 3, 2],
  ];
  incroci.forEach(([a, b, sa, sb], i) => {
    doc[`risultatiCampionato/ris-${idRis++}`] = {
      giornata: (i % 8) + 1,
      data: dataRelativa(-(finestra - 4) + Math.round((i * (finestra - 10)) / incroci.length)),
      ora: "18:00",
      casa: AVVERSARIE[a],
      ospite: AVVERSARIE[b],
      setCasa: sa,
      setOspite: sb,
    };
  });
  prossime.forEach((p, i) => {
    doc[`risultatiCampionato/prog-${i}`] = {
      giornata: giocate.length + i + 1,
      data: dataRelativa(p.g),
      ora: p.casa ? "18:00" : "17:30",
      casa: p.casa ? nostre : AVVERSARIE[p.avv],
      ospite: p.casa ? AVVERSARIE[p.avv] : nostre,
      setCasa: null,
      setOspite: null,
    };
  });

  // --- scout: tre partite complete ---
  ["gara-7", "gara-6", "gara-5"].forEach((garaId, indice) => {
    // Tanti set quanti ne è durata la partita: uno scout con tre set su una
    // gara finita 2-3 è la prima cosa che un allenatore nota.
    const esito = giocate[Number(garaId.split("-")[1])];
    const numeroSet = esito.noi + esito.loro;
    const inCampo = ["at01", "at05", "at03", "at09", "at02", "at11"];
    const set = {};
    const formazioni = {};
    for (let n = 1; n <= numeroSet; n += 1) {
      set[n] = setGiocato(casuale, indice);
      formazioni[n] = { inCampo, libero: "at06" };
    }
    doc[`scout/${garaId}`] = {
      partitaId: garaId,
      aggiornato: giornoRelativo(-5 - indice * 7).toISOString(),
      set,
      formazioni,
    };
  });

  // --- test atletici: tre rilevazioni, così i grafici hanno una linea ---
  ["iniziale", "intermedia", "finale"].forEach((fase, f) => {
    const quando = dataRelativa(-90 + f * 40);
    ROSA.slice(0, 14).forEach((a, i) => {
      const crescita = f * (1.5 + (i % 3) * 0.6);
      doc[`testAtletici/test-${fase}-${a.id}`] = {
        atletaId: a.id,
        fase,
        data: quando,
        // Altezza e reach sì: servono a capire chi sta crescendo in fretta.
        // Peso e BMI restano vuoti di proposito: non si rilevano a ragazze
        // di questa età dentro un gestionale visibile allo staff.
        altezza: 162 + (i % 7) * 3 + Math.round(crescita / 2),
        peso: null,
        bmi: null,
        reach: 208 + (i % 7) * 4 + Math.round(crescita / 2),
        reach2: null,
        cmj: Math.round((26 + (i % 5) * 2 + crescita) * 10) / 10,
        sprint10m: Math.round((2.08 - f * 0.03 + (i % 4) * 0.04) * 100) / 100,
        agility: Math.round((10.4 - f * 0.12 + (i % 5) * 0.2) * 100) / 100,
        yoyo: 14 + f + (i % 3),
        fcr: 68 - f - (i % 5),
        saltoConRincorsa: 240 + (i % 6) * 5 + Math.round(crescita),
        attacco: Math.min(10, 5 + (i % 4) + f),
        muro: Math.min(10, 4 + (i % 3) + f),
        battuta: Math.min(10, 5 + (i % 5)),
        ricezione: Math.min(10, 5 + (i % 4)),
        infortuni: a.id === "at07" && f === 0 ? "Caviglia destra, distorsione" : null,
        mobilita: null,
        asimmetrie: null,
        dolore: null,
        disponibilita: a.id === "at07" && f === 0 ? 70 : 100,
        pesoSollevato: null,
        ripetizioni: null,
        oneRM: null,
      };
    });
  });

  // --- esercizi ---
  ESERCIZI.forEach((e, i) => {
    doc[`esercizi/es-${i}`] = e;
  });

  // --- piani di allenamento ---
  PIANI(dataRelativa).forEach((p, i) => {
    doc[`pianiAllenamento/piano-${i}`] = p;
  });

  // --- obiettivi ---
  doc["obiettivi/ob-1"] = {
    titolo: "Ridurre gli errori in battuta sotto il 12%",
    tipo: "squadra", atletaId: null, categoria: CATEGORIA,
    scadenza: dataRelativa(45), stato: "In corso",
    descrizione: "Nelle ultime tre gare siamo al 17%: troppi punti regalati nei finali di set.",
  };
  doc["obiettivi/ob-2"] = {
    titolo: "Muro: chiusura a due sulla banda",
    tipo: "squadra", atletaId: null, categoria: CATEGORIA,
    scadenza: dataRelativa(70), stato: "In corso",
    descrizione: "Lavoro sulla lettura dell'alzata e sul tempo di spostamento della centrale.",
  };
  doc["obiettivi/ob-3"] = {
    titolo: "Alzata in salto sulla palla di seconda linea",
    tipo: "individuale", atletaId: "at01", categoria: CATEGORIA,
    scadenza: dataRelativa(30), stato: "In corso",
    descrizione: "Mantenere l'equilibrio in volo e non scendere con la palla.",
  };
  doc["obiettivi/ob-4"] = {
    titolo: "Ricezione: posizione di partenza più bassa",
    tipo: "individuale", atletaId: "at16", categoria: CATEGORIA,
    scadenza: dataRelativa(-10), stato: "Raggiunto",
    descrizione: "Migliorata dopo quattro settimane di lavoro specifico.",
  };

  // --- bacheca ---
  BACHECA(dataRelativa, giornoRelativo).forEach((c, i) => {
    doc[`comunicazioni/com-${i}`] = c;
  });

  // --- sondaggio ---
  doc["sondaggi/son-1"] = {
    domanda: "Cena di squadra prima della sosta: quale sera vi va meglio?",
    opzioni: ["Venerdì 20:30", "Sabato 20:00", "Domenica a pranzo"],
    data: dataRelativa(-3),
  };
  [["at01", 1], ["at02", 1], ["at04", 0], ["at06", 1], ["at09", 2], ["at14", 1], ["at10", 0]].forEach(
    ([id, scelta]) => {
      doc[`sondaggi/son-1/risposte/${id}`] = { opzioneIndex: scelta, aggiornato: dataRelativa(-2) };
    }
  );

  // --- messaggi privati ---
  // Due conversazioni in attesa di risposta e una già chiusa: è quello che
  // si vede aprendo la pagina in una settimana normale.
  conversazione(doc, "at12", [
    ["atleta", "Greta Rinaldi", "Buonasera mister, giovedì non riesco a venire: ho il recupero di inglese fino alle 19.", -3, 20, 12],
    ["staff", "Marta Ferraris", "Va bene Greta, grazie di avvisare. Recupera sabato mattina se puoi.", -3, 21, 40],
    ["atleta", "Greta Rinaldi", "Sabato ci sono. Posso portare anche le ginocchiere nuove?", -1, 18, 5],
  ]);
  conversazione(doc, "at07", [
    ["atleta", "Viola Lanzi", "La caviglia tira un po' quando atterro. Devo fermarmi?", 0, 9, 30],
  ]);
  // Giulia è l'atleta con cui si entra nella demo: la sua conversazione
  // serve, altrimenti chi prova il ruolo "atleta" trova la pagina messaggi
  // vuota proprio mentre gliela stai mostrando.
  conversazione(doc, "at01", [
    ["atleta", "Giulia Baldini", "Mister, sabato posso portare mia cugina a vedere la partita?", -5, 16, 10],
    ["staff", "Marta Ferraris", "Certo Giulia, nessun problema. Ricordati di arrivare alle 17 come le altre.", -5, 18, 2],
    ["atleta", "Giulia Baldini", "Perfetto, grazie!", -5, 18, 9],
    ["staff", "Marta Ferraris", "Ci vediamo sabato.", -5, 18, 14],
  ]);
  conversazione(doc, "at04", [
    ["staff", "Marta Ferraris", "Matilde, sabato lavoriamo sull'attacco da zona 4. Arriva dieci minuti prima.", -6, 17, 0],
    ["atleta", "Matilde Donati", "Ci sono!", -6, 17, 22],
  ]);

  // Chi ha aperto bacheca e messaggi, e quando.
  doc["letture/u-atleta"] = { bacheca: giornoRelativo(-1), messaggi: giornoRelativo(-1) };
  doc["letture/u-at02"] = { bacheca: giornoRelativo(-2), messaggi: giornoRelativo(-4) };
  doc["letture/u-at04"] = { bacheca: giornoRelativo(0), messaggi: giornoRelativo(0) };
  doc["letture/u-at09"] = { bacheca: giornoRelativo(-5), messaggi: giornoRelativo(-6) };

  // --- sistema di gioco ---
  doc["sistemaGioco/attuale"] = {
    schema: "5-1",
    note: "Palleggiatrice in zona 1 al servizio. Cambio-O sul primo pallone. Libero in seconda linea per la schiacciatrice opposta al palleggio.",
    aggiornato: giornoRelativo(-30).toISOString(),
  };

  return doc;
}

// ---------- pezzi di contorno ----------

function dataConOra(giorniIndietro, ore, minuti) {
  const d = giornoRelativo(giorniIndietro);
  d.setUTCHours(ore, minuti, 0, 0);
  d.toDate = () => d;
  d.toMillis = () => d.getTime();
  return d;
}



function notaTecnica(a) {
  const note = {
    Palleggiatrice: "Buona lettura, da migliorare l'alzata in salto sulla palla staccata.",
    Schiacciatrice: "Attacco potente in parallela, diagonale ancora da costruire.",
    Centrale: "Tempo di muro in crescita, da lavorare lo spostamento sulla banda.",
    Opposto: "Forte sul primo tempo dietro, in ricezione va coperta.",
    Libero: "Ricezione affidabile, difesa in tuffo da affinare.",
  };
  return note[a.ruolo] || "";
}

function rate(atletaId, stagione, indice) {
  // Due rate: la prima pagata da quasi tutte, la seconda ancora aperta per
  // circa metà della squadra. Così la pagina Quote ha qualcosa da mostrare
  // in entrambe le colonne.
  const prima = {
    id: `${atletaId}-r1`,
    stagione,
    descrizione: "Prima rata — iscrizione e assicurazione",
    importo: 180,
    scadenza: dataRelativa(-60),
    pagata: indice !== 11 && indice !== 17,
    dataPagamento: indice !== 11 && indice !== 17 ? dataRelativa(-62 + (indice % 5)) : null,
  };
  const seconda = {
    id: `${atletaId}-r2`,
    stagione,
    descrizione: "Seconda rata — quota annuale",
    importo: 170,
    scadenza: dataRelativa(14),
    pagata: indice % 2 === 0 && indice !== 6,
    dataPagamento: indice % 2 === 0 && indice !== 6 ? dataRelativa(-8 + (indice % 4)) : null,
  };
  return [prima, seconda];
}

// Un set di scout con numeri che stanno in piedi. I volumi sono quelli veri di
// un set: una squadra attacca una trentina di volte, riceve una dozzina di
// battute, e il singolo attaccante tocca palla fra le tre e le otto volte. Con
// numeri doppi le percentuali restano credibili ma i totali no, e un allenatore
// se ne accorge alla prima occhiata.
// Numeri che stanno in piedi: i tentativi si dividono
// fra esiti, e le percentuali restano in valori da giovanile (attacco
// positivo intorno al 35-40%, ricezione positiva intorno al 55%).
function setGiocato(casuale, variazione) {
  const righe = {};
  const titolari = ["at01", "at05", "at03", "at09", "at02", "at11", "at06"];
  titolari.forEach((id) => {
    const b = BRAVURA[id] || {};
    const ruolo = ROSA.find((a) => a.id === id)?.ruolo;

    const attTent = ruolo === "Libero" ? 0 : Math.round((3 + casuale() * 5) * (b.attacco || 1));
    const attPunti = Math.round(attTent * (0.34 + casuale() * 0.1) * (b.attacco || 1));
    const attErrori = Math.round(attTent * (0.08 + casuale() * 0.05));
    const attMurati = Math.max(0, Math.round(attTent * (0.05 + casuale() * 0.04)));

    const batTent = ruolo === "Libero" ? 0 : Math.round(2 + casuale() * 3);
    const batAce = Math.round(batTent * (0.08 + casuale() * 0.07) * (b.battuta || 1));
    const batErrori = Math.round(batTent * (0.1 + casuale() * 0.08));
    const batPositive = Math.round(batTent * (0.4 + casuale() * 0.15));

    const ricTent = ruolo === "Centrale" ? Math.round(casuale() * 2) : Math.round((3 + casuale() * 4) * (b.ricezione || 1));
    const ricPositive = Math.round(ricTent * (0.52 + casuale() * 0.12) * (b.ricezione || 1));
    const ricErrori = Math.round(ricTent * (0.04 + casuale() * 0.05));
    const ricNegative = Math.max(0, ricTent - ricPositive - ricErrori);

    const difTent = Math.round((2 + casuale() * 4) * (b.difesa || 1));
    const difPositive = Math.round(difTent * (0.55 + casuale() * 0.15));
    const difErrori = Math.max(0, Math.round(difTent * (0.1 + casuale() * 0.06)));

    const murTent = ruolo === "Libero" ? 0 : Math.round((1 + casuale() * 3) * (b.muro || 1));
    const murPunti = Math.round(murTent * (0.15 + casuale() * 0.12) * (b.muro || 1));
    const murTocchi = Math.round(murTent * (0.25 + casuale() * 0.15));
    const murErrori = Math.max(0, Math.round(murTent * (0.08 + casuale() * 0.06)));

    righe[id] = {
      attacco: { tentativi: attTent, punti: attPunti, errori: attErrori, murati: attMurati },
      battuta: { tentativi: batTent, ace: batAce, errori: batErrori, positive: batPositive },
      ricezione: { tentativi: ricTent, positive: ricPositive, negative: ricNegative, errori: ricErrori },
      difesa: { tentativi: difTent, positive: difPositive, errori: difErrori },
      muro: { tentativi: murTent, punti: murPunti, tocchi: murTocchi, errori: murErrori },
    };
  });
  // Una o due entrate dalla panchina, diverse di set in set.
  const panchina = ["at14", "at10", "at16"][variazione % 3];
  righe[panchina] = {
    attacco: { tentativi: 3, punti: 1, errori: 0, murati: 1 },
    battuta: { tentativi: 2, ace: 0, errori: 1, positive: 1 },
    ricezione: { tentativi: 4, positive: 2, negative: 2, errori: 0 },
    difesa: { tentativi: 2, positive: 1, errori: 0 },
    muro: { tentativi: 1, punti: 0, tocchi: 1, errori: 0 },
  };
  return righe;
}

const ESERCIZI = [
  { nome: "Riscaldamento con palla a coppie", categoria: "U16", faseGioco: "Riscaldamento", obiettivoTecnico: "Attivazione", durataMedia: 10, descrizione: "Palleggio e bagher a coppie aumentando la distanza.", obiettivo: "Attivare spalle e gambe.", attrezzatura: "Una palla ogni due", tipologia: null, sottoGesti: [], livello: 1 },
  { nome: "Battuta a bersaglio", categoria: "U16", faseGioco: "Battuta", obiettivoTecnico: "Precisione", durataMedia: 15, descrizione: "Tre materassini nelle zone 1, 5 e 6: dieci battute a testa contando i centri.", obiettivo: "Ridurre gli errori mantenendo la potenza.", attrezzatura: "Materassini", tipologia: "battuta", sottoGesti: ["caricamento", "colpo"], livello: 2 },
  { nome: "Ricezione a due con libero", categoria: "U16", faseGioco: "Ricezione", obiettivoTecnico: "Posizionamento", durataMedia: 20, descrizione: "Battuta da sopra, ricezione a due più libero, alzata e attacco in zona 4.", obiettivo: "Palla alzabile sopra il 50%.", attrezzatura: "Carrello palloni", tipologia: "ricezione", sottoGesti: ["postura", "superficie"], livello: 3 },
  { nome: "Muro a due sulla banda", categoria: "U16", faseGioco: "Muro", obiettivoTecnico: "Chiusura", durataMedia: 20, descrizione: "Centrale e laterale chiudono su alzata alta in zona 4, con cambio di lato ogni cinque ripetizioni.", obiettivo: "Mani oltre la rete, nessuno spazio fra le braccia.", attrezzatura: "Pedana", tipologia: "muro", sottoGesti: ["spostamento", "tempo"], livello: 3 },
  { nome: "Cambio palla 6 contro 6", categoria: "U16", faseGioco: "Gioco", obiettivoTecnico: "Cambio palla", durataMedia: 25, descrizione: "Si gioca solo il cambio palla: chi riceve deve chiudere il punto, altrimenti il punto va agli avversari.", obiettivo: "Efficienza del primo attacco.", attrezzatura: "", tipologia: null, sottoGesti: [], livello: 4 },
  { nome: "Difesa su attacco da pedana", categoria: "U16", faseGioco: "Difesa", obiettivoTecnico: "Lettura", durataMedia: 15, descrizione: "Attacco dalla pedana su tre atlete in seconda linea, con copertura obbligatoria.", obiettivo: "Palla recuperata e giocabile.", attrezzatura: "Pedana", tipologia: "difesa", sottoGesti: ["postura", "tuffo"], livello: 3 },
  { nome: "Alzata in salto", categoria: "U16", faseGioco: "Palleggio", obiettivoTecnico: "Alzata", durataMedia: 15, descrizione: "Palla di seconda linea, alzata in salto verso zona 2 e zona 4 alternate.", obiettivo: "Equilibrio in volo, nessun passo di aggiustamento.", attrezzatura: "", tipologia: "palleggio", sottoGesti: ["mani", "tempo"], livello: 4 },
  { nome: "Circuito di forza a corpo libero", categoria: "U16", faseGioco: "Atletico", obiettivoTecnico: "Forza", durataMedia: 20, descrizione: "Quattro stazioni: affondi, plank, salti sul gradino, squat. Tre giri.", obiettivo: "Resistenza alla forza.", attrezzatura: "Gradini", tipologia: null, sottoGesti: [], livello: 2 },
];

function PIANI(dataRelativa) {
  return [
    {
      titolo: "Battuta e ricezione",
      categoria: "U16",
      data: dataRelativa(-2),
      blocchi: [
        { nome: "Riscaldamento", esercizi: "Riscaldamento con palla a coppie", durataMin: 15 },
        { nome: "Tecnica battuta", esercizi: "Battuta a bersaglio", durataMin: 20 },
        { nome: "Ricezione", esercizi: "Ricezione a due con libero", durataMin: 30 },
        { nome: "Gioco", esercizi: "Cambio palla 6 contro 6", durataMin: 25 },
      ],
      note: "Insistere sulla battuta: 17% di errori nelle ultime tre gare.",
    },
    {
      titolo: "Muro e difesa",
      categoria: "U16",
      data: dataRelativa(1),
      blocchi: [
        { nome: "Riscaldamento", esercizi: "Riscaldamento con palla a coppie", durataMin: 15 },
        { nome: "Muro", esercizi: "Muro a due sulla banda", durataMin: 25 },
        { nome: "Difesa", esercizi: "Difesa su attacco da pedana", durataMin: 20 },
        { nome: "Gioco", esercizi: "Cambio palla 6 contro 6", durataMin: 25 },
      ],
      note: "Prima della gara di sabato: chiusura a due, è l'obiettivo di squadra.",
    },
    {
      titolo: "Rifinitura pre-gara",
      categoria: "U16",
      data: dataRelativa(3),
      blocchi: [
        { nome: "Riscaldamento", esercizi: "Riscaldamento con palla a coppie", durataMin: 15 },
        { nome: "Alzata", esercizi: "Alzata in salto", durataMin: 15 },
        { nome: "Cambio palla", esercizi: "Cambio palla 6 contro 6", durataMin: 30 },
      ],
      note: "Seduta corta, niente carico. Sestetto provato per sabato.",
    },
  ];
}

function BACHECA(dataRelativa, giornoRelativo) {
  return [
    {
      testo:
        "Sabato gara in casa contro Pallavolo Ponte Nuovo, ritrovo in palestra alle 17:00. Portate entrambe le maglie.",
      data: dataRelativa(-1),
      creatoIl: giornoRelativo(-1),
      autore: "Marta Ferraris",
    },
    {
      testo:
        "Ricordo a chi non l'ha ancora fatto che la seconda rata scade fra due settimane. Chi ha difficoltà parli con Paolo, si trova una soluzione.",
      data: dataRelativa(-4),
      creatoIl: giornoRelativo(-4),
      autore: "Paolo Riva",
    },
    {
      testo:
        "Tre certificati medici scadono entro il mese. Chi riceve l'avviso nella propria area, per favore prenoti la visita questa settimana: senza certificato valido non si entra in campo.",
      data: dataRelativa(-8),
      creatoIl: giornoRelativo(-8),
      autore: "Paolo Riva",
    },
    {
      testo:
        "Bella reazione giovedì dopo il secondo set. Da lì si riparte: giovedì lavoriamo sul muro.",
      data: dataRelativa(-13),
      creatoIl: giornoRelativo(-13),
      autore: "Marta Ferraris",
    },
  ];
}

function conversazione(doc, atletaId, messaggi) {
  let ultimo = null;
  messaggi.forEach(([autore, autoreNome, testo, giorni, ore, minuti], i) => {
    const quando = giornoRelativo(giorni);
    quando.setUTCHours(ore, minuti, 0, 0);
    quando.toDate = () => quando;
    quando.toMillis = () => quando.getTime();
    doc[`conversazioni/${atletaId}/messaggi/msg-${i}`] = {
      testo,
      autore,
      autoreNome,
      timestamp: quando,
    };
    ultimo = { testo, autore, quando };
  });
  doc[`conversazioni/${atletaId}`] = {
    ultimoMessaggio: ultimo.testo,
    ultimoAggiornamento: ultimo.quando,
    ultimoAutore: ultimo.autore,
  };
}
