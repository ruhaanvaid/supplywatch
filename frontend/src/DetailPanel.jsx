import { useEffect, useRef } from "react";
import PriceChart from "./PriceChart";
import ScoreGauge from "./ScoreGauge";
import SignalBars from "./SignalBars";
import WhatToDo from "./WhatToDo";

// Everything about one food. On a laptop it sits BESIDE the cards; on a phone the
// same element becomes a sheet that slides up from the bottom (see App.css).
export default function DetailPanel({ detail, onClose }) {
  const panelRef = useRef(null);

  // When a food opens: move keyboard focus into the panel (so keyboard and screen
  // reader users land on it), and let the Escape key close it.
  useEffect(() => {
    panelRef.current?.focus();
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detail?.key, onClose]);

  return (
    <>
      {/* Dark backdrop behind the phone sheet; tapping it closes the sheet. Hidden on laptops. */}
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="detail-panel" ref={panelRef} tabIndex={-1} aria-labelledby="detail-title">
        {!detail ? (
          <p>Loading…</p>
        ) : (
          <>
            <div className="detail-head">
              <h2 id="detail-title"><span aria-hidden="true">{detail.emoji}</span> {detail.name}</h2>
              <button className="close-button" onClick={onClose} aria-label="Close details">×</button>
            </div>
            <ScoreGauge score={detail.score} band={detail.band} />

            <h3>{detail.price_label ?? `Price per ${detail.unit}`}</h3>
            <PriceChart data={detail.price_history} height={180} money={!detail.price_label} />

            <h3>Why this score</h3>
            <SignalBars signals={detail.signals} weights={detail.weights} />
            <div className="explanation-box">
              <p>{detail.explanation.text}</p>
              <p className="small">Written by: {detail.explanation.source}</p>
            </div>

            <h3>Headlines used</h3>
            {detail.headlines.length === 0 ? (
              <p className="small">No relevant headlines in the last 30 days.</p>
            ) : (
              <ul className="headlines">
                {detail.headlines.map((h) => (
                  <li key={h.headline}>
                    <span className="small">{h.date}</span>{" "}
                    {h.source_url ? <a href={h.source_url} target="_blank" rel="noreferrer">{h.headline}</a>
                                  : <>{h.headline} <span className="small">(sample headline, no link)</span></>}
                    <span className="small"> · severity {h.severity}/5</span>
                  </li>
                ))}
              </ul>
            )}

            <WhatToDo suppliers={detail.suppliers} substitutes={detail.substitutes} />
          </>
        )}
      </aside>
    </>
  );
}
