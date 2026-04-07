import { memo, useCallback, useEffect, useRef, useState } from "react";
import styles from "./MapExplorer.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExpand, faMagnifyingGlassMinus, faMagnifyingGlassPlus, faMaximize } from "@fortawesome/free-solid-svg-icons";
import { MapPin, type MapPinType } from "./components/MapPin";

const ZOOM_SENSITIVITY = 1200;

export type FitMode = "fit" | "cover";

export interface MapExplorerProps {
    width?: number | string;
    height?: number | string;
    className?: string | undefined;
    image: string;
}

interface CanvasControlOverlayProps {
    zoom: (amount: number) => void;
    fitToScreen: () => void;
}

interface CanvasMapOverlayProps {
    pins: MapPinType[];
    camera: {
        x: number;
        y: number;
        zoom: number;
    };
}

function fitZoom(canvas: HTMLCanvasElement, img: HTMLImageElement, mode: FitMode = "fit"): number {
    const maxZoomX = canvas.width / img.width;
    const maxZoomY = canvas.height / img.height;
    const f = mode === "fit" ? Math.max : Math.min;
    return f(maxZoomX, maxZoomY);
}

function fitPan(canvas: HTMLCanvasElement, img: HTMLImageElement, zoom: number, mode: FitMode = "fit"): { x: number; y: number } {
    if (mode === "fit") return { x: 0, y: 0 };
    return {
        x: (canvas.width / zoom - img.width) / 2 * zoom,
        y: (canvas.height / zoom - img.height) / 2 * zoom,
    };
}

const CanvasControlOverlay = memo((props: CanvasControlOverlayProps) => {
    return (
        <div className={styles.canvasControlOverlay}>
            <div className={styles.canvasControlOverlayColumn}>
                <button className={styles.button} title="Zoom in" onClick={() => props.zoom(0.25)}>
                    <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
                </button>
                <button className={styles.button} title="Zoom out" onClick={() => props.zoom(-0.25)}>
                    <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
                </button>
                <br />
                <button className={styles.button} title="Fit to screen" onClick={() => props.fitToScreen()}>
                    <FontAwesomeIcon icon={faExpand} />
                </button>
            </div>
            <div className={styles.canvasControlOverlayColumn}>
                <button className={styles.button} title="Toggle fullscreen">
                    <FontAwesomeIcon icon={faMaximize} />
                </button>
            </div>
        </div>
    );
});

const CanvasMapOverlay = memo((props: CanvasMapOverlayProps) => {
    return <div className={styles.canvasMapOverlay}>
        {
            props.pins.map(pin => <MapPin key={pin.id} pin={pin} camera={props.camera} />)
        }
    </div>;
})

export function MapExplorer(props: MapExplorerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const zoomRef = useRef<number>(1);
    const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const lastMousePosition = useRef({ x: 0, y: 0 });

    const [isDragging, setIsDragging] = useState(false);
    const [mapPins, setMapPins] = useState<MapPinType[]>([{x: 1390, y: 1460, id: "hello"}]);
    const [camera, _updateCamera] = useState({ x: 0, y: 0, zoom: 1 });

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;

        if (canvas === null || img === null) return;
        const ctx = canvas.getContext("2d");
        if (ctx === null) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(panRef.current.x, panRef.current.y);
        ctx.scale(zoomRef.current, zoomRef.current);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
    }, []);

    const updateCamera = useCallback(() => {
        _updateCamera({ ...panRef.current, zoom: zoomRef.current });
    }, []);

    const zoom = useCallback((amount: number, redraw: boolean = true) => {
        if (canvasRef.current === null) return;

        const zoomFactor = 1 + amount;
        const previousZoom = zoomRef.current;
        zoomRef.current = Math.max(zoomRef.current * zoomFactor, 0.01);
        
        const realZoomFactor = zoomRef.current / previousZoom;
        const centerX = canvasRef.current.width / 2;
        const centerY = canvasRef.current.height / 2;

        panRef.current.x = centerX + (panRef.current.x - centerX) * realZoomFactor;
        panRef.current.y = centerY + (panRef.current.y - centerY) * realZoomFactor;

        updateCamera();
        if (redraw) {
            draw();
        }
    }, [draw, updateCamera]);

    const fitToScreen = useCallback(() => {
        if (canvasRef.current === null || imageRef.current === null) return;

        zoomRef.current = fitZoom(canvasRef.current, imageRef.current, "cover");
        panRef.current = fitPan(canvasRef.current, imageRef.current, zoomRef.current, "cover");
        updateCamera();
        draw();
    }, [draw, updateCamera]);

    const handleMapStartDrag = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(true);
        lastMousePosition.current = { x: event.clientX, y: event.clientY };
    }, []);

    const handleMapStopDrag = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMapDrag = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging) return;

        event.preventDefault();
        const dx = event.clientX - lastMousePosition.current.x;
        const dy = event.clientY - lastMousePosition.current.y;

        panRef.current.x += dx;
        panRef.current.y += dy;

        lastMousePosition.current = { x: event.clientX, y: event.clientY };
        updateCamera();
        draw();
    }, [isDragging, draw, updateCamera]);

    const handleMapZoom = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas === null) return;

        const rect = canvas.getBoundingClientRect();

        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const worldX = (mouseX - panRef.current.x) / zoomRef.current;
        const worldY = (mouseY - panRef.current.y) / zoomRef.current;

        zoom(-event.deltaY / ZOOM_SENSITIVITY, false);

        panRef.current.x = mouseX - worldX * zoomRef.current;
        panRef.current.y = mouseY - worldY * zoomRef.current;

        updateCamera();
        draw();
    }, [zoom, draw, updateCamera]);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d");

        if (ctx == null) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const img = new Image();
        imageRef.current = img;
        img.src = props.image;

        const observer = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            canvas.width = width;
            canvas.height = height;
            if (img.complete) draw();
        });

        observer.observe(canvas);
        img.onload = () => {
            zoomRef.current = fitZoom(canvas, img, "cover");
            panRef.current = fitPan(canvas, img, zoomRef.current, "cover");
            updateCamera();
            draw();
        };

        return () => observer.disconnect();
    }, [draw, props.image, updateCamera]);

    return (
        <>
            <div className={styles.mapContainer} style={{ width: props.width, height: props.height }}>
                <canvas
                    ref={canvasRef}
                    className={`${styles.mapCanvas} ${isDragging ? styles.dragging : styles.draggable}`}
                    onMouseDown={handleMapStartDrag}
                    onMouseUp={handleMapStopDrag}
                    onMouseMove={handleMapDrag}
                    onWheel={handleMapZoom}
                />
                <CanvasMapOverlay pins={mapPins} camera={camera} />
                <CanvasControlOverlay zoom={zoom} fitToScreen={fitToScreen} />
            </div>
        </>
    );
}
