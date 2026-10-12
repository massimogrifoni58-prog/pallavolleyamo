// La barra per cambiare ruolo senza uscire, durante una dimostrazione.
//
// È la cosa che con gli account veri è scomoda da fare e che convince più di
// ogni spiegazione: mostri lo scout da allenatrice, cambi in atleta e si vede
// che quella pagina per lei non esiste più. Due secondi, davanti a loro.
//
// Il pulsante "Ricarica i dati" rimette la stagione come era all'inizio: dopo
// che qualcuno ha segnato presenze o cancellato una gara, si riparte pulito
// senza ricaricare la pagina.
import { useState } from "react";
import { ACCOUNT_DEMO } from "./datiDemo.js";
import { entraComeDemo } from "./fintoAuth.js";
import { caricaDatiDemo } from "./fintoFirestore.js";

export default function BarraDemo() {
  const [aperta, setAperta] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        right: 14,
        bottom: 14,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {aperta && (
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            display: "grid",
            gap: 6,
            minWidth: 230,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-faint)",
              padding: "2px 4px",
            }}
          >
            Guarda l'app come
          </div>
          {ACCOUNT_DEMO.filter((a) => a.etichetta).map((a) => (
            <button
              key={a.uid}
              type="button"
              onClick={() => {
                entraComeDemo(a.uid);
                setAperta(false);
              }}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {a.etichetta}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              caricaDatiDemo();
              setAperta(false);
            }}
            style={{
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-dim)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Ricarica i dati di partenza
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAperta((v) => !v)}
        style={{
          padding: "9px 14px",
          borderRadius: 999,
          border: "1px solid var(--accent)",
          background: "var(--accent)",
          color: "var(--su-colore)",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
        }}
      >
        Demo · cambia ruolo
      </button>
    </div>
  );
}
