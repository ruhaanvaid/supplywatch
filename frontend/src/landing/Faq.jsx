import Icon from "./icons";

// FAQ accordion. <details>/<summary> is the browser's built-in open/close: it works
// with the keyboard (Tab + Enter) and screen readers with no JavaScript. The chevron
// turns and the answer slides open in CSS (landing.css); with reduced motion it just opens.
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

export default function Faq() {
  return (
    <section id="faq" className="landing-section" aria-labelledby="faq-title">
      <h2 id="faq-title">Frequently asked questions</h2>
      <div className="faq surface">
        {QUESTIONS.map(([question, answer]) => (
          <details key={question} className="faq-item">
            <summary>{question}<span className="faq-chevron"><Icon name="chevron" size={18} /></span></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
