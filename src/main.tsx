import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OidcProvider } from "@axa-fr/react-oidc";
import App from "./App.tsx";
import "./index.css";
import { ApiProvider } from "./providers/ApiProvider.tsx";
import { QueryProvider } from "./providers/QueryProvider.tsx";
import { AuthCallback } from "./pages/AuthCallback";
import { SilentCallback } from "./pages/SilentCallback";

const oidcConfiguration = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI,
  silent_redirect_uri: import.meta.env.VITE_OIDC_SILENT_REDIRECT_URI,
  scope: import.meta.env.VITE_OIDC_SCOPE,
  response_type: "code",
  automaticSilentRenew: true,
  loadUserInfo: true,
  service_worker_relative_url: "/OidcServiceWorker.js",
  service_worker_only: false,
};

createRoot(document.getElementById("root")!).render(
  <OidcProvider
    configuration={oidcConfiguration}
    authenticatingComponent={() => (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    )}
  >
    <BrowserRouter>
      <ApiProvider backendUrl={import.meta.env.VITE_BACKEND_URL}>
        <QueryProvider>
          <Routes>
            <Route path="/authentication/callback" element={<AuthCallback />} />
            <Route
              path="/authentication/silent-callback"
              element={<SilentCallback />}
            />
            <Route path="/*" element={<App />} />
          </Routes>
        </QueryProvider>
      </ApiProvider>
    </BrowserRouter>
  </OidcProvider>
);
