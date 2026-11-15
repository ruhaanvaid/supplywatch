import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell, Field, postJson } from "./authForm";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  // Arriving from the link in the confirmation email, in a browser that isn't logged in.
  const params = new URLSearchParams(window.location.search);
  const note = params.get("verified") === "1" ? "Your email is confirmed. Log in to continue."
             : params.get("verify_error") === "1" ? "That confirmation link didn't work. Log in to get a new one."
             : null;
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    if (!form.email || !form.password) return setError("Please enter your email and password.");

    setLoading(true);
    const response = await postJson("/api/login", form);
    setLoading(false);
    if (response.ok) return navigate("/app");
    // On purpose we never say WHICH part was wrong, so nobody can test which emails have accounts.
    setError(response.status === 429 ? "Too many failed tries. Please wait 15 minutes and try again."
           : response.status === 401 ? "Invalid email or password."
           : "Something went wrong. Please try again.");
  }

  return (
    <AuthShell title="Log in to SupplyWatch" error={error}>
      {note && <div className="form-note" role="status">{note}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <Field id="email" label="Email" type="email" value={form.email} onChange={update("email")} autoComplete="email" />
        <Field id="password" label="Password" type="password" value={form.password} onChange={update("password")}
               autoComplete="current-password" />
        <button type="submit" className="btn btn-filled btn-block" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p>New here? <Link to="/signup">Create a free account</Link> or <Link to="/app?demo=1">try the demo</Link>.</p>
    </AuthShell>
  );
}
