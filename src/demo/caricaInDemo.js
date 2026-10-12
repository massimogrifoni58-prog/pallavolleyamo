// Carica un pezzo dell'interfaccia soltanto quando l'app è costruita in
// modalità demo.
//
// L'importazione è dinamica di proposito: così quel codice finisce in un file
// a parte e nella versione vera non viene mai scaricato né eseguito. Nelle
// due pagine che lo usano resta solo questa riga.
import { useEffect, useState } from "react";

export function useComponenteDemo(carica) {
  const [Componente, setComponente] = useState(null);

  useEffect(() => {
    if (import.meta.env.MODE !== "demo") return;
    let annullato = false;
    carica()
      .then((modulo) => {
        if (!annullato) setComponente(() => modulo.default);
      })
      .catch((err) => console.error("Demo: pezzo non caricato", err));
    return () => {
      annullato = true;
    };
  }, []);

  return Componente;
}
