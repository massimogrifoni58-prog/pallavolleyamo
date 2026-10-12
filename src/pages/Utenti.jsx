import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth, db, secondaryAuth } from "../firebase/config";
import { useConfirm, useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { formatDate, formatDateTime } from "../utils";

// I quattro livelli che fanno parte dello staff, con l'etichetta mostrata.
// Il campo schemaRuoli distingue questi dal vecchio schema, dove "staff"
// voleva dire semplicemente "non è un'atleta": senza, le regole del database
// leggerebbero un nuovo staff come web manager.
const RUOLI_STAFF = {
  webmanager: "Web manager",
  amministratore: "Amministratore",
  staff: "Staff",
  allenatore: "Allenatore",
};
const eStaff = (r) => Object.keys(RUOLI_STAFF).includes(r);

// Come chiamare il ruolo di un account nella tabella. Gli account creati
// prima hanno ruolo "staff" più un campo booleano: vanno letti come li legge
// il database, altrimenti l'app mostrerebbe una cosa e ne varrebbe un'altra.
// Se quell'account vale come web manager, col criterio del database. Serve
// per non mostrare i pulsanti di modifica a chi non li puo usare: le regole
// lo bloccherebbero comunque, ma un pulsante che fallisce sembra un guasto.
function eWebManagerUtente(u) {
  if (!u) return false;
  if ((u.schemaRuoli || 1) >= 2) return u.ruolo === "webmanager";
  return u.ruolo === "staff" && u.amministratore !== false;
}

function etichettaRuolo(u) {
  if (u.ruolo === "genitore") return "Genitore";
  if (!eStaff(u.ruolo)) return "Atleta";
  if (u.schemaRuoli >= 2) return RUOLI_STAFF[u.ruolo];
  return u.amministratore !== false ? "Web manager" : "Allenatore";
}

export default function Utenti() {
  const confirmDialog = useConfirm();
  const { showToast } = useToast();
  const { isWebManager } = useAuth();
  const [users, setUsers] = useState([]);
  const [atlete, setAtlete] = useState([]);
  const [loginLog, setLoginLog] = useState({});
  // Dispositivi su cui le notifiche sono state attivate, raggruppati per
  // utente: senza almeno uno, quella persona non riceve niente sul telefono.
  const [dispositivi, setDispositivi] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [inModifica, setInModifica] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "users"), (snap) =>
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsub2 = onSnapshot(collection(db, "atlete"), (snap) => {
      setAtlete(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsub3 = onSnapshot(collection(db, "loginLog"), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      setLoginLog(map);
    });
    const unsub4 = onSnapshot(
      collection(db, "pushTokens"),
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => {
          const { uid, aggiornato } = d.data() || {};
          if (!uid) return;
          if (!map[uid]) map[uid] = { quanti: 0, ultimo: null };
          map[uid].quanti += 1;
          const quando = aggiornato?.toMillis?.() ?? (aggiornato ? Date.parse(aggiornato) : 0);
          if (quando && quando > (map[uid].ultimo || 0)) map[uid].ultimo = quando;
        });
        setDispositivi(map);
      },
      (err) => console.error("Errore lettura dispositivi notifiche:", err)
    );
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  // Invece di comunicare una password, si manda un collegamento con cui la
  // persona se la imposta da sé: tu non la conosci e non deve girare nelle
  // chat. Vale anche quando qualcuno la dimentica.
  async function inviaLinkPassword(u) {
    if (!u.email) {
      showToast("Questo account non ha un'email.", { type: "error" });
      return;
    }
    try {
      // L'email di Firebase arriva nella lingua indicata qui.
      auth.languageCode = "it";
      await sendPasswordResetEmail(auth, u.email);
      showToast(`Email inviata a ${u.email}.`, { type: "success" });
    } catch (err) {
      console.error("Errore invio email password:", err);
      showToast("Invio non riuscito: controlla l'indirizzo.", { type: "error" });
    }
  }

  async function handleDelete(u) {
    const ok = await confirmDialog(
      `Rimuovere l'accesso di ${u.nome} ${u.cognome}?\n\n` +
        `Questo toglie subito l'accesso ai dati dell'app. Per eliminare del tutto ` +
        `l'account di login dovrai anche rimuoverlo da Firebase Authentication.`
    );
    if (!ok) return;
    await deleteDoc(doc(db, "users", u.id));
    showToast(
      `${u.nome} ${u.cognome}: accesso rimosso. Per completare, vai su Firebase ` +
        `Console → Authentication → cerca "${u.email}" → tre puntini → Elimina utente.`,
      { type: "success", persistent: true }
    );
  }

  // Quante persone ricevono davvero le notifiche: serve a sapere su chi puoi
  // contare quando mandi un avviso, invece di darlo per scontato.
  const conNotifiche = users.filter((u) => dispositivi[u.id]).length;

  if (loading) return <div className="empty-state">Caricamento…</div>;

  return (
    <div>
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}
      >
        <div>
          <h1 className="page-title">Gestione utenti</h1>
          <p className="page-sub">
            Crea gli account per staff e atlete
            {users.length > 0 && (
              <>
                {" · "}
                {conNotifiche} di {users.length}{" "}
                {conNotifiche === 1 ? "ha attivato" : "hanno attivato"} le notifiche
              </>
            )}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + Nuovo account
        </button>
      </div>

      <div className="panel">
        {users.length === 0 ? (
          <div className="empty-state">Nessun account creato oltre al tuo.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Ruolo</th>
                <th>Atleta collegata</th>
                <th>Ultimo accesso</th>
                <th>Notifiche</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const atletaCollegata = atlete.find((a) => a.id === u.atletaId);
                const ultimoAccesso = formatDateTime(loginLog[u.id]?.ultimoAccesso);
                const push = dispositivi[u.id];
                // Il profilo di chi cura l'app non si modifica dall'esterno.
                const protetto = eWebManagerUtente(u) && !isWebManager;
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      {u.nome} {u.cognome}
                    </td>
                    <td style={{ color: "var(--text-dim)" }}>{u.email}</td>
                    <td>
                      <span className={`badge ${eStaff(u.ruolo) ? "badge-ok" : ""}`}>
                        {etichettaRuolo(u)}
                      </span>
                      {["staff", "allenatore"].includes(u.ruolo) && (
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                          {(u.categorie || []).length
                            ? (u.categorie || []).join(", ")
                            : "tutte le squadre"}
                        </div>
                      )}
                    </td>
                    <td style={{ color: "var(--text-dim)" }}>
                      {atletaCollegata
                        ? `${atletaCollegata.nome} ${atletaCollegata.cognome}`
                        : "—"}
                    </td>
                    <td style={{ color: ultimoAccesso ? "var(--text-dim)" : "var(--text-faint)" }}>
                      {ultimoAccesso || "Mai entrata"}
                    </td>
                    <td>
                      {push ? (
                        <>
                          <span className="badge badge-ok">Attive</span>
                          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                            {push.quanti === 1 ? "1 dispositivo" : `${push.quanti} dispositivi`}
                            {push.ultimo ? ` · dal ${formatDate(new Date(push.ultimo).toISOString().slice(0, 10))}` : ""}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "var(--text-faint)", fontSize: 13 }}>
                          Non attivate
                        </span>
                      )}
                    </td>
                    {/* Tre pulsanti su una riga sola sforavano dal riquadro:
                        ora vanno a capo e si allineano a destra. */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        {protetto ? (
                          <span
                            className="badge"
                            title="Il profilo del web master si modifica solo da chi cura l'app."
                          >
                            Protetto
                          </span>
                        ) : (
                          <>
                            <button className="btn btn-ghost" onClick={() => inviaLinkPassword(u)}>
                              Password
                            </button>
                            <button className="btn btn-ghost" onClick={() => setInModifica(u)}>
                              Modifica
                            </button>
                            <button className="btn btn-danger-ghost" onClick={() => handleDelete(u)}>
                              Rimuovi
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <NuovoUtenteModal
          atlete={atlete}
          puoNominareWebManager={isWebManager}
          onClose={() => setShowNew(false)}
        />
      )}
      {inModifica && (
        <ModificaUtenteModal
          utente={inModifica}
          atlete={atlete}
          puoNominareWebManager={isWebManager}
          onClose={() => setInModifica(null)}
        />
      )}
    </div>
  );
}

