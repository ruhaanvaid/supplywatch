import { Link } from "react-router-dom";

// The one closing band in Field green: one plain sentence, the two buttons, left-aligned
// like the rest of the page (not a centered slogan). White on Field is 7.7:1.
export default function ClosingBand() {
  return (
    <section className="closing" aria-labelledby="closing-title">
      <div className="closing-inner">
        <h2 id="closing-title">Open the demo and see this month's scores for 33 foods.</h2>
        <div className="hero-buttons">
          <Link to="/app?demo=1" className="btn btn-on-field">Try the demo (no account)</Link>
          <Link to="/signup" className="btn btn-outline-on-field">Sign up free</Link>
        </div>
      </div>
    </section>
  );
}
