import React, { useMemo, useState } from "react";

// Classifica interattiva di un girone.
// partite: [{ home, away, score: "3-1" | "3 - 1", giornata?, data? }]
// nomeSq: funzione che rende leggibile il nome squadra
// onApriSquadra: (nomeOriginale) => void, apre la pagina della squadra

export function leggiSetPartita(score) {
  const parts = String(score || "").split("-");
  if (parts.length !== 2) return null;
  const c = parseInt(parts[0], 10);
  const o = parseInt(parts[1], 10);
  if (isNaN(c) || isNaN(o) || c === o) return null;
  return [c, o];
}

export function numGiornata(m) {
  const n = parseInt(String(m.giornata || "").replace(/\D/g, ""), 10);
  return isNaN(n) ? null : n;
}

// Punti FIPAV: 3-0 / 3-1 = 3 punti, 3-2 = 2 punti alla vincente e 1 alla perdente
export function puntiPartita(vinti, persi) {
  if (vinti > persi) return persi <= 1 ? 3 : 2;
  return vinti === 2 ? 1 : 0;
}

function ordinaPartite(lista) {
  return [...lista].sort((a, b) => {
    const ga = numGiornata(a), gb = numGiornata(b);
    if (ga !== null && gb !== null && ga !== gb) return ga - gb;
    return String(a.data || "").localeCompare(String(b.data || ""));
  });
}

export function calcola(partite, vista = "totale") {
  const sq = {};
  const nuova = (nome) => ({ nome, g: 0, v: 0, p: 0, sv: 0, sp: 0, pts: 0, partite: [] });
  ordinaPartite(partite).forEach((m) => {
    const set = leggiSetPartita(m.score);
    if (!set) return;
    const [c, o] = set;
    if (!sq[m.home]) sq[m.home] = nuova(m.home);
    if (!sq[m.away]) sq[m.away] = nuova(m.away);
    const lati = [
      { s: sq[m.home], vinti: c, persi: o, avv: m.away, casa: true },
      { s: sq[m.away], vinti: o, persi: c, avv: m.home, casa: false },
    ];
    lati.forEach(({ s, vinti, persi, avv, casa }) => {
      if (vista === "casa" && !casa) return;
      if (vista === "trasferta" && casa) return;
      const pti = puntiPartita(vinti, persi);
      s.g++;
      s.sv += vinti; s.sp += persi;
      s.pts += pti;
      if (vinti > persi) s.v++; else s.p++;
      s.partite.push({ avv, casa, vinti, persi, pti, giornata: numGiornata(m), data: m.data || "" });
    });
  });
  return Object.values(sq)
    .map((s) => ({ ...s, qs: s.sp ? s.sv / s.sp : (s.sv ? Infinity : 0) }))
    .sort((a, b) => b.pts - a.pts || b.v - a.v || b.qs - a.qs || a.nome.localeCompare(b.nome))
    .map((s, i) => ({ ...s, pos: i + 1 }));
}

const COLONNE = [
  { k: "g", l: "G", t: "Partite giocate" },
  { k: "v", l: "V", t: "Vittorie" },
  { k: "p", l: "P", t: "Sconfitte" },
  { k: "sv", l: "SV", t: "Set vinti", mob: false },
  { k: "sp", l: "SP", t: "Set persi", mob: false },
  { k: "qs", l: "QS", t: "Quoziente set (vinti / persi)" },
  { k: "pts", l: "Pt", t: "Punti" },
];

function fmtQs(q) {
  if (q === Infinity) return "max";
  return q.toFixed(2).replace(".", ",");
}

function fmtData(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) return "";
  const [, m, g] = d.split("-");
  return `${g}/${m}`;
}

