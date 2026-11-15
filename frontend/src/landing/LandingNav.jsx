import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./icons";

// Slim sticky bar. It's see-through white with a blur; once you scroll, a thin
// bottom border appears so it separates from the page. On phones the links and
// buttons fold into a Menu button (aria-expanded tells screen readers if it's open).
export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setMenuOpen(false);   // picking a link closes the phone menu
  return (
    <header className={`landing-nav${scrolled ? " scrolled" : ""}`}>
      <nav className="landing-nav-inner" aria-label="Main">
        <Link to="/" className="wordmark">SupplyWatch</Link>
        <button type="button" className="menu-button" aria-expanded={menuOpen} aria-controls="landing-menu"
                onClick={() => setMenuOpen(!menuOpen)}>
          <Icon name="menu" /> <span>Menu</span>
        </button>
        <div id="landing-menu" className={`landing-menu${menuOpen ? " open" : ""}`}>
          {/* Plain #anchors: the browser scrolls smoothly (scroll-behavior in tokens.css). */}
          <a href="#how" onClick={close}>How it works</a>
          <a href="#faq" onClick={close}>FAQ</a>
          <Link to="/login" className="btn btn-outline btn-small">Log in</Link>
          <Link to="/signup" className="btn btn-filled btn-small">Sign up free</Link>
        </div>
      </nav>
    </header>
  );
}
