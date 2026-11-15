import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell, Field, postJson } from "./authForm";

// Check the form in the browser first, so people get instant, specific messages.
// The server checks everything again (never trust the browser alone).
function validate({ name, email, password }) {
  const errors = {};
  if (!name.trim()) errors.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email, like you@example.org.";
  if (password.length < 8) errors.password = "Your password needs at least 8 characters.";
  return errors;
}

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(event) {
    event.preventDefault();               // stop the browser's own page reload
    const found = validate(form);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    const response = await postJson("/api/signup", form);
    setLoading(false);
    if (response.ok) return navigate("/app");   // the server already set the login cookie
    setServerError(response.status === 409
      ? <>That email is already registered. <Link to="/login">Log in instead?</Link></>
      : "Something went wrong. Please try again.");
  }

  return (
    <AuthShell title="Create your free account" error={serverError}>
      <form onSubmit={handleSubmit} noValidate>
        <Field id="name" label="Name" value={form.name} onChange={update("name")}
               error={errors.name} autoComplete="name" />
        <Field id="email" label="Email" type="email" value={form.email} onChange={update("email")}
               error={errors.email} autoComplete="email" />
        <Field id="password" label="Password" type="password" value={form.password} onChange={update("password")}
               error={errors.password} autoComplete="new-password" hint="At least 8 characters." />
        <button type="submit" className="btn btn-filled btn-block" disabled={loading}>
          {loading ? "Creating your account…" : "Sign up free"}
        </button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </AuthShell>
  );
}
