import { Link } from "react-router-dom";
import ReplayChart, { useEggReplay } from "../ReplayChart";
import { monthLabel } from "../chartMath";

// The thesis of the page: one real event, told plainly. Left: a headline built from
// the replay result (the "10 months" and both dates are computed, never typed).
// Right: the real egg price chart, annotated, running to the page edge on a laptop.
export default function Hero() {
  const { replay, prices } = useEggReplay();
  const months = replay?.lead_time_months_yellow;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-text">
        <p className="eyebrow">Food shortage early warning · free</p>
        <h1 id="hero-title">
          {replay ? <>Eggs showed warning signs <span className="num">{months}</span> months before stores limited purchases.</>
                  : <>Food shortage warnings, from public data.</>}
        </h1>
        <p className="hero-lead">
          {replay && <>We replayed the real 2022–23 data month by month, never looking ahead: egg risk reached
            Medium in {monthLabel(replay.first_yellow, "long")}, and grocers were limiting egg purchases
            by {monthLabel(replay.reported, "long")}. </>}
          SupplyWatch does the same check for 33 everyday foods, so food banks and small stores can
          see trouble coming and stock up in time.
        </p>
        <div className="hero-buttons">
          <Link to="/signup" className="btn btn-filled">Sign up free</Link>
          <Link to="/app?demo=1" className="btn btn-outline">Try the demo (no account)</Link>
        </div>
      </div>

      <div className="hero-chart">
        <ReplayChart replay={replay} prices={prices} height={340} />
        {replay && (
          <p className="hero-honest">
            It only reached High in {monthLabel(replay.first_red, "long")}, the month the shortage was reported.
            <strong> One event is a demonstration, not proof.</strong>
          </p>
        )}
      </div>
    </section>
  );
}
