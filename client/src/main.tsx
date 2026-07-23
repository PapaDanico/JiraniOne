import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted fonts (was Google Fonts) — same-origin means no third-party
// render-blocking CSS fetch, they ride the SW precache for offline, and
// CSP needs no font/style exceptions. Latin subset only (Kenyan market — English/Swahili are both latin-script), which keeps the SW precache lean. Weights mirror what the old
// fonts.googleapis.com URL loaded; add a weight here if a design change
// needs one.
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/cormorant-garamond/latin-600-italic.css";
import "./index.css";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
