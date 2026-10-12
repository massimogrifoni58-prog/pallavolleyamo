import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifiche } from "../contexts/NotificheContext";
import { useTema } from "../contexts/TemaContext";
import { attivaNotifichePush } from "../push";
import { useSettings } from "../contexts/SettingsContext";
import { IconMenu, IconX, IconLogout } from "./Icons";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { testataDi } from "../grafichePagine";
import { useComponenteDemo } from "../demo/caricaInDemo";

// Come si chiama ciascun ruolo sotto il nome, nel menu. Prima diceva "Staff"
// a chiunque non fosse un'atleta: con sei livelli non basta più, e chi apre
// l'app deve poter vedere a colpo d'occhio con quali permessi sta lavorando.
const ETICHETTA_RUOLO = {
  webmanager: "Web manager",
  amministratore: "Amministratore",
  staff: "Staff",
  allenatore: "Allenatore",
  atleta: "Atleta",
  genitore: "Genitore",
};

// Le voci sono raggruppate per area: in fila sarebbero sedici, e trovare
// la pagina giusta diventa un esercizio di memoria. L'ordine dei gruppi
// segue la giornata tipo: prima cosa succede oggi, poi la squadra, poi il
// lavoro tecnico, le gare, le comunicazioni e infine l'amministrazione.
const NAV_ITEMS = [
  { gruppo: null, id: "dashboard", label: "Dashboard", staffOnly: false },
  { gruppo: null, id: "miaarea", label: "La mia area", staffOnly: false, atletaOnly: true },

  { gruppo: "Squadra", id: "atlete", label: "Atlete", staffOnly: false },
  { gruppo: "Squadra", id: "presenze", label: "Presenze", staffOnly: false },
  { gruppo: "Squadra", id: "test", label: "Test atletici", staffOnly: false },
  { gruppo: "Squadra", adminOnly: true, id: "riepilogo", label: "Riepilogo generale", staffOnly: true },

  { gruppo: "Lavoro tecnico", id: "tecnica", label: "Area tecnica", staffOnly: false },
  { gruppo: "Lavoro tecnico", id: "scout", label: "Scout partita", staffOnly: false },

  { gruppo: "Gare", id: "partite", label: "Gare", staffOnly: false },
  { gruppo: "Gare", id: "campionato", label: "Campionato", staffOnly: false },
  { gruppo: "Gare", id: "campi", label: "Campi e orari", staffOnly: false },

  { gruppo: "Comunicazione", id: "bacheca", label: "Bacheca", staffOnly: false },
  { gruppo: "Comunicazione", id: "messaggi", label: "Messaggi", staffOnly: false },
  { gruppo: "Comunicazione", id: "sondaggi", label: "Sondaggi", staffOnly: false },

  { gruppo: "Amministrazione", adminOnly: true, id: "quote", label: "Quote", staffOnly: false },
  { gruppo: "Amministrazione", adminOnly: true, id: "utenti", label: "Gestione utenti", staffOnly: true },
  { gruppo: "Amministrazione", adminOnly: true, id: "impostazioni", label: "Impostazioni", staffOnly: true },
];
export default function Layout({ page, setPage, children }) {
  // Solo nella versione dimostrativa: la barra per cambiare ruolo davanti a
  // chi guarda. Nella versione vera questa riga non carica niente.
  const BarraDemo = useComponenteDemo(() => import("../demo/BarraDemo.jsx"));
  // Immagini di testata, una per area. Stanno qui e non nelle singole pagine:
  // così la fascia si applica a tutte e sedici senza toccarne nessuna.
  const [testate, setTestate] = useState({});
  // Il nome da mostrare accanto al logo del web master: un marchio senza
  // nome, in piccolo, non dice a nessuno di chi è.
  const [nomeWebMaster, setNomeWebMaster] = useState("");
  useEffect(() => {
    return onSnapshot(
      collection(db, "grafichePagine"),
      (snap) => {
        const m = {};
        snap.docs.forEach((d) => (m[d.id] = d.data()?.immagine || null));
        setTestate(m);
        const wm = snap.docs.find((d) => d.id === "logo-webmaster");
        setNomeWebMaster(wm?.data()?.nome || "");
      },
      (err) => console.error("Errore lettura grafiche pagine:", err)
    );
  }, []);
  // Prima l'immagine della pagina, poi quella dell'area come riserva.
  const testata = testataDi(page, testate);
  const logoWebMaster = testate["logo-webmaster"] || null;
  const { user, profile, isStaff, isGenitore, isAdmin, ruolo, limitato, categorieStaff, logout } =
    useAuth();
  const { nomeSocieta, logoDataUrl } = useSettings();
  const [menuAperto, setMenuAperto] = useState(false);
  const { tema, cambiaTema } = useTema() || {};
  const { nonLettiBacheca = 0, nonLettiMessaggi = 0, chiediPermesso } = useNotifiche() || {};

  // Le voci effettivamente visibili a chi sta guardando: servono anche per
  // sapere dove comincia un gruppo nuovo.
  const vociVisibili = NAV_ITEMS.filter(
    (item) =>
      (!item.staffOnly || isStaff) &&
      (!item.atletaOnly || !isStaff) &&
      // Il genitore non risponde ai sondaggi al posto della figlia.
      !(isGenitore && ["sondaggi"].includes(item.id)) &&
      // Quote, utenti, impostazioni e riepilogo restano all'amministratore.
      // Il limite vale dentro lo staff: per l'atleta la voce Quote resta,
      // perché mostra solo le sue.
      (!item.adminOnly || isAdmin || !isStaff)
  ).map((item) =>
    // Per atlete e genitori "Quote" non è amministrazione della società:
    // sono le proprie rate, e sotto quel titolo non le cercherebbero.
    !isStaff && item.id === "quote" ? { ...item, gruppo: "Le mie quote" } : item
  );

  function contatore(id) {
    if (id === "bacheca") return nonLettiBacheca;
    if (id === "messaggi") return nonLettiMessaggi;
    return 0;
  }

  // Il permesso va chiesto dopo un gesto dell'utente, quindi serve un
  // pulsante. Si mostra finché il permesso non è concesso: legarlo a un
  // segnalibro locale, come si faceva prima, lo faceva sparire per sempre
  // anche a chi non aveva mai registrato il dispositivo.
  const [permesso, setPermesso] = useState(() =>
    typeof Notification === "undefined" ? "non-supportato" : Notification.permission
  );
  const mostraInvito = permesso === "default";

  // Se il permesso c'è già, il dispositivo si registra da solo: chi aveva
  // accettato prima che esistessero le notifiche vere resterebbe altrimenti
  // senza, e senza modo di accorgersene.
  useEffect(() => {
    if (!user || permesso !== "granted") return;
    attivaNotifichePush(user, profile);
  }, [user, profile, permesso]);

  async function attivaNotifiche() {
    const esito = await attivaNotifichePush(user, profile);
    if (!esito.ok) await chiediPermesso?.();
    setPermesso(typeof Notification === "undefined" ? "non-supportato" : Notification.permission);
  }
  const initials = (profile?.nome?.[0] || "") + (profile?.cognome?.[0] || "");

  function vaiA(id) {
    setPage(id);
    setMenuAperto(false);
  }

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <button
          className="icon-btn"
          onClick={() => setMenuAperto(true)}
          aria-label="Apri menu"
        >
          <IconMenu />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="sidebar-brand-mark" style={{ width: 26, height: 26 }}>
            {logoDataUrl && <img src={logoDataUrl} alt="" />}
          </div>
          <strong style={{ fontSize: 14 }}>{nomeSocieta || "Gestionale"}</strong>
        </div>
        <div style={{ width: 26 }} />
      </div>

      <div
        className={`sidebar-backdrop ${menuAperto ? "open" : ""}`}
        onClick={() => setMenuAperto(false)}
      />

      <aside className={`sidebar ${menuAperto ? "open" : ""}`}>
        <div
          className="sidebar-brand"
          style={{ justifyContent: "space-between" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="sidebar-brand-mark">
              {logoDataUrl && <img src={logoDataUrl} alt="" />}
            </div>
            <div>
              <div className="sidebar-brand-text">{nomeSocieta || "Gestionale"}</div>
              <div className="sidebar-brand-sub">Società sportiva</div>
            </div>
          </div>
          <button
            className="icon-btn"
            style={{ display: menuAperto ? "block" : "none" }}
            onClick={() => setMenuAperto(false)}
            aria-label="Chiudi menu"
          >
            <IconX width={16} height={16} />
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {vociVisibili.map((item, i) => {
            const gruppoPrecedente = i > 0 ? vociVisibili[i - 1].gruppo : null;
            const nuovoGruppo = item.gruppo && item.gruppo !== gruppoPrecedente;
            return (
              <div key={item.id}>
                {nuovoGruppo && (
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-faint)",
                      padding: "14px 10px 6px",
                    }}
                  >
                    {item.gruppo}
                  </div>
                )}
                <button
                  className={`nav-item ${page === item.id ? "active" : ""}`}
                  style={{ width: "100%" }}
                  onClick={() => vaiA(item.id)}
                >
                  {item.label}
                  {contatore(item.id) > 0 && (
                    <span
                      style={{
                        marginLeft: "auto",
                        minWidth: 20,
                        height: 20,
                        borderRadius: 999,
                        background: "var(--warn)",
                        color: "var(--su-colore)",
                        fontSize: 11,
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 6px",
                      }}
                    >
                      {contatore(item.id)}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {mostraInvito && (
          <div style={{ padding: "10px 12px" }}>
            <button
              className="btn btn-ghost"
              style={{ width: "100%", fontSize: 12 }}
              onClick={attivaNotifiche}
            >
              Attiva le notifiche
            </button>
          </div>
        )}

        <div style={{ padding: "0 12px 8px" }}>
          <button
            className="btn btn-ghost"
            style={{ width: "100%", fontSize: 12 }}
            onClick={cambiaTema}
          >
            {tema === "chiaro" ? "Passa al tema scuro" : "Passa al tema chiaro"}
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{initials.toUpperCase() || "?"}</div>
            <div>
              {limitato && (
                <div style={{ fontSize: 10, color: "var(--accent)", marginBottom: 2 }}>
                  {categorieStaff.join(", ")}
                </div>
              )}
              <div className="user-chip-name">
                {profile?.nome} {profile?.cognome}
              </div>
              <div className="user-chip-role">{ETICHETTA_RUOLO[ruolo] || "Atleta"}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <IconLogout width={14} height={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            Esci
          </button>

          {/* Tre marchi, tre ruoli diversi: la società in alto perché è di chi
              usa l'app; qui sotto, in piccolo, chi l'app l'ha fatta e chi la
              cura. Separati dal resto, così non competono con il contenuto. */}
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid var(--border-soft)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Ogni marchio con la sua scritta accanto: da soli, alti sedici
                pixel e smorzati, erano due macchioline che nessuno
                riconosceva. La riga spiega cosa sono. */}
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src="/icon-192.png"
                alt=""
                width={24}
                height={24}
                style={{ borderRadius: 6, display: "block", flexShrink: 0 }}
              />
              <span style={{ lineHeight: 1.25 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)" }}>
                  HubVolley
                </span>
                <span style={{ display: "block", fontSize: 10, color: "var(--text-faint)" }}>
                  gestionale per la pallavolo
                </span>
              </span>
            </span>

            {logoWebMaster && (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img
                  src={logoWebMaster}
                  alt=""
                  style={{
                    height: 24,
                    width: "auto",
                    maxWidth: 90,
                    display: "block",
                    flexShrink: 0,
                  }}
                />
                <span style={{ lineHeight: 1.25 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)" }}>
                    {nomeWebMaster || "Web master"}
                  </span>
                  <span style={{ display: "block", fontSize: 10, color: "var(--text-faint)" }}>
                    web master
                  </span>
                </span>
              </span>
            )}
          </div>
        </div>
      </aside>

      <main
        className="main"
        data-testata={testata ? "si" : undefined}
        style={testata ? { "--testata-img": `url(${testata})` } : undefined}
      >
        {children}
      </main>

      {BarraDemo && <BarraDemo />}
    </div>
  );
}
