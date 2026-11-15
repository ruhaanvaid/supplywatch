import { useCallback, useEffect, useState } from "react";
import DetailPanel from "./DetailPanel";
import Footer from "./Footer";
import Header from "./Header";
import HighRiskAlert from "./HighRiskAlert";
import PastYears from "./PastYears";
import RiskGrid from "./RiskGrid";
import { BAND_ORDER } from "./riskLevels";
import "./App.css";

// Fetch JSON from our backend. Vite forwards /api to FastAPI (see vite.config.js).
async function getJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

// "Unusual" = medium (yellow) or high (red) risk. Calm foods are only shown when searched.
const isUnusual = (item) => item.band === "red" || item.band === "yellow";

export default function App() {
  const [status, setStatus] = useState(null);      // sample/live badge info
  const [items, setItems] = useState([]);          // every tracked food, with scores
  const [query, setQuery] = useState("");          // what's typed in the search box
  const [selectedKey, setSelectedKey] = useState(null);
  const [detail, setDetail] = useState(null);      // the selected food's full report
  const [error, setError] = useState(null);

  // Get the badge info and all scores, and open the riskiest unusual food (if any).
  // It's a named function so the "Try again" button can call it too.
  const loadData = useCallback(() => {
    setError(null);
    Promise.all([getJson("/api/status"), getJson("/api/items")])
      .then(([statusData, itemData]) => {
        setStatus(statusData);
        setItems(itemData);
        // Auto-open the riskiest food only on wide screens. On a phone the panel is a
        // sheet that would cover the page before the user has seen anything.
        const riskiest = itemData.filter(isUnusual).sort((a, b) => b.score - a.score)[0];
        const wideScreen = window.matchMedia("(min-width: 901px)").matches;
        setSelectedKey(riskiest && wideScreen ? riskiest.key : null);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(loadData, [loadData]);

  // Whenever a different food is picked, clear the old details and load the new ones.
  useEffect(() => {
    setDetail(null);
    if (selectedKey) getJson(`/api/items/${selectedKey}`).then(setDetail).catch((e) => setError(e.message));
  }, [selectedKey]);

  // Closing puts keyboard focus back on the food's card, so keyboard users don't lose their place.
  const closeDetail = useCallback(() => {
    const key = selectedKey;
    setSelectedKey(null);
    setTimeout(() => document.querySelector(`[data-key="${key}"]`)?.focus());
  }, [selectedKey]);

  // The logo goes "home": clear the search, close any open food, back to the top.
  const goHome = useCallback(() => {
    setQuery("");
    setSelectedKey(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Searching shows every matching food; otherwise only the unusual ones.
  // Either way: highest risk first, then highest score within the same level.
  const search = query.trim().toLowerCase();
  const shown = (search
    ? items.filter((item) => item.name.toLowerCase().includes(search))
    : items.filter(isUnusual)
  ).sort((a, b) => BAND_ORDER[a.band] - BAND_ORDER[b.band] || (b.score ?? -1) - (a.score ?? -1));
  const loading = !status && !error;   // nothing has arrived yet

  return (
    <div className="page">
      <Header status={status} onHome={goHome} />

      {/* Plain-language error with a way out, instead of a technical message. */}
      {error && (
        <div className="error-box" role="alert">
          <p><strong>Can't reach SupplyWatch right now.</strong> The server may be waking up
            (this can take up to a minute) or offline.</p>
          <button className="button-secondary" onClick={loadData}>Try again</button>
        </div>
      )}

      {/* Shows only if a food is at HIGH risk; otherwise nothing. */}
      <HighRiskAlert items={items} onSelect={setSelectedKey} />

      {/* With a food open, the page becomes two columns on a laptop (cards | details). */}
      <div className={`layout${selectedKey ? " with-panel" : ""}`}>
        <div className="layout-main">
          <label className="search">
            Search any food
            <input type="search" value={query} placeholder="e.g. milk, beef, rice"
                   onChange={(e) => setQuery(e.target.value)} />
          </label>

          <h2>{search ? `Results for "${query.trim()}"` : "Unusual right now"}</h2>
          {items.length > 0 && shown.length === 0 && (
            <p className="empty-note">
              {search
                ? `No tracked food matches "${query.trim()}". We track ${items.length} foods.`
                : `No unusual food shortages right now. Search above to check any of the ${items.length} foods we track.`}
            </p>
          )}
          <RiskGrid items={shown} loading={loading} selectedKey={selectedKey} onSelect={setSelectedKey} />
        </div>

        {selectedKey && <DetailPanel detail={detail} onClose={closeDetail} />}
      </div>

      <PastYears />
      <Footer status={status} />
    </div>
  );
}
