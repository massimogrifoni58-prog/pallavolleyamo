// Il finto database della versione dimostrativa.
//
// Risponde alle stesse funzioni di firebase/firestore che l'app usa, ma invece
// di parlare con Firebase tiene tutto in memoria. In modalità demo la
// configurazione di Vite fa puntare "firebase/firestore" a questo file, così
// nessuna pagina dell'app sa che dall'altra parte non c'è nessun database:
// continua a chiamare collection(), onSnapshot(), setDoc() come sempre.
//
// Conseguenza voluta: ricaricando la pagina tutto torna come all'inizio. Per
// una dimostrazione è un vantaggio — si ripulisce da sé dopo che qualcuno ci
// ha pasticciato dentro — ma non ci si può lavorare davvero.

import { costruisciStagione } from "./datiDemo";

// ---------- il magazzino ----------
// Una mappa percorso -> documento. "atlete/a01" è un documento,
// "atlete" la collezione che lo contiene, "partite/p3/risposte/a01" un
// documento in una sottocollezione: i percorsi con un numero pari di
// segmenti sono documenti, quelli dispari collezioni.
const documenti = new Map();

export function caricaDatiDemo() {
  documenti.clear();
  const stagione = costruisciStagione();
  for (const [percorso, dati] of Object.entries(stagione)) {
    documenti.set(percorso, dati);
  }
  avvisa(null); // ridisegna tutto quello che sta in ascolto
}

let contatore = 0;
function nuovoId() {
  contatore += 1;
  return `demo${Date.now().toString(36)}${contatore.toString(36)}`;
}

// ---------- riferimenti ----------

function rifColl(percorso) {
  return { __tipo: "coll", percorso, id: percorso.split("/").pop() };
}
function rifDoc(percorso) {
  return { __tipo: "doc", percorso, id: percorso.split("/").pop() };
}

export function getFirestore() {
  return { __tipo: "db" };
}

export function collection(primo, ...resto) {
  if (primo?.__tipo === "doc") return rifColl([primo.percorso, ...resto].join("/"));
  return rifColl(resto.join("/"));
}

export function doc(primo, ...resto) {
  // doc(collezione) senza id: Firestore ne genera uno, e l'app conta su
  // questo per sapere l'id prima di scrivere (vedi l'importazione del backup).
  if (primo?.__tipo === "coll") {
    const id = resto.length ? resto[0] : nuovoId();
    return rifDoc(`${primo.percorso}/${id}`);
  }
  if (primo?.__tipo === "doc") return rifDoc([primo.percorso, ...resto].join("/"));
  return rifDoc(resto.join("/"));
}

// ---------- interrogazioni ----------

export function query(sorgente, ...vincoli) {
  const precedenti = sorgente.__tipo === "query" ? sorgente.vincoli : [];
  return {
    __tipo: "query",
    percorso: sorgente.percorso,
    vincoli: [...precedenti, ...vincoli],
  };
}

export function where(campo, operatore, valore) {
  return { __vincolo: "where", campo, operatore, valore };
}
export function orderBy(campo, direzione = "asc") {
  return { __vincolo: "orderBy", campo, direzione };
}
export function limit(quanti) {
  return { __vincolo: "limit", quanti };
}

// Campi annidati come "rateQuota.gennaio".
function valoreDi(oggetto, campo) {
  return campo.split(".").reduce((acc, parte) => (acc == null ? acc : acc[parte]), oggetto);
}

function confronta(valore, operatore, atteso) {
  switch (operatore) {
    case "==":
      return valore === atteso;
    case "!=":
      return valore !== atteso;
    case ">":
      return valore > atteso;
    case ">=":
      return valore >= atteso;
    case "<":
      return valore < atteso;
    case "<=":
      return valore <= atteso;
    case "in":
      return Array.isArray(atteso) && atteso.includes(valore);
    case "array-contains":
      return Array.isArray(valore) && valore.includes(atteso);
    default:
      return true;
  }
}

// I documenti figli diretti di una collezione: quelli il cui percorso
// comincia con quello della collezione e non contiene altre barre dopo.
function figliDi(percorsoColl) {
  const prefisso = `${percorsoColl}/`;
  const trovati = [];
  for (const [percorso, dati] of documenti) {
    if (!percorso.startsWith(prefisso)) continue;
    const resto = percorso.slice(prefisso.length);
    if (resto.includes("/")) continue;
    trovati.push({ id: resto, dati });
  }
  return trovati;
}

