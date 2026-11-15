import { useState } from "react";
import { getJson } from "./api";
import PriceLine from "./PriceLine";
import ReplayPanel from "./ReplayPanel";

// "Replay and past years": the egg replay test (the same annotated chart as the landing
// page) and real past US food shortages with sources and real BLS prices.
// Closed until asked for, so the main page stays about today.
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

  // The replayed food's real price chart, found in the past-events data (never typed in).
  const reported = replay?.shortage_reported.date.slice(0, 7);
  const replayPrices = events?.flatMap((e) => e.price_charts).find((c) => c.key === replay?.target_item &&
    c.prices.some((p) => p.month === replay.first_yellow) && c.prices.some((p) => p.month === reported))?.prices;

  return (
    <section className="replay-section" aria-labelledby="past-title">
      <div className="replay-head">
        <div>
          <h2 id="past-title">Replay: the 2022–23 egg shortage</h2>
          <p className="caption">
            Would SupplyWatch have warned in time? The real data, month by month, plus real U.S. food
            shortages since 2016 with their sources and prices.
          </p>
        </div>
        <button className="btn btn-outline" onClick={toggle} aria-expanded={open}>
          {open ? "Close the replay" : "Open the replay"}
        </button>
      </div>
      {open && (
        <div className="past-body">
          {error && <p className="error">{error}</p>}
          {!events && !error && <p>Loading…</p>}
          {replay && events && <ReplayPanel result={replay} prices={replayPrices} />}
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
    <article className="past-event">
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
            <PriceLine data={chart.prices} height={150} money={!chart.price_label} />
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
