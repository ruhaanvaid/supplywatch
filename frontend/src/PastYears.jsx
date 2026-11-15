import { useState } from "react";
import PriceChart from "./PriceChart";
import ReplayPanel from "./ReplayPanel";

// "Past years": real past US food shortages (each with sources and real BLS prices),
// plus the replay test. Hidden behind one button so the main page stays about today.
export default function PastYears() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState(null);
  const [replay, setReplay] = useState(null);
  const [error, setError] = useState(null);

  // Load only the first time it's opened: most visitors never need this data.
  async function toggle() {
    setOpen(!open);
    if (open || events) return;
    try {
      const [past, test] = await Promise.all(
        ["/api/past", "/api/backtest"].map((path) => fetch(path).then((r) => r.json())));
      setEvents(past.events);
      setReplay(test);
    } catch {
      setError("Couldn't load past years. Please try again.");
    }
  }

  return (
    <section className="past">
      <button className="button-secondary" onClick={toggle} aria-expanded={open}>
        {open ? "Hide past years" : "Past years"}
      </button>
      {open && (
        <div className="past-body">
          <h2>Food shortages since 2016</h2>
          <p className="small">
            Major US food shortages that made national news, each with its source. Charts show real
            national average prices (U.S. Bureau of Labor Statistics) from a year before to six months after.
          </p>
          {error && <p className="error">{error}</p>}
          {!events && !error && <p>Loading…</p>}
          {events?.map((event) => <PastEvent key={event.id} event={event} />)}
          {replay && (
            <>
              <h2>Would SupplyWatch have warned in time?</h2>
              <ReplayPanel result={replay} />
            </>
          )}
        </div>
      )}
    </section>
  );
}

function PastEvent({ event }) {
  return (
    <article className="past-event">
      <h3>{event.title}</h3>
      <p className="small">
        {event.kind === "shortage" ? "Shortage" : "Price spike"} · started {event.start} ·
        widely reported {event.reported} · cause: {event.cause}
      </p>
      <p>{event.summary}</p>
      {event.price_charts.length > 0 ? (
        event.price_charts.map((chart) => (
          <div key={chart.key}>
            <h4>{chart.name}: price per {chart.unit}</h4>
            <PriceChart data={chart.prices} height={160} />
          </div>
        ))
      ) : (
        <p className="small">No government price data for this food in this period, so there's no chart.</p>
      )}
      <p className="small">
        Sources:{" "}
        {event.sources.map((source, i) => (
          <span key={source.url}>
            {i > 0 && " · "}
            <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
          </span>
        ))}
      </p>
    </article>
  );
}
