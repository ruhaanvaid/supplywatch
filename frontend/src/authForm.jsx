import { Link } from "react-router-dom";
import "./landing.css";

// Pieces shared by the sign-up and log-in pages, so both look and behave the same.

// Send the form to the backend as JSON. Returns the response (or a fake "500" if
// the server can't be reached at all), so the page can show a friendly message.
export async function postJson(path, body) {
  try {
    return await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" },
                               body: JSON.stringify(body) });
  } catch {
    return { ok: false, status: 500 };
  }
}

// The page frame: logo, title, an error box if needed, then the form.
export function AuthShell({ title, error, children }) {
  return (
    <div className="auth-page">
      <Link to="/" className="landing-logo">SupplyWatch</Link>
      <main className="auth-card">
        <h1>{title}</h1>
        {/* role="alert" makes screen readers read the error out loud as soon as it appears */}
        {error && <div className="form-error" role="alert">{error}</div>}
        {children}
      </main>
    </div>
  );
}

// One labeled input. A field with an error gets a red border, the message right
// under it, and aria attributes so screen readers announce the problem too.
export function Field({ id, label, error, hint, ...inputProps }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} className={error ? "invalid" : ""} aria-invalid={!!error}
             aria-describedby={describedBy} {...inputProps} />
      {error ? <p id={`${id}-error`} className="field-error">{error}</p>
             : hint && <p id={`${id}-hint`} className="small">{hint}</p>}
    </div>
  );
}
