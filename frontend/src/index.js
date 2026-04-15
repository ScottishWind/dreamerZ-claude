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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('ServiceWorker registered:', registration.scope);
        })
        .catch((error) => {
          console.warn('ServiceWorker registration failed:', error);
        });
      return;
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  });
}
