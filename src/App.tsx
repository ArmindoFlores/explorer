import { MapExplorer } from "./components/MapExplorer";
import styles from  "./App.module.css";
import { useCallback } from "react";
import { useMapExplorer } from "./components/MapExplorerContext";

export function App() {
    const { pins } = useMapExplorer();

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
