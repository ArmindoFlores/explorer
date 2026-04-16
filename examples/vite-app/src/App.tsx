import { MapExplorer, useMapPins } from "map-explorer";

import styles from  "./App.module.css";
import { useCallback } from "react";

export function App() {
    const pins = useMapPins();

    const onSave = useCallback(() => {
        console.log(pins);
    }, [pins]);

    return (
        <div className={styles.appContainer}>
            <MapExplorer image="/Tayira.webp" resize="both" />
            <br></br>
            <button onClick={onSave}>Save</button>
        </div>
    )
}
