// Top of the page: what this tool is, and a badge that says whether the data is real.

// "2026-10-31" -> "Oct 31, 2026". We build the date from its parts on purpose:
// new Date("2026-10-31") is read as UTC midnight, which shows as Oct 30 in California.
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function Header({ status, onHome }) {
  const isLive = status?.mode === "live";
  return (
    <header className="header">
      <div>
        <h1 className="header-title">
          {/* A real link to "/", so it also works with the keyboard, middle-click and screen
              readers. A normal click resets the page without reloading it. */}
          <a href="/" className="home-link" onClick={(e) => { e.preventDefault(); onHome(); }}>SupplyWatch</a>
        </h1>
        <p className="header-tagline">Early warning for food supply shortages</p>
      </div>

      {status && (
        <div className="header-meta">
          {/* title= shows the full explanation when you hover over the badge */}
          <span className={`data-badge ${isLive ? "live" : "sample"}`} title={status.label}>
            <span className="data-badge-dot" aria-hidden="true" />
            {isLive ? "LIVE DATA" : "SAMPLE DATA"}
          </span>
          <span className="header-date">Data as of {formatDate(status.as_of)}</span>
        </div>
      )}
    </header>
  );
}
