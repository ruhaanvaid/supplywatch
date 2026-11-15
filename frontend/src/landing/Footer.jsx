import { Link } from "react-router-dom";

// Quiet footer: what this is, where the data comes from, and the three ways in.
export default function Footer() {
  return (
    <footer className="site-footer">
      <p>SupplyWatch, a student project.</p>
      <p>Data: U.S. Bureau of Labor Statistics · GDELT · U.S. Drought Monitor · New York Fed.</p>
      <nav aria-label="Footer">
        <Link to="/login">Log in</Link>
        <Link to="/signup">Sign up</Link>
        <Link to="/app?demo=1">Try the demo</Link>
      </nav>
    </footer>
  );
}
