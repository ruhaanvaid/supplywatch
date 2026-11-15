import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/supplywatch-logo.svg";
import Icon from "./icons";

// Slim top bar: the logo (the real file, untouched), two page links, Log in, Sign up.
// On phones the links fold into a Menu button; aria-expanded tells screen readers
// whether it's open, and picking a link closes it.
export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="topbar">
      <nav className="topbar-inner" aria-label="Main">
        <Link to="/" className="logo-link"><img src={logo} alt="SupplyWatch" className="logo" /></Link>
        <button type="button" className="menu-button" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>
          <Icon name="menu" size={20} /> Menu
        </button>
        <div id="site-menu" className={`site-menu${open ? " open" : ""}`}>
          <a href="#how" onClick={close}>How it works</a>
          <a href="#faq" onClick={close}>FAQ</a>
          <Link to="/login" className="btn btn-outline btn-small">Log in</Link>
          <Link to="/signup" className="btn btn-filled btn-small">Sign up free</Link>
        </div>
      </nav>
    </header>
  );
}
