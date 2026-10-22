import React, { useMemo, useState } from "react";
import societaData from "../data/societa.json";

// "Si gioca vicino a te": ordina le partite del weekend per distanza dall'utente.
// La posizione resta nel telefono: non viene inviata a nessun server.
// Dove si gioca si ricava dalla squadra di casa:
//   1) se e' una societa' della Mappa volley -> il suo palazzetto
//   2) altrimenti il paese che compare nel nome della squadra (posizione approssimata)

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const VUOTE = new Set("volley pallavolo asd a s d ssd polisportiva team academy club sport giovanile u19 u17 u16 u15 u14 u13 u12 green1 green2 green3 rossa blu bianca arancio nera gialla".split(" "));
const parole = (s) => new Set(norm(s).split(" ").filter((t) => t.length > 2 && !VUOTE.has(t)));

// Paesi che non hanno una societa' nella Mappa volley (coordinate del centro)
const PAESI_EXTRA = {
  "arrone": [42.583, 12.767], "norcia": [42.793, 13.093], "san gemini": [42.613, 12.545],
  "sansepolcro": [43.572, 12.139], "chiusi": [43.017, 11.949], "petrignano": [43.103, 12.533],
  "trestina": [43.357, 12.240], "pietralunga": [43.443, 12.434], "montefalco": [42.894, 12.651],
  "nocera umbra": [43.113, 12.786], "bevagna": [42.934, 12.608], "corciano": [43.129, 12.287],
  "castel ritaldi": [42.823, 12.672], "gualdo cattaneo": [42.911, 12.556], "giano dell umbria": [42.833, 12.578],
  "san venanzo": [42.868, 12.268], "ficulle": [42.836, 12.066], "fabro": [42.863, 12.013],
  "citta della pieve": [42.953, 12.004], "panicale": [43.028, 12.100], "passignano": [43.188, 12.137],
  "tuoro": [43.207, 12.074], "montecastrilli": [42.650, 12.488], "otricoli": [42.420, 12.477],
  "stroncone": [42.501, 12.659], "ferentillo": [42.621, 12.788], "valfabbrica": [43.159, 12.602],
  "gubbio": [43.352, 12.577], "castel dell aquila": [42.619, 12.448], "umbertide": [43.306, 12.336], "attigliano": [42.516, 12.293],
};
// Nomi abbreviati -> nome del comune usato sopra o nella Mappa volley
const ALIAS = { "arronepallavolo": "arrone", "bastia": "bastia umbra", "ellera": "ellera umbra", "amerina": "amelia", "fossato": "fossato di vico", "castello": "citta di castello", "valleceppi": "ponte valleceppi" };
// Squadre senza paese nel nome, di cui si conosce la sede
const SEDE_NOTA = { "delfino": "tavernelle", "sirio": "magione", "sir": "perugia", "difdif": "castel dell aquila", "italchimici": "foligno", "clt": "terni", "tiber": "todi" };

export function costruisciLuoghi() {
  const soc = (societaData.societa || []).filter((s) => s.lat && s.lng);
  const citta = {};
  const scritto = { "castel dell aquila": "Castel dell'Aquila", "san gemini": "San Gemini", "citta della pieve": "Città della Pieve", "giano dell umbria": "Giano dell'Umbria" };
  soc.forEach((s) => {
    const c = norm(s.citta);
    if (!c) return;
    scritto[c] = s.citta;
    (citta[c] = citta[c] || []).push([s.lat, s.lng]);
  });
  const comuni = {};
  Object.entries(citta).forEach(([c, pts]) => {
    comuni[c] = [pts.reduce((t, p) => t + p[0], 0) / pts.length, pts.reduce((t, p) => t + p[1], 0) / pts.length];
  });
  Object.entries(PAESI_EXTRA).forEach(([c, p]) => { if (!comuni[c]) comuni[c] = p; });
  const nomiComuni = Object.keys(comuni).sort((a, b) => b.length - a.length);
  const nomeBello = (c) => scritto[c] || c.replace(/\b\w/g, (x) => x.toUpperCase());

  const cache = {};
  return function luogo(squadra) {
    if (squadra in cache) return cache[squadra];
    let ris = null;
    // 1) societa' della Mappa volley con almeno due parole in comune.
    // Se il nome della squadra contiene un paese, vale solo una societa' di quel paese
    // (evita per esempio "Don Bosco Gubbio" abbinata a "Don Bosco Cannara").
    const tp = parole(squadra);
    const testo0 = " " + norm(squadra) + " ";
    const paeseNelNome = nomiComuni.find((x) => testo0.includes(" " + x + " "));
    let migliore = null, punti = 0;
    soc.forEach((s) => {
      if (paeseNelNome && norm(s.citta) !== paeseNelNome && !(" " + norm(s.nome) + " ").includes(" " + paeseNelNome + " ")) return;
      const n = [...parole(s.nome)].filter((t) => tp.has(t)).length;
      if (n > punti) { punti = n; migliore = s; }
    });
    if (migliore && punti >= 2) {
      ris = { lat: migliore.lat, lng: migliore.lng, dove: [migliore.palazzetto, migliore.citta].filter(Boolean).join(", "), preciso: true, link: migliore.gmaps };
    } else {
      // 2) paese nel nome della squadra
      const testo = " " + norm(squadra) + " ";
      let c = nomiComuni.find((x) => testo.includes(" " + x + " "));
      if (!c) {
        const a = Object.keys(ALIAS).find((x) => testo.includes(" " + x + " "));
        if (a) c = ALIAS[a];
      }
      if (!c) {
        const k = Object.keys(SEDE_NOTA).find((x) => testo.includes(" " + x + " "));
        if (k) c = SEDE_NOTA[k];
      }
      if (c && comuni[c]) ris = { lat: comuni[c][0], lng: comuni[c][1], dove: nomeBello(c), preciso: false };
    }
    if (ris && !ris.link) ris.link = `https://www.google.com/maps/dir/?api=1&destination=${ris.lat},${ris.lng}`;
    cache[squadra] = ris;
    return ris;
  };
}

