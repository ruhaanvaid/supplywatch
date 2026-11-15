import { Link } from "react-router-dom";

// Shown for any address we don't have, instead of a blank page.
export default function NotFound() {
  return (
    <main className="page narrow-page">
      <h1>Page not found</h1>
      <p>We couldn't find that page. It may have moved, or the address has a typo.</p>
      <p><Link to="/">Go to the SupplyWatch home page</Link></p>
    </main>
  );
}
