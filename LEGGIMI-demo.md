# HubVolley — versione dimostrativa

`HubVolley-demo.html` è un file solo. Si apre con un doppio clic, non ha
bisogno di internet e non si collega a niente: puoi portartelo su una
chiavetta o tenerlo sul portatile.

## Prima di mostrarlo

Dentro ci sono atlete inventate di una società inventata — "Pallavolo Valle
Verde". Nessun nome, telefono o certificato reale. È fatto apposta: una
dimostrazione si fa davanti a estranei, e le atlete vere sono minorenni.

## Come si usa

All'apertura trovi quattro pulsanti: allenatrice, amministratore, atleta,
genitore. Un clic ed entri, senza digitare niente.

In basso a destra, dentro l'app, c'è **Demo · cambia ruolo**: cambi punto di
vista davanti a chi guarda, senza uscire. È la cosa che convince di più —
mostri lo scout da allenatrice, passi ad atleta e si vede che quella pagina
per lei non esiste.

Dallo stesso menu, **Ricarica i dati di partenza** rimette tutto com'era dopo
che qualcuno ci ha giocato dentro.

## Cosa c'è dentro

Una stagione U16 completa: venti atlete, un mese e mezzo di presenze con due
ragazze che stanno calando, otto gare giocate e quattro in programma, lo
scout di tre partite set per set, le quote a metà pagate, bacheca, messaggi
in attesa di risposta, un sondaggio e tre rilevazioni di test atletici.

Due dettagli voluti, se qualcuno te li chiede:

- **Peso e BMI sono vuoti.** Su ragazze di quindici-sedici anni non si
  rilevano dentro un gestionale che lo staff vede. Altezza e reach sì, quelli
  servono a capire chi sta crescendo in fretta.
- **Le notifiche sul telefono non si possono provare qui**: servono un
  servizio che le recapita e un dispositivo registrato. Vanno raccontate.

## Cosa non fa

Ricaricando la pagina tutto torna all'inizio: i dati vivono nella pagina e
non vengono salvati da nessuna parte. Per una dimostrazione è un vantaggio,
ma non ci si può lavorare davvero.

## Rifarlo dopo una modifica all'app

    npm run build:demo

Produce di nuovo `HubVolley-demo.html` a partire dal codice attuale. Non
tocca il sito vero e non consuma crediti Netlify, perché non viene
pubblicato da nessuna parte.