export default function ClassificaInterattiva({ partite, nomeSq = (n) => n, onApriSquadra, evidenzia }) {
  const [vista, setVista] = useState("totale");
  const [ord, setOrd] = useState({ k: "pos", dir: 1 });
  const [aperta, setAperta] = useState(null);
  const [cerca, setCerca] = useState("");

  const righe = useMemo(() => calcola(partite, vista), [partite, vista]);

  // Variazione rispetto alla giornata precedente (solo nella vista totale)
  const variazioni = useMemo(() => {
    if (vista !== "totale") return {};
    const giornate = partite.map(numGiornata).filter((g) => g !== null);
    if (!giornate.length) return {};
    const ultima = Math.max(...giornate);
    const prima = partite.filter((m) => numGiornata(m) !== null && numGiornata(m) < ultima);
    if (!prima.length) return {};
    const prec = {};
    calcola(prima, "totale").forEach((s) => { prec[s.nome] = s.pos; });
    const out = {};
    righe.forEach((s) => { if (prec[s.nome]) out[s.nome] = prec[s.nome] - s.pos; });
    return out;
  }, [partite, righe, vista]);

  const maxPts = Math.max(1, ...righe.map((r) => r.pts));
  const q = cerca.trim().toLowerCase();

  const ordinate = useMemo(() => {
    if (ord.k === "pos") return ord.dir === 1 ? righe : [...righe].reverse();
    return [...righe].sort((a, b) => (b[ord.k] - a[ord.k]) * ord.dir || a.pos - b.pos);
  }, [righe, ord]);

  function clicColonna(k) {
    setOrd((o) => (o.k === k ? { k, dir: -o.dir } : { k, dir: 1 }));
  }

  function freccia(k) {
    if (ord.k !== k) return null;
    return <span className="ci-freccia" aria-hidden="true">{ord.dir === 1 ? "▾" : "▴"}</span>;
  }

  if (!righe.length) return <p className="state">Nessun risultato disponibile.</p>;

  return (
    <div className="ci">
      <div className="ci-barra">
        <div className="ci-vista" role="tablist" aria-label="Partite considerate">
          {[["totale", "Totale"], ["casa", "In casa"], ["trasferta", "In trasferta"]].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={vista === k}
              className={"ci-vista__btn" + (vista === k ? " is-on" : "")}
              onClick={() => { setVista(k); setAperta(null); }}>{l}</button>
          ))}
        </div>
        <input className="ci-cerca" type="search" placeholder="Cerca la tua squadra"
          value={cerca} onChange={(e) => setCerca(e.target.value)} aria-label="Cerca squadra" />
      </div>

      <div className="classifica-wrap ci-wrap">
        <table className="classifica-table ci-table">
          <thead>
            <tr>
              <th className="ci-th" onClick={() => clicColonna("pos")} title="Posizione">#{freccia("pos")}</th>
              <th className="classifica-table__nome">Squadra</th>
              {COLONNE.map((c) => (
                <th key={c.k} title={c.t + " — tocca per ordinare"}
                  className={"ci-th" + (c.mob === false ? " ci-nomob" : "") + (ord.k === c.k ? " is-sort" : "")}
                  onClick={() => clicColonna(c.k)}>
                  {c.l}{freccia(c.k)}
                </th>
              ))}
              <th className="ci-nomob" title="Ultime 5 partite, la più recente a destra">Forma</th>
            </tr>
          </thead>
          <tbody>
            {ordinate.map((s) => {
              const mia = evidenzia && evidenzia(s.nome);
              const evid = (q && nomeSq(s.nome).toLowerCase().includes(q)) || mia;
              const spenta = q && !evid;
              const isOpen = aperta === s.nome;
              const delta = variazioni[s.nome];
              const ultime = s.partite.slice(-5);
              return (
                <React.Fragment key={s.nome}>
                  <tr
                    className={"ci-riga" + (s.pos === 1 ? " classifica-table__first" : "") + (evid ? " is-evid" : "") + (spenta ? " is-spenta" : "") + (isOpen ? " is-open" : "")}
                    onClick={() => setAperta(isOpen ? null : s.nome)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAperta(isOpen ? null : s.nome); } }}
                    aria-expanded={isOpen}
                  >
                    <td className="classifica-table__pos">
                      <span className={"classifica-pos" + (s.pos <= 3 ? " classifica-pos--" + s.pos : "")}>{s.pos}</span>
                      {delta ? (
                        <span className={"ci-delta " + (delta > 0 ? "is-su" : "is-giu")} title={delta > 0 ? `Guadagnate ${delta} posizioni` : `Perse ${-delta} posizioni`}>
                          {delta > 0 ? "▲" : "▼"}{Math.abs(delta)}
                        </span>
                      ) : null}
                    </td>
                    <td className="classifica-table__nome">
                      <span className="ci-nome">{nomeSq(s.nome)}</span>
                      <span className="ci-barra-pt" style={{ width: (s.pts / maxPts) * 100 + "%" }} aria-hidden="true" />
                    </td>
                    <td>{s.g}</td>
                    <td>{s.v}</td>
                    <td>{s.p}</td>
                    <td className="ci-nomob">{s.sv}</td>
                    <td className="ci-nomob">{s.sp}</td>
                    <td className="ci-qs">{fmtQs(s.qs)}</td>
                    <td className="classifica-table__pts">{s.pts}</td>
                    <td className="ci-nomob">
                      <span className="ci-forma">
                        {ultime.map((p, i) => (
                          <span key={i} className={"ci-pallino " + (p.vinti > p.persi ? "is-v" : "is-p")}
                            title={`${p.vinti > p.persi ? "Vinta" : "Persa"} ${p.vinti}-${p.persi} ${p.casa ? "contro" : "a casa di"} ${nomeSq(p.avv)}`}>
                            {p.vinti > p.persi ? "V" : "P"}
                          </span>
                        ))}
                      </span>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="ci-dettaglio">
                      <td colSpan={COLONNE.length + 3}>
                        <Dettaglio s={s} nomeSq={nomeSq} onApriSquadra={onApriSquadra} vista={vista} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="ci-nota">Tocca una squadra per vedere le sue partite. Tocca le intestazioni per ordinare.</p>
    </div>
  );
}

