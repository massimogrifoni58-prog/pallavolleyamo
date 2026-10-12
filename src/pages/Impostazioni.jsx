import { useEffect, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { useToast, useConfirm } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import ImportaBackup from "./ImportaBackup";
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, onSnapshot } from "firebase/firestore";
import { formatDate } from "../utils";
import { AREE_TESTATA, PAGINE_TESTATA, MISURA_CONSIGLIATA } from "../grafichePagine";
import { db } from "../firebase/config";

// Ridimensiona l'immagine lato client prima di salvarla, per restare
// ben sotto i limiti di dimensione di un documento Firestore.
// maxSize è il lato più lungo in pixel, qualita la compressione JPEG.
// Le immagini sono salvate dentro il documento delle impostazioni, che non
// può superare il megabyte: una foto di sfondo va quindi ridotta parecchio.
function ridimensionaImmagine(file, maxSize = 240, qualita = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scala = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scala);
        const h = Math.round(img.height * scala);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", qualita));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Impostazioni() {
  const {
    nomeSocieta,
    logoDataUrl,
    sfondoAreaTecnica,
    inquadraturaSfondo,
    saveSettings,
  } = useSettings();
  const { showToast } = useToast();
  const { isWebManager } = useAuth();
  const [nome, setNome] = useState(nomeSocieta || "");
  const [anteprimaLogo, setAnteprimaLogo] = useState(logoDataUrl || "");
  const [anteprimaSfondo, setAnteprimaSfondo] = useState(sfondoAreaTecnica || "");
  // La fascia è larga e bassa: una foto verticale viene tagliata, e quale
  // parte tenere dipende dalla foto. Meglio farlo scegliere.
  const [inquadratura, setInquadratura] = useState(inquadraturaSfondo || "center");
  const [saving, setSaving] = useState(false);

  // Il logo si salva appena lo scegli, come tutte le altre immagini dell'app.
  // Prima restava in attesa del pulsante "Salva" in fondo al modulo: chi lo
  // caricava vedeva l'anteprima cambiare, usciva dalla pagina convinto di
  // aver fatto, e ritrovava il logo di prima senza capire perché.
  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    let dataUrl;
    try {
      dataUrl = await ridimensionaImmagine(file);
    } catch {
      showToast("Non riesco ad aprire questa immagine: prova con un PNG o un JPEG.", {
        type: "error",
      });
      return;
    }
    setAnteprimaLogo(dataUrl);
    try {
      await saveSettings({ logoDataUrl: dataUrl });
      showToast("Logo della società salvato.", { type: "success" });
    } catch (err) {
      console.error("Errore salvataggio logo:", err?.code, err);
      showToast(
        err?.code === "permission-denied"
          ? "Permesso negato: serve un account con i permessi di amministrazione."
          : `Logo non salvato (${err?.code || "motivo sconosciuto"}).`,
        { type: "error" }
      );
    }
  }

  async function handleSfondoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Larga ma compressa: deve restare ben sotto il limite del documento.
      const dataUrl = await ridimensionaImmagine(file, 1200, 0.62);
      // Un carattere di data URL vale circa un byte: oltre i 700 KB si
      // rischia di non poter più salvare nulla in quel documento.
      if (dataUrl.length > 700000) {
        showToast("Immagine troppo pesante: provane una più piccola.", { type: "error" });
        return;
      }
      setAnteprimaSfondo(dataUrl);
    } catch {
      showToast("Impossibile leggere l'immagine.", { type: "error" });
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings({
        nomeSocieta: nome.trim(),
        logoDataUrl: anteprimaLogo,
        sfondoAreaTecnica: anteprimaSfondo,
        inquadraturaSfondo: inquadratura,
      });
      showToast("Impostazioni salvate.", { type: "success" });
    } catch {
      showToast("Salvataggio non riuscito.", { type: "error" });
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Impostazioni</h1>
        <p className="page-sub">Nome e logo della società, mostrati in tutta l'app</p>
      </div>

      <div className="panel" style={{ padding: 24, maxWidth: 480 }}>
        <form onSubmit={handleSave}>
          <div className="field">
            <label>Nome società</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="es. Amerina Pallavolo"
            />
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
              È la scritta in alto nel menu, accanto al logo. Va salvata con il
              pulsante in fondo; il logo invece si salva da sé.
            </div>
          </div>

          <div className="field">
            <label>Logo</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  background: anteprimaLogo ? "transparent" : "var(--panel-raised)",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {anteprimaLogo ? (
                  <img
                    src={anteprimaLogo}
                    alt="Anteprima logo"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Nessuno</span>
                )}
              </div>
              <div>
                <input type="file" accept="image/*" onChange={handleLogoChange} />
                <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>
                  Immagine quadrata consigliata, verrà ridimensionata automaticamente.
                </p>
              </div>
            </div>
          </div>

          <div className="field">
            <label>Immagine di sfondo dell'Area tecnica</label>
            {anteprimaSfondo ? (
              <div style={{ marginBottom: 8 }}>
                <img
                  src={anteprimaSfondo}
                  alt="Anteprima sfondo"
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    height: 110,
                    objectFit: "cover",
                    objectPosition: `center ${inquadratura}`,
                    borderRadius: 10,
                    border: "1px solid var(--border-soft)",
                  }}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {[
                    ["top", "Alto"],
                    ["center", "Centro"],
                    ["bottom", "Basso"],
                  ].map(([valore, etichetta]) => (
                    <button
                      key={valore}
                      type="button"
                      className={inquadratura === valore ? "btn btn-primary" : "btn btn-ghost"}
                      onClick={() => setInquadratura(valore)}
                    >
                      {etichetta}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-danger-ghost"
                    onClick={() => setAnteprimaSfondo("")}
                  >
                    Togli immagine
                  </button>
                </div>
              </div>
            ) : null}
            <input type="file" accept="image/*" onChange={handleSfondoChange} />
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>
              Una foto larga della palestra o della squadra. Viene ridotta e compressa
              automaticamente; sopra ci va il testo, quindi meglio un'immagine senza
              troppi dettagli nella parte sinistra. Senza immagine resta il disegno
              del campo.
            </p>
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 8 }}>
            {saving ? "Salvataggio…" : "Salva nome e sfondo"}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 32, maxWidth: 480 }}>
        {/* Il marchio di chi cura l'app lo cambia solo chi cura l'app: per
            tutti gli altri il riquadro non compare nemmeno, perche le regole
            del database rifiuterebbero comunque il salvataggio. */}
        {isWebManager && <LogoWebMaster />}

        <ImmaginiTestata />

        <RimuoviDoppioni />

        <RimuoviEserciziRipetuti />

        <StatoNotifiche />

        <EsportaDati />

        <ElencoRosa />

        <ImportaBackup />
      </div>
    </div>
  );
}


