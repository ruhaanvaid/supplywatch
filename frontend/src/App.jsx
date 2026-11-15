import { useEffect, useState } from "react";
import DetailPanel from "./DetailPanel";
import Header from "./Header";
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

  // On first load: get the badge info and all scores, and open the riskiest unusual food.
  useEffect(() => {
    Promise.all([getJson("/api/status"), getJson("/api/items")])
      .then(([statusData, itemData]) => {
        setStatus(statusData);
        setItems(itemData);
        const riskiest = itemData.filter(isUnusual).sort((a, b) => b.score - a.score)[0];
        setSelectedKey(riskiest ? riskiest.key : null);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Whenever a different food is picked, load its details.
  useEffect(() => {
    if (!selectedKey) return setDetail(null);
    getJson(`/api/items/${selectedKey}`).then(setDetail).catch((e) => setError(e.message));
  }, [selectedKey]);

  // Searching shows every matching food; otherwise only the unusual ones, riskiest first.
  const search = query.trim().toLowerCase();
  const unscored = items.filter((item) => item.score === null).length;   // not enough data
  // Either way: highest risk first, then highest score within the same level.
  const shown = (search
    ? items.filter((item) => item.name.toLowerCase().includes(search))
    : items.filter(isUnusual)
  ).sort((a, b) => BAND_ORDER[a.band] - BAND_ORDER[b.band] || (b.score ?? -1) - (a.score ?? -1));
  const loading = !status && !error;   // nothing has arrived yet

  return (
    <div className="page">
      <Header status={status} />

      {error && <p className="error">Could not load data: {error}. Is the backend running?</p>}

      <label className="search">
        Search any food
        <input type="search" value={query} placeholder="e.g. milk, beef, rice"
               onChange={(e) => setQuery(e.target.value)} />
      </label>

      <h2>{search ? `Results for "${query.trim()}"` : "Unusual right now"}</h2>
      {items.length > 0 && shown.length === 0 && (
        <p className="small">
          {search
            ? `No tracked food matches "${query.trim()}". We track ${items.length} foods.`
            : `No unusual food shortages right now. ${items.length - unscored} of ${items.length} tracked foods look normal` +
              (unscored ? `; ${unscored} ${unscored === 1 ? "doesn't" : "don't"} have enough data to score (search to see which).` : ".")}
        </p>
      )}
      <RiskGrid items={shown} loading={loading} selectedKey={selectedKey} onSelect={setSelectedKey} />

      <PastYears />

      {detail && <DetailPanel detail={detail} />}
    </div>
  );
}