function NuovoUtenteModal({ atlete, puoNominareWebManager, onClose }) {
  const { showToast } = useToast();
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ruolo, setRuolo] = useState("atleta");
  // Dentro lo staff: amministratore oppure allenatore con categorie.
  const [amministratore, setAmministratore] = useState(false);
  const [categorie, setCategorie] = useState([]);
  // Le squadre disponibili si ricavano dalle atlete già inserite.
  const categorieDisponibili = [
    ...new Set(atlete.map((a) => a.categoria).filter(Boolean)),
  ].sort();
  const [atletaId, setAtletaId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // Modo consigliato: nessuno conosce la password, la imposta la persona
  // stessa dal collegamento che riceve per email.
  const [inviaEmail, setInviaEmail] = useState(true);
  const [copiato, setCopiato] = useState(false);

  // Le credenziali devono comunque uscire dall'app: chi le riceve non può
  // ancora entrare. Qui si prepara il testo già scritto, così non va
  // ricomposto a mano per ogni famiglia.
  async function copiaMessaggio() {
    const testo = [
      `Ciao, ecco l'accesso a HubVolley${
        ruolo === "genitore" ? " per seguire la squadra" : ""
      }.`,
      "",
      `Indirizzo: ${window.location.origin}`,
      `Email: ${email.trim()}`,
      `Password: ${password}`,
      "",
      "Conviene installare l'app sulla schermata Home del telefono: si apre come una normale applicazione e si possono ricevere le notifiche.",
      "La password si può cambiare in seguito.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    } catch {
      // Alcuni browser rifiutano la copia automatica: in quel caso si mostra
      // il testo e lo si seleziona a mano.
      window.prompt("Copia il messaggio:", testo);
    }
  }

  // I recapiti sono già nella scheda: riscriverli a mano è lavoro inutile e
  // occasione di errori di battitura. Per il genitore si prende la sua email,
  // non quella della figlia, altrimenti i due account si sovrapporrebbero.
  function handleSelectAtleta(id) {
    setAtletaId(id);
    const a = atlete.find((x) => x.id === id);
    if (!a) return;
    if (ruolo === "genitore") {
      setNome("Genitore");
      setCognome(a.cognome || "");
      setEmail(a.emailGenitore || "");
    } else {
      setNome(a.nome || "");
      setCognome(a.cognome || "");
      setEmail(a.emailAtleta || a.emailGenitore || "");
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Usiamo un'istanza Firebase secondaria per non perdere la sessione
      // dello staff che sta creando il nuovo account.
      // Con l'invio per email la password iniziale è casuale e non viene
      // mostrata a nessuno: serve solo perché Firebase ne richiede una.
      const passwordIniziale = inviaEmail
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 20)
        : password;
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        passwordIniziale
      );
      await setDoc(doc(db, "users", cred.user.uid), {
        nome: nome.trim(),
        cognome: cognome.trim(),
        email: email.trim(),
        ruolo,
        schemaRuoli: 2,
        // Tenuto per gli account che non sono ancora stati riaperti: le
        // regole lo ignorano quando schemaRuoli è presente.
        amministratore: ruolo === "webmanager",
        categorie: ruolo === "staff" || ruolo === "allenatore" ? categorie : [],
        atletaId: eStaff(ruolo) ? null : atletaId || null,
      });
      await signOut(secondaryAuth);

      if (inviaEmail) {
        auth.languageCode = "it";
        await sendPasswordResetEmail(auth, email.trim());
      }
      showToast(
        inviaEmail
          ? `Account creato. Email inviata a ${email.trim()}.`
          : "Account creato.",
        { type: "success" }
      );
      onClose();
    } catch (err) {
      setError(mapError(err.code));
    }
    setSaving(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nuovo account</h3>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="field">
            <label>Ruolo</label>
            <select
              value={ruolo}
              // Passando da atleta a genitore cambia quale email serve.
              onBlur={() => atletaId && handleSelectAtleta(atletaId)}
              onChange={(e) => {
                setRuolo(e.target.value);
                if (e.target.value === "staff") setAtletaId("");
              }}
            >
              <option value="atleta">Atleta</option>
              <option value="genitore">Genitore</option>
              {puoNominareWebManager && (
                <option value="webmanager">Web manager — tutto</option>
              )}
              <option value="amministratore">Amministratore — comunicazioni e amministrazione</option>
              <option value="staff">Staff — squadra, gare, comunicazioni</option>
              <option value="allenatore">Allenatore — squadra, gare, comunicazioni, lavoro tecnico</option>
            </select>
          </div>

          {(ruolo === "staff" || ruolo === "allenatore") && (
            <>
              <div className="field">
                <label>Tipo di accesso</label>
                <select
                  value={amministratore ? "admin" : "allenatore"}
                  onChange={(e) => setAmministratore(e.target.value === "admin")}
                >
                  <option value="allenatore">Allenatore — solo le sue squadre</option>
                  <option value="admin">Amministratore — accesso completo</option>
                </select>
              </div>

              {!amministratore && (
                <div className="field">
                  <label>Squadre assegnate</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {categorieDisponibili.map((c) => {
                      const scelta = categorie.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() =>
                            setCategorie((prec) =>
                              prec.includes(c) ? prec.filter((x) => x !== c) : [...prec, c]
                            )
                          }
                          style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            border: `1px solid ${scelta ? "var(--accent)" : "var(--border)"}`,
                            background: scelta ? "var(--accent-soft)" : "transparent",
                            color: scelta ? "var(--accent)" : "var(--text-dim)",
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
                    Senza squadre assegnate vedrà tutte le atlete, ma non quote,
                    utenti e impostazioni.
                  </div>
                </div>
              )}
            </>
          )}

          {(ruolo === "atleta" || ruolo === "genitore") && (
            <div className="field">
              <label>
                {ruolo === "genitore" ? "Figlia" : "Collega alla scheda atleta"}
              </label>
              <select value={atletaId} onChange={(e) => handleSelectAtleta(e.target.value)}>
                <option value="">— Seleziona per compilare i campi —</option>
                {atlete.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome} {a.cognome}
                  </option>
                ))}
              </select>
              {atletaId && !email && (
                <p style={{ fontSize: 12, color: "var(--warn)", marginTop: 6 }}>
                  {ruolo === "genitore"
                    ? "Nella scheda non c'è l'email del genitore: scrivila qui sotto, e se vuoi aggiungila anche alla scheda dell'atleta."
                    : "Questa atleta non ha un'email in scheda: inseriscine una qui sotto per poter creare l'account di login."}
                </p>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Cognome</label>
              <input
                value={cognome}
                onChange={(e) => setCognome(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="field">
            <label>Email (usata per il login)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={inviaEmail}
                onChange={(e) => setInviaEmail(e.target.checked)}
                style={{ width: "auto" }}
              />
              Manda un'email per impostare la password
            </label>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
              Consigliato: la password la sceglie chi riceve l'email, e non deve
              passare per messaggi o telefonate.
            </div>
          </div>

          {!inviaEmail && (
            <div className="field">
              <label>Password provvisoria</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <div style={{ fontSize: 11, color: "var(--warn)", marginTop: 4 }}>
                Dovrai comunicarla tu, e difficilmente verrà cambiata.
              </div>

              {email && password && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ marginTop: 8 }}
                  onClick={copiaMessaggio}
                >
                  {copiato ? "Copiato" : "Copia il messaggio da inviare"}
                </button>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Creazione…" : "Crea account"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function mapError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "Esiste già un account con questa email.";
    case "auth/weak-password":
      return "La password deve avere almeno 6 caratteri.";
    case "auth/invalid-email":
      return "Indirizzo email non valido.";
    default:
      return "Creazione account non riuscita. Riprova.";
  }
}


// Modifica di un account già esistente: si cambia il tipo di accesso, le
// squadre assegnate e il collegamento alla scheda atleta.
//
// Email e password non si toccano da qui: appartengono al sistema di accesso,
// non alla scheda. Per cambiarle si usa la console Firebase.
function ModificaUtenteModal({ utente, atlete, puoNominareWebManager, onClose }) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [ruolo, setRuolo] = useState(utente.ruolo || "atleta");
  const [amministratore, setAmministratore] = useState(utente.amministratore !== false);
  const [categorie, setCategorie] = useState(utente.categorie || []);
  const [atletaId, setAtletaId] = useState(utente.atletaId || "");
  const [salvando, setSalvando] = useState(false);

  const categorieDisponibili = [
    ...new Set(atlete.map((a) => a.categoria).filter(Boolean)),
  ].sort();

  // Togliersi da soli l'amministrazione lascerebbe l'app senza nessuno che
  // possa rimediare, se si è l'unico.
  const seStesso = utente.id === user?.uid;
  const siStaTogliendo = seStesso && (ruolo !== "staff" || !amministratore);

  async function salva() {
    setSalvando(true);
    try {
      await updateDoc(doc(db, "users", utente.id), {
        ruolo,
        schemaRuoli: 2,
        // Tenuto per gli account che non sono ancora stati riaperti: le
        // regole lo ignorano quando schemaRuoli è presente.
        amministratore: ruolo === "webmanager",
        categorie: ruolo === "staff" || ruolo === "allenatore" ? categorie : [],
        atletaId: eStaff(ruolo) ? null : atletaId || null,
      });
      showToast("Account aggiornato.", { type: "success" });
      onClose();
    } catch (err) {
      console.error("Errore aggiornamento account:", err);
      showToast("Aggiornamento non riuscito.", { type: "error" });
    }
    setSalvando(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3>
          {utente.nome} {utente.cognome}
        </h3>
        <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: -6 }}>{utente.email}</p>

        <div className="field">
          <label>Ruolo</label>
          <select value={ruolo} onChange={(e) => setRuolo(e.target.value)}>
            <option value="atleta">Atleta</option>
            <option value="genitore">Genitore</option>
            {puoNominareWebManager && (
              <option value="webmanager">Web manager — tutto</option>
            )}
            <option value="amministratore">Amministratore — comunicazioni e amministrazione</option>
            <option value="staff">Staff — squadra, gare, comunicazioni</option>
            <option value="allenatore">Allenatore — squadra, gare, comunicazioni, lavoro tecnico</option>
          </select>
        </div>

        {ruolo === "staff" && (
          <>
            <div className="field">
              <label>Tipo di accesso</label>
              <select
                value={amministratore ? "admin" : "allenatore"}
                onChange={(e) => setAmministratore(e.target.value === "admin")}
              >
                <option value="allenatore">Allenatore — solo le sue squadre</option>
                <option value="admin">Amministratore — accesso completo</option>
              </select>
            </div>

            {!amministratore && (
              <div className="field">
                <label>Squadre assegnate</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {categorieDisponibili.map((c) => {
                    const scelta = categorie.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setCategorie((prec) =>
                            prec.includes(c) ? prec.filter((x) => x !== c) : [...prec, c]
                          )
                        }
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          border: `1px solid ${scelta ? "var(--accent)" : "var(--border)"}`,
                          background: scelta ? "var(--accent-soft)" : "transparent",
                          color: scelta ? "var(--accent)" : "var(--text-dim)",
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
                  Senza squadre assegnate vedrà tutte le atlete, ma non quote, utenti e
                  impostazioni.
                </div>
              </div>
            )}
          </>
        )}

        {(ruolo === "atleta" || ruolo === "genitore") && (
          <div className="field">
            <label>{ruolo === "genitore" ? "Figlia" : "Scheda atleta collegata"}</label>
            <select value={atletaId} onChange={(e) => setAtletaId(e.target.value)}>
              <option value="">— Nessuna —</option>
              {atlete.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.cognome} {a.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {siStaTogliendo && (
          <p style={{ fontSize: 13, color: "var(--warn)" }}>
            Stai togliendo a te stesso l'accesso da amministratore. Se sei l'unico, nessuno
            potrà più rimetterlo dall'app: si dovrà intervenire da Firebase.
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button className="btn btn-primary" onClick={salva} disabled={salvando}>
            {salvando ? "Salvataggio…" : "Salva"}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
