import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";
import { MapExplorerContextProvider } from "./components/MapExplorerContext.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MapExplorerContextProvider>
            <App />
        </MapExplorerContextProvider>
    </StrictMode>,
);
