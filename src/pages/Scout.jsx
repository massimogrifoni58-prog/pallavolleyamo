import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  increment,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useToast, useConfirm } from "../contexts/ToastContext";
import { useRosa } from "../dati";
import { formatDate, idConvocate } from "../utils";
import { prioritaSquadra, chiSiMuove, prioritaAtleta } from "../analisi";
import {
  FONDAMENTALI_SCOUT,
  vociDi,
  sommaSet,
  totaleSquadra,
  indicatori,
  unisciTotali,
  prospetto,
  rigaFondamentale,
  confrontoCompagne,
  TENTATIVI_MINIMI_CONFRONTO,
} from "../scoutCalcoli";

const SET_DISPONIBILI = [1, 2, 3, 4, 5];

function Perc({ v }) {
  return <>{v == null ? "—" : `${v}%`}</>;
}

export default function Scout() {
  const { isStaff } = useAuth();
  const { showToast } = useToast();
  const confirmDialog = useConfirm();
  const { rosa } = useRosa();
  const [partite, setPartite] = useState([]);
  // Quante delle prime voci dell'elenco sono gare già giocate.
  const [giocate, setGiocate] = useState(0);
  const [scout, setScout] = useState({}); // partitaId -> { set: {...} }
  const [partitaId, setPartitaId] = useState("");
  const [setScelti, setSetScelti] = useState([...SET_DISPONIBILI]);
  const [vista, setVista] = useState("squadra");
  const [periodoStagione, setPeriodoStagione] = useState("Stagione in corso");
  const [atletaAperta, setAtletaAperta] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, "partite"), orderBy("data", "desc")), (s) => {
      const oggi = new Date().toISOString().slice(0, 10);
      const tutte = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Prima le gare già giocate, dalla più recente: è su quelle che si
      // lavora. Le prossime restano sotto, in ordine di calendario. Ordinare
      // per distanza da oggi sarebbe stato "il più vicino per primo", ma le
      // date saltavano avanti e indietro e l'elenco sembrava sparso.
      const giocate = tutte
        .filter((p) => p.data && p.data <= oggi)
        .sort((a, b) => b.data.localeCompare(a.data));
      const prossime = tutte
        .filter((p) => p.data && p.data > oggi)
        .sort((a, b) => a.data.localeCompare(b.data));
      const senzaData = tutte.filter((p) => !p.data);
      const lista = [...giocate, ...prossime, ...senzaData];
      setPartite(lista);
      setGiocate(giocate.length);
      setPartitaId((prec) => prec || lista[0]?.id || "");
    });
    const u2 = onSnapshot(
      collection(db, "scout"),
      (s) => {
        const mappa = {};
        s.docs.forEach((d) => (mappa[d.id] = d.data()));
        setScout(mappa);
      },
      (err) => console.error("Errore lettura scout:", err)
    );
    return () => {
      u1();
      u2();
    };
  }, []);

  const partita = partite.find((p) => p.id === partitaId);
  const datiPartita = scout[partitaId]?.set || {};

  // Azzerare lo scout di una gara: serve dopo una prova, o quando ci si
  // accorge a metà che si stava registrando sulla partita sbagliata. Cancella
  // solo i dati dello scout: la gara, le convocazioni e il risultato restano.
  const setConDati = Object.keys(datiPartita).length;

  async function cancellaScoutPartita() {
    if (!partitaId) return;
    const ok = await confirmDialog(
      `Cancellare tutti i dati scout di questa gara? Spariscono ${setConDati} set e non si possono recuperare. La gara e le convocazioni restano.`
    );
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "scout", partitaId));
      showToast("Dati scout della gara cancellati.", { type: "success" });
    } catch (err) {
      console.error("Errore cancellazione scout:", err);
      showToast("Non è stato possibile cancellare.", { type: "error" });
    }
  }

  // Solo le atlete convocate, se la convocazione è stata compilata.
  const atleteInDistinta = useMemo(() => {
    if (!partita) return [];
    const convocate = idConvocate(partita.convocate);
    const lista = convocate.length
      ? rosa.filter((a) => convocate.includes(a.id))
      : rosa;
    // In ordine di numero, come su qualunque foglio scout: durante la gara si
    // cerca il numero, e con la griglia sempre uguale la mano ci arriva da
    // sola. Chi non ha ancora un numero finisce in fondo, in ordine alfabetico.
    const numero = (a) => {
      const n = parseInt(a.numeroMaglia, 10);
      return Number.isFinite(n) ? n : Infinity;
    };
    return [...lista].sort(
      (a, b) =>
        numero(a) - numero(b) ||
        `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`)
    );
  }, [partita, rosa]);

  const totali = useMemo(() => sommaSet(setScelti, datiPartita), [setScelti, datiPartita]);
  const squadra = useMemo(() => totaleSquadra(totali), [totali]);
  const indSquadra = indicatori(squadra);

  // Consuntivo: somma di tutte le gare con dati registrati.
  const stagione = useMemo(() => {
    const oggi = new Date();
    const annoInizio = oggi.getMonth() >= 7 ? oggi.getFullYear() : oggi.getFullYear() - 1;
    const dal = `${annoInizio}-08-01`;
    const gare = partite.filter(
      (p) => scout[p.id]?.set && (periodoStagione === "Tutte" || p.data >= dal)
    );
    let totaliStagione = {};
    const perGara = [];
    gare.forEach((p) => {
      const t = sommaSet(SET_DISPONIBILI, scout[p.id].set);
      totaliStagione = unisciTotali(totaliStagione, t);
      const sq = totaleSquadra(t);
      perGara.push({ partita: p, squadra: sq, ind: indicatori(sq), totali: t });
    });
    return {
      gare: perGara.sort((a, b) => String(b.partita.data).localeCompare(String(a.partita.data))),
      totali: totaliStagione,
      squadra: totaleSquadra(totaliStagione),
    };
  }, [partite, scout, periodoStagione]);

  // Priorità: le ultime tre gare contro tutto quello che viene prima. Tre è
  // il minimo per cui una differenza non è l'umore di una serata, e resta
  // abbastanza vicino da descrivere come sta andando adesso.
  const analisi = useMemo(() => {
    const gare = stagione.gare; // già dalla più recente
    if (gare.length === 0) return null;
    const quanteRecenti = Math.min(3, Math.max(1, gare.length - 1));
    const recenti = gare.slice(0, quanteRecenti);
    const prima = gare.slice(quanteRecenti);

    const unisci = (elenco) =>
      elenco.reduce((acc, g) => unisciTotali(acc, g.totali), {});
    const totaliRecenti = unisci(recenti);
    const totaliPrima = unisci(prima);

    return {
      gareRecenti: recenti.map((g) => g.partita),
      garePrima: prima.length,
      perAtletaRecenti: totaliRecenti,
      perAtletaPrima: totaliPrima,
      squadraRecenti: totaleSquadra(totaliRecenti),
      squadraPrima: totaleSquadra(totaliPrima),
    };
  }, [stagione]);

  async function salvaSet(numeroSet, righe) {
    await setDoc(
      doc(db, "scout", partitaId),
      {
        partitaId,
        aggiornato: new Date().toISOString(),
        set: { ...datiPartita, [numeroSet]: righe },
      },
      { merge: true }
    );
    showToast(`Set ${numeroSet} salvato.`, { type: "success" });
  }

  if (partite.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Scout partita</h1>
        </div>
        <div className="panel">
          <div className="empty-state">
            Nessuna gara in calendario: creane una da "Gare" per poter registrare lo scout.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Scout partita</h1>
        <p className="page-sub">Dati per fondamentale, squadra e singola atleta</p>
      </div>

      {/* Filtri */}
      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}
      >
        <div className="field" style={{ margin: 0, minWidth: 240 }}>
          <label>Partita</label>
          <select value={partitaId} onChange={(e) => setPartitaId(e.target.value)}>
            <optgroup label="Giocate">
              {partite.slice(0, giocate).map((p) => (
                <option key={p.id} value={p.id}>
                  {formatDate(p.data)} — {p.avversario}
                  {scout[p.id]?.set ? " · con dati" : ""}
                </option>
              ))}
            </optgroup>
            {partite.length > giocate && (
              <optgroup label="In programma">
                {partite.slice(giocate).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.data ? formatDate(p.data) : "senza data"} — {p.avversario}
                    {scout[p.id]?.set ? " · con dati" : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {isStaff && setConDati > 0 && (
          <button
            className="btn btn-danger-ghost"
            onClick={cancellaScoutPartita}
            title="Cancella i dati scout di questa gara"
          >
            Azzera scout gara
          </button>
        )}
        <div className="field" style={{ margin: 0 }}>
          <label>Set considerati</label>
          <div style={{ display: "flex", gap: 4 }}>
            {SET_DISPONIBILI.map((n) => {
              const attivo = setScelti.includes(n);
              const haDati = !!datiPartita[n];
              return (
                <button
                  key={n}
                  onClick={() =>
                    setSetScelti((prev) =>
                      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort()
                    )
                  }
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: `1px solid ${attivo ? "var(--accent)" : "var(--border)"}`,
                    background: attivo ? "var(--accent-soft)" : "transparent",
                    color: haDati ? "var(--text)" : "var(--text-faint)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  title={haDati ? `Set ${n}` : `Set ${n} — nessun dato`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="tag-row">
        {[
          ["squadra", "Squadra"],
          ["priorita", "Priorità"],
          ["tabellone", "Tabellone"],
          ["atlete", "Atlete"],
          ["stagione", "Consuntivo stagione"],
          ...(isStaff
            ? [
                ["partita", "Modalità partita"],
                ["inserimento", "Inserimento dati"],
              ]
            : []),
        ].map(([k, l]) => (
          <button
            key={k}
            className={`tab ${vista === k ? "active" : ""}`}
            onClick={() => setVista(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {vista === "squadra" && <VistaSquadra squadra={squadra} ind={indSquadra} />}
      {vista === "priorita" && (
        <VistaPriorita analisi={analisi} rosa={rosa} onApri={(id) => setAtletaAperta(id)} />
      )}
      {vista === "tabellone" && (
        <Tabellone
          totali={totali}
          squadra={squadra}
          rosa={rosa}
          stagione={stagione}
          partita={partita}
          setScelti={setScelti}
        />
      )}
      {vista === "atlete" && (
        <VistaAtlete
          totali={totali}
          rosa={rosa}
          onApri={(id) => setAtletaAperta(id)}
        />
      )}
      {vista === "stagione" && (
        <VistaStagione
          stagione={stagione}
          rosa={rosa}
          periodo={periodoStagione}
          onPeriodo={setPeriodoStagione}
          onApri={(id) => setAtletaAperta(id)}
        />
      )}
      {vista === "partita" && isStaff && (
        <ModalitaPartita
          atlete={atleteInDistinta}
          partitaId={partitaId}
          datiPartita={datiPartita}
          formazioni={scout[partitaId]?.formazioni}
          showToast={showToast}
        />
      )}
      {vista === "inserimento" && isStaff && (
        <Inserimento
          atlete={atleteInDistinta}
          datiPartita={datiPartita}
          onSalva={salvaSet}
        />
      )}

      {atletaAperta && (
        <SchedaAtletaScout
          atletaId={atletaAperta}
          rosa={rosa}
          scout={scout}
          partite={partite}
          onClose={() => setAtletaAperta(null)}
        />
      )}
    </div>
  );
}

// Le priorità: su cosa conviene lavorare, e perché.
//
// Ogni voce porta il numero che la giustifica. Senza, sarebbe un oracolo da
// credere sulla fiducia; con, è un argomento che l'allenatore può controllare
// e contestare — che è l'unico modo perché serva a qualcosa.
function VistaPriorita({ analisi, rosa, onApri }) {
  if (!analisi) {
    return (
      <div className="panel">
        <div className="empty-state">
          Nessuna gara con dati scout: le priorità si ricavano da lì.
        </div>
      </div>
    );
  }

  const { squadraRecenti, squadraPrima, perAtletaRecenti, perAtletaPrima } = analisi;
  const priorita = prioritaSquadra(squadraRecenti, squadraPrima);
  const movimenti = chiSiMuove(perAtletaRecenti, perAtletaPrima).slice(0, 8);
  const nomeDi = (id) => {
    const a = rosa.find((x) => x.id === id);
    if (!a) return "Atleta";
    return `${a.numeroMaglia ? `${a.numeroMaglia} ` : ""}${a.cognome} ${a.nome}`;
  };

  const periodo =
    analisi.gareRecenti.length === 1
      ? "l'ultima gara"
      : `le ultime ${analisi.gareRecenti.length} gare`;

  return (
    <div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <h3>Su cosa lavorare</h3>
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
            {periodo}
            {analisi.garePrima > 0 ? ` confrontate con le ${analisi.garePrima} precedenti` : ""}
          </span>
        </div>

        {priorita.length === 0 ? (
          <div className="empty-state">
            Nessun punto regalato registrato: non c'è niente da ordinare.
          </div>
        ) : (
          <div style={{ padding: "14px 20px" }}>
            {priorita.slice(0, 3).map((p, i) => (
              <div
                key={p.fondamentale}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "10px 0",
                  borderBottom: i < 2 ? "1px solid var(--border-soft)" : "none",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: `1px solid ${i === 0 ? "var(--warn)" : "var(--border)"}`,
                    color: i === 0 ? "var(--warn)" : "var(--text-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 14 }}>
                  <strong>{p.etichetta}</strong>
                  <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 2 }}>
                    {p.motivo.replace(`${p.etichetta}: `, "")}
                  </div>
                </span>
              </div>
            ))}

            {priorita.length > 3 && (
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10 }}>
                Poi: {priorita.slice(3).map((p) => p.etichetta.toLowerCase()).join(", ")}.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Chi si sta muovendo</h3>
        </div>
        {movimenti.length === 0 ? (
          <div className="empty-state">
            Nessuno scostamento abbastanza grande, o troppi pochi dati per dirlo.
            Servono almeno una dozzina di tocchi per fondamentale.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Cosa</th>
                <th>Prima</th>
                <th>Ora</th>
              </tr>
            </thead>
            <tbody>
              {movimenti.map((m, i) => (
                <tr
                  key={`${m.atletaId}-${m.fondamentale}-${i}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => onApri(m.atletaId)}
                >
                  <td style={{ fontWeight: 600 }}>{nomeDi(m.atletaId)}</td>
                  <td style={{ color: "var(--text-dim)" }}>{m.etichetta}</td>
                  <td style={{ color: "var(--text-dim)" }}>{m.prima}%</td>
                  <td
                    style={{
                      fontWeight: 700,
                      color: m.direzione === "peggio" ? "var(--danger)" : "var(--ok)",
                    }}
                  >
                    {m.ora}% {m.direzione === "peggio" ? "↓" : "↑"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 12 }}>
        L'ordine nasce da quanti punti ogni fondamentale regala e da come sta
        andando rispetto a prima. Non ci sono valori di riferimento presi da
        fuori: il confronto è sempre fra la squadra e sé stessa.
      </p>
    </div>
  );
}

// Il tabellone: i numeri come si leggono su un foglio scout, e stampabili.
//
// Tre viste di uno stesso dato, perché tre domande diverse: come è andata la
// squadra, come è andata ciascuna atleta, e come sono andate le giornate una
// dopo l'altra. Le colonne sono sempre le stesse — interventi, punti, errori,
// giocati, percentuale — così chi le legge impara a leggerle una volta sola.
function Tabellone({ totali, squadra, rosa, stagione, partita, setScelti }) {
  const [fondamentale, setFondamentale] = useState("tutti");
  const [periodo, setPeriodo] = useState("partita");

  const nomeDi = (id) => {
    const a = rosa.find((x) => x.id === id);
    if (!a) return "Atleta non in elenco";
    return `${a.numeroMaglia ? `${a.numeroMaglia} ` : ""}${a.cognome} ${a.nome}`;
  };

  // Su quali dati si lavora: la gara scelta o tutta la stagione.
  const daMostrare = periodo === "stagione" ? stagione.totali : totali;
  const squadraDaMostrare = periodo === "stagione" ? stagione.squadra : squadra;

  // La riga di una atleta: o un fondamentale solo, o la somma di tutti.
  function rigaDi(dati) {
    if (fondamentale === "tutti") return prospetto(dati).totale;
    return rigaFondamentale(dati, fondamentale);
  }

  const righeAtlete = Object.entries(daMostrare)
    .map(([id, d]) => ({ id, nome: nomeDi(id), ...rigaDi(d) }))
    .filter((r) => r.interventi > 0)
    .sort((a, b) => b.interventi - a.interventi);

  const prospettoSquadra = prospetto(squadraDaMostrare);

  // Le giornate: una colonna per gara, in ordine di calendario.
  const giornate = [...stagione.gare].reverse();

  const intestazione =
    periodo === "stagione"
      ? `Stagione — ${stagione.gare.length} ${stagione.gare.length === 1 ? "gara" : "gare"}`
      : `${partita ? `${formatDate(partita.data)} · ${partita.avversario}` : "Gara"} — set ${setScelti.join(", ")}`;

  const celle = (r) => (
    <>
      <td>{r.interventi}</td>
      <td style={{ fontWeight: 600, color: "var(--ok)" }}>{r.punti}</td>
      <td style={{ color: "var(--danger)" }}>{r.errori}</td>
      <td style={{ color: "var(--text-dim)" }}>{r.giocati}</td>
      <td style={{ fontWeight: 700 }}>{r.perc == null ? "—" : `${r.perc}%`}</td>
    </>
  );

  return (
    <div className="foglio-stampa">
      <div
        className="senza-stampa"
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}
      >
        <div className="field" style={{ margin: 0, minWidth: 150 }}>
          <label>Periodo</label>
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            <option value="partita">Gara selezionata</option>
            <option value="stagione">Tutta la stagione</option>
          </select>
        </div>
        <div className="field" style={{ margin: 0, minWidth: 160 }}>
          <label>Fondamentale</label>
          <select value={fondamentale} onChange={(e) => setFondamentale(e.target.value)}>
            <option value="tutti">Tutti sommati</option>
            {FONDAMENTALI_SCOUT.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          Stampa
        </button>
      </div>

      <h2 style={{ fontSize: 15, marginBottom: 10 }}>{intestazione}</h2>

      {/* --- squadra, fondamentale per fondamentale --- */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-header">
          <h3>Squadra</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Fondamentale</th>
              <th>Interventi</th>
              <th>Punti</th>
              <th>Errori</th>
              <th>Giocati</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {prospettoSquadra.righe.map((r) => (
              <tr key={r.fondamentale}>
                <td style={{ fontWeight: 600 }}>{r.etichetta}</td>
                {celle(r)}
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid var(--border)" }}>
              <td style={{ fontWeight: 700 }}>Totale</td>
              {celle(prospettoSquadra.totale)}
            </tr>
          </tbody>
        </table>
      </div>

      {/* --- atleta per atleta --- */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-header">
          <h3>
            Atlete
            {fondamentale !== "tutti" && (
              <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>
                {" "}
                · {FONDAMENTALI_SCOUT.find((f) => f.key === fondamentale)?.label.toLowerCase()}
              </span>
            )}
          </h3>
        </div>
        {righeAtlete.length === 0 ? (
          <div className="empty-state">Nessun dato per il periodo scelto.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Interventi</th>
                <th>Punti</th>
                <th>Errori</th>
                <th>Giocati</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {righeAtlete.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.nome}</td>
                  {celle(r)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- tutte le giornate --- */}
      <div className="panel">
        <div className="panel-header">
          <h3>Tutte le giornate</h3>
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
            interventi · punti · errori per gara
          </span>
        </div>
        {giornate.length === 0 ? (
          <div className="empty-state">Nessuna gara con dati scout registrati.</div>
        ) : (
          <div className="tabella-scorrevole">
          <table>
            <thead>
              <tr>
                <th>Atleta</th>
                {giornate.map((g) => (
                  <th key={g.partita.id} style={{ whiteSpace: "nowrap" }}>
                    {String(g.partita.data).slice(8, 10)}/{String(g.partita.data).slice(5, 7)}
                    <div style={{ fontWeight: 400, fontSize: 10, color: "var(--text-faint)" }}>
                      {(g.partita.avversario || "").slice(0, 10)}
                    </div>
                  </th>
                ))}
                <th>Totale</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(stagione.totali)
                .map((id) => ({ id, nome: nomeDi(id) }))
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map(({ id, nome }) => (
                  <tr key={id}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{nome}</td>
                    {giornate.map((g) => {
                      const d = g.totali[id];
                      if (!d) {
                        // Non convocata o nessun tocco registrato: una riga
                        // vuota dice più di uno zero, che sembrerebbe un
                        // rendimento nullo invece di un'assenza.
                        return (
                          <td key={g.partita.id} style={{ color: "var(--text-faint)" }}>
                            —
                          </td>
                        );
                      }
                      const r = rigaDi(d);
                      return (
                        <td key={g.partita.id} style={{ whiteSpace: "nowrap" }}>
                          {r.interventi}
                          <span style={{ color: "var(--ok)" }}> · {r.punti}</span>
                          <span style={{ color: "var(--danger)" }}> · {r.errori}</span>
                        </td>
                      );
                    })}
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                      {(() => {
                        const r = rigaDi(stagione.totali[id]);
                        return `${r.interventi} · ${r.punti} · ${r.errori}`;
                      })()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <p className="senza-stampa" style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 12 }}>
        Giocati sono i palloni rimasti in gioco: interventi meno punti meno
        errori. La percentuale è l'efficienza, (punti − errori) ÷ interventi,
        e può essere negativa quando gli errori superano i punti. Nel totale è
        ricalcolata sulle somme, non è la media delle percentuali.
      </p>
    </div>
  );
}

function VistaSquadra({ squadra, ind }) {
  const puntiPerFondamentale = [
    { label: "Attacco", v: squadra.attacco?.punti || 0 },
    { label: "Muro", v: squadra.muro?.punti || 0 },
    { label: "Battuta", v: squadra.battuta?.ace || 0 },
  ];
  const maxPunti = Math.max(1, ...puntiPerFondamentale.map((p) => p.v));

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{ind.puntiFatti}</div>
          <div className="stat-label">Punti fatti</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: "var(--danger)" }}>
          <div className="stat-value">{ind.puntiRegalati}</div>
          <div className="stat-label">Punti regalati</div>
        </div>
        <div
          className="stat-card"
          style={{ borderLeftColor: ind.saldo >= 0 ? "var(--ok)" : "var(--danger)" }}
        >
          <div className="stat-value">
            {ind.saldo > 0 ? `+${ind.saldo}` : ind.saldo}
          </div>
          <div className="stat-label">Saldo</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            <Perc v={ind.attaccoEfficienza} />
          </div>
          <div className="stat-label">Efficienza attacco</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            <Perc v={ind.ricezionePositiva} />
          </div>
          <div className="stat-label">Ricezione positiva</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div className="panel">
          <div className="panel-header">
            <h3>Produzione punti</h3>
          </div>
          <div style={{ padding: "16px 20px" }}>
            {puntiPerFondamentale.map((p) => (
              <div key={p.label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span>{p.label}</span>
                  <span style={{ fontWeight: 600 }}>{p.v}</span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: "var(--border-soft)",
                    marginTop: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round((p.v / maxPunti) * 100)}%`,
                      height: "100%",
                      background: "var(--accent)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Punti fatti e regalati</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fondamentale</th>
                <th>Fatti</th>
                <th>Regalati</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Attacco</td>
                <td>{squadra.attacco?.punti || 0}</td>
                <td style={{ color: "var(--danger)" }}>{ind.regalati.attacco}</td>
              </tr>
              <tr>
                <td>Battuta</td>
                <td>{squadra.battuta?.ace || 0}</td>
                <td style={{ color: "var(--danger)" }}>{ind.regalati.battuta}</td>
              </tr>
              <tr>
                <td>Muro</td>
                <td>{squadra.muro?.punti || 0}</td>
                <td style={{ color: "var(--danger)" }}>{ind.regalati.muro}</td>
              </tr>
              <tr>
                <td>Ricezione</td>
                <td>—</td>
                <td style={{ color: "var(--danger)" }}>{ind.regalati.ricezione}</td>
              </tr>
              <tr>
                <td>Difesa</td>
                <td>—</td>
                <td style={{ color: "var(--danger)" }}>{ind.regalati.difesa}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ padding: "10px 20px", fontSize: 11, color: "var(--text-faint)" }}>
            Un punto regalato è un errore che assegna direttamente il punto all'avversaria; gli
            attacchi murati sono conteggiati qui.
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Dettaglio per fondamentale</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fondamentale</th>
              <th>Tentativi</th>
              <th>Esiti</th>
              <th>Indicatore</th>
            </tr>
          </thead>
          <tbody>
            {FONDAMENTALI_SCOUT.map((f) => {
              const d = squadra[f.key] || {};
              const esiti = f.voci
                .filter((v) => v.key !== "tentativi")
                .map((v) => `${v.label} ${d[v.key] || 0}`)
                .join(" · ");
              const indicatore =
                f.key === "attacco"
                  ? ["Efficienza", ind.attaccoEfficienza]
                  : f.key === "battuta"
                  ? ["Ace", ind.battutaAce]
                  : f.key === "ricezione"
                  ? ["Positiva", ind.ricezionePositiva]
                  : f.key === "difesa"
                  ? ["Positiva", ind.difesaPositiva]
                  : ["Efficacia", ind.muroEfficacia];
              return (
                <tr key={f.key}>
                  <td style={{ fontWeight: 600 }}>{f.label}</td>
                  <td>{d.tentativi || 0}</td>
                  <td style={{ color: "var(--text-dim)", fontSize: 13 }}>{esiti}</td>
                  <td>
                    {indicatore[0]} <Perc v={indicatore[1]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function VistaAtlete({ totali, rosa, onApri }) {
  const righe = Object.entries(totali)
    .map(([atletaId, d]) => {
      const a = rosa.find((r) => r.id === atletaId);
      const ind = indicatori(d);
      return {
        id: atletaId,
        nome: a
          ? `${a.numeroMaglia ? `${a.numeroMaglia} ` : ""}${a.cognome} ${a.nome}`
          : "Atleta non in elenco",
        ruolo: a?.ruoloCampo || "",
        punti: ind.puntiFatti,
        regalati: ind.puntiRegalati,
        attacco: ind.attaccoEfficienza,
        ricezione: ind.ricezionePositiva,
        ace: d.battuta?.ace || 0,
        muri: d.muro?.punti || 0,
      };
    })
    .sort((a, b) => b.punti - a.punti);

  if (righe.length === 0) {
    return (
      <div className="panel">
        <div className="empty-state">
          Nessun dato per i set selezionati. Inseriscili dalla scheda "Inserimento dati".
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Rendimento per atleta</h3>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Atleta</th>
            <th>Ruolo</th>
            <th>Punti</th>
            <th>Regalati</th>
            <th>Eff. attacco</th>
            <th>Ric. positiva</th>
            <th>Ace</th>
            <th>Muri</th>
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => (
            <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => onApri(r.id)}>
              <td style={{ fontWeight: 600 }}>{r.nome}</td>
              <td style={{ color: "var(--text-dim)" }}>{r.ruolo || "—"}</td>
              <td style={{ fontWeight: 600 }}>{r.punti}</td>
              <td style={{ color: "var(--danger)" }}>{r.regalati}</td>
              <td>
                <Perc v={r.attacco} />
              </td>
              <td>
                <Perc v={r.ricezione} />
              </td>
              <td>{r.ace}</td>
              <td>{r.muri}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: "10px 20px", fontSize: 11, color: "var(--text-faint)" }}>
        Tocca una riga per il profilo della singola atleta e lo storico delle ultime partite.
      </div>
    </div>
  );
}

function Inserimento({ atlete, datiPartita, onSalva }) {
  const [numeroSet, setNumeroSet] = useState(1);
  const [righe, setRighe] = useState({});
  const [atletaId, setAtletaId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [daSalvare, setDaSalvare] = useState(false);

  useEffect(() => {
    setRighe(datiPartita[numeroSet] || {});
    setDaSalvare(false);
  }, [numeroSet, datiPartita]);

  useEffect(() => {
    if (!atletaId && atlete.length) setAtletaId(atlete[0].id);
  }, [atlete, atletaId]);

  function cambia(fondamentale, voce, delta) {
    setDaSalvare(true);
    setRighe((prev) => {
      const attuale = Number(prev[atletaId]?.[fondamentale]?.[voce] || 0);
      const nuovoValore = Math.max(0, attuale + delta);
      return {
        ...prev,
        [atletaId]: {
          ...prev[atletaId],
          [fondamentale]: { ...prev[atletaId]?.[fondamentale], [voce]: nuovoValore },
        },
      };
    });
  }

  function imposta(fondamentale, voce, valore) {
    setDaSalvare(true);
    setRighe((prev) => ({
      ...prev,
      [atletaId]: {
        ...prev[atletaId],
        [fondamentale]: {
          ...prev[atletaId]?.[fondamentale],
          [voce]: valore === "" ? 0 : Math.max(0, Number(valore)),
        },
      },
    }));
  }

  async function salva() {
    setSalvando(true);
    await onSalva(numeroSet, righe);
    setDaSalvare(false);
    setSalvando(false);
  }

  if (atlete.length === 0) {
    return (
      <div className="panel">
        <div className="empty-state">
          Nessuna atleta disponibile: controlla le convocazioni della gara o l'elenco rosa.
        </div>
      </div>
    );
  }

  const dati = righe[atletaId] || {};
  // Riepilogo rapido: quante voci sono già state compilate per ciascuna atleta.
  const compilate = (id) =>
    FONDAMENTALI_SCOUT.reduce((s, f) => {
      const d = righe[id]?.[f.key] || {};
      return s + f.voci.reduce((n, v) => n + (Number(d[v.key] || 0) > 0 ? 1 : 0), 0);
    }, 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div className="field" style={{ margin: 0 }}>
          <label>Set</label>
          <div style={{ display: "flex", gap: 4 }}>
            {SET_DISPONIBILI.map((n) => (
              <button
                key={n}
                onClick={() => setNumeroSet(n)}
                className={`tab ${numeroSet === n ? "active" : ""}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="field" style={{ margin: 0, minWidth: 220 }}>
          <label>Atleta</label>
          <select value={atletaId} onChange={(e) => setAtletaId(e.target.value)}>
            {atlete.map((a) => {
              const n = compilate(a.id);
              return (
                <option key={a.id} value={a.id}>
                  {a.numeroMaglia ? `${a.numeroMaglia} — ` : ""}
                  {a.cognome} {a.nome}
                  {n > 0 ? ` · ${n} voci` : ""}
                </option>
              );
            })}
          </select>
        </div>

        <button
          className="btn btn-primary"
          style={{ marginLeft: "auto" }}
          onClick={salva}
          disabled={salvando}
        >
          {salvando ? "Salvataggio…" : `Salva set ${numeroSet}`}
        </button>
      </div>

      {daSalvare && (
        <p style={{ fontSize: 12, color: "var(--warn)", marginBottom: 12 }}>
          Modifiche non ancora salvate. Puoi passare da un'atleta all'altra senza perderle: il
          salvataggio vale per tutto il set.
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {FONDAMENTALI_SCOUT.map((f) => (
          <div className="panel" key={f.key}>
            <div className="panel-header">
              <h3>{f.label}</h3>
            </div>
            <div style={{ padding: "12px 16px" }}>
              {f.voci.map((v) => {
                const valore = Number(dati[f.key]?.[v.key] || 0);
                return (
                  <div
                    key={v.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "6px 0",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{v.label}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => cambia(f.key, v.key, -1)}
                        style={bottoneStepper}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={valore}
                        onChange={(e) => imposta(f.key, v.key, e.target.value)}
                        style={{
                          width: 52,
                          textAlign: "center",
                          padding: "6px 4px",
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          color: "var(--text)",
                          fontWeight: 600,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => cambia(f.key, v.key, 1)}
                        style={{ ...bottoneStepper, borderColor: "var(--accent)", color: "var(--accent)" }}
                      >
                        +
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary"
        style={{ marginTop: 16 }}
        onClick={salva}
        disabled={salvando}
      >
        {salvando ? "Salvataggio…" : `Salva set ${numeroSet}`}
      </button>
    </div>
  );
}

const bottoneStepper = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-dim)",
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
  cursor: "pointer",
};

function SchedaAtletaScout({ atletaId, rosa, scout, partite, onClose }) {
  const a = rosa.find((r) => r.id === atletaId);

  // Storico: una riga per partita in cui l'atleta ha dati registrati.
  const storico = partite
    .map((p) => {
      const dati = scout[p.id]?.set;
      if (!dati) return null;
      const totali = sommaSet(SET_DISPONIBILI, dati);
      const suoi = totali[atletaId];
      if (!suoi) return null;
      const ind = indicatori(suoi);
      return {
        partita: p,
        punti: ind.puntiFatti,
        regalati: ind.puntiRegalati,
        attacco: ind.attaccoEfficienza,
        ricezione: ind.ricezionePositiva,
      };
    })
    .filter(Boolean)
    .slice(0, 6);

  const ultima = storico[0];

  // Il confronto con le compagne si fa sul totale della stagione, non su una
  // partita sola: su una serata le percentuali ballano troppo perché il
  // paragone significhi qualcosa.
  const totaliStagione = partite.reduce((acc, p) => {
    const dati = scout[p.id]?.set;
    if (!dati) return acc;
    return unisciTotali(acc, sommaSet(SET_DISPONIBILI, dati));
  }, {});
  const confronto = confrontoCompagne(totaliStagione, atletaId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h3>
          {a ? `${a.nome} ${a.cognome}${a.numeroMaglia ? ` · n. ${a.numeroMaglia}` : ""}` : "Atleta"}
          {a?.ruoloCampo ? ` · ${a.ruoloCampo}` : ""}
        </h3>

        {ultima ? (
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-value">{ultima.punti}</div>
              <div className="stat-label">Punti (ultima gara)</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "var(--danger)" }}>
              <div className="stat-value">{ultima.regalati}</div>
              <div className="stat-label">Punti regalati</div>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
            Nessun dato registrato per questa atleta.
          </p>
        )}

        {confronto.righe.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 2 }}>
              Rispetto alle compagne — tutta la stagione
            </div>
            <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "0 0 8px" }}>
              Il paragone è con le altre {confronto.quante} atlete che hanno giocato le
              stesse partite, con gli stessi criteri di rilevazione. Non con valori presi
              da fuori: quelli misurano altri livelli con altre definizioni.
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fondamentale</th>
                  <th style={{ textAlign: "right" }}>Lei</th>
                  <th style={{ textAlign: "right" }}>Compagne</th>
                  <th style={{ textAlign: "right" }}>Scarto</th>
                </tr>
              </thead>
              <tbody>
                {confronto.righe.map((r) => (
                  <tr key={r.chiave}>
                    <td>
                      {r.etichetta}
                      <div style={{ fontSize: 10, color: "var(--text-faint)" }}>
                        {r.tentativiLei} interventi suoi · {r.tentativiCompagne} delle compagne
                      </div>
                    </td>
                    {r.sufficiente ? (
                      <>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{r.lei}%</td>
                        <td style={{ textAlign: "right", color: "var(--text-dim)" }}>
                          {r.compagne}%
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 600,
                            color:
                              r.scarto === 0
                                ? "var(--text-dim)"
                                : r.meglio
                                  ? "var(--ok)"
                                  : "var(--warn)",
                          }}
                        >
                          {r.scarto > 0 ? "+" : ""}
                          {r.scarto}
                        </td>
                      </>
                    ) : (
                      <td
                        colSpan={3}
                        style={{ textAlign: "right", fontSize: 11, color: "var(--text-faint)" }}
                      >
                        {r.tentativiLei === 0
                          ? "non rilevato"
                          : `servono almeno ${TENTATIVI_MINIMI_CONFRONTO.atleta} interventi`}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "8px 0 0" }}>
              Sotto {TENTATIVI_MINIMI_CONFRONTO.atleta} interventi lo scarto non viene
              mostrato: con pochi palloni un errore solo sposta la percentuale di otto
              punti, e il confronto direbbe com'è andata una sera, non come gioca.
              Negli errori in battuta il valore basso è quello buono: il verde tiene
              già conto del verso.
            </p>
          </div>
        )}

        {storico.length > 0 && (
          <>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 6 }}>
              Ultime partite
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gara</th>
                  <th>Punti</th>
                  <th>Reg.</th>
                  <th>Att.</th>
                  <th>Ric.</th>
                </tr>
              </thead>
              <tbody>
                {storico.map((r) => (
                  <tr key={r.partita.id}>
                    <td>
                      {formatDate(r.partita.data)}
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                        {r.partita.avversario}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.punti}</td>
                    <td style={{ color: "var(--danger)" }}>{r.regalati}</td>
                    <td>
                      <Perc v={r.attacco} />
                    </td>
                    <td>
                      <Perc v={r.ricezione} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div style={{ marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}


function VistaStagione({ stagione, rosa, periodo, onPeriodo, onApri }) {
  const ind = indicatori(stagione.squadra);
  const nGare = stagione.gare.length;

  const righe = Object.entries(stagione.totali)
    .map(([atletaId, d]) => {
      const a = rosa.find((r) => r.id === atletaId);
      const i = indicatori(d);
      const garePresente = stagione.gare.filter((g) => g.totali[atletaId]).length;
      return {
        id: atletaId,
        nome: a
          ? `${a.numeroMaglia ? `${a.numeroMaglia} ` : ""}${a.cognome} ${a.nome}`
          : "Atleta non in elenco",
        gare: garePresente,
        punti: i.puntiFatti,
        regalati: i.puntiRegalati,
        mediaPunti: garePresente ? Math.round((i.puntiFatti / garePresente) * 10) / 10 : null,
        attacco: i.attaccoEfficienza,
        ricezione: i.ricezionePositiva,
        ace: d.battuta?.ace || 0,
        muri: d.muro?.punti || 0,
      };
    })
    .sort((a, b) => b.punti - a.punti);

  return (
    <>
      <div className="field" style={{ maxWidth: 220, marginBottom: 16 }}>
        <label>Periodo</label>
        <select value={periodo} onChange={(e) => onPeriodo(e.target.value)}>
          <option>Stagione in corso</option>
          <option>Tutte</option>
        </select>
      </div>

      {nGare === 0 ? (
        <div className="panel">
          <div className="empty-state">
            Nessuna gara con dati registrati nel periodo scelto.
          </div>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-value">{nGare}</div>
              <div className="stat-label">Gare con scout</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{ind.puntiFatti}</div>
              <div className="stat-label">Punti fatti</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "var(--danger)" }}>
              <div className="stat-value">{ind.puntiRegalati}</div>
              <div className="stat-label">Punti regalati</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                <Perc v={ind.attaccoEfficienza} />
              </div>
              <div className="stat-label">Efficienza attacco</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                <Perc v={ind.ricezionePositiva} />
              </div>
              <div className="stat-label">Ricezione positiva</div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-header">
              <h3>Totali per atleta</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Atleta</th>
                  <th>Gare</th>
                  <th>Punti</th>
                  <th>Media/gara</th>
                  <th>Regalati</th>
                  <th>Eff. attacco</th>
                  <th>Ric. positiva</th>
                  <th>Ace</th>
                  <th>Muri</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((r) => (
                  <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => onApri(r.id)}>
                    <td style={{ fontWeight: 600 }}>{r.nome}</td>
                    <td>{r.gare}</td>
                    <td style={{ fontWeight: 600 }}>{r.punti}</td>
                    <td>{r.mediaPunti ?? "—"}</td>
                    <td style={{ color: "var(--danger)" }}>{r.regalati}</td>
                    <td>
                      <Perc v={r.attacco} />
                    </td>
                    <td>
                      <Perc v={r.ricezione} />
                    </td>
                    <td>{r.ace}</td>
                    <td>{r.muri}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Andamento gara per gara</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gara</th>
                  <th>Punti</th>
                  <th>Regalati</th>
                  <th>Saldo</th>
                  <th>Eff. attacco</th>
                  <th>Ric. positiva</th>
                </tr>
              </thead>
              <tbody>
                {stagione.gare.map((g) => (
                  <tr key={g.partita.id}>
                    <td>
                      {formatDate(g.partita.data)}
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                        {g.partita.avversario}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{g.ind.puntiFatti}</td>
                    <td style={{ color: "var(--danger)" }}>{g.ind.puntiRegalati}</td>
                    <td
                      style={{
                        fontWeight: 600,
                        color: g.ind.saldo >= 0 ? "var(--ok)" : "var(--danger)",
                      }}
                    >
                      {g.ind.saldo > 0 ? `+${g.ind.saldo}` : g.ind.saldo}
                    </td>
                    <td>
                      <Perc v={g.ind.attaccoEfficienza} />
                    </td>
                    <td>
                      <Perc v={g.ind.ricezionePositiva} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}


// Ogni pulsante corrisponde a un'azione vista in campo. Un tocco aggiunge un
// tentativo al fondamentale e, quando serve, anche l'esito: così non bisogna
// ricordarsi di contare due cose separate.
// Simboli dello scout tradizionale, quelli che si usano sul referto:
//   #  punto diretto        +  positiva        !  neutra, in campo
//   -  negativa             /  murata          =  errore
// Il simbolo resta la cosa grande sul pulsante, l'etichetta sotto serve a
// chi non è abituato alla notazione.
const AZIONI = [
  {
    fondamentale: "attacco",
    label: "Attacco",
    esiti: [
      { voce: "punti", simbolo: "#", label: "Punto", colore: "var(--ok)" },
      { voce: null, simbolo: "!", label: "Difesa avversaria", colore: "var(--border)" },
      { voce: "murati", simbolo: "/", label: "Murato", colore: "var(--warn)" },
      { voce: "errori", simbolo: "=", label: "Errore", colore: "var(--danger)" },
    ],
  },
  {
    fondamentale: "battuta",
    label: "Battuta",
    esiti: [
      { voce: "ace", simbolo: "#", label: "Ace", colore: "var(--ok)" },
      { voce: "positive", simbolo: "+", label: "Positiva", colore: "var(--accent)" },
      { voce: null, simbolo: "!", label: "In campo", colore: "var(--border)" },
      { voce: "errori", simbolo: "=", label: "Errore", colore: "var(--danger)" },
    ],
  },
  {
    fondamentale: "ricezione",
    label: "Ricezione",
    esiti: [
      { voce: "positive", simbolo: "#", label: "Perfetta", colore: "var(--ok)" },
      { voce: "negative", simbolo: "-", label: "Negativa", colore: "var(--warn)" },
      { voce: "errori", simbolo: "=", label: "Errore", colore: "var(--danger)" },
    ],
  },
  {
    fondamentale: "difesa",
    label: "Difesa",
    esiti: [
      { voce: "positive", simbolo: "+", label: "Positiva", colore: "var(--ok)" },
      { voce: "errori", simbolo: "=", label: "Errore", colore: "var(--danger)" },
    ],
  },
  {
    fondamentale: "muro",
    label: "Muro",
    esiti: [
      { voce: "punti", simbolo: "#", label: "Punto", colore: "var(--ok)" },
      { voce: "tocchi", simbolo: "+", label: "Tocco", colore: "var(--accent)" },
      { voce: "errori", simbolo: "=", label: "Errore", colore: "var(--danger)" },
    ],
  },
];

function ModalitaPartita({ atlete, partitaId, datiPartita, formazioni, showToast }) {
  const [numeroSet, setNumeroSet] = useState(1);
  const [atletaId, setAtletaId] = useState("");
  // Modifica del sestetto: si entra apposta, così durante il gioco un tocco
  // sbagliato non cambia chi è in campo.
  const [cambioFormazione, setCambioFormazione] = useState(false);
  const [ultime, setUltime] = useState([]); // per annullare
  const [inCorso, setInCorso] = useState(false);

  const totali = datiPartita[numeroSet] || {};
  const selezionata = atlete.find((a) => a.id === atletaId);

  const formazione = formazioni?.[numeroSet] || {};
  const inCampo = formazione.inCampo || [];
  const liberoId = formazione.libero || null;
  // Finché il sestetto non è stato indicato si lavora su tutte: altrimenti
  // all'inizio della partita non si potrebbe registrare nulla.
  const formazioneImpostata = inCampo.length > 0;
  const attiva = (id) => !formazioneImpostata || inCampo.includes(id) || id === liberoId;

  async function salvaFormazione(nuovoInCampo, nuovoLibero) {
    try {
      await setDoc(
        doc(db, "scout", partitaId),
        { partitaId, aggiornato: new Date().toISOString() },
        { merge: true }
      );
      await updateDoc(doc(db, "scout", partitaId), {
        [`formazioni.${numeroSet}`]: {
          inCampo: nuovoInCampo,
          libero: nuovoLibero || null,
        },
      });
    } catch (err) {
      console.error("Errore salvataggio formazione:", err);
      showToast("Formazione non salvata.", { type: "error" });
    }
  }

  function tocca(id) {
    if (!cambioFormazione) {
      if (!attiva(id)) {
        showToast("Questa atleta è in panchina.", { type: "error" });
        return;
      }
      setAtletaId(id);
      return;
    }
    // In modifica: il tocco aggiunge o toglie dal sestetto, al massimo sei.
    if (id === liberoId) {
      salvaFormazione(inCampo, null);
      return;
    }
    if (inCampo.includes(id)) {
      salvaFormazione(inCampo.filter((x) => x !== id), liberoId);
    } else if (inCampo.length >= 6) {
      showToast("Sei già in campo: togline una prima.", { type: "error" });
    } else {
      salvaFormazione([...inCampo, id], liberoId);
    }
  }

  function segnaLibero(id) {
    salvaFormazione(inCampo.filter((x) => x !== id), liberoId === id ? null : id);
  }

  // Scrive un solo campo alla volta con un incremento: due tocchi ravvicinati
  // non si sovrascrivono, anche con la rete lenta.
  async function registra(fondamentale, voce, segno = 1) {
    if (!atletaId) {
      showToast("Scegli prima l'atleta.", { type: "error" });
      return;
    }
    setInCorso(true);
    const base = `set.${numeroSet}.${atletaId}.${fondamentale}`;
    const aggiornamento = { [`${base}.tentativi`]: increment(segno) };
    if (voce) aggiornamento[`${base}.${voce}`] = increment(segno);
    try {
      // Il documento deve esistere prima dell'aggiornamento.
      await setDoc(
        doc(db, "scout", partitaId),
        { partitaId, aggiornato: new Date().toISOString() },
        { merge: true }
      );
      // I punti nel nome del campo valgono come percorso annidato solo con
      // updateDoc: con setDoc creerebbero un campo chiamato "set.1.abc...".
      await updateDoc(doc(db, "scout", partitaId), aggiornamento);
      if (segno > 0) {
        setUltime((prev) => [{ atletaId, fondamentale, voce }, ...prev].slice(0, 20));
      }
    } catch (err) {
      console.error("Errore registrazione azione:", err);
      showToast("Azione non salvata.", { type: "error" });
    }
    setInCorso(false);
  }

  async function annullaUltima() {
    const ultima = ultime[0];
    if (!ultima) return;
    const precedente = atletaId;
    setAtletaId(ultima.atletaId);
    const base = `set.${numeroSet}.${ultima.atletaId}.${ultima.fondamentale}`;
    const aggiornamento = { [`${base}.tentativi`]: increment(-1) };
    if (ultima.voce) aggiornamento[`${base}.${ultima.voce}`] = increment(-1);
    try {
      await updateDoc(doc(db, "scout", partitaId), aggiornamento);
      setUltime((prev) => prev.slice(1));
      showToast("Ultima azione annullata.", { type: "success" });
    } catch (err) {
      console.error("Errore annullamento:", err);
    }
    setAtletaId(precedente);
  }

  if (atlete.length === 0) {
    return (
      <div className="panel">
        <div className="empty-state">
          Nessuna atleta disponibile: controlla le convocazioni della gara.
        </div>
      </div>
    );
  }

  const suoi = totali[atletaId] || {};

  return (
    <div>
      {/* Barra fissa: set, atleta scelta e annulla restano sempre a portata */}
      <div
        className="panel"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          padding: "10px 14px",
          marginBottom: 12,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "flex", gap: 4 }}>
          {SET_DISPONIBILI.map((n) => (
            <button
              key={n}
              onClick={() => setNumeroSet(n)}
              className={`tab ${numeroSet === n ? "active" : ""}`}
              style={{ minWidth: 38 }}
            >
              {n}
            </button>
          ))}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {selezionata
              ? `${selezionata.numeroMaglia ? `${selezionata.numeroMaglia} — ` : ""}${selezionata.cognome} ${selezionata.nome}`
              : "nessuna atleta"}
          </span>
          <button
            className={cambioFormazione ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => setCambioFormazione((v) => !v)}
          >
            {cambioFormazione ? "Fine sestetto" : "Sestetto"}
          </button>
          <button className="btn btn-ghost" onClick={annullaUltima} disabled={!ultime.length}>
            Annulla
          </button>
        </span>
      </div>

      {/* Atlete: pulsanti grandi, si resta sulla stessa finché non si cambia */}
      <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
        {cambioFormazione && (
          <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 10px" }}>
            Tocca le sei in campo ({inCampo.length}/6). Doppio tocco per indicare il libero.
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {atlete.map((a) => {
            const scelta = a.id === atletaId && !cambioFormazione;
            const inGioco = attiva(a.id);
            const libero = a.id === liberoId;
            const bordo = scelta
              ? "var(--accent)"
              : libero
              ? "var(--warn)"
              : inGioco
              ? "var(--ok)"
              : "var(--border)";
            return (
              <button
                key={a.id}
                onClick={() => tocca(a.id)}
                onDoubleClick={() => cambioFormazione && segnaLibero(a.id)}
                style={{
                  flex: "1 1 120px",
                  minHeight: 52,
                  borderRadius: 10,
                  border: `1px solid ${bordo}`,
                  background: scelta ? "var(--accent-soft)" : "transparent",
                  color: scelta ? "var(--accent)" : inGioco ? "var(--text)" : "var(--text-faint)",
                  // La panchina resta leggibile ma visibilmente spenta.
                  opacity: inGioco ? 1 : 0.45,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {a.numeroMaglia && (
                  <div style={{ fontSize: 20, lineHeight: 1, fontWeight: 800 }}>
                    {a.numeroMaglia}
                  </div>
                )}
                <div style={{ fontSize: a.numeroMaglia ? 12 : 14, fontWeight: 600 }}>
                  {a.cognome}
                </div>
                {libero && (
                  <div style={{ fontSize: 10, color: "var(--warn)", fontWeight: 600 }}>libero</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Azioni */}
      {AZIONI.map((gruppo) => (
        <div className="panel" key={gruppo.fondamentale} style={{ padding: 12, marginBottom: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <strong style={{ fontSize: 14 }}>{gruppo.label}</strong>
            <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
              {suoi[gruppo.fondamentale]?.tentativi || 0} azioni
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {gruppo.esiti.map((e) => (
              <button
                key={e.label}
                onClick={() => registra(gruppo.fondamentale, e.voce)}
                disabled={inCorso || !atletaId}
                style={{
                  flex: "1 1 96px",
                  minHeight: 56,
                  borderRadius: 10,
                  border: `1px solid ${e.colore}`,
                  background: "transparent",
                  color: "var(--text)",
                  fontWeight: 700,
                  fontSize: 14,
                  opacity: atletaId ? 1 : 0.45,
                  cursor: atletaId ? "pointer" : "not-allowed",
                }}
              >
                <div style={{ fontSize: 22, lineHeight: 1 }}>{e.simbolo}</div>
                <div style={{ fontSize: 11, fontWeight: 500, marginTop: 3 }}>{e.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 400 }}>
                  {e.voce ? suoi[gruppo.fondamentale]?.[e.voce] || 0 : ""}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <p style={{ fontSize: 11, color: "var(--text-faint)" }}>
        Ogni tocco viene salvato subito. "In campo" registra l'azione senza esito, per tenere il
        conto dei tentativi.
      </p>
    </div>
  );
}
