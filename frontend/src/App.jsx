import { useEffect, useState } from "react";
import DetailPanel from "./DetailPanel";
import ReplayPanel from "./ReplayPanel";
import RiskGrid from "./RiskGrid";
import "./App.css";

// Fetch JSON from our backend. Vite forwards /api to FastAPI (see vite.config.js).
async function getJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

export default function App() {
  const [status, setStatus] = useState(null);      // sample/live banner info
  const [items, setItems] = useState([]);          // the 8 tiles
  const [selectedKey, setSelectedKey] = useState(null);
  const [detail, setDetail] = useState(null);      // the selected item's full report
  const [replay, setReplay] = useState(null);      // backtest result, when shown
  const [error, setError] = useState(null);

  // On first load: get the banner and the 8 scores, and open the riskiest item.
  useEffect(() => {
    Promise.all([getJson("/api/status"), getJson("/api/items")])
      .then(([statusData, itemData]) => {
        setStatus(statusData);
        setItems(itemData);
        const riskiest = [...itemData].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];
        setSelectedKey(riskiest?.key);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Whenever a different tile is picked, load that item's details.
  useEffect(() => {
    if (!selectedKey) return;
    getJson(`/api/items/${selectedKey}`).then(setDetail).catch((e) => setError(e.message));
  }, [selectedKey]);

  function toggleReplay() {
    if (replay) return setReplay(null);
    getJson("/api/backtest").then(setReplay).catch((e) => setError(e.message));
  }

  return (
    <div className="page">
      <header>
        <h1>SupplyWatch</h1>
        <p className="subtitle">Shortage early warning for Southern California food banks</p>
        {status && (
          <div className={`banner ${status.mode}`}>
            {status.label} · as of {status.as_of} · AI: {status.llm}
          </div>
        )}
      </header>

      {error && <p className="error">Could not load data: {error}. Is the backend running?</p>}

      <RiskGrid items={items} selectedKey={selectedKey} onSelect={setSelectedKey} />

      <button className="replay-button" onClick={toggleReplay}>
        {replay ? "Hide replay" : "Replay: 2022–23 egg shortage"}
      </button>
      {replay && <ReplayPanel result={replay} />}

      {detail && <DetailPanel detail={detail} />}
    </div>
  );
}
