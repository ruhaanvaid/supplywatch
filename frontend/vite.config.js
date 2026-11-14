import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Forward every /api request to the FastAPI backend on port 8000.
// The page and the API then look like one website, so no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8000" } },
});
