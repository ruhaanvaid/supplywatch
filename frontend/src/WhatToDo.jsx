// "What to do": real places to buy from, and substitutes to hand out instead (each with why).
// Each supplier card is a link to the organization's official website.
export default function WhatToDo({ suppliers, substitutes }) {
  return (
    <section className="todo">
      <h3>What to do</h3>

      <h4>Where else to source it</h4>
      <div className="todo-cards">
        {suppliers.map((s) => (
          <a key={s.name} className="todo-card" href={s.url} target="_blank" rel="noreferrer">
            <strong>{s.name}</strong>
            <span className="small">{s.type} · {s.area}</span>
            <span>{s.what}</span>
          </a>
        ))}
      </div>
      <p className="small">
        Real organizations, listed for convenience. SupplyWatch has no connection to them;
        check availability, prices and terms with them directly.
      </p>

      <h4>Substitutes to offer</h4>
      {/* Each substitute says WHY it works: a fixed, hand-written note in data/items.json
          (same role in a meal, keeps longer, no fridge...), not AI-written. */}
      <ul className="substitutes">
        {substitutes.map((sub) => (
          <li key={sub.name}>
            <strong>{sub.name}</strong>
            <span className="small">{sub.why}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
