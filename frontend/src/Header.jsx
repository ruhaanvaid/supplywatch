import { Link } from "react-router-dom";

// Top of the dashboard: the logo, a badge that says what data you're looking at,
// and either your name + "Log out" (logged in) or "Sign up free" (demo).

// "2026-10-31" -> "Oct 31, 2026". We build the date from its parts on purpose:
// new Date("2026-10-31") is read as UTC midnight, which shows as Oct 30 in California.
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function Header({ status, onHome, user, demo, onLogOut }) {
  const isLive = status?.mode === "live";
  const badgeText = demo ? "DEMO · SAMPLE DATA" : isLive ? "LIVE DATA" : "SAMPLE DATA";
  return (
    <header className="header">
      <div>
        <h1 className="header-title">
          {/* A real link, so it also works with the keyboard, middle-click and screen readers.
              A normal click resets the dashboard (clears search, closes the open food). */}
          <a href={demo ? "/app?demo=1" : "/app"} className="home-link"
             onClick={(e) => { e.preventDefault(); onHome(); }}>SupplyWatch</a>
        </h1>
        <p className="header-tagline">Early warning for food supply shortages</p>
      </div>

      <div className="header-meta">
        <div className="header-account">
          {user && <span>Hi, {user.name}</span>}
          {user && <button className="button-secondary" onClick={onLogOut}>Log out</button>}
          {demo && <Link to="/signup" className="button-secondary">Sign up free</Link>}
        </div>
        {status && (
          <>
            {/* title= shows the full explanation when you hover over the badge */}
            <span className={`data-badge ${isLive && !demo ? "live" : "sample"}`} title={status.label}>
              <span className="data-badge-dot" aria-hidden="true" />
              {badgeText}
            </span>
            <span className="header-date">Data as of {formatDate(status.as_of)}</span>
          </>
        )}
      </div>
    </header>
  );
}
