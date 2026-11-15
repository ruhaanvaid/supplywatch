import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell, Field, postJson } from "./authForm";

// Step 2 of "forgot password": opened from the link in the email (?token=...).
// Choose a new password; on success you're logged in and taken to the dashboard.
export default function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError(null);
    const found = {};
    if (form.password.length < 8) found.password = "Your new password needs at least 8 characters.";
    if (form.confirm !== form.password) found.confirm = "The two passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    const response = await postJson("/api/reset-password", { token, password: form.password });
    setLoading(false);
    if (response.ok) return navigate("/app");    // the server already logged you in
    setServerError(response.status === 400
      ? <>This reset link has expired or was already used. <Link to="/forgot-password">Get a new one</Link>.</>
      : "Something went wrong. Please try again.");
  }

  if (!token) {
    return (
      <AuthShell title="Choose a new password"
                 error={<>This page needs the link from the reset email. <Link to="/forgot-password">Get one here</Link>.</>} />
    );
  }
  return (
    <AuthShell title="Choose a new password" error={serverError}>
      <form onSubmit={handleSubmit} noValidate>
        <Field id="password" label="New password" type="password" value={form.password} onChange={update("password")}
               error={errors.password} autoComplete="new-password" hint="At least 8 characters." />
        <Field id="confirm" label="Type it again" type="password" value={form.confirm} onChange={update("confirm")}
               error={errors.confirm} autoComplete="new-password" />
        <button type="submit" className="btn btn-filled btn-block" disabled={loading}>
          {loading ? "Saving…" : "Save new password"}
        </button>
      </form>
    </AuthShell>
  );
}