function applicaVincoli(righe, vincoli = []) {
  let risultato = righe;
  for (const v of vincoli) {
    if (v.__vincolo === "where") {
      risultato = risultato.filter((r) => confronta(valoreDi(r.dati, v.campo), v.operatore, v.valore));
    }
  }
  for (const v of vincoli) {
    if (v.__vincolo === "orderBy") {
      const segno = v.direzione === "desc" ? -1 : 1;
      risultato = [...risultato].sort((x, y) => {
        const a = valoreDi(x.dati, v.campo);
        const b = valoreDi(y.dati, v.campo);
        if (a == null && b == null) return 0;
        if (a == null) return 1;
        if (b == null) return -1;
        if (typeof a === "string" && typeof b === "string") {
          return segno * a.localeCompare(b, "it");
        }
        return segno * (a < b ? -1 : a > b ? 1 : 0);
      });
    }
  }
  for (const v of vincoli) {
    if (v.__vincolo === "limit") risultato = risultato.slice(0, v.quanti);
  }
  return risultato;
}

// ---------- istantanee ----------

function istantaneaDocumento(percorso) {
  const dati = documenti.get(percorso);
  return {
    id: percorso.split("/").pop(),
    ref: rifDoc(percorso),
    exists: () => dati !== undefined,
    data: () => (dati === undefined ? undefined : copia(dati)),
    get: (campo) => valoreDi(dati || {}, campo),
  };
}

function istantaneaElenco(rif) {
  const righe = applicaVincoli(figliDi(rif.percorso), rif.vincoli);
  const docs = righe.map((r) => ({
    id: r.id,
    ref: rifDoc(`${rif.percorso}/${r.id}`),
    exists: () => true,
    data: () => copia(r.dati),
    get: (campo) => valoreDi(r.dati, campo),
  }));
  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: (fn) => docs.forEach(fn),
  };
}

function istantanea(rif) {
  return rif.__tipo === "doc" ? istantaneaDocumento(rif.percorso) : istantaneaElenco(rif);
}

// ---------- ascolto ----------

const inAscolto = new Set();

export function onSnapshot(rif, inSuccesso, inErrore) {
  // onSnapshot accetta anche un oggetto { next, error }.
  const chiama = typeof inSuccesso === "function" ? inSuccesso : inSuccesso?.next;
  const errore = typeof inErrore === "function" ? inErrore : inSuccesso?.error;

  const esegui = () => {
    try {
      chiama?.(istantanea(rif));
    } catch (e) {
      console.error("Demo: errore in un ascoltatore", e);
      errore?.(e);
    }
  };

  const voce = { rif, esegui };
  inAscolto.add(voce);
  // Firestore consegna la prima istantanea in modo asincrono: imitarlo evita
  // che un setState parta durante il render del componente.
  Promise.resolve().then(esegui);
  return () => inAscolto.delete(voce);
}

function genitoreDi(percorsoDoc) {
  const parti = percorsoDoc.split("/");
  parti.pop();
  return parti.join("/");
}

// Avvisa solo chi guarda davvero quel documento o la collezione che lo
// contiene: senza questo filtro ogni scrittura ridisegnerebbe tutta l'app, e
// un componente che scrive in risposta a un'istantanea entrerebbe in ciclo.
function avvisa(percorsoDoc) {
  const padre = percorsoDoc ? genitoreDi(percorsoDoc) : null;
  for (const voce of [...inAscolto]) {
    const r = voce.rif;
    if (percorsoDoc === null) {
      voce.esegui();
    } else if (r.__tipo === "doc") {
      if (r.percorso === percorsoDoc) voce.esegui();
    } else if (r.percorso === padre) {
      voce.esegui();
    }
  }
}

// ---------- scritture ----------

export function serverTimestamp() {
  // L'app legge questi valori con `.toDate ? .toDate() : new Date(valore)` e
  // con `.toMillis()`: una data con quei due metodi va bene per entrambi.
  const adesso = new Date();
  adesso.toDate = () => adesso;
  adesso.toMillis = () => adesso.getTime();
  return adesso;
}

export function Timestamp() {}
Timestamp.now = () => serverTimestamp();
Timestamp.fromDate = (d) => {
  const copiaData = new Date(d);
  copiaData.toDate = () => copiaData;
  copiaData.toMillis = () => copiaData.getTime();
  return copiaData;
};