// L'elenco "rosa" contiene solo nome, cognome, categoria e ruolo ed è l'unica
// parte delle schede leggibile dalle atlete: serve alle pagine di squadra.
// Si aggiorna da solo aprendo la pagina Atlete, ma qui si può forzare e,
// soprattutto, vedere se qualcosa non ha funzionato.
function ElencoRosa() {
  const { showToast } = useToast();
  const [stato, setStato] = useState(null);
  const [inCorso, setInCorso] = useState(false);

  async function aggiorna() {
    setInCorso(true);
    setStato(null);
    try {
      const schede = await getDocs(collection(db, "atlete"));
      const esistenti = await getDocs(collection(db, "rosa"));
      const mappa = new Map(esistenti.docs.map((d) => [d.id, d.data()]));
      let scritte = 0;
      for (const d of schede.docs) {
        const a = d.data();
        const voce = {
          nome: a.nome || "",
          cognome: a.cognome || "",
          categoria: a.categoria || null,
          ruoloCampo: a.ruoloCampo || null,
        };
        await setDoc(doc(db, "rosa", d.id), voce);
        scritte += 1;
        mappa.delete(d.id);
      }
      let rimosse = 0;
      for (const id of mappa.keys()) {
        await deleteDoc(doc(db, "rosa", id));
        rimosse += 1;
      }
      setStato({
        ok: true,
        testo: `Elenco aggiornato: ${scritte} atlete${rimosse ? `, ${rimosse} voci rimosse` : ""}.`,
      });
      showToast("Elenco rosa aggiornato.", { type: "success" });
    } catch (err) {
      console.error("Errore aggiornamento rosa:", err);
      const permessi = String(err?.code || "").includes("permission");
      setStato({
        ok: false,
        testo: permessi
          ? "Permesso negato: le regole del database non contengono ancora il blocco per la collezione \"rosa\"."
          : `Non riuscito: ${err?.message || "errore sconosciuto"}`,
      });
    }
    setInCorso(false);
  }

  return (
    <div className="panel" style={{ padding: 24, maxWidth: 560, marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>Elenco rosa</h3>
      <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
        Copia ridotta delle schede (solo nome, cognome, categoria e ruolo) che permette alle
        atlete di vedere le pagine di squadra senza accedere ai dati personali. Si aggiorna da
        sola quando apri la pagina Atlete; questo pulsante serve a forzarla e a controllare che
        funzioni.
      </p>
      <button className="btn btn-primary" onClick={aggiorna} disabled={inCorso}>
        {inCorso ? "Aggiornamento…" : "Aggiorna elenco rosa"}
      </button>
      {stato && (
        <p
          style={{
            fontSize: 13,
            marginTop: 12,
            color: stato.ok ? "var(--ok)" : "var(--danger)",
          }}
        >
          {stato.testo}
        </p>
      )}
    </div>
  );
}


// Copia di sicurezza completa: scarica tutti i dati in un unico file.
// Serve ad avere il lavoro fuori da Firebase, se un domani l'account avesse
// problemi o si volesse cambiare strumento.
const COLLEZIONI = [
  "atlete",
  "rosa",
  "allenamenti",
  "testAtletici",
  "partite",
  "sondaggi",
  "orariCampi",
  "comunicazioni",
  "esercizi",
  "pianiAllenamento",
  "risorseTecniche",
  "sistemaGioco",
  "obiettivi",
  "scout",
  "conversazioni",
  "users",
  "impostazioni",
];

// Collezioni annidate dentro un documento: vanno lette una per documento.
const SOTTOCOLLEZIONI = {
  partite: ["risposte"],
  sondaggi: ["risposte"],
  conversazioni: ["messaggi"],
};

function EsportaDati() {
  const { showToast } = useToast();
  const [inCorso, setInCorso] = useState(false);
  const [avanzamento, setAvanzamento] = useState("");

  async function esporta() {
    setInCorso(true);
    const dati = {};
    let totale = 0;
    try {
      for (const nome of COLLEZIONI) {
        setAvanzamento(nome);
        const snap = await getDocs(collection(db, nome));
        dati[nome] = [];
        for (const d of snap.docs) {
          const voce = { id: d.id, ...d.data() };
          for (const sotto of SOTTOCOLLEZIONI[nome] || []) {
            const sub = await getDocs(collection(db, nome, d.id, sotto));
            if (!sub.empty) {
              voce[`_${sotto}`] = sub.docs.map((s) => ({ id: s.id, ...s.data() }));
            }
          }
          dati[nome].push(voce);
          totale += 1;
        }
      }

      const contenuto = {
        app: "hubvolley",
        esportatoIl: new Date().toISOString(),
        documenti: totale,
        dati,
      };
      const blob = new Blob([JSON.stringify(contenuto, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hubvolley_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Copia scaricata: ${totale} documenti.`, { type: "success" });
    } catch (err) {
      console.error("Errore esportazione:", err);
      showToast("Esportazione non riuscita.", { type: "error" });
    }
    setAvanzamento("");
    setInCorso(false);
  }

  return (
    <div className="panel" style={{ padding: 24, maxWidth: 560, marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>Copia di sicurezza</h3>
      <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
        Scarica in un unico file tutti i dati dell'app: atlete, presenze, test, gare, scout,
        quote, piani di allenamento e comunicazioni. Conservalo sul computer e rifallo ogni
        tanto — è l'unica copia che resta fuori da Firebase.
      </p>
      <button className="btn btn-primary" onClick={esporta} disabled={inCorso}>
        {inCorso ? `Lettura ${avanzamento}…` : "Scarica copia di sicurezza"}
      </button>
    </div>
  );
}


// Quanti dispositivi sono registrati per le notifiche.
// Serve a capire perché "non arrivano": quasi sempre perché nessuno ha
// premuto "Attiva le notifiche" sul proprio telefono.
function StatoNotifiche() {
  const [conteggio, setConteggio] = useState(null);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    getDocs(collection(db, "pushTokens"))
      .then((snap) => {
        const perRuolo = { staff: 0, atleta: 0 };
        snap.docs.forEach((d) => {
          const r = d.data().ruolo === "staff" ? "staff" : "atleta";
          perRuolo[r] += 1;
        });
        setConteggio(perRuolo);
      })
      .catch((err) => {
        console.error("Errore lettura dispositivi:", err);
        setErrore("Non riesco a leggere l'elenco dei dispositivi.");
      });
  }, []);

  return (
    <div className="panel" style={{ padding: 24, maxWidth: 560, marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>Notifiche</h3>
      {errore ? (
        <p style={{ fontSize: 13, color: "var(--warn)" }}>{errore}</p>
      ) : conteggio == null ? (
        <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Lettura in corso…</p>
      ) : (
        <p style={{ fontSize: 14 }}>
          Dispositivi registrati: <strong>{conteggio.atleta}</strong> fra le atlete,{" "}
          <strong>{conteggio.staff}</strong> nello staff.
        </p>
      )}
      <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
        Ogni persona deve premere una volta "Attiva le notifiche" nel menu, dal proprio
        dispositivo, e concedere il permesso. Su iPhone funziona solo se l'app è stata
        installata sulla schermata Home.
      </p>
    </div>
  );
}


// Toglie i piani di allenamento ripetuti, tenendone uno per ogni data e
// categoria. Serve dopo una reimportazione fatta prima che il controllo
// automatico sui doppioni esistesse.
// Un'immagine di testata per ogni pagina, più una per area che vale come
// riserva. Così non sei obbligato a trovarne sedici prima di vedere qualcosa:
// ne metti una per gruppo e sono tutte coperte, poi sostituisci quelle che
// vuoi diverse, una alla volta.
// Il marchio di chi cura l'app, in fondo al menu. È distinto da quello della
// società: quello identifica chi usa l'app, questo chi la mantiene. Sta nella
// stessa collezione delle immagini di testata, così non pesa sul documento
// delle impostazioni, che ha già dentro logo e sfondo.
function LogoWebMaster() {
  const { showToast } = useToast();
  const confirmDialog = useConfirm();
  const [logo, setLogo] = useState(null);
  const [nome, setNome] = useState("");
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    return onSnapshot(
      doc(db, "grafichePagine", "logo-webmaster"),
      (d) => {
        setLogo(d.data()?.immagine || null);
        setNome(d.data()?.nome ?? "");
      },
      (err) => console.error("Errore lettura logo web master:", err)
    );
  }, []);

  async function carica(file) {
    if (!file) return;
    setInCorso(true);
    try {
      // Compare alto 18 pixel: oltre i 240 di lato si caricherebbe peso inutile.
      const dataUrl = await ridimensionaImmagine(file, 240, 0.85);
      await setDoc(
        doc(db, "grafichePagine", "logo-webmaster"),
        { immagine: dataUrl, aggiornato: new Date().toISOString() },
        { merge: true }
      );
      showToast("Logo del web master salvato.", { type: "success" });
    } catch (err) {
      console.error("Errore salvataggio logo web master:", err?.code, err);
      showToast(
        err?.code
          ? `Salvataggio non riuscito (${err.code}).`
          : "Non riesco ad aprire questa immagine: prova con un PNG o un JPEG.",
        { type: "error" }
      );
    }
    setInCorso(false);
  }

  async function rimuovi() {
    const ok = await confirmDialog("Togliere il logo del web master?");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "grafichePagine", "logo-webmaster"));
      showToast("Logo rimosso.", { type: "success" });
    } catch {
      showToast("Non è stato possibile rimuovere il logo.", { type: "error" });
    }
  }

  return (
    <div className="panel" style={{ padding: 20, marginBottom: 20 }}>
      <strong style={{ fontSize: 14 }}>Logo del web master</strong>
      <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "6px 0 14px" }}>
        Compare in fondo al menu, sotto il marchio HubVolley, con il nome
        accanto. PNG con sfondo trasparente: viene mostrato alto 24 pixel.
      </p>

      <div className="field">
        <label>Nome da mostrare</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={async () => {
            try {
              await setDoc(
                doc(db, "grafichePagine", "logo-webmaster"),
                { nome: nome.trim() },
                { merge: true }
              );
            } catch (err) {
              console.error("Errore salvataggio nome web master:", err?.code, err);
            }
          }}
          placeholder="es. Massimo Grifoni"
        />
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span
          style={{
            minWidth: 90,
            height: 36,
            borderRadius: 8,
            border: "1px solid var(--border-soft)",
            background: logo ? `center/contain no-repeat url(${logo})` : "var(--panel-raised)",
          }}
        />
        <label className="btn btn-secondary" style={{ cursor: "pointer", margin: 0 }}>
          {inCorso ? "Carico…" : logo ? "Cambia" : "Scegli"}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => carica(e.target.files?.[0])}
          />
        </label>
        {logo && (
          <button className="btn btn-ghost" onClick={rimuovi}>
            Togli
          </button>
        )}
      </div>
    </div>
  );
}

function ImmaginiTestata() {
  const { showToast } = useToast();
  const confirmDialog = useConfirm();
  const [immagini, setImmagini] = useState({});
  const [inCorso, setInCorso] = useState(null);

  useEffect(() => {
    return onSnapshot(
      collection(db, "grafichePagine"),
      (snap) => {
        const m = {};
        snap.docs.forEach((d) => (m[d.id] = d.data()?.immagine || null));
        setImmagini(m);
      },
      (err) => console.error("Errore lettura grafiche pagine:", err)
    );
  }, []);

  async function carica(chiave, file) {
    if (!file) return;
    setInCorso(chiave);

    // Leggere la foto e salvarla sono due operazioni che falliscono per
    // motivi opposti: un formato che il browser non apre, oppure la rete.
    // Tenerle sotto lo stesso controllo voleva dire mostrare la stessa frase
    // per entrambe, e lasciare chi la legge senza niente in mano.
    let dataUrl;
    try {
      // Larga perché fa da fascia, ma molto compressa: sta dietro un velo
      // quasi pieno, non è una foto da guardare da vicino.
      dataUrl = await ridimensionaImmagine(file, MISURA_CONSIGLIATA.larghezza, 0.58);
    } catch (err) {
      console.error("Testata: lettura del file non riuscita.", err);
      const heic = /\.(heic|heif)$/i.test(file.name || "");
      showToast(
        heic
          ? "Questo è un file HEIC dell'iPhone e il browser non sa aprirlo. Esportala come JPEG, o usane uno screenshot."
          : "Non riesco ad aprire questa immagine. Prova con un JPEG o con uno screenshot della foto.",
        { type: "error" }
      );
      setInCorso(null);
      return;
    }

    const peso = Math.round(dataUrl.length / 1024);
    if (dataUrl.length > 700000) {
      showToast(
        `Dopo la compressione pesa ancora ${peso} KB, il massimo è 684 KB. Ritagliala a ${MISURA_CONSIGLIATA.testo}.`,
        { type: "error" }
      );
      setInCorso(null);
      return;
    }

    try {
      await setDoc(doc(db, "grafichePagine", chiave), {
        immagine: dataUrl,
        aggiornato: new Date().toISOString(),
      });
      showToast("Immagine di testata salvata.", { type: "success" });
    } catch (err) {
      console.error("Testata: salvataggio non riuscito.", err?.code, err);
      // Il codice di Firestore dice esattamente cosa è andato storto: vale la
      // pena riportarlo, invece di un generico "non riuscito".
      const motivi = {
        "permission-denied":
          "Permesso negato: esci e rientra, e controlla che la regola per grafichePagine sia pubblicata.",
        "resource-exhausted":
          "Esaurite le operazioni gratuite giornaliere di Firebase: si azzerano alle 9 di mattina.",
        "invalid-argument": `L'immagine è troppo grande per un documento (${peso} KB).`,
        unavailable:
          "Niente connessione a Firebase: controlla la rete e riprova.",
      };
      showToast(motivi[err?.code] || `Salvataggio non riuscito (${err?.code || "motivo sconosciuto"}).`, {
        type: "error",
      });
    }
    setInCorso(null);
  }

  async function rimuovi(chiave, label) {
    const ok = await confirmDialog(`Togliere l'immagine di "${label}"?`);
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "grafichePagine", chiave));
      showToast("Immagine rimossa.", { type: "success" });
    } catch {
      showToast("Non è stato possibile rimuovere l'immagine.", { type: "error" });
    }
  }

  function Riga({ chiave, label, nota, ereditata }) {
    const propria = immagini[chiave];
    const mostrata = propria || ereditata;
    return (
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: "9px 0",
          borderTop: "1px solid var(--border-soft)",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            width: 64,
            height: 30,
            borderRadius: 6,
            flexShrink: 0,
            border: "1px solid var(--border-soft)",
            opacity: propria ? 1 : 0.5,
            background: mostrata
              ? `center/cover url(${mostrata})`
              : "var(--panel-raised)",
          }}
        />
        <span style={{ flex: "1 1 130px", minWidth: 130 }}>
          <strong style={{ fontSize: 13 }}>{label}</strong>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
            {nota || (propria ? "immagine propria" : ereditata ? "usa quella dell'area" : "nessuna immagine")}
          </div>
        </span>
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <label className="btn btn-secondary" style={{ cursor: "pointer", margin: 0 }}>
            {inCorso === chiave ? "Carico…" : propria ? "Cambia" : "Scegli"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => carica(chiave, e.target.files?.[0])}
            />
          </label>
          {propria && (
            <button className="btn btn-ghost" onClick={() => rimuovi(chiave, label)}>
              Togli
            </button>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="panel" style={{ padding: 20, marginBottom: 20 }}>
      <strong style={{ fontSize: 14 }}>Immagini di testata</strong>
      <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "6px 0 4px" }}>
        Vanno dietro il titolo della pagina. Misura consigliata{" "}
        <strong style={{ color: "var(--text-dim)" }}>{MISURA_CONSIGLIATA.testo}</strong>:
        immagini più grandi vengono ridotte comunque, quindi non servono.
      </p>
      <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "0 0 16px" }}>
        La fascia è molto bassa e larga: viene ritagliata al centro in altezza,
        e la metà sinistra resta coperta dal velo che tiene leggibile il titolo.
        Il soggetto va quindi messo <strong style={{ color: "var(--text-dim)" }}>a destra</strong> e
        al centro in verticale.
      </p>

      <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 600, color: "var(--text-dim)" }}>
        Per area — valgono per le pagine senza immagine propria
      </div>
      {AREE_TESTATA.map((a) => (
        <Riga key={a.key} chiave={a.key} label={a.label} nota="riserva dell'area" />
      ))}

      <div
        style={{
          margin: "18px 0 6px",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-dim)",
        }}
      >
        Per singola pagina
      </div>
      {PAGINE_TESTATA.map((pg) => (
        <Riga
          key={pg.id}
          chiave={pg.id}
          label={pg.label}
          ereditata={immagini[pg.area]}
        />
      ))}
    </div>
  );
}