function distanzaKm(a, b) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function VicinoATe({ partite, nome, etichettaGiorno }) {
  const luogo = useMemo(costruisciLuoghi, []);
  const [stato, setStato] = useState("pronto"); // pronto | cerco | ok | errore
  const [pos, setPos] = useState(null);
  const [errore, setErrore] = useState("");
  const [quante, setQuante] = useState(8);

  function cerca() {
    if (!navigator.geolocation) { setStato("errore"); setErrore("Questo dispositivo non permette di conoscere la posizione."); return; }
    setStato("cerco");
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setStato("ok"); setQuante(8); },
      (e) => {
        setStato("errore");
        setErrore(e.code === 1
          ? "Non hai dato il permesso di usare la posizione. Puoi attivarlo dalle impostazioni del browser e riprovare."
          : "Non riesco a trovare la tua posizione in questo momento. Riprova tra poco.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  }

  const vicine = useMemo(() => {
    if (!pos) return [];
    return partite
      .filter((p) => !p.risultato)
      .map((p) => { const l = luogo(p.casa); return l ? { p, l, km: distanzaKm(pos, l) } : null; })
      .filter(Boolean)
      .sort((a, b) => a.km - b.km || (a.p.data + (a.p.ora || "")).localeCompare(b.p.data + (b.p.ora || "")));
  }, [pos, partite, luogo]);

  const giornoBreve = (d) => (etichettaGiorno ? etichettaGiorno(d) : d);

  return (
    <div className="vicino">
      {stato !== "ok" && (
        <div className="vicino__invito">
          <div>
            <p className="vicino__titolo">📍 Si gioca vicino a te</p>
            <p className="vicino__testo">Trova le partite di questo weekend nei palazzetti più vicini a dove ti trovi. La posizione resta sul tuo telefono.</p>
          </div>
          <button className="vicino__btn" onClick={cerca} disabled={stato === "cerco"}>
            {stato === "cerco" ? "Cerco la posizione…" : "Mostra le partite vicine"}
          </button>
          {stato === "errore" && <p className="vicino__errore">{errore}</p>}
        </div>
      )}
      {stato === "ok" && (
        <div className="vicino__risultati">
          <div className="vicino__testa">
            <p className="vicino__titolo">📍 Le partite più vicine a te</p>
            <button className="vicino__chiudi" onClick={() => { setStato("pronto"); setPos(null); }}>Chiudi</button>
          </div>
          {vicine.length === 0 && <p className="vicino__testo">Nessuna partita ancora da giocare trovata per questo weekend.</p>}
          <ol className="vicino__lista">
            {vicine.slice(0, quante).map(({ p, l, km }) => (
              <li key={p.id} className="vicino__riga">
                <div className="vicino__km">{km < 1 ? "<1" : km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km)}<span>km</span></div>
                <div className="vicino__corpo">
                  <p className="vicino__quando">{giornoBreve(p.data)}{p.ora ? " · " + p.ora : ""}</p>
                  <p className="vicino__partita">{nome(p.casa)} – {nome(p.ospite)}</p>
                  <p className="vicino__dove">{(p.campionato || "").replace(/ Girone.*$/, "")} · {l.preciso ? l.dove : "zona " + l.dove}</p>
                </div>
                <a className="vicino__vai" href={l.link} target="_blank" rel="noopener noreferrer">Come arrivare</a>
              </li>
            ))}
          </ol>
          {vicine.length > quante && <button className="vicino__altre" onClick={() => setQuante((q) => q + 8)}>Mostra altre partite</button>}
          <p className="vicino__nota">Distanze in linea d'aria. Per le squadre senza palazzetto in archivio la posizione è quella del paese.</p>
        </div>
      )}
    </div>
  );
}
