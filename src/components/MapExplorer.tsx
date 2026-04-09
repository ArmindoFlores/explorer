import { memo, useCallback, useEffect, useRef, useState } from "react";
import styles from "./MapExplorer.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExpand, faLocationDot, faLock, faLockOpen, faMagnifyingGlassMinus, faMagnifyingGlassPlus, faMaximize } from "@fortawesome/free-solid-svg-icons";
import { MapPin, MapPinIcon } from "./MapPinIcon";
import type { Vector2 } from "../utils";
import { useMapExplorer } from "./MapExplorerContext";

const ZOOM_SENSITIVITY = 1200;

export interface MapExplorerProps {
    width?: number | string;
    height?: number | string;
    className?: string | undefined;
    image?: string;
}

interface CanvasControlOverlayProps {
    toggleAddLocation: () => void;
    isAddingLocation: boolean;
}

const CanvasControlOverlay = memo((props: CanvasControlOverlayProps) => {
    const {
        zoom,
        fitToScreen,
        locked,
        toggleLocked,
    } = useMapExplorer();

    return (
        <div className={styles.canvasControlOverlay}>
            <div className={styles.canvasControlOverlayColumn}>
                <button className={styles.button} title="Zoom in" onClick={() => zoom(0.25)}>
                    <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
                </button>
                <button className={styles.button} title="Zoom out" onClick={() => zoom(-0.25)}>
                    <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
                </button>
                <br />
                <button className={styles.button} title="Fit to screen" onClick={() => fitToScreen()}>
                    <FontAwesomeIcon icon={faExpand} />
                </button>
                {
                    !locked && <>
                        <br />
                        <button
                            className={`${styles.button} ${props.isAddingLocation ? styles.active : ""}`}
                            title="Add location"
                            onClick={() => props.toggleAddLocation()}
                        >
                            <FontAwesomeIcon icon={faLocationDot} />
                        </button>
                    </>
                }
            </div>
            <div className={styles.canvasControlOverlayColumn}>
                <button className={styles.button} title="Toggle fullscreen">
                    <FontAwesomeIcon icon={faMaximize} />
                </button>
                <br />
                <button
                    className={styles.button}
                    title={locked ? "Unlock map" : "Lock map"}
                    onClick={() => toggleLocked()}
                >
                    <FontAwesomeIcon icon={locked ? faLockOpen : faLock} />
                </button>
            </div>
        </div>
    );
});

const CanvasMapOverlay = memo(() => {
    const { pins } = useMapExplorer();

    return <div className={styles.canvasMapOverlay}>
        {
            pins.map(pin => (
                <MapPinIcon
                    key={pin.id}
                    pin={pin}
                />
            ))
        }
    </div>;
});

function isMouseEvent<E extends HTMLElement>(event: React.MouseEvent<E> | React.TouchEvent<E>): event is React.MouseEvent<E> {
    return (event as React.MouseEvent<E>).clientX !== undefined && (event as React.MouseEvent<E>).clientY !== undefined;
}

function getEventCoordinates<E extends HTMLElement>(event: React.MouseEvent<E> | React.TouchEvent<E>): Vector2 {
    if (isMouseEvent(event)) {
        return { x: event.clientX, y: event.clientY };
    }
    if (event.type === "touchend") {
        return {
            x: event.changedTouches[0].clientX,
            y: event.changedTouches[0].clientY
        };
    }
    return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
    };
}

export function MapExplorer(props: MapExplorerProps) {
    const {
        loadImage,
        addPin,
        setCamera,
        zoom,
        $canvas,
        $setCanvas,
        $canvasToWorld,
        $clientToCanvas,
    } = useMapExplorer();
    const lastMousePosition = useRef({ x: 0, y: 0 });
    const isClick = useRef(false);

    const [isDragging, setIsDragging] = useState(false);
    const [isAddingLocation, setIsAddingLocation] = useState(false);
    
    const toggleAddLocation = useCallback(() => {
        setIsAddingLocation(old => !old);
    }, []);

    const handleMapStartDrag = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const { x, y } = getEventCoordinates(event);
        setIsDragging(true);
        lastMousePosition.current = { x, y };
        isClick.current = true;
    }, []);
    
    const handleMapClick = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const { x: clientX, y: clientY } = getEventCoordinates(event);
        if (!isAddingLocation) return;

        const { x, y } = $canvasToWorld($clientToCanvas({x: clientX, y: clientY}));
        addPin(new MapPin(x, y));

    }, [isAddingLocation, addPin, $canvasToWorld, $clientToCanvas]);

    const handleMapStopDrag = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (isClick.current) {
            handleMapClick(event);
        }
        setIsDragging(false);
    }, [handleMapClick]);

    const handleMapDrag = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDragging) return;

        setCamera(camera => {
            const { x: clientX, y: clientY } = getEventCoordinates(event);
            const dx = clientX - lastMousePosition.current.x;
            const dy = clientY - lastMousePosition.current.y;
    
            camera.x += dx;
            camera.y += dy;
    
            lastMousePosition.current = { x: clientX, y: clientY };
            isClick.current = false;
            return camera;
        });

    }, [isDragging, setCamera]);

    const handleMapZoom = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
        setCamera(camera => {
            if ($canvas === null) return camera;
            const rect = $canvas.getBoundingClientRect();
    
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
    
            const worldX = (mouseX - camera.x) / camera.zoom;
            const worldY = (mouseY - camera.y) / camera.zoom;
    
            camera.zoom = zoom(-event.deltaY / ZOOM_SENSITIVITY, false);
    
            camera.x = mouseX - worldX * camera.zoom;
            camera.y = mouseY - worldY * camera.zoom;
            return camera;
        });

    }, [setCamera, $canvas, zoom]);

    useEffect(() => {
        if ($canvas != null && props.image != undefined) {
            loadImage(props.image);
        }
    }, [props.image, loadImage, $canvas]);

    return (
        <>
            <div className={styles.mapContainer} style={{ width: props.width, height: props.height }}>
                <canvas
                    ref={(c) => $setCanvas(c)}
                    className={`${styles.mapCanvas} ${isDragging ? styles.dragging : styles.draggable} ${isAddingLocation ? styles.newLocation : ""}`}
                    onMouseDown={handleMapStartDrag}
                    onMouseUp={handleMapStopDrag}
                    onMouseMove={handleMapDrag}
                    onWheel={handleMapZoom}
                    onTouchStart={handleMapStartDrag}
                    onTouchEnd={handleMapStopDrag}
                    onTouchMove={handleMapDrag}
                />
                <CanvasMapOverlay />
                <CanvasControlOverlay
                    toggleAddLocation={toggleAddLocation}
                    isAddingLocation={isAddingLocation}
                />
            </div>
        </>
    );
}
