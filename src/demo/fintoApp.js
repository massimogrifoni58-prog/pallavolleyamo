// Sostituisce firebase/app nella versione dimostrativa: l'app chiama
// initializeApp e getApps all'avvio, qui restituiscono semplici oggetti con
// un nome, perché nulla deve collegarsi davvero a Firebase.

const istanze = new Map();

export function initializeApp(config, nome = "[DEFAULT]") {
  const istanza = { name: nome, options: config || {}, __finto: true };
  istanze.set(nome, istanza);
  return istanza;
}

export function getApps() {
  return [...istanze.values()];
}

export function getApp(nome = "[DEFAULT]") {
  return istanze.get(nome) || initializeApp({}, nome);
}

export function deleteApp(istanza) {
  istanze.delete(istanza?.name);
  return Promise.resolve();
}
