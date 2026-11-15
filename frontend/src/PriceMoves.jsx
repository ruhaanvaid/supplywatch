import { useEffect, useRef } from "react";
import { percent } from "./chartMath";

// "Major price moves" under the chart, newest first. Each entry: month, arrow,
// % change, from -> to price, 1-2 sentences, and the evidence they rest on.
// Clicking an entry highlights its marker on the chart (and the other way round).
export default function PriceMoves({ report, money, activeMonth, onPick }) {
  const listRef = useRef(null);
  const price = (value) => (money ? `$${value.toFixed(2)}` : value.toFixed(1));

  // When a chart marker is clicked, bring its list entry into view.
  useEffect(() => {
    listRef.current?.querySelector(`[data-month="${activeMonth}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeMonth]);

  if (report.moves.length === 0) return <p className="small">No major price changes in this period.</p>;
  return (
    <>
      <p className="small">
        A month counts as a major move if the price changed by at least {percent(report.threshold).replace("+", "")}:
        the bigger of 3% and twice this food's usual monthly change ({percent(report.typical).replace("+", "")}).
      </p>
      <ol className="moves" ref={listRef}>
        {report.moves.map((move) => {
          const up = move.change > 0;
          const cited = move.evidence.filter((e) => move.explanation.evidence_ids.includes(e.id));
          return (
            <li key={move.month} data-month={move.month} className={activeMonth === move.month ? "active" : ""}>
              <button type="button" className="move-head" aria-pressed={activeMonth === move.month}
                      onClick={() => onPick(activeMonth === move.month ? null : move.month)}>
                <span>{move.month_name}</span>
                <span className={up ? "move-up" : "move-down"}>
                  <span aria-hidden="true">{up ? "▲" : "▼"}</span> {up ? "Up" : "Down"} {percent(move.change)}
                </span>
                <span className="small">{price(move.from_price)} → {price(move.to_price)}</span>
              </button>
              <p>{move.explanation.text}</p>
              {cited.length > 0 && (
                <ul className="evidence-chips" aria-label="Evidence from our data">
                  {cited.map((e) => (
                    <li key={e.id}>
                      <strong>{e.kind}:</strong>{" "}
                      {e.url ? <a href={e.url} target="_blank" rel="noreferrer">{e.label}</a> : e.label}
                    </li>
                  ))}
                </ul>
              )}
              <p className="small">
                Written by: {move.explanation.source}
                {move.explanation.confidence && ` · confidence: ${move.explanation.confidence}`}
              </p>
            </li>
          );
        })}
      </ol>
    </>
  );
}
