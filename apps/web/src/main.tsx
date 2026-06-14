import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import superjson from "superjson";
import App from "./App.js";
import { API_URL, trpc } from "./lib/trpc.js";
import "./styles.css";

function Root() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  const [trpcClient] = useState(() =>
    trpc.createClient({ links: [httpBatchLink({ url: API_URL, transformer: superjson, headers: () => ({ "ngrok-skip-browser-warning": "true" }) })] }),
  );
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