function Dettaglio({ s, nomeSq, onApriSquadra, vista }) {
  const conta = (v, p) => s.partite.filter((x) => x.vinti === v && x.persi === p).length;
  const esiti = [
    ["3-0", conta(3, 0), "is-v"], ["3-1", conta(3, 1), "is-v"], ["3-2", conta(3, 2), "is-v"],
    ["2-3", conta(2, 3), "is-p"], ["1-3", conta(1, 3), "is-p"], ["0-3", conta(0, 3), "is-p"],
  ];
  const media = s.g ? (s.pts / s.g).toFixed(2).replace(".", ",") : "0";
  return (
    <div className="ci-det">
      <div className="ci-det__stat">
        <div><strong>{media}</strong><span>punti a partita</span></div>
        <div><strong>{s.g ? Math.round((s.v / s.g) * 100) : 0}%</strong><span>vittorie</span></div>
        <div className="ci-det__esiti">
          {esiti.map(([l, n, c]) => (
            <span key={l} className={"ci-esito " + c + (n ? "" : " is-zero")}><b>{n}</b>{l}</span>
          ))}
        </div>
      </div>
      <ul className="ci-det__lista">
        {[...s.partite].reverse().map((p, i) => (
          <li key={i} className={p.vinti > p.persi ? "is-v" : "is-p"}>
            <span className="ci-det__g">{p.giornata ? `G${p.giornata}` : ""}{fmtData(p.data) ? ` · ${fmtData(p.data)}` : ""}</span>
            <span className="ci-det__avv">{p.casa ? "vs " : "@ "}{nomeSq(p.avv)}</span>
            <span className="ci-det__ris">{p.vinti}-{p.persi}</span>
            <span className="ci-det__pti">+{p.pti}</span>
          </li>
        ))}
      </ul>
      {onApriSquadra && (
        <button type="button" className="ci-det__link" onClick={(e) => { e.stopPropagation(); onApriSquadra(s.nome); }}>
          Calendario completo di {nomeSq(s.nome)} →
        </button>
      )}
      {vista !== "totale" && <p className="ci-nota">Conteggio solo partite {vista === "casa" ? "in casa" : "in trasferta"}.</p>}
    </div>
  );
}
