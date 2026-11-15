// FAQ on the landing page. <details>/<summary> is the browser's built-in
// expand/collapse: it works with the keyboard and screen readers, no JavaScript needed.
const QUESTIONS = [
  ["Is it free?",
   "Yes. SupplyWatch is a free student project. There is nothing to buy."],
  ["Where does the data come from?",
   "Free public sources: monthly prices from the U.S. Bureau of Labor Statistics, news from the GDELT " +
   "news search, drought maps from the U.S. Drought Monitor, and shipping strain from the New York Fed's " +
   "Global Supply Chain Pressure Index. Every number links back to its source in the app."],
  ["How accurate is it?",
   "We don't know yet, and we won't pretend to. We replayed one real shortage (eggs, 2022–23): it gave a " +
   "Medium warning 10 months before the shortage was reported, but only turned High the same month. One " +
   "event is a demonstration, not proof. Treat scores as a prompt to look closer, not a forecast."],
  ["Is my data private?",
   "We store only your name, your email, a scrambled (hashed) version of your password and the date you " +
   "signed up. We never store your password itself, and we don't share or sell anything."],
  ["Do I need an account to try it?",
   "No. \"Try the demo\" opens the full dashboard with sample data, no sign-up needed."],
];

export default function LandingFaq() {
  return (
    <section id="faq" className="landing-section">
      <h2>Frequently asked questions</h2>
      {QUESTIONS.map(([question, answer]) => (
        <details key={question} className="faq-item">
          <summary>{question}</summary>
          <p>{answer}</p>
        </details>
      ))}
    </section>
  );
}
