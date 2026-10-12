import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { useComponenteDemo } from "../demo/caricaInDemo";

export default function Login() {
  const { login, error, setError, profile, user, logout } = useAuth();
  const { nomeSocieta, logoDataUrl } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Solo nella versione dimostrativa: i quattro accessi pronti, un clic
  // ciascuno. Nella versione vera questa riga non carica niente.
  const PannelloDemo = useComponenteDemo(() => import("../demo/PannelloDemo.jsx"));

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // errore già gestito nel context
    }
    setSubmitting(false);
  }

  // Utente autenticato ma senza profilo Firestore associato
  if (user && !profile) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-mark" />
          <h1 className="login-title">Account non configurato</h1>
          <p className="login-sub">
            Il tuo accesso è riuscito, ma non è stato ancora associato a un
            profilo. Chiedi allo staff amministrativo di completare la tua
            registrazione.
          </p>
          <button className="btn btn-secondary" onClick={logout}>
            Torna al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-mark">{logoDataUrl && <img src={logoDataUrl} alt="" />}</div>
        <h1 className="login-title">{nomeSocieta || "Gestionale Società"}</h1>
        <p className="login-sub">Accedi con le credenziali fornite dallo staff.</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              required
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            disabled={submitting}
          >
            {submitting ? "Accesso in corso…" : "Accedi"}
          </button>
        </form>

        {PannelloDemo && <PannelloDemo />}
      </div>
    </div>
  );
}
