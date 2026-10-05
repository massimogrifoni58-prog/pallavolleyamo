function PallavoloUmbriaPage() {
  const dati = pallavoloUmbriaData || {};
  const squadre = dati.squadre || [];
  const derby = dati.derby || null;
  const serieCD = dati.serieCD || {};
  const partiteCD = serieCD.partite || [];
  const archivio = dati.archivio || [];
  const [filtro, setFiltro] = useState("Tutte");

  const squadreVisibili = squadre.filter((s) =>
    filtro === "Tutte" ? true : filtro === "Femminile" ? s.genere === "F" : s.genere === "M"
  );

  function fmtData(iso) {
    if (!iso) return "";
    return new Date(iso + "T00:00:00").toLocaleDateString("it-IT", {
      weekday: "long", day: "numeric", month: "long",
    });
  }

  function RigaPartita({ p }) {
    return (
      <div style={{ fontSize: "0.88rem", lineHeight: 1.5 }}>
        <div style={{ fontWeight: 600 }}>
          {p.casa} <span style={{ color: "var(--text-dim)" }}>vs</span> {p.ospite}
        </div>
        <div style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>
          {fmtData(p.quando)}{p.ora ? `, ore ${p.ora}` : ""}
          {p.giornata ? ` (giornata ${p.giornata})` : ""}
        </div>
        {p.impianto && (
          <div style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>{p.impianto}</div>
        )}
      </div>
    );
  }

  const cardStyle = {
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "1rem 1.1rem",
  };

  return (
    <main>
      <CampionatiHero titolo="Pallavolo Umbria" />
      <section className="section">
        <h2 className="feed-heading">La settimana</h2>
        {dati.settimana && (
          <p style={{ color: "var(--gold)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            {dati.settimana}
          </p>
        )}
        {dati.commento && (
          <p style={{ lineHeight: 1.6, maxWidth: "70ch", marginBottom: "1.75rem" }}>{dati.commento}</p>
        )}

        {derby && (
          <div style={{ ...cardStyle, borderColor: "var(--gold)", background: "rgba(212,175,55,0.07)", marginBottom: "1.75rem" }}>
            <h3 style={{ color: "var(--gold)", fontSize: "1.05rem", margin: "0 0 0.3rem" }}>{derby.titolo}</h3>
            {derby.nota && (
              <p style={{ color: "var(--text-dim)", fontSize: "0.82rem", margin: "0 0 0.85rem" }}>{derby.nota}</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {(derby.partite || []).map((p, i) => <RigaPartita key={i} p={p} />)}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {["Tutte", "Femminile", "Maschile"].map((f) => (
            <button key={f}
              className={`filter-btn ${filtro === f ? "filter-btn--active" : ""}`}
              onClick={() => setFiltro(f)}>
              {f}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
          {squadreVisibili.map((s) => (
            <div key={s.id} style={cardStyle}>
              <h3 style={{ fontSize: "1.05rem", margin: "0 0 0.15rem" }}>{s.nome}</h3>
              <p style={{ color: "var(--gold)", fontSize: "0.8rem", margin: "0 0 0.85rem" }}>
                {s.categoria}, {s.genere === "F" ? "femminile" : "maschile"}
              </p>

              {s.ultimo && (
                <div style={{ marginBottom: "0.85rem" }}>
                  <div style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>Ultimo risultato, {s.ultimo.quando}</div>
                  <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                    {s.ultimo.casa}{" "}
                    <span style={{ color: "var(--gold)" }}>{s.ultimo.risultato}</span>{" "}
                    {s.ultimo.ospite}
                  </div>
                  {s.ultimo.parziali && s.ultimo.parziali.length > 0 && (
                    <div style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>
                      {s.ultimo.parziali.join(", ")}
                    </div>
                  )}
                </div>
              )}

              {s.prossima && (
                <div style={{ marginBottom: s.commento ? "0.85rem" : 0 }}>
                  <div style={{ color: "var(--text-dim)", fontSize: "0.78rem", marginBottom: "0.15rem" }}>Prossima partita</div>
                  <RigaPartita p={s.prossima} />
                </div>
              )}

              {s.commento && (
                <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5, borderLeft: "3px solid var(--gold)", paddingLeft: "0.75rem" }}>
                  {s.commento}
                </p>
              )}
            </div>
          ))}
        </div>

        {(serieCD.commento || partiteCD.length > 0) && (
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ color: "var(--gold)", fontSize: "1.05rem", marginBottom: "0.5rem" }}>Serie C e D</h3>
            {serieCD.commento && (
              <p style={{ lineHeight: 1.6, maxWidth: "70ch", marginBottom: "0.85rem" }}>{serieCD.commento}</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
              {partiteCD.map((p, i) => (
                <div key={i} style={cardStyle}>
                  {p.categoria && (
                    <div style={{ color: "var(--gold)", fontSize: "0.78rem", marginBottom: "0.2rem" }}>{p.categoria}</div>
                  )}
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    {p.casa}{" "}
                    {p.risultato
                      ? <span style={{ color: "var(--gold)" }}>{p.risultato}</span>
                      : <span style={{ color: "var(--text-dim)" }}>vs</span>}{" "}
                    {p.ospite}
                  </div>
                  {p.quando && (
                    <div style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>
                      {fmtData(p.quando)}{p.ora ? `, ore ${p.ora}` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {archivio.length > 0 && (
          <div>
            <h3 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Settimane precedenti</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
              {archivio.map((a, i) => (
                <div key={i} style={cardStyle}>
                  <div style={{ color: "var(--gold)", fontSize: "0.8rem", marginBottom: "0.25rem" }}>{a.settimana}</div>
                  <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5 }}>{a.commento}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}