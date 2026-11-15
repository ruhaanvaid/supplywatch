import { Link } from "react-router-dom";
import logo from "./assets/supplywatch-logo.svg";

// The dashboard's slim top bar: the logo (the real file, untouched; click = reset the
// dashboard), a badge saying which data you're seeing and how fresh it is, and your account.

// "2026-10-31" -> "Oct 31, 2026". Built from its parts on purpose:
// new Date("2026-10-31") is read as UTC midnight, which shows as Oct 30 in California.
export function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Header({ status, onHome, user, demo, onLogOut }) {
  const isLive = status?.mode === "live" && !demo;
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a href={demo ? "/app?demo=1" : "/app"} className="logo-link" onClick={(e) => { e.preventDefault(); onHome(); }}>
          <img src={logo} alt="SupplyWatch, back to the top of the dashboard" className="logo" />
        </a>
        <nav className="account" aria-label="Account">
          {status && (
            // Field green, never a risk color, so "sample" can't be mistaken for "medium risk".
            <span className={`data-badge ${isLive ? "live" : "sample"}`} title={status.label}>
              {demo ? "Demo · sample data" : isLive ? "Live data" : "Sample data"}
              <span className="num"> · {formatDate(status.as_of)}</span>
            </span>
          )}
          {user && <span className="account-name">{user.name}</span>}
          {user && <button className="btn btn-outline btn-small" onClick={onLogOut}>Log out</button>}
          {demo && <Link to="/signup" className="btn btn-filled btn-small">Sign up free</Link>}
        </nav>
      </div>
    </header>
  );
}
