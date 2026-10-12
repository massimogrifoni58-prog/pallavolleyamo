// I quattro accessi della demo, sulla schermata di ingresso.
//
// In una dimostrazione dal vivo nessuno vuole digitare un indirizzo e una
// password: un clic ed è dentro. Serve anche a far capire in partenza che i
// ruoli sono separati, che è la cosa che le società chiedono sempre.
//
// Questo file finisce in un pezzo di codice a parte, caricato solo quando
// l'app è costruita in modalità demo: nella versione vera non viene mai
// scaricato.
import { ACCOUNT_DEMO } from "./datiDemo.js";
import { entraComeDemo } from "./fintoAuth.js";

export default function PannelloDemo() {
  return (
    <div
      style={{
        marginTop: 22,
        paddingTop: 18,
        borderTop: "1px solid var(--border)",
        textAlign: "left",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--accent)",
          marginBottom: 4,
        }}
      >
        Versione dimostrativa
      </div>
      <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "0 0 14px" }}>
        Dati inventati, nessuna atleta reale. Entra con uno dei quattro ruoli
        per vedere la stessa app come la vede ciascuno.
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        {ACCOUNT_DEMO.filter((a) => a.etichetta).map((a) => (
          <button
            key={a.uid}
            type="button"
            onClick={() => entraComeDemo(a.uid)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--panel-raised)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, display: "block" }}>
              {a.etichetta} — {a.nome} {a.cognome}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-faint)", display: "block" }}>
              {a.descrizione}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
