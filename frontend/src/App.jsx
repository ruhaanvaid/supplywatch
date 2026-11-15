import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJson, isDemo } from "./api";
import DetailPanel from "./DetailPanel";
import FoodFilters from "./FoodFilters";
import Footer from "./Footer";
import Header from "./Header";
import HighRiskAlert from "./HighRiskAlert";
import PastYears from "./PastYears";
import RiskGrid from "./RiskGrid";
import SummaryCards from "./SummaryCards";
import VerifyBanner from "./VerifyBanner";
import { filterAndSortFoods, useFoodView } from "./filterAndSortFoods";
import { RISK_LEVELS } from "./riskLevels";
import "./App.css";

// "Unusual" = medium (yellow) or high (red) risk.
const isUnusual = (item) => item.band === "red" || item.band === "yellow";

export default function App() {
  const [status, setStatus] = useState(null);      // sample/live badge info
  const [items, setItems] = useState([]);          // every tracked food, with scores
  const [view, setView] = useFoodView();           // search text, risk filter, sort (kept in the address)
  const [selectedKey, setSelectedKey] = useState(null);
  const [detail, setDetail] = useState(null);      // the selected food's full report
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);          // {name, email} when logged in
  const demo = isDemo();
  const navigate = useNavigate();

  // Any "not logged in" answer sends you to the login page; other errors show the error box.
  const handleError = useCallback((e) => {
    if (e.message === "NOT_LOGGED_IN") navigate("/login", { replace: true });
    else setError(e.message);
  }, [navigate]);

  // Get the badge info and all scores, and open the riskiest unusual food (if any).
  // It's a named function so the "Try again" button can call it too.
  const loadData = useCallback(() => {
    setError(null);
    // Who's logged in? (Skipped in the demo, which needs no account.)
    const who = demo ? Promise.resolve(null) : getJson("/api/me");
    Promise.all([who, getJson("/api/status"), getJson("/api/items")])
      .then(([me, statusData, itemData]) => {
        setUser(me);
        setStatus(statusData);
        setItems(itemData);
        // Auto-open the riskiest food only on wide screens. On a phone the panel is a
        // sheet that would cover the page before the user has seen anything.
        const riskiest = itemData.filter(isUnusual).sort((a, b) => b.score - a.score)[0];
        const wideScreen = window.matchMedia("(min-width: 901px)").matches;
        setSelectedKey(riskiest && wideScreen ? riskiest.key : null);
      })
      .catch(handleError);
  }, [demo, handleError]);
  useEffect(loadData, [loadData]);

  // Whenever a different food is picked, clear the old details and load the new ones.
  useEffect(() => {
    setDetail(null);
    if (selectedKey) getJson(`/api/items/${selectedKey}`).then(setDetail).catch(handleError);
  }, [selectedKey, handleError]);

  // Log out: the server deletes the cookie, then we go back to the landing page.
  const logOut = async () => {
    await fetch("/api/logout", { method: "POST" });
    navigate("/");
  };

  // Closing puts keyboard focus back on the food's card, so keyboard users don't lose their place.
  const closeDetail = useCallback(() => {
    const key = selectedKey;
    setSelectedKey(null);
    setTimeout(() => document.querySelector(`[data-key="${key}"]`)?.focus());
  }, [selectedKey]);

  // "Clear filters": back to all foods, no search (the sort choice stays).
  const clearFilters = () => setView({ q: "", risk: "all" });

  // The logo goes "home": clear search, filter and sort, close any open food, back to the top.
  const goHome = () => {
    setView({ q: "", risk: "all", sort: "risk_desc" });
    setSelectedKey(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Which cards to show: see filterAndSortFoods in foodFilters.js.
  const shown = filterAndSortFoods(items, view.q, view.risk, view.sort);
  const loading = !status && !error;   // nothing has arrived yet
  const chosen = Object.values(RISK_LEVELS).find((level) => level.id === view.risk);
  const heading = !chosen ? "All foods"
    : chosen.id === "none" ? "Foods with not enough data" : `${chosen.label} risk foods`;
  const filtered = view.q.trim() !== "" || view.risk !== "all";

  return (
    <div className="page">
      <Header status={status} onHome={goHome} user={user} demo={demo} onLogOut={logOut} />

      {/* Plain-language error with a way out, instead of a technical message. */}
      {error && (
        <div className="error-box" role="alert">
          <p><strong>Can't reach SupplyWatch right now.</strong> The server may be waking up
            (this can take up to a minute) or offline.</p>
          <button className="button-secondary" onClick={loadData}>Try again</button>
        </div>
      )}

      {/* "Please confirm your email" reminders (logged-in users only). */}
      <VerifyBanner user={user} />

      {/* Shows only if a food is at HIGH risk; otherwise nothing. */}
      <HighRiskAlert items={items} onSelect={setSelectedKey} />

      {/* High / Medium / Low counts. Clicking one filters the cards below. */}
      {items.length > 0 && <SummaryCards items={items} risk={view.risk} onPick={(risk) => setView({ risk })} />}

      {/* With a food open, the page becomes two columns on a laptop (cards | details). */}
      <div className={`layout${selectedKey ? " with-panel" : ""}`}>
        <div className="layout-main">
          <FoodFilters items={items} view={view} setView={setView} />

          <h2>{heading}{view.q.trim() && ` matching "${view.q.trim()}"`}</h2>
          {/* Screen readers hear this number change as filters change. */}
          {items.length > 0 && (
            <p className="small" aria-live="polite">Showing {shown.length} of {items.length} foods.</p>
          )}
          {items.length > 0 && shown.length === 0 && (
            <div className="empty-state">
              <p><strong>No foods match these filters.</strong> Try another risk level or a different search.</p>
              {filtered && <button type="button" className="button-secondary" onClick={clearFilters}>Clear filters</button>}
            </div>
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
