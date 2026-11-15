import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LandingFaq from "./LandingFaq";
import RiskBadge from "./RiskBadge";
import "./landing.css";

const PROBLEMS = [
  ["Small buyers find out too late", "By the time a shortage is in the news, big buyers have already stocked up and prices have jumped."],
  ["Big companies have tools. Small ones have nothing.", "Supply-risk software costs thousands a year. Food banks and corner stores can't pay that."],
  ["Food banks can't afford empty shelves", "When a staple runs out, families who depend on it go without."],
];

// Simple line icons (inline SVG, so no icon library to load or explain).
const icon = (path) => (
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);
const STEPS = [
  [icon(<><circle cx="12" cy="12" r="3" /><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /></>),
   "Watch public data", "Prices, news, drought maps and shipping strain, from free government and public sources."],
  [icon(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
   "Score the risk", "Each food gets a 0–100 score: Low, Medium or High. Plain arithmetic, no AI."],
  [icon(<path d="M4 5h16v11H8l-4 4z" />),
   "Explain why", "A short plain-English summary of what pushed the score up, with links to the sources."],
  [icon(<path d="M5 12l5 5L20 7" />),
   "Suggest what to do", "Real alternate suppliers and substitute foods for anything that looks risky."],
];

// "2022-03" -> "March 2022"
const monthName = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

export default function LandingPage() {
  // The proof card uses the REAL replay result from the backend, never a typed-in number.
  // The hero preview shows the demo scenario's top 3 foods, fetched from the same
  // backend the demo uses (and labeled "SAMPLE DATA" on screen).
  const [replay, setReplay] = useState(null);
  const [preview, setPreview] = useState([]);
  useEffect(() => {
    const get = (path) => fetch(path).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    get("/api/backtest").then(setReplay);
    get("/api/items?demo=1").then((items) =>
      setPreview((items ?? []).filter((i) => i.score !== null).sort((a, b) => b.score - a.score).slice(0, 3)));
  }, []);

  return (
    <div className="landing">
      <nav className="landing-nav" aria-label="Main">
        <Link to="/" className="landing-logo">SupplyWatch</Link>
        <div className="landing-nav-links">
          <a href="#how">How it works</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="landing-nav-buttons">
          <Link to="/login" className="btn btn-outline">Log in</Link>
          <Link to="/signup" className="btn btn-filled">Sign up free</Link>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-text">
            <h1>Know about food shortages before the shelves go empty.</h1>
            <p className="hero-sub">Free early warning for food banks and small food businesses.
              SupplyWatch watches public data and flags foods that are starting to look risky.</p>
            <div className="hero-buttons">
              <Link to="/signup" className="btn btn-filled btn-large">Sign up free</Link>
              <Link to="/app?demo=1" className="btn btn-outline btn-large">Try the demo</Link>
            </div>
            <p className="small">The demo needs no account.</p>
          </div>
          <div className="hero-preview" aria-label="Example of the dashboard, using sample data">
            <span className="sample-tag">SAMPLE DATA</span>
            {preview.length === 0 && <p className="small">Loading the sample…</p>}
            {preview.map((food) => (
              <div key={food.name} className="preview-row">
                <span className="preview-name">{food.name}</span>
                <span className="preview-score">{food.score}<span className="small">/100</span></span>
                <RiskBadge band={food.band} />
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <h2>The problem</h2>
          <div className="card-row">
            {PROBLEMS.map(([title, text]) => (
              <div key={title} className="landing-card"><h3>{title}</h3><p>{text}</p></div>
            ))}
          </div>
        </section>

        <section id="how" className="landing-section">
          <h2>How it works</h2>
          <ol className="steps">
            {STEPS.map(([svg, title, text]) => (
              <li key={title} className="landing-card step">
                <span className="step-icon">{svg}</span><h3>{title}</h3><p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {replay && (
          <section className="landing-section">
            <div className="proof-card">
              <p className="proof-label">Tested on a real shortage: the {replay.event}</p>
              <p className="proof-big">
                Medium warning <strong>{replay.lead_time_months_yellow} months early</strong>
              </p>
              <p>Replaying the real data month by month, SupplyWatch would have shown eggs as Medium risk
                in {monthName(replay.first_yellow)}, {replay.lead_time_months_yellow} months before the shortage
                was reported. It only turned High in {monthName(replay.first_red)}, the same month it was
                reported. One event is a demonstration, not proof.</p>
            </div>
          </section>
        )}

        <section className="landing-section">
          <div className="limits-box">
            <h2>What SupplyWatch is and isn't</h2>
            <ul>
              <li><strong>It is</strong> an early warning aid that points you at foods worth a closer look.</li>
              <li><strong>It isn't</strong> a forecast. It can't tell you when or whether a shortage will happen.</li>
              <li>Scores use <strong>reasoned weights</strong>, not weights fitted to past data.</li>
              <li>The AI only <strong>rates news headlines and writes the explanations</strong>. It never sets the score.</li>
            </ul>
          </div>
        </section>

        <LandingFaq />

        <section className="cta-band">
          <h2>Start watching your supplies today.</h2>
          <div className="hero-buttons">
            <Link to="/signup" className="btn btn-light btn-large">Sign up free</Link>
            <Link to="/app?demo=1" className="btn btn-on-dark btn-large">Try the demo</Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>SupplyWatch · a student project · Data: U.S. Bureau of Labor Statistics, GDELT,
          U.S. Drought Monitor, New York Fed</p>
      </footer>
    </div>
  );
}
