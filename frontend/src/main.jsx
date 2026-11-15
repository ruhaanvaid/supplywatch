import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import LandingPage from "./LandingPage";
import LoginPage from "./LoginPage";
import NotFound from "./NotFound";
import SignupPage from "./SignupPage";
import "./App.css";

// Which page to show for which address. BrowserRouter reads the address bar,
// and <Routes> picks the first <Route> whose path matches.
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app" element={<App />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
