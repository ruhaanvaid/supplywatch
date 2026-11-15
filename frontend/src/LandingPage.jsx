import CtaBand from "./landing/CtaBand";
import Faq from "./landing/Faq";
import Footer from "./landing/Footer";
import Hero from "./landing/Hero";
import HowItWorks from "./landing/HowItWorks";
import IsIsnt from "./landing/IsIsnt";
import LandingNav from "./landing/LandingNav";
import ProblemCards from "./landing/ProblemCards";
import ProofSection from "./landing/ProofSection";
import TrustStrip from "./landing/TrustStrip";
import "./landing.css";

// The public home page ("/"), top to bottom. Each section is its own small
// component in src/landing/, and all of them use the same tokens (tokens.css)
// and the same FoodCard / Sparkline as the dashboard, so the two pages match.
export default function LandingPage() {
  return (
    <div className="landing-page">
      <LandingNav />
      <main className="landing">
        <Hero />
        <TrustStrip />
        <ProblemCards />
        <HowItWorks />
        <ProofSection />
        <IsIsnt />
        <Faq />
        <CtaBand />
      </main>
      <div className="landing">
        <Footer />
      </div>
    </div>
  );
}
