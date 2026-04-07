import { MapExplorer } from "./MapExplorer";
import styles from  "./App.module.css";

export function App() {
    return (
        <div className={styles.appContainer}>
            <MapExplorer image="/Tayira.webp" />
        </div>
    )
}
