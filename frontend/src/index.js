import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress PostHog analytics errors in development (not an app issue)
window.addEventListener('error', (event) => {
  if (event.message?.includes('postMessage') && 
      event.message?.includes('PerformanceServerTiming')) {
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('PerformanceServerTiming')) {
    event.preventDefault();
    return true;
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
