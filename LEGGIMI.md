# Aggiornamento del 12 ottobre

Tre cose in un pacchetto solo, per non spendere più crediti Netlify del
necessario: carica tutti i file in **un unico commit** su GitHub.

## 1. Il profilo del web master è protetto

- `firestore.rules` — **va incollato nella console Firebase**, non basta
  caricarlo su GitHub. Firestore Database → Regole → Pubblica.
- `src/pages/Utenti.jsx` — gli account di livello web manager mostrano
  "Protetto" invece dei pulsanti, a chi non è web manager.
- `src/pages/Impostazioni.jsx` — il riquadro del logo web master lo vede
  solo il web manager.

## 2. Confronto con le compagne nello scout

- `src/scoutCalcoli.js` — nuova funzione `confrontoCompagne`.
- `src/pages/Scout.jsx` — nella scheda della singola atleta (si apre
  toccando una riga in "Atlete") compare il confronto con le compagne su
  tutta la stagione, fondamentale per fondamentale.

Il riferimento è interno di proposito: le compagne hanno giocato le stesse
partite con gli stessi criteri di rilevazione. Sotto dodici interventi lo
scarto non si mostra. Negli errori in battuta il verso è invertito e il
colore ne tiene conto.

## 3. Correzione: il titolo delle pagine

- `src/index.css` — su sei pagine (Gare, Atlete, Presenze, Campionato,
  Quote, Area tecnica) il titolo finiva a destra invece che a sinistra.
  Era una regola che avevo introdotto io uniformando le fasce.

## Il resto

`HubVolley-demo.html` è la demo aggiornata: doppio clic, nessun server,
nessun credito. Gli altri file (`src/demo/`, `strumenti/`, `vite.config.js`,
`package.json`, `src/pages/Login.jsx`, `src/components/Layout.jsx`) servono
solo a poterla rigenerare con `npm run build:demo`. Sono già compresi nel
commit senza fare danni: in produzione quel codice non viene mai caricato.
