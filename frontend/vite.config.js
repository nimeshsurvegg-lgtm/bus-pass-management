import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Requests to /api are forwarded to the Flask backend, so no CORS setup is needed.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: { proxy: { "/api": env.VITE_BACKEND_URL || "http://localhost:5001" } },
  };
});
