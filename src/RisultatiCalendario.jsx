import React, { useEffect, useMemo, useState } from "react";
import ClassificaInterattiva, { calcola, numGiornata, leggiSetPartita, puntiPartita } from "./ClassificaInterattiva.jsx";

// Risultati e calendario interattivi di un campionato.
// partite: [{ id, data, ora, casa, ospite, risultato, giornata, impianto?, categoria? }]
// modo: "risultati" (parte dall'ultima giornata giocata) | "calendario" (dalla prossima da giocare)
// grafica(p): elemento con il pulsante della grafica social (solo partite giocate)
// onIcs(lista, nomeFile): scarica il calendario .ics
// onApriSquadra(nome): apre "La mia squadra" su quella squadra

const bello = (n) => (n || "").replace(/\b[Aa]\.?\s?[Ss]\.?\s?[Dd]\.?(?=\s|$)/g, "").replace(/\s+/g, " ").trim()
  .toLowerCase().replace(/(^|[\s\-'])(\S)/g, (m, a, b) => a + b.toUpperCase())
  .replace(/\b(Di|Del|Della|Dei|Da)\b(?!$)/g, (w) => w.toLowerCase());
const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const pad = (n) => String(n).padStart(2, "0");
const isoDi = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const oggiISO = () => isoDi(new Date());
const setDi = (p) => leggiSetPartita(p.risultato);
const aCalc = (p) => ({ home: p.casa, away: p.ospite, score: p.risultato, giornata: p.giornata, data: p.data });

function inizio(p) {
  const t = new Date(p.data + "T" + ((p.ora || "23:59").slice(0, 5)) + ":00").getTime();
  return isNaN(t) ? null : t;
}
function inCorso(p) {
  if (setDi(p)) return false;
  const t = inizio(p);
  return t !== null && t <= Date.now() && Date.now() < t + 3 * 3600 * 1000;
}
function quando(p) {
  const g = Math.round((new Date(p.data + "T00:00:00") - new Date(oggiISO() + "T00:00:00")) / 86400000);
  const ora = (p.ora || "").slice(0, 5);
  if (g === 0) return ora ? `oggi ${ora}` : "oggi";
  if (g === 1) return ora ? `domani ${ora}` : "domani";
  if (g > 1 && g < 7) return `tra ${g} giorni`;
  return ora || "";
}
const dataLunga = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
const dataCorta = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });

export default function RisultatiCalendario({ partite, modo = "risultati", grafica, onIcs, onApriSquadra }) {
  const lista = useMemo(() => (partite || []).filter((p) => p.data)
    .slice().sort((a, b) => (a.data + (a.ora || "")).localeCompare(b.data + (b.ora || ""))), [partite]);

  const giornate = useMemo(() => {
    const m = new Map();
    lista.forEach((p) => {
      const g = numGiornata(p);
      if (g === null) return;
      if (!m.has(g)) m.set(g, []);
      m.get(g).push(p);
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([g, ps]) => {
      const giocate = ps.filter(setDi).length;
      return { g, partite: ps, giocate, stato: giocate === ps.length ? "giocata" : giocate > 0 ? "parziale" : "futura" };
    });
  }, [lista]);

  const classifica = useMemo(() => calcola(lista.filter(setDi).map(aCalc)), [lista]);
  const posDi = (nome) => classifica.find((r) => r.nome === nome);

  const giornataIniziale = () => {
    if (!giornate.length) return null;
    if (modo === "calendario") {
      const prossima = giornate.find((x) => x.stato !== "giocata");
      return (prossima || giornate[giornate.length - 1]).g;
    }
    const conRisultati = giornate.filter((x) => x.giocate > 0);
    return (conRisultati.length ? conRisultati[conRisultati.length - 1] : giornate[0]).g;
  };

  const [vista, setVista] = useState(giornate.length ? "giornate" : "mese");
  const [gSel, setGSel] = useState(giornataIniziale);
  const [sqSel, setSqSel] = useState(null);
  const [aperta, setAperta] = useState(null);

  // al cambio di campionato si riparte dalla giornata giusta
  useEffect(() => {
    setVista(giornate.length ? "giornate" : "mese");
    setGSel(giornataIniziale());
    setSqSel(null);
    setAperta(null);
  }, [partite]);

  const toggle = (id) => setAperta(aperta === id ? null : id);
  const scheda = { aperta, toggle, posDi, lista, grafica, onIcs, onApriSquadra };

  if (!lista.length) return <p className="state">Nessuna partita disponibile per questo campionato.</p>;

  // squadre del campionato, in ordine di classifica (chi non ha ancora giocato in fondo)
  const squadre = [...new Set(lista.flatMap((p) => [p.casa, p.ospite]))].filter(Boolean)
    .sort((a, b) => ((posDi(a) || {}).pos || 999) - ((posDi(b) || {}).pos || 999) || bello(a).localeCompare(bello(b), "it"));
  const q = sqSel && squadre.includes(sqSel) ? sqSel : null;
  const scegliSquadra = (n) => { setSqSel(q === n ? null : n); setAperta(null); };

  return (
    <div className="rc">
      <div className="rc-barra">
        <div className="ci-vista" role="tablist" aria-label="Vista">
          {giornate.length > 0 && (
            <button type="button" role="tab" aria-selected={vista === "giornate"}
              className={"ci-vista__btn" + (vista === "giornate" && !q ? " is-on" : "")}
              onClick={() => { setVista("giornate"); setSqSel(null); setAperta(null); }}>Giornate</button>
          )}
          <button type="button" role="tab" aria-selected={vista === "mese"}
            className={"ci-vista__btn" + (vista === "mese" && !q ? " is-on" : "")}
            onClick={() => { setVista("mese"); setSqSel(null); setAperta(null); }}>Mese</button>
        </div>
      </div>

      <div className="rc-squadre" role="group" aria-label="Squadre del campionato">
        {squadre.map((n) => {
          const r = posDi(n);
          return (
            <button key={n} type="button" className={"rc-sqchip" + (q === n ? " is-on" : "")}
              aria-pressed={q === n} onClick={() => scegliSquadra(n)} title={"Partite di " + bello(n)}>
              {r && <span className="rc-sqchip__pos">{r.pos}</span>}
              <span className="rc-sqchip__nome">{bello(n)}</span>
            </button>
          );
        })}
      </div>

      {q ? (
        <VistaSquadre key={q} trovate={[q]} lista={lista} scheda={scheda} onChiudi={() => setSqSel(null)} />
      ) : vista === "giornate" ? (
        <VistaGiornate giornate={giornate} gSel={gSel} setGSel={(g) => { setGSel(g); setAperta(null); }} lista={lista} scheda={scheda} />
      ) : (
        <VistaMese lista={lista} scheda={scheda} gIniziale={giornate.find((x) => x.g === gSel)} />
      )}
    </div>
  );
}

// ---------- Vista per giornata ----------
function VistaGiornate({ giornate, gSel, setGSel, lista, scheda }) {
  const [classificaAperta, setClassificaAperta] = useState(false);
  const idx = Math.max(0, giornate.findIndex((x) => x.g === gSel));
  const gio = giornate[idx];
  const stripRef = React.useRef(null);

  useEffect(() => {
    const el = stripRef.current && stripRef.current.querySelector(".is-sel");
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", inline: "center" });
  }, [gSel]);

  const giocate = gio.partite.filter(setDi);
  const vCasa = giocate.filter((p) => { const s = setDi(p); return s[0] > s[1]; }).length;
  const tieBreak = giocate.filter((p) => { const s = setDi(p); return s[0] + s[1] === 5; }).length;
  const date = [...new Set(gio.partite.map((p) => p.data))].sort();
  const periodo = date.length === 1 ? dataCorta(date[0]) : `${dataCorta(date[0])} – ${dataCorta(date[date.length - 1])}`;
  const finoA = lista.filter((p) => setDi(p) && numGiornata(p) !== null && numGiornata(p) <= gio.g);

  return (
    <>
      <div className="rc-giornate">
        <button type="button" className="rc-freccia" disabled={idx === 0} onClick={() => setGSel(giornate[idx - 1].g)} aria-label="Giornata precedente">‹</button>
        <div className="rc-strip" ref={stripRef}>
          {giornate.map((x) => (
            <button key={x.g} type="button"
              className={"rc-g is-" + x.stato + (x.g === gio.g ? " is-sel" : "")}
              onClick={() => setGSel(x.g)} title={`Giornata ${x.g}: ${x.giocate}/${x.partite.length} giocate`}>
              <span className="rc-g__n">{x.g}</span>
              <span className="rc-g__pt" />
            </button>
          ))}
        </div>
        <button type="button" className="rc-freccia" disabled={idx === giornate.length - 1} onClick={() => setGSel(giornate[idx + 1].g)} aria-label="Giornata successiva">›</button>
      </div>

      <div className="ms-card rc-testa">
        <div className="rc-testa__tit">
          <span className="rc-testa__g">Giornata {gio.g}</span>
          <span className="rc-testa__date">{periodo}</span>
        </div>
        <div className="rc-testa__dati">
          <span><b>{giocate.length}</b>/{gio.partite.length} giocate</span>
          {giocate.length > 0 && <span><b>{vCasa}</b> vittorie in casa</span>}
          {giocate.length > 0 && <span><b>{giocate.length - vCasa}</b> in trasferta</span>}
          {giocate.length > 0 && <span><b>{tieBreak}</b> al tie-break</span>}
        </div>
        <div className="rc-lista">
          {gio.partite.map((p) => <Partita key={p.id} p={p} {...scheda} />)}
        </div>
        {finoA.length > 0 && (
          <>
            <button type="button" className="ms-btn" onClick={() => setClassificaAperta(!classificaAperta)}>
              {classificaAperta ? "Nascondi la classifica" : `Classifica dopo la giornata ${gio.g}`}
            </button>
            {classificaAperta && (
              <div style={{ marginTop: "0.8rem" }}>
                <ClassificaInterattiva partite={finoA.map(aCalc)} nomeSq={bello} onApriSquadra={scheda.onApriSquadra} />
              </div>
            )}
          </>
        )}
      </div>
      <p className="ms-nota">
        <span className="rc-leg is-giocata" /> giocata <span className="rc-leg is-parziale" /> in corso <span className="rc-leg is-futura" /> da giocare · Tocca una partita per i dettagli.
      </p>
    </>
  );
}

// ---------- Vista mese ----------
function VistaMese({ lista, scheda, gIniziale }) {
  const perGiorno = useMemo(() => {
    const m = {};
    lista.forEach((p) => { (m[p.data] = m[p.data] || []).push(p); });
    return m;
  }, [lista]);
  const oggi = oggiISO();
  const partenza = (gIniziale && gIniziale.partite[0] && gIniziale.partite[0].data) || oggi;
  const [mese, setMese] = useState(() => { const d = new Date(partenza + "T00:00:00"); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [giorno, setGiorno] = useState(null);

  const anno = mese.getFullYear(), m = mese.getMonth();
  const pref = `${anno}-${pad(m + 1)}`;
  const giorniMese = Object.keys(perGiorno).filter((d) => d.startsWith(pref)).sort();
  const attivo = giorno && giorno.startsWith(pref) ? giorno
    : (giorniMese.find((d) => d >= oggi) || giorniMese[giorniMese.length - 1] || null);
  let primo = new Date(anno, m, 1).getDay(); primo = primo === 0 ? 6 : primo - 1;
  const celle = [];
  for (let i = 0; i < primo; i++) celle.push(null);
  for (let d = 1; d <= new Date(anno, m + 1, 0).getDate(); d++) celle.push(d);

  const cambia = (delta) => { setMese(new Date(anno, m + delta, 1)); setGiorno(null); };
  const delGiorno = attivo ? perGiorno[attivo] || [] : [];

  return (
    <>
      <div className="ms-card">
        <div className="rc-mese__nav">
          <button type="button" className="rc-freccia" onClick={() => cambia(-1)} aria-label="Mese precedente">‹</button>
          <span className="rc-mese__nome">{mese.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</span>
          <button type="button" className="rc-freccia" onClick={() => cambia(1)} aria-label="Mese successivo">›</button>
        </div>
        <div className="rc-griglia rc-griglia--testa">
          {["L", "M", "M", "G", "V", "S", "D"].map((g, i) => <span key={i}>{g}</span>)}
        </div>
        <div className="rc-griglia">
          {celle.map((d, i) => {
            if (d === null) return <span key={"v" + i} />;
            const iso = `${pref}-${pad(d)}`;
            const ps = perGiorno[iso] || [];
            const fatte = ps.filter(setDi).length;
            const cls = "rc-giorno" + (ps.length ? (fatte === ps.length ? " is-giocata" : fatte ? " is-parziale" : " is-futura") : "")
              + (iso === oggi ? " is-oggi" : "") + (iso === attivo ? " is-sel" : "");
            return (
              <button key={iso} type="button" className={cls} disabled={!ps.length} onClick={() => setGiorno(iso)}
                title={ps.length ? `${ps.length} partite` : ""}>
                <span>{d}</span>
                {ps.length > 0 && <small>{ps.length}</small>}
              </button>
            );
          })}
        </div>
        <p className="ms-nota">Il numero indica quante partite ci sono quel giorno.</p>
      </div>
      {attivo ? (
        <div className="ms-card">
          <div className="ms-card__titolo" style={{ textTransform: "capitalize" }}>{dataLunga(attivo)}</div>
          <div className="rc-lista">
            {delGiorno.map((p) => <Partita key={p.id} p={p} {...scheda} conGiornata />)}
          </div>
        </div>
      ) : (
        <p className="state">In questo mese non ci sono partite. Cambia mese.</p>
      )}
    </>
  );
}

// ---------- Ricerca squadra ----------
function VistaSquadre({ trovate, lista, scheda, onChiudi }) {
  const [filtro, setFiltro] = useState("tutte");
  if (!trovate.length) return <p className="state">Nessuna squadra trovata in questo campionato.</p>;
  const set = new Set(trovate);
  let ps = lista.filter((p) => set.has(p.casa) || set.has(p.ospite));
  if (filtro === "giocate") ps = ps.filter(setDi).reverse();
  if (filtro === "dagiocare") ps = ps.filter((p) => !setDi(p));
  return (
    <div className="ms-card">
      {trovate.length <= 3 && trovate.map((s) => {
        const r = scheda.posDi(s);
        return (
          <div key={s} className="rc-sq">
            <div>
              <div className="rc-sq__nome">{bello(s)}</div>
              {r && <div className="rc-sq__info">{r.pos}° in classifica · {r.pts} punti · {r.v} vinte, {r.p} perse</div>}
            </div>
            <div className="rc-sq__azioni">
              {scheda.onApriSquadra && (
                <button type="button" className="ms-btn" style={{ marginTop: 0 }} onClick={() => scheda.onApriSquadra(s)}>La mia squadra →</button>
              )}
              {onChiudi && (
                <button type="button" className="rc-chiudi" onClick={onChiudi} aria-label="Chiudi e torna al campionato">✕</button>
              )}
            </div>
          </div>
        );
      })}
      <div className="ci-vista" role="tablist" style={{ margin: "0.6rem 0 0.8rem" }}>
        {[["tutte", "Tutte"], ["giocate", "Giocate"], ["dagiocare", "Da giocare"]].map(([k, l]) => (
          <button key={k} type="button" className={"ci-vista__btn" + (filtro === k ? " is-on" : "")} onClick={() => setFiltro(k)}>{l}</button>
        ))}
      </div>
      <div className="rc-lista">
        {ps.map((p) => <Partita key={p.id} p={p} {...scheda} conGiornata conData evidenzia={set} />)}
        {!ps.length && <p className="ms-nota">Nessuna partita.</p>}
      </div>
    </div>
  );
}

// ---------- Partita (riga + scheda) ----------
function Partita({ p, aperta, toggle, posDi, lista, grafica, onIcs, onApriSquadra, conGiornata, conData = false, evidenzia }) {
  const s = setDi(p);
  const live = inCorso(p);
  const isOpen = aperta === p.id;
  const vinceCasa = s && s[0] > s[1];
  const mia = (n) => evidenzia && evidenzia.has(n);
  return (
    <div className={"rc-p" + (isOpen ? " is-open" : "") + (s ? " is-giocata" : "")}>
      <button type="button" className="rc-p__testa" onClick={() => toggle(p.id)} aria-expanded={isOpen}>
        <span className="rc-p__ora">
          {conData ? <b>{new Date(p.data + "T00:00:00").getDate()}</b> : null}
          <span>{conData ? new Date(p.data + "T00:00:00").toLocaleDateString("it-IT", { month: "short" }) : dataCorta(p.data).split(" ")[0]}</span>
          {!conData && <b>{(p.ora || "").slice(0, 5) || "—"}</b>}
        </span>
        <span className="rc-p__squadre">
          <span className={"rc-p__sq" + (s ? (vinceCasa ? " is-vince" : " is-perde") : "") + (mia(p.casa) ? " is-mia" : "")}>
            <span className="rc-p__nome">{bello(p.casa)}</span>
            {s && <b className="rc-p__set">{s[0]}</b>}
          </span>
          <span className={"rc-p__sq" + (s ? (!vinceCasa ? " is-vince" : " is-perde") : "") + (mia(p.ospite) ? " is-mia" : "")}>
            <span className="rc-p__nome">{bello(p.ospite)}</span>
            {s && <b className="rc-p__set">{s[1]}</b>}
          </span>
          {conGiornata && numGiornata(p) !== null && <span className="rc-p__g">Giornata {numGiornata(p)}</span>}
        </span>
        <span className="rc-p__stato">
          {s ? <span className="rc-fine">{s[0] + s[1] === 5 ? "tie-break" : "finale"}</span>
            : live ? <span className="ms-live">in corso</span>
            : <span className="ms-quando">{quando(p)}</span>}
        </span>
      </button>
      {isOpen && <Scheda p={p} s={s} posDi={posDi} lista={lista} grafica={grafica} onIcs={onIcs} onApriSquadra={onApriSquadra} />}
    </div>
  );
}

function Scheda({ p, s, posDi, lista, grafica, onIcs, onApriSquadra }) {
  const altra = lista.find((x) => x.id !== p.id && norm(x.casa) === norm(p.ospite) && norm(x.ospite) === norm(p.casa));
  const sAltra = altra ? setDi(altra) : null;
  const pc = posDi(p.casa), po = posDi(p.ospite);
  const maps = p.impianto ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.impianto) : null;
  const forma = (r) => r && (
    <span className="ms-forma ms-forma--mini">
      {r.partite.slice(-5).map((x, i) => (
        <span key={i} className={"ms-pallino " + (x.vinti > x.persi ? "is-v" : "is-p")}>{x.vinti > x.persi ? "V" : "P"}</span>
      ))}
    </span>
  );
  return (
    <div className="ms-scheda rc-scheda">
      <div className="ms-scheda__riga">
        <span className="ms-etic">Quando</span>
        <span style={{ textTransform: "capitalize" }}>{dataLunga(p.data)}{p.ora ? `, ore ${p.ora.slice(0, 5)}` : ""}</span>
      </div>
      {p.impianto && (
        <div className="ms-scheda__riga">
          <span className="ms-etic">Dove</span>
          <span>{p.impianto} · <a href={maps} target="_blank" rel="noreferrer">Apri la mappa</a></span>
        </div>
      )}
      {s && (
        <div className="ms-scheda__riga">
          <span className="ms-etic">Punti</span>
          <span>{bello(p.casa)} +{puntiPartita(s[0], s[1])} · {bello(p.ospite)} +{puntiPartita(s[1], s[0])}</span>
        </div>
      )}
      {(pc || po) && (
        <div className="ms-scheda__riga">
          <span className="ms-etic">Classifica</span>
          <span className="rc-scheda__pos">
            {pc && <span>{bello(p.casa)}: <b>{pc.pos}°</b> {forma(pc)}</span>}
            {po && <span>{bello(p.ospite)}: <b>{po.pos}°</b> {forma(po)}</span>}
          </span>
        </div>
      )}
      {altra && (
        <div className="ms-scheda__riga">
          <span className="ms-etic">{altra.data < p.data ? "Andata" : "Ritorno"}</span>
          <span>
            {dataCorta(altra.data)}: {bello(altra.casa)} – {bello(altra.ospite)}{" "}
            {sAltra ? <b>{sAltra[0]}-{sAltra[1]}</b> : <span className="ms-dim">da giocare</span>}
          </span>
        </div>
      )}
      <div className="rc-scheda__azioni">
        {s && grafica && grafica(p)}
        {!s && onIcs && (
          <button type="button" className="ms-btn ms-btn--pieno" onClick={() => onIcs([{
            id: p.id, data: p.data, ora: (p.ora || "").slice(0, 5), casa: p.casa, ospite: p.ospite,
            camp: p.campionato || p.categoria || "", giornata: p.giornata, luogo: p.impianto,
          }], "partita-" + norm(p.casa + " " + p.ospite).replace(/[^a-z0-9]+/g, "-") + ".ics")}>
            Aggiungi al calendario
          </button>
        )}
        {onApriSquadra && [p.casa, p.ospite].map((n) => (
          <button key={n} type="button" className="ms-btn" onClick={() => onApriSquadra(n)}>{bello(n)} →</button>
        ))}
      </div>
    </div>
  );
}
