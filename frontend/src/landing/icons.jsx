// Small line icons for the landing page, as inline SVG paths (no icon library,
// nothing to download). Decorative: every icon sits next to words that say the same,
// so screen readers skip them (aria-hidden).
const PATHS = {
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  speech: "M4 5h16v11H8l-4 4z",
  check: "M5 12l5 5L20 7",
  cross: "M6 6l12 12M18 6L6 18",
  clock: "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  scale: "M12 4v16M5 20h14M6 8l-3 6h6zM18 8l-3 6h6zM6 8h12",
  basket: "M3 10h18l-2 9H5zM8 10l4-6 4 6",
  price: "M20 13l-7 7-9-9V4h7zM8 8h.01",
  news: "M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2",
  ship: "M3 17l2 3h14l2-3zM5 17V11h14v6M9 11V7h6v4M12 3v4",
  menu: "M4 7h16M4 12h16M4 17h16",
  chevron: "M9 6l6 6-6 6",
};

export default function Icon({ name, size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="icon">
      <path d={PATHS[name]} />
    </svg>
  );
}
