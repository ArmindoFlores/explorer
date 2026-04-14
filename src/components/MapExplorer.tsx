import { MapPin, MapPinIcon } from "./MapPinIcon";
import { Vector2, distance, getMouseEventCoordinates } from "../utils";
import { faExpand, faLocationDot, faLock, faLockOpen, faMagnifyingGlassMinus, faMagnifyingGlassPlus, faMaximize, faRuler } from "@fortawesome/free-solid-svg-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EditPinModal } from "./EditPinModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./MapExplorer.module.css";
import { useMapExplorer } from "./MapExplorerContext";

const ZOOM_SENSITIVITY = 1200;

export type ResizeValue = "none" | "both" | "horizontal" | "vertical";
type ModalType = "EDIT_MAP_PIN";
type MapTool = "ADD_PIN" | "MEASURE";

export interface MapExplorerProps {
    width?: number | string;
    height?: number | string;
    className?: string | undefined;
    image?: string;
    resize?: ResizeValue;
    onEditPin?: (pin: MapPin) => Promise<MapPin | null>;
}

interface CanvasControlOverlayProps {
    toggleActiveTool: (tool: MapTool) => void;
    activeTool: MapTool | undefined;
}

interface CanvasMapOverlayProps {
    editPin: (mapPin: MapPin) => void;
    ruler: {
        start: Vector2 | null;
        end: Vector2 | null;
    }
    clearRuler: () => void;
}

interface RulerProps {
    ruler: CanvasMapOverlayProps["ruler"];
    clearRuler: CanvasMapOverlayProps["clearRuler"];
}

