import "./index.css";

import { App } from "./App.tsx";
import { MapExplorerContextProvider, type MapExplorerConfig } from "map-explorer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const configOverride: Partial<MapExplorerConfig> = {
    canEdit: true,
};

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MapExplorerContextProvider config={configOverride}>
            <App />
        </MapExplorerContextProvider>
    </StrictMode>,
);
