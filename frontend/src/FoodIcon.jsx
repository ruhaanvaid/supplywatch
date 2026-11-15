// One simple line icon per food group (inline SVG: no icon library, no images).
// Calmer than emoji and it looks the same on every device. Decorative only:
// the food's name is always written next to it, so screen readers skip it.
const PATHS = {
  // an apple with a leaf
  produce: "M12 7c-1-2-3-3-5-2-3 1-3 5-2 8 1 4 3 7 5 7 1 0 1-1 2-1s1 1 2 1c2 0 4-3 5-7 1-3 1-7-2-8-2-1-4 0-5 2zM12 7c0-2 1-3 3-4",
  // a milk carton
  dairy: "M8 3h8v3l2 3v12H6V9l2-3zM6 9h12M10 14h4",
  // a drumstick
  meat: "M15 3a6 6 0 0 1 3 11l-4 1-5 5a2 2 0 0 1-3-3l5-5 1-4a6 6 0 0 1 3-5z",
  // a jar with a lid
  pantry: "M8 3h8v3H8zM7 6h10l1 3v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9zM6 12h12",
  // a cup with a handle
  other: "M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M11 3v2",
};

export default function FoodIcon({ group }) {
  return (
    <span className={`food-icon group-${group}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
           strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={PATHS[group] ?? PATHS.other} />
      </svg>
    </span>
  );
}
