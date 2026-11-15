import { useState } from "react";
import { formatValue, layout, monthLabel } from "./chartMath";

// THE chart of the site: a thin price line, annotated like a newspaper graphic.
// One component for every size: the landing hero, the replay, the detail panel,
// and (compact) the small lines in each row. Plain SVG + HTML, no chart library.
//
// The line is SVG stretched to the box (thin at any size thanks to non-scaling-stroke).
// Everything with text or a click target is HTML placed by percentage on top, so
// labels stay readable on a phone and markers are real, focusable buttons.
//
//   data         [{month, price}] oldest first
//   notes        [{month, label}] dated annotations with a hairline down to the line
//   markers      [{month, text, label}] clickable major moves; activeMonth + onPick
//   guides       [{value, label}] dashed horizontal lines (e.g. the Medium threshold)
export default function PriceLine({ data, compact = false, money = true, height = 240, label,
                                    notes = [], markers = [], guides = [], activeMonth, onPick, caption }) {
  const [hover, setHover] = useState(null);   // index of the month under the pointer
  if (!data || data.length < 2) return compact ? <span className="pl-none">No price data</span> : <p className="small">No price history available.</p>;

  const values = data.map((d) => d.price);
  const { low, high, x, y } = layout([...values, ...guides.map((g) => g.value)], notes.length ? 0.7 : 0);   // notes get room above the line
  const at = (month) => data.findIndex((d) => d.month === month);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = values.length - 1;
  const show = (v) => formatValue(v, money);
  const summary = label ?? `From ${show(values[0])} in ${monthLabel(data[0].month)} to ${show(values[last])} in ${monthLabel(data[last].month)}`;

  // Pointer position -> nearest month, for the readout. (Keyboard users get the same
  // facts from the label, the axis and the focusable markers.)
  const track = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    setHover(Math.round(((e.clientX - box.left) / box.width) * last));
  };

  // Compact lines sit inside row buttons, where only inline elements are allowed: use spans.
  const Wrap = compact ? "span" : "figure", Plot = compact ? "span" : "div";
  return (
    <Wrap className={`priceline${compact ? " compact" : ""}`}>
      <Plot className="pl-plot" style={{ height }} onPointerMove={compact ? undefined : track} onPointerLeave={() => setHover(null)}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={summary}>
          {!compact && [low, high].map((v) => <line key={v} className="pl-grid" x1="0" x2="100" y1={y(v)} y2={y(v)} />)}
          {guides.map((g) => <line key={g.value} className="pl-guide" x1="0" x2="100" y1={y(g.value)} y2={y(g.value)} />)}
          {notes.map((n) => at(n.month) >= 0 && <line key={n.month} className="pl-note-line" x1={x(at(n.month))} x2={x(at(n.month))} y1="0" y2={y(values[at(n.month)])} />)}
          <polyline className="pl-line" points={points} pathLength="100" />
        </svg>
        <span className="pl-dot" style={{ left: `${x(last)}%`, top: `${y(values[last])}%` }} />

        {!compact && [low, high].map((v) => <span key={v} className="pl-axis num" style={{ top: `${y(v)}%` }}>{show(v)}</span>)}
        {guides.map((g) => <span key={g.value} className="pl-guide-label" style={{ top: `${y(g.value)}%` }}>{g.label}</span>)}
        {notes.map((n, k) => at(n.month) >= 0 && (
          // Notes past the middle hang to the LEFT of their line (anchored by `right`, so they keep their width).
          <span key={n.month} className={`pl-note${x(at(n.month)) > 55 ? " flip" : ""}`}
                style={{ top: `calc(var(--note-row) * ${k})`, ...(x(at(n.month)) > 55 ? { right: `${100 - x(at(n.month))}%` } : { left: `${x(at(n.month))}%` }) }}>
            {n.label}
          </span>
        ))}
        {notes.map((n) => at(n.month) >= 0 && <span key={`d${n.month}`} className="pl-note-dot" style={{ left: `${x(at(n.month))}%`, top: `${y(values[at(n.month)])}%` }} />)}
        {markers.map((m) => at(m.month) >= 0 && (
          <button key={m.month} type="button" aria-pressed={activeMonth === m.month}
                  className={`pl-marker ${m.up ? "up" : "down"}${x(at(m.month)) > 85 ? " at-right" : x(at(m.month)) < 15 ? " at-left" : ""}`}
                  aria-label={m.label} style={{ left: `${x(at(m.month))}%`, top: `${y(values[at(m.month)])}%` }}
                  onClick={() => onPick?.(m.month)}>
            <span aria-hidden="true">{m.text}</span>
          </button>
        ))}
        {hover !== null && hover >= 0 && hover <= last && (
          <span className="pl-readout num" style={{ left: `${x(hover)}%` }} aria-hidden="true">
            {monthLabel(data[hover].month)} · {show(values[hover])}
          </span>
        )}
      </Plot>
      {!compact && (
        <div className="pl-xaxis num" aria-hidden="true">
          <span>{monthLabel(data[0].month)}</span><span>{monthLabel(data[last].month)}</span>
        </div>
      )}
      {/* Honesty: the scale is zoomed in to the prices, which makes changes look bigger. Say so. */}
      {(caption || (!compact && low > 0)) && (
        <figcaption className="pl-caption">
          {caption}{caption && " "}
          {!compact && low > 0 && `The ${money ? "price" : ""} scale doesn't start at ${money ? "$0" : "0"}, so changes look bigger than they are.`.replace("The  scale", "The scale")}
        </figcaption>
      )}
    </Wrap>
  );
}