const CanvasControlOverlay = memo((props: CanvasControlOverlayProps) => {
    const { zoom, fitToScreen, locked, toggleLocked, config } =
        useMapExplorer();

    return (
        <div className={styles.canvasControlOverlay}>
            <div className={styles.canvasControlOverlayColumn}>
                <button
                    className={styles.button}
                    title="Zoom in"
                    onClick={() => zoom(0.25)}
                >
                    <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
                </button>
                <button
                    className={styles.button}
                    title="Zoom out"
                    onClick={() => zoom(-0.25)}
                >
                    <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
                </button>
                <br />
                <button
                    className={styles.button}
                    title="Fit to screen"
                    onClick={() => fitToScreen()}
                >
                    <FontAwesomeIcon icon={faExpand} />
                </button>
                {!locked && config.canEdit && (
                    <>
                        <br />
                        <button
                            className={`${styles.button} ${props.activeTool === "ADD_PIN" ? styles.active : ""}`}
                            title="Add location"
                            onClick={() => props.toggleActiveTool("ADD_PIN")}
                        >
                            <FontAwesomeIcon icon={faLocationDot} />
                        </button>
                    </>
                )}
                <br />
                <button
                    className={`${styles.button} ${props.activeTool === "MEASURE" ? styles.active : ""}`}
                    title="Measure distance"
                    onClick={() => props.toggleActiveTool("MEASURE")}
                >
                    <FontAwesomeIcon icon={faRuler} />
                </button>
            </div>
            <div className={styles.canvasControlOverlayColumn}>
                <button className={styles.button} title="Toggle fullscreen">
                    <FontAwesomeIcon icon={faMaximize} />
                </button>
                {config.canEdit && (
                    <>
                        <br />
                        <button
                            className={styles.button}
                            title={locked ? "Unlock map" : "Lock map"}
                            onClick={() => toggleLocked()}
                        >
                            <FontAwesomeIcon
                                icon={locked ? faLockOpen : faLock}
                            />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
});

const Ruler = memo((props: RulerProps) => {
    const { camera, $canvasToWorld, scale, unit } = useMapExplorer();

    useEffect(() => {
        props.clearRuler();
    }, [camera]);

    const { start, end } = props.ruler;

    const text = useMemo(() => {
        if (start == null || end == null) return "";
        const startWorld = $canvasToWorld(start);
        const endWorld = $canvasToWorld(end);
        return `${(distance(startWorld, endWorld) * scale).toFixed(1)}${unit ? " " + unit : ""}`;
    }, [start, end, unit, $canvasToWorld, scale]);

    const dx = useMemo(() => end?.x != undefined && start?.x != undefined ? end.x - start.x : null, [start?.x, end?.x]);
    const dy = useMemo(() => end?.y != undefined && start?.y != undefined ? end.y - start.y : null, [start?.y, end?.y]);

    const ticks = useMemo(() => {
        if (dx == null || dy == null || start == null) {
            return [];
        }

        const length = Math.sqrt(dx * dx + dy * dy);
        const spacing = 20;
        const tickSize = 8;

        const count = Math.floor(length / spacing);
        const ticksArray = [];

        for (let i = 1; i < count; i++) {
            const t = i / count;

            const x = start.x + dx * t;
            const y = start.y + dy * t;

            const perpX = -dy / length;
            const perpY = dx / length;

            ticksArray.push({
                x1: x - perpX * tickSize / 2,
                y1: y - perpY * tickSize / 2,
                x2: x + perpX * tickSize / 2,
                y2: y + perpY * tickSize / 2,
            });
        }

        return ticksArray;
    }, [start, end, dx, dy]);

    if (!start || !end || dx == null || dy == null) return null;

    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Flip text if upside down
    const textAngle = (angleDeg > 90 || angleDeg < -90)
        ? angleDeg + 180
        : angleDeg;

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    return (
        <svg className={styles.ruler}>
            <g>
                <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="white"
                    strokeWidth={6}
                    strokeLinecap="round"
                />
                {ticks.map((t, i) => (
                    <line
                        key={i}
                        x1={t.x1}
                        y1={t.y1}
                        x2={t.x2}
                        y2={t.y2}
                        stroke="white"
                        strokeWidth={4}
                        strokeLinecap="round"
                    />
                ))}

                <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="black"
                    strokeWidth={3}
                    strokeLinecap="round"
                />
                {ticks.map((t, i) => (
                    <line
                        key={i}
                        x1={t.x1}
                        y1={t.y1}
                        x2={t.x2}
                        y2={t.y2}
                        stroke="black"
                        strokeWidth={2}
                        strokeLinecap="round"
                    />
                ))}
            </g>


            <text
                x={midX}
                y={midY - 15}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${textAngle}, ${midX}, ${midY})`}
                className={styles.rulerText}
            >
                {text}
            </text>
        </svg>
    );
});

const CanvasMapOverlay = memo((props: CanvasMapOverlayProps) => {
    const { pins } = useMapExplorer();

    return <div className={styles.canvasMapOverlay}>
        {
            pins.map(pin => (
                <MapPinIcon
                    key={pin.id}
                    pin={pin}
                    onEdit={() => props.editPin(pin)}
                />
            ))
        }
        <Ruler ruler={props.ruler} clearRuler={props.clearRuler} />
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
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [spacePressed, setSpacePressed] = useState(false);
    const [activeTool, setActiveTool] = useState<MapTool>();
    const [openedModal, setOpenedModal] = useState<ModalType | null>(null);
    const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
    const [rulerStartPosition, setRulerStartPosition] = useState<Vector2 | null>(null);
    const [rulerEndPosition, setRulerEndPosition] = useState<Vector2 | null>(null);

    const clearRuler = useCallback(() => {
        setRulerStartPosition(null);
        setRulerEndPosition(null);
    }, []);

    const toggleActiveTool = useCallback((tool: MapTool | undefined) => {
        clearRuler();
        setActiveTool(oldTool => oldTool === tool ? undefined : tool);
    }, [clearRuler]);

    const handleMapStartDrag = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const { x, y } = getMouseEventCoordinates(event);
        if (activeTool === "MEASURE" && !spacePressed) {
            // Measure
            const coords = $clientToCanvas({ x, y });
            setRulerStartPosition(coords);
            setRulerEndPosition(null);
            setIsMeasuring(true);
        }
        else {
            // Drag
            setIsDragging(true);
            lastMousePosition.current = { x, y };
            isClick.current = true;
        }
    }, [activeTool, $clientToCanvas, spacePressed]);

    const handleMapClick = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const { x: clientX, y: clientY } = getMouseEventCoordinates(event);
        if (activeTool !== "ADD_PIN") return;

        const { x, y } = $canvasToWorld($clientToCanvas({ x: clientX, y: clientY }));
        addPin(new MapPin(x, y));

    }, [activeTool, addPin, $canvasToWorld, $clientToCanvas]);

    const handleMapStopDrag = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (isClick.current) {
            handleMapClick(event);
        }
        setIsDragging(false);
        setIsMeasuring(false);
    }, [handleMapClick]);

    const handleMapDrag = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const { x: clientX, y: clientY } = getMouseEventCoordinates(event);
        if (isDragging) {
            // Drag
            setCamera(camera => {
                const dx = clientX - lastMousePosition.current.x;
                const dy = clientY - lastMousePosition.current.y;

                camera.x += dx;
                camera.y += dy;

                lastMousePosition.current = { x: clientX, y: clientY };
                isClick.current = false;
                return camera;
            });
        }
        else if (isMeasuring) {
            // Measure
            const coords = $clientToCanvas({ x: clientX, y: clientY });
            setRulerEndPosition(coords);
        }
    }, [isMeasuring, isDragging, setCamera]);

    const handleMapZoom = useCallback(
        (event: React.WheelEvent<HTMLCanvasElement>) => {
            setCamera((camera) => {
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
        },
        [setCamera, $canvas, zoom]
    );

    const startEditingPin = useCallback((mapPin: MapPin) => {
        setSelectedPin(mapPin);
        setOpenedModal("EDIT_MAP_PIN");
    }, []);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.code === "Space") {
            setSpacePressed(true);
        }
    }, []);

    const handleKeyUp = useCallback((event: KeyboardEvent) => {
        if (event.code === "Space") {
            setSpacePressed(false);
        }
    }, []);

    useEffect(() => {
        if ($canvas != null && props.image != undefined) {
            loadImage(props.image);
        }
    }, [props.image, loadImage, $canvas]);

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("keyup", handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

    return (
        <div
            className={styles.mapContainer}
            style={{ width: props.width, height: props.height, resize: props.resize }}
        >
            <canvas
                ref={(c) => $setCanvas(c)}
                className={`${styles.mapCanvas} ${isDragging ? styles.dragging : (activeTool === undefined || spacePressed ? styles.draggable : "")} ${activeTool === "ADD_PIN" ? styles.newLocation : ""}`}
                onMouseDown={handleMapStartDrag}
                onMouseUp={handleMapStopDrag}
                onMouseMove={handleMapDrag}
                onWheel={handleMapZoom}
                onTouchStart={handleMapStartDrag}
                onTouchEnd={handleMapStopDrag}
                onTouchMove={handleMapDrag}
            />
            <CanvasMapOverlay editPin={startEditingPin} ruler={{ start: rulerStartPosition, end: rulerEndPosition }} clearRuler={clearRuler} />
            <CanvasControlOverlay
                toggleActiveTool={toggleActiveTool}
                activeTool={activeTool}
            />
            {openedModal === "EDIT_MAP_PIN" && (
                <EditPinModal
                    isOpen={openedModal === "EDIT_MAP_PIN"}
                    onRequestClose={() => setOpenedModal(null)}
                    pin={selectedPin!}
                    onCommit={(updatedPin) =>
                        editPin(updatedPin.id, updatedPin)
                    }
                />
            )}
        </div>
    );
}
