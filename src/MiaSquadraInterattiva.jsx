import React, { useMemo, useState } from "react";
import ClassificaInterattiva, { calcola, numGiornata, leggiSetPartita, puntiPartita } from "./ClassificaInterattiva.jsx";

// Cruscotto interattivo per la pagina "La mia squadra".
// mie:   partite della squadra scelta (formato tuttePartiteSquadre: camp, giornata, data, ora, casa, ospite, ris, luogo)
// tutte: tutte le partite note, per calcolare le classifiche dei gironi
// squadraMia(nomeSquadra, nomeScelto) -> true se la squadra e' la "mia"

const bello = (n) => (n || "").replace(/\b[Aa]\.?\s?[Ss]\.?\s?[Dd]\.?(?=\s|$)/g, "").replace(/\s+/g, " ").trim()
  .toLowerCase().replace(/(^|[\s\-'])(\S)/g, (m, a, b) => a + b.toUpperCase())
  .replace(/\b(Di|Del|Della|Dei|Da)\b(?!$)/g, (w) => w.toLowerCase());

const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const campBreve = (c) => (c || "").replace(/\s*Femminile/i, " F").replace(/\s*Maschile/i, " M").replace(/Girone Unico/i, "").trim();

function oggiISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function giorniA(iso) {
  const a = new Date(oggiISO() + "T00:00:00"), b = new Date(iso + "T00:00:00");
  return Math.round((b - a) / 86400000);
}
function quando(p) {
  const g = giorniA(p.data);
  if (g === 0) return p.ora ? `oggi ${p.ora}` : "oggi";
  if (g === 1) return p.ora ? `domani ${p.ora}` : "domani";
  if (g > 1 && g < 7) return `tra ${g} giorni`;
  return new Date(p.data + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}
const aCalc = (p) => ({ home: p.casa, away: p.ospite, score: p.ris, giornata: p.giornata, data: p.data });

export default function MiaSquadraInterattiva({ nome, mie, tutte, squadraMia, inCorso, onIcs }) {
  const mio = (n) => squadraMia(n, nome);

  // Campionati con almeno un risultato: per ognuno classifica e statistiche
  const campionati = useMemo(() => {
    const out = [];
    const visti = new Set();
    [...mie].sort((a, b) => (a.data || "").localeCompare(b.data || "")).forEach((p) => {
      if (visti.has(p.camp)) return;
      visti.add(p.camp);
      const partiteCamp = tutte.filter((x) => x.camp === p.camp && x.ris && leggiSetPartita(x.ris));
      // stesse partite da due fonti: una volta sola
      const uniche = [];
      const chiavi = new Set();
      partiteCamp.forEach((x) => {
        const k = norm(x.casa) + "|" + norm(x.ospite);
        if (!chiavi.has(k)) { chiavi.add(k); uniche.push(x); }
      });
      const classifica = calcola(uniche.map(aCalc));
      const riga = classifica.find((r) => mio(r.nome));
      if (riga) out.push({ camp: p.camp, partite: uniche, classifica, riga });
    });
    // prima il campionato con piu' partite giocate
    return out.sort((a, b) => b.riga.g - a.riga.g);
  }, [mie, tutte, nome]);

  const [campSel, setCampSel] = useState(null);
  const c = campionati.find((x) => x.camp === campSel) || campionati[0];

  return (
    <div className="ms">
      {campionati.length > 1 && (
        <div className="ms-chips" role="tablist" aria-label="Campionato">
          {campionati.map((x) => (
            <button key={x.camp} type="button" role="tab" aria-selected={x === c}
              className={"ms-chip" + (x === c ? " is-on" : "")} onClick={() => setCampSel(x.camp)}>
              {campBreve(x.camp)}
            </button>
          ))}
        </div>
      )}

      {c && <Cruscotto c={c} />}
      {c && <Andamento c={c} />}
      {c && <MiniClassifica c={c} mio={mio} />}

      <Calendario mie={mie} mio={mio} campionati={campionati} inCorso={inCorso} onIcs={onIcs} nome={nome} />
    </div>
  );
}

// ---------- Cruscotto ----------
function Cruscotto({ c }) {
  const r = c.riga;
  const n = c.classifica.length;
  const giornate = c.partite.map(numGiornata).filter((g) => g !== null);
  let delta = 0;
  if (giornate.length) {
    const ultima = Math.max(...giornate);
    const prima = c.partite.filter((x) => numGiornata(x) !== null && numGiornata(x) < ultima);
    if (prima.length) {
      const prec = calcola(prima.map(aCalc)).find((x) => x.nome === r.nome);
      if (prec) delta = prec.pos - r.pos;
    }
  }
  const conta = (v, p) => r.partite.filter((x) => x.vinti === v && x.persi === p).length;
  const esiti = [["3-0", 3, 0], ["3-1", 3, 1], ["3-2", 3, 2], ["2-3", 2, 3], ["1-3", 1, 3], ["0-3", 0, 3]];
  const maxEsito = Math.max(1, ...esiti.map(([, v, p]) => conta(v, p)));
  const qs = r.sp ? (r.sv / r.sp).toFixed(2).replace(".", ",") : (r.sv ? "max" : "0");

  return (
    <div className="ms-card ms-crusc">
      <div className="ms-crusc__pos">
        <span className={"ms-crusc__num" + (r.pos <= 3 ? " is-podio" : "")}>{r.pos}°</span>
        <span className="ms-crusc__su">su {n}</span>
        {delta !== 0 && (
          <span className={"ms-crusc__delta " + (delta > 0 ? "is-su" : "is-giu")}>
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} {Math.abs(delta) === 1 ? "posizione" : "posizioni"}
          </span>
        )}
        <span className="ms-crusc__camp">{c.camp}</span>
      </div>
      <div className="ms-crusc__dati">
        <Dato v={r.pts} l="punti" oro />
        <Dato v={`${r.v}-${r.p}`} l="vinte-perse" />
        <Dato v={`${r.sv}-${r.sp}`} l="set" />
        <Dato v={qs} l="quoziente set" />
        <Dato v={r.g ? (r.pts / r.g).toFixed(2).replace(".", ",") : "0"} l="punti a partita" />
      </div>
      <div className="ms-crusc__riga">
        <div>
          <div className="ms-etic">Ultime partite</div>
          <div className="ms-forma">
            {r.partite.slice(-5).map((x, i) => (
              <span key={i} className={"ms-pallino " + (x.vinti > x.persi ? "is-v" : "is-p")}
                title={`${x.vinti}-${x.persi} ${x.casa ? "contro" : "a casa di"} ${bello(x.avv)}`}>
                {x.vinti > x.persi ? "V" : "P"}
              </span>
            ))}
          </div>
        </div>
        <div className="ms-esiti">
          <div className="ms-etic">Come sono finite</div>
          <div className="ms-esiti__barre">
            {esiti.map(([l, v, p]) => {
              const k = conta(v, p);
              return (
                <div key={l} className={"ms-esiti__col " + (v > p ? "is-v" : "is-p")} title={`${k} partite finite ${l}`}>
                  <span className="ms-esiti__n">{k || ""}</span>
                  <span className="ms-esiti__bar" style={{ height: (k / maxEsito) * 100 + "%" }} />
                  <span className="ms-esiti__l">{l}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dato({ v, l, oro }) {
  return (
    <div className="ms-dato">
      <strong className={oro ? "is-oro" : ""}>{v}</strong>
      <span>{l}</span>
    </div>
  );
}

// ---------- Andamento in classifica ----------
function Andamento({ c }) {
  const nomeMio = c.riga.nome;
  const punti = useMemo(() => {
    const giornate = [...new Set(c.partite.map(numGiornata).filter((g) => g !== null))].sort((a, b) => a - b);
    const out = [];
    giornate.forEach((g) => {
      const finoA = c.partite.filter((x) => numGiornata(x) !== null && numGiornata(x) <= g);
      const cl = calcola(finoA.map(aCalc));
      const r = cl.find((x) => x.nome === nomeMio);
      if (!r) return;
      const partita = c.partite.find((x) => numGiornata(x) === g && (x.casa === nomeMio || x.ospite === nomeMio));
      let info = null;
      if (partita) {
        const [sc, so] = leggiSetPartita(partita.ris);
        const casa = partita.casa === nomeMio;
        const vinti = casa ? sc : so, persi = casa ? so : sc;
        info = { avv: casa ? partita.ospite : partita.casa, casa, vinti, persi, pti: puntiPartita(vinti, persi) };
      }
      out.push({ g, pos: r.pos, pts: r.pts, tot: cl.length, info });
    });
    return out;
  }, [c, nomeMio]);
  const [sel, setSel] = useState(null);
  if (punti.length < 2) return null;

  const tot = Math.max(...punti.map((p) => p.tot));
  const W = 320, H = 150, px = 26, py = 18;
  const x = (i) => px + (i * (W - 2 * px)) / (punti.length - 1);
  const y = (pos) => py + ((pos - 1) * (H - 2 * py)) / Math.max(1, tot - 1);
  const attivo = punti[sel === null ? punti.length - 1 : sel];
  const linea = punti.map((p, i) => `${x(i)},${y(p.pos)}`).join(" ");

  return (
    <div className="ms-card">
      <div className="ms-card__titolo">Andamento in classifica</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="ms-grafico" role="img" aria-label="Posizione in classifica giornata per giornata">
        {[1, Math.ceil(tot / 2), tot].map((pos) => (
          <g key={pos}>
            <line x1={px} x2={W - px} y1={y(pos)} y2={y(pos)} className="ms-grafico__griglia" />
            <text x={px - 8} y={y(pos) + 3} className="ms-grafico__asse" textAnchor="end">{pos}°</text>
          </g>
        ))}
        <polyline points={linea} className="ms-grafico__linea" />
        {punti.map((p, i) => (
          <g key={p.g} onClick={() => setSel(i)} className="ms-grafico__punto">
            <circle cx={x(i)} cy={y(p.pos)} r="14" fill="transparent" />
            <circle cx={x(i)} cy={y(p.pos)} r={p === attivo ? 6 : 4}
              className={p.info ? (p.info.vinti > p.info.persi ? "is-v" : "is-p") : ""} />
            <text x={x(i)} y={H - 2} className="ms-grafico__asse" textAnchor="middle">G{p.g}</text>
          </g>
        ))}
      </svg>
      <div className="ms-grafico__info">
        <strong>Giornata {attivo.g}</strong> · {attivo.pos}° posto · {attivo.pts} punti
        {attivo.info && (
          <span className={attivo.info.vinti > attivo.info.persi ? "is-v" : "is-p"}>
            {" "}— {attivo.info.casa ? "vs" : "@"} {bello(attivo.info.avv)} {attivo.info.vinti}-{attivo.info.persi} (+{attivo.info.pti})
          </span>
        )}
      </div>
      <p className="ms-nota">Tocca un punto per vedere quella giornata.</p>
    </div>
  );
}

// ---------- Mini classifica ----------
function MiniClassifica({ c, mio }) {
  const [tutta, setTutta] = useState(false);
  const cl = c.classifica;
  const pos = c.riga.pos;
  let mostra;
  if (cl.length <= 7) mostra = cl.map((r) => r.pos);
  else {
    const set = new Set([1, 2]);
    for (let i = pos - 2; i <= pos + 2; i++) if (i >= 1 && i <= cl.length) set.add(i);
    mostra = [...set].sort((a, b) => a - b);
  }
  return (
    <div className="ms-card">
      <div className="ms-card__titolo">Classifica</div>
      {!tutta ? (
        <div className="ms-mini">
          {mostra.map((p, i) => {
            const r = cl[p - 1];
            const salto = i > 0 && p - mostra[i - 1] > 1;
            return (
              <React.Fragment key={r.nome}>
                {salto && <div className="ms-mini__salto">···</div>}
                <div className={"ms-mini__riga" + (mio(r.nome) ? " is-mia" : "")}>
                  <span className="ms-mini__pos">{r.pos}</span>
                  <span className="ms-mini__nome">{bello(r.nome)}</span>
                  <span className="ms-mini__g">{r.g} g</span>
                  <span className="ms-mini__pt">{r.pts}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <ClassificaInterattiva partite={c.partite.map(aCalc)} nomeSq={bello} evidenzia={mio} />
      )}
      <button type="button" className="ms-btn" onClick={() => setTutta(!tutta)}>
        {tutta ? "Mostra solo le vicine" : "Classifica completa e interattiva"}
      </button>
    </div>
  );
}

// ---------- Calendario interattivo ----------
function Calendario({ mie, mio, campionati, inCorso, onIcs, nome }) {
  const ordinate = useMemo(() => [...mie].sort((a, b) => (a.data + (a.ora || "")).localeCompare(b.data + (b.ora || ""))), [mie]);
  const daGiocare = ordinate.filter((p) => !p.ris);
  const [filtro, setFiltro] = useState(daGiocare.length ? "prossime" : "giocate");
  const [luogo, setLuogo] = useState("ovunque");
  const [aperta, setAperta] = useState(null);
  const [quante, setQuante] = useState(10);

  if (!ordinate.length) return null;

  let lista = ordinate;
  if (filtro === "prossime") lista = lista.filter((p) => !p.ris);
  if (filtro === "giocate") lista = lista.filter((p) => p.ris).reverse();
  if (luogo === "casa") lista = lista.filter((p) => mio(p.casa));
  if (luogo === "trasferta") lista = lista.filter((p) => mio(p.ospite));

  const posDi = (camp, squadra) => {
    const cc = campionati.find((x) => x.camp === camp);
    return cc ? cc.classifica.find((r) => r.nome === squadra) : null;
  };

  return (
    <div className="ms-card">
      <div className="ms-card__titolo">Calendario</div>
      <div className="ms-filtri">
        <div className="ci-vista" role="tablist" aria-label="Partite">
          {[["prossime", `Da giocare ${daGiocare.length}`], ["giocate", `Giocate ${ordinate.length - daGiocare.length}`], ["tutte", "Tutte"]].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={filtro === k}
              className={"ci-vista__btn" + (filtro === k ? " is-on" : "")}
              onClick={() => { setFiltro(k); setAperta(null); setQuante(10); }}>{l}</button>
          ))}
        </div>
        <div className="ci-vista" role="tablist" aria-label="Campo">
          {[["ovunque", "Ovunque"], ["casa", "Casa"], ["trasferta", "Trasferta"]].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={luogo === k}
              className={"ci-vista__btn" + (luogo === k ? " is-on" : "")}
              onClick={() => { setLuogo(k); setAperta(null); }}>{l}</button>
          ))}
        </div>
      </div>

      {lista.length === 0 && <p className="ms-nota">Nessuna partita con questi filtri.</p>}

      <div className="ms-cal">
        {lista.slice(0, quante).map((p) => {
          const casa = mio(p.casa);
          const avv = casa ? p.ospite : p.casa;
          const set = p.ris ? leggiSetPartita(p.ris) : null;
          const vinti = set ? (casa ? set[0] : set[1]) : null;
          const persi = set ? (casa ? set[1] : set[0]) : null;
          const esito = set ? (vinti > persi ? "V" : "P") : null;
          const live = !p.ris && inCorso(p);
          const isOpen = aperta === p.id;
          const d = new Date(p.data + "T00:00:00");
          return (
            <div key={p.id} className={"ms-partita" + (isOpen ? " is-open" : "") + (esito === "V" ? " is-v" : esito === "P" ? " is-p" : "")}>
              <button type="button" className="ms-partita__testa" onClick={() => setAperta(isOpen ? null : p.id)} aria-expanded={isOpen}>
                <span className="ms-partita__data">
                  <b>{d.getDate()}</b>
                  <span>{d.toLocaleDateString("it-IT", { month: "short" })}</span>
                </span>
                <span className="ms-partita__centro">
                  <span className="ms-partita__avv">
                    <span className={"ms-partita__dove " + (casa ? "is-casa" : "is-fuori")}>{casa ? "Casa" : "Fuori"}</span>
                    {bello(avv)}
                  </span>
                  <span className="ms-partita__sub">
                    {d.toLocaleDateString("it-IT", { weekday: "short" })}{p.ora ? ` ${p.ora}` : ""} · {campBreve(p.camp)}{p.giornata ? ` · G${p.giornata}` : ""}
                  </span>
                </span>
                <span className="ms-partita__esito">
                  {set ? (
                    <span className={"ms-ris " + (esito === "V" ? "is-v" : "is-p")}>{vinti}-{persi}</span>
                  ) : live ? (
                    <span className="ms-live">in corso</span>
                  ) : (
                    <span className="ms-quando">{quando(p)}</span>
                  )}
                </span>
              </button>
              {isOpen && (
                <SchedaPartita p={p} casa={casa} avv={avv} vinti={vinti} persi={persi}
                  posAvv={posDi(p.camp, avv)} ordinate={ordinate} onIcs={onIcs} nome={nome} />
              )}
            </div>
          );
        })}
      </div>
      {lista.length > quante && (
        <button type="button" className="ms-btn" onClick={() => setQuante(quante + 10)}>Mostra altre partite ({lista.length - quante})</button>
      )}
    </div>
  );
}

function SchedaPartita({ p, casa, avv, vinti, persi, posAvv, ordinate, onIcs, nome }) {
  const d = new Date(p.data + "T00:00:00");
  const altra = ordinate.find((x) => x.id !== p.id && x.camp === p.camp &&
    ((norm(x.casa) === norm(p.ospite) && norm(x.ospite) === norm(p.casa)) || (norm(x.casa) === norm(p.casa) && norm(x.ospite) === norm(p.ospite))));
  const altraIsAndata = altra && altra.data < p.data;
  let altraTesto = null;
  if (altra) {
    const s = altra.ris ? leggiSetPartita(altra.ris) : null;
    const cAltra = norm(altra.casa) === norm(casa ? p.casa : p.ospite);
    const v = s ? (cAltra ? s[0] : s[1]) : null, pr = s ? (cAltra ? s[1] : s[0]) : null;
    altraTesto = (
      <span>
        {altraIsAndata ? "Andata" : "Ritorno"} {new Date(altra.data + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
        {" "}({cAltra ? "in casa" : "in trasferta"}):{" "}
        {s ? <b className={v > pr ? "is-v" : "is-p"}>{v > pr ? "vinta" : "persa"} {v}-{pr}</b> : "da giocare"}
      </span>
    );
  }
  const maps = p.luogo ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.luogo) : null;
  return (
    <div className="ms-scheda">
      <div className="ms-scheda__riga">
        <span className="ms-etic">Quando</span>
        <span>{d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}{p.ora ? `, ore ${p.ora}` : ""}</span>
      </div>
      <div className="ms-scheda__riga">
        <span className="ms-etic">Partita</span>
        <span>{bello(p.casa)} <span className="ms-dim">vs</span> {bello(p.ospite)}</span>
      </div>
      {p.luogo && (
        <div className="ms-scheda__riga">
          <span className="ms-etic">Dove</span>
          <span>{p.luogo} · <a href={maps} target="_blank" rel="noreferrer">Apri la mappa</a></span>
        </div>
      )}
      {vinti !== null && (
        <div className="ms-scheda__riga">
          <span className="ms-etic">Risultato</span>
          <span><b className={vinti > persi ? "is-v" : "is-p"}>{vinti > persi ? "Vinta" : "Persa"} {vinti}-{persi}</b> · +{puntiPartita(vinti, persi)} {puntiPartita(vinti, persi) === 1 ? "punto" : "punti"} in classifica</span>
        </div>
      )}
      {posAvv && (
        <div className="ms-scheda__riga">
          <span className="ms-etic">Avversaria</span>
          <span>
            {posAvv.pos}° in classifica, {posAvv.pts} punti
            <span className="ms-forma ms-forma--mini">
              {posAvv.partite.slice(-5).map((x, i) => (
                <span key={i} className={"ms-pallino " + (x.vinti > x.persi ? "is-v" : "is-p")}>{x.vinti > x.persi ? "V" : "P"}</span>
              ))}
            </span>
          </span>
        </div>
      )}
      {altraTesto && (
        <div className="ms-scheda__riga">
          <span className="ms-etic">{altraIsAndata ? "Andata" : "Ritorno"}</span>
          {altraTesto}
        </div>
      )}
      {!p.ris && onIcs && (
        <button type="button" className="ms-btn ms-btn--pieno"
          onClick={() => onIcs([p], "partita-" + norm(avv).replace(/[^a-z0-9]+/g, "-") + ".ics")}>
          Aggiungi questa partita al calendario
        </button>
      )}
    </div>
  );
}
