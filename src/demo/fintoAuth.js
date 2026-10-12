// Il finto accesso della versione dimostrativa.
//
// Nessuna password viene controllata: la demo non protegge niente, perché non
// c'è niente da proteggere — i dati sono inventati e vivono nella pagina.
// Basta l'indirizzo email di uno degli account preparati, e in modalità demo
// la schermata di accesso li offre direttamente come pulsanti.
//
// Serve anche a una cosa che con gli account veri è scomoda: cambiare ruolo
// davanti a chi guarda, per mostrare la stessa app come la vede un'allenatrice
// e come la vede un'atleta.

import { ACCOUNT_DEMO } from "./datiDemo";

const sessioni = new Map(); // nome istanza -> utente corrente
const ascoltatori = new Map(); // nome istanza -> Set di callback

function utenteDa(voce) {
  const utente = {
    uid: voce.uid,
    email: voce.email,
    displayName: `${voce.nome} ${voce.cognome}`,
    emailVerified: true,
    getIdToken: async () => `finto-${voce.uid}`,
  };
  return utente;
}

export function getAuth(app) {
  const nome = app?.name || "[DEFAULT]";
  if (!sessioni.has(nome)) sessioni.set(nome, null);
  if (!ascoltatori.has(nome)) ascoltatori.set(nome, new Set());
  return {
    __finto: true,
    name: nome,
    get currentUser() {
      return sessioni.get(nome);
    },
  };
}

function avvisa(nome) {
  const utente = sessioni.get(nome);
  for (const cb of ascoltatori.get(nome) || []) cb(utente);
}

export function onAuthStateChanged(auth, callback) {
  const nome = auth.name;
  if (!ascoltatori.has(nome)) ascoltatori.set(nome, new Set());
  ascoltatori.get(nome).add(callback);
  Promise.resolve().then(() => callback(sessioni.get(nome) || null));
  return () => ascoltatori.get(nome)?.delete(callback);
}

function cercaAccount(email) {
  const pulita = (email || "").trim().toLowerCase();
  return ACCOUNT_DEMO.find((a) => a.email.toLowerCase() === pulita);
}

export async function signInWithEmailAndPassword(auth, email) {
  const voce = cercaAccount(email);
  if (!voce) {
    throw Object.assign(new Error("Account non trovato"), {
      code: "auth/invalid-credential",
    });
  }
  sessioni.set(auth.name, utenteDa(voce));
  avvisa(auth.name);
  return { user: sessioni.get(auth.name) };
}

// Usata dalla schermata di accesso in modalità demo: un clic ed è dentro,
// senza far digitare niente a chi sta guardando.
export function entraComeDemo(uid) {
  const voce = ACCOUNT_DEMO.find((a) => a.uid === uid);
  if (!voce) return;
  sessioni.set("[DEFAULT]", utenteDa(voce));
  avvisa("[DEFAULT]");
}

export async function signOut(auth) {
  sessioni.set(auth.name, null);
  avvisa(auth.name);
}

// Creare un account nella demo funziona per far vedere la pagina, ma vale
// solo finché la pagina resta aperta.
export async function createUserWithEmailAndPassword(auth, email) {
  const voce = {
    uid: `demo-${Math.random().toString(36).slice(2, 10)}`,
    email,
    nome: "Nuovo",
    cognome: "Accesso",
  };
  ACCOUNT_DEMO.push(voce);
  const utente = utenteDa(voce);
  // Come Firebase: la seconda istanza serve proprio a non perdere la
  // sessione di chi sta creando l'account.
  if (auth.name !== "[DEFAULT]") {
    sessioni.set(auth.name, utente);
    avvisa(auth.name);
  }
  return { user: utente };
}

export async function sendPasswordResetEmail() {
  // Nella demo non parte nessuna email: la pagina mostra comunque la
  // conferma, così si capisce come funziona.
  return undefined;
}

export async function updatePassword() {}
export async function updateProfile() {}
export function connectAuthEmulator() {}
