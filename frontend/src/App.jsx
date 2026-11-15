import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJson, isDemo } from "./api";
import Controls from "./Controls";
import DetailPanel from "./DetailPanel";
import FoodGroup from "./FoodGroup";
import Footer from "./Footer";
import Header from "./Header";
import PastYears from "./PastYears";
import Spotlight from "./Spotlight";
import StatusLine from "./StatusLine";
import VerifyBanner from "./VerifyBanner";
import { filterAndSortFoods, useFoodView } from "./filterAndSortFoods";
import { GROUPS, groupFor } from "./foodGroups";
import "./App.css";

// The logged-in dashboard, top to bottom:
//   Header -> StatusLine (one sentence + counts) -> Spotlight (top 3)
//   -> Controls (search, chips, sort) -> the ledger, grouped by category -> Replay -> Footer.
// A clicked food opens the DetailPanel beside the page (or as a sheet on a phone).
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

  // Any "not logged in" answer sends you to the login page; other errors show the banner.
  const handleError = useCallback((e) => {
    if (e.message === "NOT_LOGGED_IN") navigate("/login", { replace: true });
    else setError(e.message);
  }, [navigate]);

  // Load who's logged in, the badge info and all scores. Named, so "Try again" can call it.
  const loadData = useCallback(() => {
    setError(null);
    const who = demo ? Promise.resolve(null) : getJson("/api/me");   // the demo needs no account
    Promise.all([who, getJson("/api/status"), getJson("/api/items")])
      .then(([me, statusData, itemData]) => { setUser(me); setStatus(statusData); setItems(itemData); })
      .catch(handleError);
  }, [demo, handleError]);
  useEffect(loadData, [loadData]);

  // Whenever a different food is picked, clear the old details and load the new ones.
  useEffect(() => {
    setDetail(null);
    if (selectedKey) getJson(`/api/items/${selectedKey}`).then(setDetail).catch(handleError);
  }, [selectedKey, handleError]);

  const logOut = async () => { await fetch("/api/logout", { method: "POST" }); navigate("/"); };

  // Closing puts keyboard focus back on the food's card, so keyboard users don't lose their place.
  const closeDetail = useCallback(() => {
    const key = selectedKey;
    setSelectedKey(null);
    setTimeout(() => document.querySelector(`[data-key="${key}"]`)?.focus());
  }, [selectedKey]);

  // The wordmark goes "home": clear search, filter and sort, close any open food, back to the top.
  const goHome = () => {
    setView({ q: "", risk: "all", sort: "risk_desc" });
    setSelectedKey(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Which foods show (filterAndSortFoods), then split into the groups, keeping that order.
  const shown = filterAndSortFoods(items, view.q, view.risk, view.sort);
  const groups = GROUPS.map((group) => ({ group, foods: shown.filter((food) => groupFor(food) === group.id) }))
                       .filter(({ foods }) => foods.length > 0);
  const loading = !status && !error;   // nothing has arrived yet

  return (
    <>
      <Header status={status} onHome={goHome} user={user} demo={demo} onLogOut={logOut} />
      <main className="page">
        {/* One page heading for screen readers and search engines (the wordmark is a link, not a heading). */}
        <h1 className="visually-hidden">SupplyWatch dashboard</h1>
        {/* Data-source-down banner: plain language and a way out. */}
        {error && (
          <div className="error-box" role="alert">
            <p><strong>Can't reach SupplyWatch right now.</strong> The server may be waking up
              (this can take up to a minute) or offline.</p>
            <button className="btn btn-outline btn-small" onClick={loadData}>Try again</button>
          </div>
        )}
        <VerifyBanner user={user} />

        <div className={`layout${selectedKey ? " with-panel" : ""}`}>
          <div className="layout-main">
            {items.length > 0 && (
              <StatusLine items={items} risk={view.risk} onPickRisk={(risk) => setView({ risk })} onSelectFood={setSelectedKey} />
            )}
            <Spotlight items={items} onSelect={setSelectedKey} selectedKey={selectedKey} />

            <h2 className="section-title">All foods</h2>
            <Controls items={items} view={view} setView={setView} />
            {/* Screen readers hear this number change as filters change. */}
            {items.length > 0 && <p className="section-caption" aria-live="polite">Showing {shown.length} of {items.length} foods.</p>}

            {loading && (
              <ul className="ledger" aria-busy="true" aria-label="Loading foods">
                {[1, 2, 3, 4, 5, 6].map((n) => <li key={n} className="row-skeleton"><span /></li>)}
              </ul>
            )}
            {items.length > 0 && shown.length === 0 && (
              <div className="empty-state">
                <p><strong>No foods match these filters.</strong> Try another risk level or a different search.</p>
                <button type="button" className="btn btn-outline btn-small" onClick={() => setView({ q: "", risk: "all" })}>
                  Clear filters
                </button>
              </div>
            )}
            {groups.map(({ group, foods }) => (
              <FoodGroup key={group.id} group={group} foods={foods} selectedKey={selectedKey} onSelect={setSelectedKey} />
            ))}
            <PastYears />
          </div>

          {selectedKey && <DetailPanel detail={detail} onClose={closeDetail} />}
        </div>

        <Footer status={status} />
      </main>
    </>
  );
}
