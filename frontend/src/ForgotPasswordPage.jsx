import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell, Field, postJson } from "./authForm";

// Step 1 of "forgot password": ask for the email and send a reset link.
// The answer is the same whether or not the email has an account (see password_reset.py).
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter a valid email, like you@example.org.");
    setLoading(true);
    const response = await postJson("/api/forgot-password", { email });
    setLoading(false);
    if (response.ok) setSent(true);
    else setError("Something went wrong. Please try again.");
  }

  return (
    <AuthShell title="Reset your password" error={error}>
      {sent ? (
        <div className="form-note" role="status">
          If <strong>{email}</strong> has a SupplyWatch account, we've emailed a link to reset the
          password. It works for 1 hour. Check your spam folder too.
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <p>Enter the email you signed up with and we'll send you a link to choose a new password.</p>
          <Field id="email" label="Email" type="email" value={email}
                 onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <button type="submit" className="btn btn-filled btn-block" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p><Link to="/login">Back to log in</Link></p>
    </AuthShell>
  );
}
