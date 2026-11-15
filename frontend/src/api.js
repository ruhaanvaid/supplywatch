// Talking to the backend from the dashboard.

// Demo mode = the page address has ?demo=1 ("Try the demo" button).
export const isDemo = () => new URLSearchParams(window.location.search).get("demo") === "1";

// In demo mode, every API call also gets ?demo=1, so the backend answers with
// the sample scenario and doesn't ask for a login.
export function apiPath(path) {
  return isDemo() ? `${path}${path.includes("?") ? "&" : "?"}demo=1` : path;
}

// Fetch JSON. A 401 ("not logged in") becomes a special error the dashboard
// turns into a trip to the login page.
export async function getJson(path) {
  const response = await fetch(apiPath(path));
  if (response.status === 401) throw new Error("NOT_LOGGED_IN");
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}
