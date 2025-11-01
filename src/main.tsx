
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import { ApiProvider } from "./providers/ApiProvider.tsx";
  import { QueryProvider } from "./providers/QueryProvider.tsx";

  createRoot(document.getElementById("root")!).render(
    <QueryProvider>
      <ApiProvider>
        <App />
      </ApiProvider>
    </QueryProvider>
  );
  