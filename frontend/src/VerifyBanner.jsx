import { useState } from "react";

// Email confirmation messages at the top of the dashboard:
//  - just clicked the link in the email  -> "Your email is confirmed"
//  - the link was expired or broken       -> "That link didn't work" + send a new one
//  - not confirmed yet                    -> "Check your inbox" + send it again
// Nothing shows for confirmed users or in the demo.
export default function VerifyBanner({ user }) {
  const params = new URLSearchParams(window.location.search);
  const [sendState, setSendState] = useState("idle");   // idle | sending | sent | wait | error

  async function resend() {
    setSendState("sending");
    const response = await fetch("/api/resend-verification", { method: "POST" }).catch(() => null);
    setSendState(response?.ok ? "sent" : response?.status === 429 ? "wait" : "error");
  }

  if (!user) return null;
  if (params.get("verified") === "1") {
    return <div className="verify-banner done" role="status"><strong>Your email is confirmed.</strong> Welcome to SupplyWatch!</div>;
  }
  if (user.verified) return null;

  const resendButton = {
    idle: <button className="link-button" onClick={resend}>Send it again</button>,
    sending: <span>Sending…</span>,
    sent: <span>Sent! Check your inbox (and spam folder).</span>,
    wait: <span>Please wait a minute, then try again.</span>,
    error: <span>Couldn't send it. Please try again later.</span>,
  }[sendState];

  return (
    <div className="verify-banner" role="status">
      {params.get("verify_error") === "1"
        ? <><strong>That confirmation link didn't work.</strong> It may be older than 2 days. </>
        : <><strong>Please confirm your email.</strong> We sent a link to {user.email}. </>}
      {resendButton}
    </div>
  );
}
