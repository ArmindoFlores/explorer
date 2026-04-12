import { MapPin, MapPinIcon } from "./MapPinIcon";
import { faExpand, faLocationDot, faLock, faLockOpen, faMagnifyingGlassMinus, faMagnifyingGlassPlus, faMaximize } from "@fortawesome/free-solid-svg-icons";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { EditPinModal } from "./EditPinModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getMouseEventCoordinates } from "../utils";
import styles from "./MapExplorer.module.css";
import { useMapExplorer } from "./MapExplorerContext";

const ZOOM_SENSITIVITY = 1200;

export type ResizeValue = "none" | "both" | "horizontal" | "vertical";
type ModalType = "EDIT_MAP_PIN";

export interface MapExplorerProps {
    width?: number | string;
    height?: number | string;
    className?: string | undefined;
    image?: string;
    resize?: ResizeValue;
    onEditPin?: (pin: MapPin) => Promise<MapPin|null>;
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
        config,
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
                    !locked && config.canEdit && <>
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
                {
                    config.canEdit && <>
                        <br />
                        <button
                            className={styles.button}
                            title={locked ? "Unlock map" : "Lock map"}
                            onClick={() => toggleLocked()}
                        >
                            <FontAwesomeIcon icon={locked ? faLockOpen : faLock} />
                        </button>
                    </>
                }
            </div>
        </div>
    );
});

const CanvasMapOverlay = memo(({ editPin }: { editPin: (mapPin: MapPin) => void }) => {
    const { pins } = useMapExplorer();

    return <div className={styles.canvasMapOverlay}>
        {
            pins.map(pin => (
                <MapPinIcon
                    key={pin.id}
                    pin={pin}
                    onEdit={() => editPin(pin)}
                />
            ))
        }
    </div>;
});

export function MapExplorer(props: MapExplorerProps) {
    const {
        loadImage,
        addPin,
        editPin,
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
    const [openedModal, setOpenedModal] = useState<ModalType|null>(null);
    const [selectedPin, setSelectedPin] = useState<MapPin|null>(null);
    
    const toggleAddLocation = useCallback(() => {
        setIsAddingLocation(old => !old);
    }, []);

    const handleMapStartDrag = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const { x, y } = getMouseEventCoordinates(event);
        setIsDragging(true);
        lastMousePosition.current = { x, y };
        isClick.current = true;
    }, []);
    
    const handleMapClick = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const { x: clientX, y: clientY } = getMouseEventCoordinates(event);
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
            const { x: clientX, y: clientY } = getMouseEventCoordinates(event);
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

    const startEditingPin = useCallback((mapPin: MapPin) => {
        setSelectedPin(mapPin);
        setOpenedModal("EDIT_MAP_PIN");
    }, []);

    useEffect(() => {
        if ($canvas != null && props.image != undefined) {
            loadImage(props.image);
        }
    }, [props.image, loadImage, $canvas]);

    return (
        <div className={styles.mapContainer} style={{ width: props.width, height: props.height, resize: props.resize }} >
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
            <CanvasMapOverlay editPin={startEditingPin} />
            <CanvasControlOverlay
                toggleAddLocation={toggleAddLocation}
                isAddingLocation={isAddingLocation}
            />
            {
                openedModal === "EDIT_MAP_PIN" &&
                <EditPinModal
                    isOpen={openedModal === "EDIT_MAP_PIN"}
                    onRequestClose={() => setOpenedModal(null)}
                    pin={selectedPin!}
                    onCommit={(updatedPin) => editPin(updatedPin.id, updatedPin)}
                />
            }
        </div>
    );
}