function RimuoviDoppioni() {
  const { showToast } = useToast();
  const confermaDialogo = useConfirm();
  const [analisi, setAnalisi] = useState(null);
  const [inCorso, setInCorso] = useState(false);

  async function analizza() {
    setInCorso(true);
    try {
      const snap = await getDocs(collection(db, "pianiAllenamento"));
      const gruppi = new Map();
      snap.docs.forEach((d) => {
        const dati = d.data();
        const chiave = `${dati.data}|${(dati.categoria || "").toLowerCase()}`;
        if (!gruppi.has(chiave)) gruppi.set(chiave, []);
        gruppi.get(chiave).push({ id: d.id, ...dati });
      });
      const ripetuti = [...gruppi.entries()].filter(([, v]) => v.length > 1);
      const daTogliere = ripetuti.reduce((s, [, v]) => s + v.length - 1, 0);
      setAnalisi({ totale: snap.size, gruppi: ripetuti, daTogliere });
    } catch (err) {
      console.error("Errore analisi doppioni:", err);
      showToast("Analisi non riuscita.", { type: "error" });
    }
    setInCorso(false);
  }

  async function rimuovi() {
    const ok = await confermaDialogo(
      `Eliminare ${analisi.daTogliere} allenamenti ripetuti? Di ogni gruppo resta il primo.`
    );
    if (!ok) return;
    setInCorso(true);
    let tolti = 0;
    try {
      for (const [, elenco] of analisi.gruppi) {
        // Si tiene il primo e si eliminano gli altri: il contenuto è lo
        // stesso, cambia solo l'identificativo interno.
        for (const p of elenco.slice(1)) {
          await deleteDoc(doc(db, "pianiAllenamento", p.id));
          tolti += 1;
        }
      }
      showToast(`${tolti} allenamenti ripetuti eliminati.`, { type: "success" });
      setAnalisi(null);
    } catch (err) {
      console.error("Errore rimozione doppioni:", err);
      showToast("Rimozione non riuscita.", { type: "error" });
    }
    setInCorso(false);
  }

  return (
    <div className="panel" style={{ padding: 24, maxWidth: 560, marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>Allenamenti ripetuti</h3>
      <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
        Cerca piani di allenamento con la stessa data e la stessa categoria, che nascono
        reimportando un backup già caricato. Di ogni gruppo ne resta uno.
      </p>

      {!analisi ? (
        <button className="btn btn-primary" onClick={analizza} disabled={inCorso}>
          {inCorso ? "Controllo…" : "Cerca ripetuti"}
        </button>
      ) : analisi.daTogliere === 0 ? (
        <p style={{ fontSize: 14, color: "var(--ok)" }}>
          Nessun allenamento ripetuto fra i {analisi.totale} presenti.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 14 }}>
            Trovati <strong>{analisi.daTogliere}</strong> allenamenti ripetuti su{" "}
            {analisi.totale} totali.
          </p>
          <div
            style={{
              maxHeight: 160,
              overflowY: "auto",
              fontSize: 12,
              color: "var(--text-dim)",
              marginBottom: 12,
            }}
          >
            {analisi.gruppi.map(([chiave, elenco]) => {
              const [data, categoria] = chiave.split("|");
              return (
                <div key={chiave}>
                  {formatDate(data)} — {categoria || "senza categoria"} · {elenco.length} copie
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-danger-ghost" onClick={rimuovi} disabled={inCorso}>
              {inCorso ? "Rimozione…" : `Elimina ${analisi.daTogliere} ripetuti`}
            </button>
            <button className="btn btn-secondary" onClick={() => setAnalisi(null)}>
              Annulla
            </button>
          </div>
        </>
      )}
    </div>
  );
}


// Toglie gli esercizi ripetuti dalla libreria. Si considerano uguali quelli
// con lo stesso nome e la stessa categoria, a prescindere da maiuscole,
// spazi doppi e identificativi interni: è così che nascono i doppioni,
// reimportando backup in cui la Planning App ha rigenerato i codici.
function RimuoviEserciziRipetuti() {
  const { showToast } = useToast();
  const confermaDialogo = useConfirm();
  const [analisi, setAnalisi] = useState(null);
  const [inCorso, setInCorso] = useState(false);
  const [avanzamento, setAvanzamento] = useState(0);

  function impronta(e) {
    const nome = (e.nome || "").toLowerCase().replace(/\s+/g, " ").trim();
    const categoria = (e.categoria || "").toLowerCase().trim();
    return `${nome}|${categoria}`;
  }

  async function analizza() {
    setInCorso(true);
    try {
      const snap = await getDocs(collection(db, "esercizi"));
      const gruppi = new Map();
      snap.docs.forEach((d) => {
        const dati = d.data();
        const chiave = impronta(dati);
        if (!gruppi.has(chiave)) gruppi.set(chiave, []);
        gruppi.get(chiave).push({ id: d.id, nome: dati.nome, categoria: dati.categoria });
      });
      const ripetuti = [...gruppi.values()].filter((v) => v.length > 1);
      setAnalisi({
        totale: snap.size,
        gruppi: ripetuti,
        daTogliere: ripetuti.reduce((s, v) => s + v.length - 1, 0),
      });
    } catch (err) {
      console.error("Errore analisi esercizi:", err);
      showToast("Analisi non riuscita.", { type: "error" });
    }
    setInCorso(false);
  }

  async function rimuovi() {
    const ok = await confermaDialogo(
      `Eliminare ${analisi.daTogliere} esercizi ripetuti? Di ogni gruppo resta il primo.`
    );
    if (!ok) return;
    setInCorso(true);
    setAvanzamento(0);
    let tolti = 0;
    try {
      // Con migliaia di esercizi le cancellazioni sono tante: si procede a
      // gruppi, mostrando a che punto siamo invece di lasciare la pagina ferma.
      const daTogliere = analisi.gruppi.flatMap((g) => g.slice(1));
      for (let i = 0; i < daTogliere.length; i += 400) {
        const lotto = daTogliere.slice(i, i + 400);
        const batch = writeBatch(db);
        lotto.forEach((e) => batch.delete(doc(db, "esercizi", e.id)));
        await batch.commit();
        tolti += lotto.length;
        setAvanzamento(tolti);
      }
      showToast(`${tolti} esercizi ripetuti eliminati.`, { type: "success" });
      setAnalisi(null);
    } catch (err) {
      console.error("Errore rimozione esercizi:", err);
      showToast("Rimozione non riuscita.", { type: "error" });
    }
    setInCorso(false);
  }

  return (
    <div className="panel" style={{ padding: 24, maxWidth: 560, marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>Esercizi ripetuti</h3>
      <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
        Cerca nella libreria esercizi con lo stesso nome e la stessa categoria. Di ogni gruppo
        ne resta uno.
      </p>

      {!analisi ? (
        <button className="btn btn-primary" onClick={analizza} disabled={inCorso}>
          {inCorso ? "Controllo…" : "Cerca ripetuti"}
        </button>
      ) : analisi.daTogliere === 0 ? (
        <p style={{ fontSize: 14, color: "var(--ok)" }}>
          Nessun esercizio ripetuto fra i {analisi.totale} presenti.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 14 }}>
            Trovati <strong>{analisi.daTogliere}</strong> esercizi ripetuti su {analisi.totale}:
            ne resterebbero {analisi.totale - analisi.daTogliere}.
          </p>
          <div
            style={{
              maxHeight: 160,
              overflowY: "auto",
              fontSize: 12,
              color: "var(--text-dim)",
              marginBottom: 12,
            }}
          >
            {analisi.gruppi.slice(0, 40).map((g, i) => (
              <div key={i}>
                {g[0].nome} — {g[0].categoria || "senza categoria"} · {g.length} copie
              </div>
            ))}
            {analisi.gruppi.length > 40 && <div>… e altri {analisi.gruppi.length - 40} gruppi</div>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-danger-ghost" onClick={rimuovi} disabled={inCorso}>
              {inCorso
                ? `Rimozione… ${avanzamento}/${analisi.daTogliere}`
                : `Elimina ${analisi.daTogliere} ripetuti`}
            </button>
            <button className="btn btn-secondary" onClick={() => setAnalisi(null)}>
              Annulla
            </button>
          </div>
        </>
      )}
    </div>
  );
}
