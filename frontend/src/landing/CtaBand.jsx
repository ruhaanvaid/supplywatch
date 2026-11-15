import { Link } from "react-router-dom";

// The last push: a deep-green rounded band with the two buttons again.
// White and pale-green text on the green pass AA contrast (9.6:1 and 7.5:1).
export default function CtaBand() {
  return (
    <section className="cta-band" aria-labelledby="cta-title">
      <h2 id="cta-title">Start watching your supplies today.</h2>
      <div className="hero-buttons">
        <Link to="/signup" className="btn btn-light btn-large">Sign up free</Link>
        <Link to="/app?demo=1" className="btn btn-on-dark btn-large">Try the demo</Link>
      </div>
      <p className="cta-note">Free. The demo needs no account.</p>
    </section>
  );
}
