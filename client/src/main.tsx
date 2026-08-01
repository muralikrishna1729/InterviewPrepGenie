import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { useAuthStore } from "./store/authStore";
import { authService } from "./services/auth";

// Hydrate auth (token from cookie) before rendering routes
try {
  const store = useAuthStore.getState();
  store.hydrate();

  // Bug 8 fix: re-read getState() AFTER hydrate() so we see the updated token
  // (hydrate() calls set() which updates the store, but the captured `store`
  // reference does NOT reflect the new state — must call getState() again)
  Promise.resolve().then(async () => {
    try {
      const freshToken = useAuthStore.getState().token;
      const freshUser = useAuthStore.getState().user;
      if (freshToken && !freshUser) {
        const user = await authService.getProfile();
        useAuthStore.getState().setUser(user);
      }
    } catch {
      // ignore profile fetch errors; user can still navigate to login
    }
  });
} catch {}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
