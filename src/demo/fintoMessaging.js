// Sostituisce firebase/messaging nella versione dimostrativa.
//
// Le notifiche sul telefono non si possono mostrare in una demo che gira
// senza internet: servono un servizio che le recapita e un dispositivo
// registrato. Qui isSupported() risponde "no", che è esattamente il caso che
// l'app già gestisce — la pagina Impostazioni dirà che le notifiche non sono
// disponibili su questo dispositivo, invece di dare un errore.

export async function isSupported() {
  return false;
}

export function getMessaging() {
  return { __finto: true };
}

export async function getToken() {
  return null;
}

export function onMessage() {
  return () => {};
}

export function deleteToken() {
  return Promise.resolve(true);
}
