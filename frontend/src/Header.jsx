import { Link } from "react-router-dom";

// The slim bar at the top of the dashboard.
// Left: the wordmark (click = reset the dashboard). Right: who you are, Log out,
// and a badge saying which data you're looking at and how fresh it is.

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
        {/* A real link, so it works with the keyboard, middle-click and screen readers.
            Keyboard focus shows as an underline here instead of the usual box (see App.css). */}
        <a href={demo ? "/app?demo=1" : "/app"} className="wordmark"
           onClick={(e) => { e.preventDefault(); onHome(); }}>SupplyWatch</a>

        <nav className="topbar-right" aria-label="Account">
          {status && (
            // The badge uses the green accent, never a risk color, so "sample" can't be read as "medium risk".
            // title= shows the full description on hover.
            <span className={`data-badge ${isLive ? "live" : "sample"}`} title={status.label}>
              <span className="data-badge-dot" aria-hidden="true" />
              {demo ? "DEMO · SAMPLE DATA" : isLive ? "LIVE DATA" : "SAMPLE DATA"}
              <span className="data-badge-date">· {formatDate(status.as_of)}</span>
            </span>
          )}
          {user && <span className="topbar-user">{user.name}</span>}
          {user && <button className="btn btn-outline btn-small" onClick={onLogOut}>Log out</button>}
          {demo && <Link to="/signup" className="btn btn-filled btn-small">Sign up free</Link>}
        </nav>
      </div>
    </header>
  );
}
