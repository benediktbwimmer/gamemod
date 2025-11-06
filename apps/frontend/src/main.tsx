import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";

import App from "./App";
import "./index.css";
import { applyTheme, loadTheme } from "./lib/theme";
import { StaffAuthProvider } from "./lib/staffAuth";

applyTheme(loadTheme());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <StaffAuthProvider>
          <App />
        </StaffAuthProvider>
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
