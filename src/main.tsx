
  import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router-dom";
  import App from "./App.tsx";
  import "./index.css";
  import { ApiProvider } from "./providers/ApiProvider.tsx";
  import { QueryProvider } from "./providers/QueryProvider.tsx";

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <QueryProvider>
        <ApiProvider>
          <App />
        </ApiProvider>
      </QueryProvider>
    </BrowserRouter>
  );
  