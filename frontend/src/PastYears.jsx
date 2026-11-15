import { useState } from "react";
import { getJson } from "./api";
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
        ["/api/past", "/api/backtest"].map(getJson));
      setEvents(past.events);
      setReplay(test);
    } catch {
      setError("Couldn't load past years. Please try again.");
    }
  }

  // A distinct card with a one-line pitch and one clear button; the details open below it.
  return (
    <section className="past-card surface" aria-labelledby="past-title">
      <div className="past-card-head">
        <div>
          <h2 id="past-title">Past years</h2>
          <p className="section-caption">
            See how SupplyWatch would have caught the 2022-23 egg shortage, plus real U.S. food
            shortages since 2016 with their sources and real prices.
          </p>
        </div>
        <button className="btn btn-outline" onClick={toggle} aria-expanded={open}>
          {open ? "Hide past years" : "Open the replay"}
        </button>
      </div>
      {open && (
        <div className="past-body">
          {error && <p className="error">{error}</p>}
          {!events && !error && <p>Loading…</p>}
          {replay && (
            <>
              <h3>Would SupplyWatch have warned in time?</h3>
              <ReplayPanel result={replay} />
            </>
          )}
          {events && (
            <>
              <h3>Food shortages since 2016</h3>
              <p className="small">
                Major US food shortages that made national news, each with its source. Charts show real
                national average prices (U.S. Bureau of Labor Statistics) from a year before to six months after.
              </p>
              {events.map((event) => <PastEvent key={event.id} event={event} />)}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function PastEvent({ event }) {
  return (
    <article className="past-event surface">
      <h4 className="past-event-title">{event.title}</h4>
      <p className="small">
        {event.kind === "shortage" ? "Shortage" : "Price spike"} · started {event.start} ·
        widely reported {event.reported} · cause: {event.cause}
      </p>
      <p>{event.summary}</p>
      {event.price_charts.length > 0 ? (
        event.price_charts.map((chart) => (
          <div key={chart.key}>
            <h5>{chart.name}: {chart.price_label ?? `price per ${chart.unit}`}</h5>
            <PriceChart data={chart.prices} height={160} money={!chart.price_label} />
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
