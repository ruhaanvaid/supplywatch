import Icon from "./icons";

// The real public data sources, in one quiet row under the hero. Text and simple
// icons only: no logos (we don't have permission to use them), no user counts,
// no testimonials. Each name links to the source's own site.
const SOURCES = [
  ["price", "U.S. Bureau of Labor Statistics", "https://www.bls.gov/cpi/"],
  ["news", "GDELT news search", "https://www.gdeltproject.org/"],
  ["sun", "U.S. Drought Monitor", "https://droughtmonitor.unl.edu/"],
  ["ship", "New York Fed", "https://www.newyorkfed.org/research/policy/gscpi"],
];

export default function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Where the data comes from">
      <p className="trust-label">Built on free public data from</p>
      <ul>
        {SOURCES.map(([icon, name, url]) => (
          <li key={name}>
            <Icon name={icon} size={18} />
            <a href={url} target="_blank" rel="noreferrer">{name}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
