import ClosingBand from "./landing/ClosingBand";
import Faq from "./landing/Faq";
import Footer from "./landing/Footer";
import Hero from "./landing/Hero";
import HowItWorks from "./landing/HowItWorks";
import IsIsnt from "./landing/IsIsnt";
import LandingNav from "./landing/LandingNav";
import WhatItWatches from "./landing/WhatItWatches";
import "./landing.css";

// The public home page ("/"). Its one job: get a busy buyer to try the demo.
// It opens with the real egg replay (the hero), then explains how, what it watches,
// what it is and isn't, answers questions, and ends with the two buttons again.
export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main className="landing">
        <Hero />
        <HowItWorks />
        <WhatItWatches />
        <IsIsnt />
        <Faq />
      </main>
      <ClosingBand />
      <div className="landing"><Footer /></div>
    </>
  );
}
