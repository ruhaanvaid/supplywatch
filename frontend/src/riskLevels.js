// ONE table that defines how each risk level looks everywhere on the page,
// so "High" can never be red in one place and orange in another.
// The backend sends colors (green/yellow/red/grey); people read words.
export const RISK_LEVELS = {
// "id" is the short word used in the page address for filters (?risk=high).
  red: { id: "high", label: "High", shape: "▲", className: "risk-high" },
  yellow: { id: "medium", label: "Medium", shape: "◆", className: "risk-medium" },
  green: { id: "low", label: "Low", shape: "●", className: "risk-low" },
  grey: { id: "none", label: "Not enough data", shape: "○", className: "risk-none" },
};

// Sort order: high risk first, "not enough data" last.
export const BAND_ORDER = { red: 0, yellow: 1, green: 2, grey: 3 };

export function levelFor(band) {
  return RISK_LEVELS[band] ?? RISK_LEVELS.grey;
}