function copia(valore) {
  if (valore instanceof Date) return valore;
  if (Array.isArray(valore)) return valore.map(copia);
  if (valore && typeof valore === "object") {
    const fuori = {};
    for (const k of Object.keys(valore)) fuori[k] = copia(valore[k]);
    return fuori;
  }
  return valore;
}

function fondi(base, nuovo) {
  const fuori = { ...base };
  for (const chiave of Object.keys(nuovo)) {
    const v = nuovo[chiave];
    const esistente = fuori[chiave];
    const sonoMappe =
      v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) &&
      esistente && typeof esistente === "object" && !Array.isArray(esistente) &&
      !(esistente instanceof Date);
    fuori[chiave] = sonoMappe ? fondi(esistente, v) : copia(v);
  }
  return fuori;
}

// updateDoc accetta percorsi col punto ("rateQuota.gennaio"): lì il punto
// indica un campo annidato, non un campo che si chiama così.
function applicaAggiornamento(base, modifiche) {
  const fuori = copia(base) || {};
  for (const chiave of Object.keys(modifiche)) {
    const valore = modifiche[chiave];
    if (!chiave.includes(".")) {
      const esistente = fuori[chiave];
      const sonoMappe =
        valore && typeof valore === "object" && !Array.isArray(valore) && !(valore instanceof Date) &&
        esistente && typeof esistente === "object" && !Array.isArray(esistente);
      fuori[chiave] = sonoMappe ? fondi(esistente, valore) : copia(valore);
      continue;
    }
    const parti = chiave.split(".");
    let punto = fuori;
    for (let i = 0; i < parti.length - 1; i += 1) {
      if (typeof punto[parti[i]] !== "object" || punto[parti[i]] === null) punto[parti[i]] = {};
      punto = punto[parti[i]];
    }
    punto[parti[parti.length - 1]] = copia(valore);
  }
  return fuori;
}

export async function setDoc(rif, dati, opzioni = {}) {
  const precedente = documenti.get(rif.percorso);
  documenti.set(
    rif.percorso,
    opzioni.merge && precedente ? fondi(precedente, dati) : copia(dati)
  );
  avvisa(rif.percorso);
}

export async function addDoc(rifColl, dati) {
  const rif = doc(rifColl);
  documenti.set(rif.percorso, copia(dati));
  avvisa(rif.percorso);
  return rif;
}

export async function updateDoc(rif, modifiche) {
  if (!documenti.has(rif.percorso)) {
    // Firestore rifiuta un aggiornamento su un documento che non esiste.
    throw Object.assign(new Error("Documento inesistente"), { code: "not-found" });
  }
  documenti.set(rif.percorso, applicaAggiornamento(documenti.get(rif.percorso), modifiche));
  avvisa(rif.percorso);
}

export async function deleteDoc(rif) {
  documenti.delete(rif.percorso);
  // Via anche le sottocollezioni: Firestore le lascerebbe orfane, qui
  // tenerle non serve a niente e sporcherebbe la dimostrazione.
  const prefisso = `${rif.percorso}/`;
  for (const percorso of [...documenti.keys()]) {
    if (percorso.startsWith(prefisso)) documenti.delete(percorso);
  }
  avvisa(rif.percorso);
}

export async function getDoc(rif) {
  return istantaneaDocumento(rif.percorso);
}

export async function getDocs(rif) {
  return istantaneaElenco(rif.__tipo === "coll" ? { ...rif, vincoli: [] } : rif);
}

export function writeBatch() {
  const operazioni = [];
  return {
    set: (rif, dati, opzioni) => {
      operazioni.push(() => setDoc(rif, dati, opzioni));
      return undefined;
    },
    update: (rif, modifiche) => {
      operazioni.push(() => updateDoc(rif, modifiche));
      return undefined;
    },
    delete: (rif) => {
      operazioni.push(() => deleteDoc(rif));
      return undefined;
    },
    commit: async () => {
      for (const op of operazioni) await op();
    },
  };
}

// Funzioni che l'app non usa ma che potrebbero comparire in futuro: meglio
// che esistano e non facciano niente, piuttosto che far saltare la demo.
export function enableIndexedDbPersistence() {
  return Promise.resolve();
}
export function connectFirestoreEmulator() {}
export const deleteField = () => undefined;
export const increment = (n) => n;
export const arrayUnion = (...v) => v;
export const arrayRemove = () => [];

caricaDatiDemo();
