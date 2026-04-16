import { deepMerge, type Camera, type Vector2 } from "../utils";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import type { MapPin } from "./MapPinIcon";

export type FitMode = "fit" | "cover";

export interface MapExplorerConfig {
    canEdit: boolean;
}

export interface MapExplorerContextProviderProps {
    children: React.ReactNode;
    config?: Partial<MapExplorerConfig>;
}

export interface MapExplorerContextType {
    locked: boolean;
    config: MapExplorerConfig;
    scale: number;
    unit: string | null;
    
    loadImage: (src: string) => void;
    setCamera: (
        cameraOrSetter: Camera | ((oldCamera: Camera) => Camera)
    ) => void;
    setPins: (
        pinsOrSetter: MapPin[] | ((oldMapPins: MapPin[]) => MapPin[])
    ) => void;
    addPin: (pin: MapPin) => void;
    removePin: (pinId: string) => void;
    editPin: (
        pinId: string,
        pinOrSetter: MapPin | ((oldPin: MapPin) => MapPin)
    ) => void;
    setLocked: (
        lockedOrSetter: boolean | ((oldLocked: boolean) => boolean)
    ) => void;
    toggleLocked: () => void;
    setScale: (scaleOrSetter: number | ((oldScale: number) => number)) => void;
    setUnit: (unitOrSetter: string|null | ((oldUnit: string|null) => string|null)) => void;
    zoom: (amount: number, focus?: Vector2) => void;
    fitToScreen: () => void;

    // internals
    $canvas: HTMLCanvasElement | null;
    $canvasSize: Vector2;
    $setCanvas: (canvas: HTMLCanvasElement | null) => void;
    $clientToCanvas: (coordinates: Vector2) => Vector2;
}

export interface MapCameraContextType {
    camera: Camera;
    $canvasToWorld: (coordinates: Vector2) => Vector2;
    $worldToCanvas: (coordinates: Vector2) => Vector2;
}

const MapExplorerContext = createContext<MapExplorerContextType | null>(null);
const useMapExplorer_ = () => useContext(MapExplorerContext);

const MapExplorerCameraContext = createContext<MapCameraContextType | null>(null);
const useMapCamera_ = () => useContext(MapExplorerCameraContext);

const MapExplorerPinsContext = createContext<MapPin[] | null>(null);
const useMapPins_ = () => useContext(MapExplorerPinsContext);

const DEFAULT_MAP_EXPLORER_CONFIG: MapExplorerConfig = {
    canEdit: true,
};

function fitZoom(
    canvas: HTMLCanvasElement,
    img: HTMLImageElement,
    mode: FitMode = "fit"
): number {
    const maxZoomX = canvas.width / img.width;
    const maxZoomY = canvas.height / img.height;
    const f = mode === "fit" ? Math.max : Math.min;
    return f(maxZoomX, maxZoomY);
}

function fitPan(
    canvas: HTMLCanvasElement,
    img: HTMLImageElement,
    zoom: number,
    mode: FitMode = "fit"
): { x: number; y: number } {
    if (mode === "fit") return { x: 0, y: 0 };
    return {
        x: ((canvas.width / zoom - img.width) / 2) * zoom,
        y: ((canvas.height / zoom - img.height) / 2) * zoom,
    };
}

export function MapExplorerContextProvider(
    props: MapExplorerContextProviderProps
) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [locked, setLocked] = useState(false);
    const [pins, setPins] = useState<MapPin[]>([]);
    const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
    const [canvasSize, setCanvasSize] = useState<Vector2>({ x: 0, y: 0 });
    const [scale, setScale] = useState(0.25);
    const [unit, setUnit] = useState<string|null>("km");

    const fullConfig = useMemo(
        () => deepMerge(DEFAULT_MAP_EXPLORER_CONFIG, props.config ?? {}),
        [props.config]
    );

    useLayoutEffect(() => {
        canvasRef.current = canvas;
    }, [canvas]);

    const updateCamera = useCallback(() => {
        setCamera(old => ({...old}));
    }, []);

    const toggleLocked = useCallback(() => {
        return setLocked((old) => !old);
    }, []);

    const addPin = useCallback((pin: MapPin) => {
        setPins((old) => [...old, pin]);
    }, []);

    const editPin = useCallback(
        (pinId: string, pinOrSetter: MapPin | ((oldPin: MapPin) => MapPin)) => {
            setPins((old) => {
                let updatedPin: MapPin;
                if (typeof pinOrSetter === "function") {
                    const oldPin = old.find((pin) => pin.id === pinId);
                    if (oldPin === undefined) return old;
                    updatedPin = pinOrSetter(oldPin);
                } else {
                    updatedPin = pinOrSetter;
                }
                return [...old.filter((pin) => pin.id !== pinId), updatedPin];
            });
        },
        []
    );

    const removePin = useCallback((pinId: string) => {
        setPins((old) => old.filter((pin) => pin.id !== pinId));
    }, []);

        const clientToCanvas = useCallback((coordinates: Vector2): Vector2 => {
        if (canvasRef.current === null) {
            throw new Error("canvas is not initialized");
        }
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: coordinates.x - rect.left,
            y: coordinates.y - rect.top,
        };
    }, []);

    const canvasToWorld = useCallback(
        (coordinates: Vector2): Vector2 => {
            return {
                x: (coordinates.x - camera.x) / camera.zoom,
                y: (coordinates.y - camera.y) / camera.zoom,
            };
        },
        [camera]
    );

    const worldToCanvas = useCallback(
        (coordinates: Vector2): Vector2 => {
            return {
                x: coordinates.x * camera.zoom + camera.x,
                y: coordinates.y * camera.zoom + camera.y,
            };
        },
        [camera]
    );

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;

        if (canvas === null || img === null) return;
        const ctx = canvas.getContext("2d");
        if (ctx === null) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(camera.x, camera.y);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
    }, [camera]);

    const zoom = useCallback((amount: number, focus?: Vector2) => {
        setCamera(camera => {
            if (canvasRef.current === null) return camera;

            const zoomFactor = 1 + amount;
            const zoom = Math.max(camera.zoom * zoomFactor, 0.01);
    
            const realZoomFactor = zoom / camera.zoom;
            const centerX = focus?.x ?? canvasRef.current.width / 2;
            const centerY = focus?.y ?? canvasRef.current.height / 2;
    
            return {
                zoom,
                x: centerX + (camera.x - centerX) * realZoomFactor,
                y: centerY + (camera.y - centerY) * realZoomFactor
            };
        });

    }, []);

    const fitToScreen = useCallback(() => {
        setCamera(camera => {
            if (canvasRef.current === null || imageRef.current === null) return camera;

            const zoom = fitZoom(canvasRef.current, imageRef.current, "cover");
            return {
                zoom: zoom, 
                ...fitPan(
                    canvasRef.current,
                    imageRef.current,
                    zoom,
                    "cover"
                ),
            };
        });
    }, []);

    const loadImage = useCallback(
        (src: string) => {
            const canvas = canvasRef.current;
            if (canvas === null) {
                throw new Error(
                    `"loadImage()" can only be called after canvas initialization`
                );
            }

            const img = new Image();
            imageRef.current = img;
            img.src = src;

            img.onload = () => {
                const zoom = fitZoom(canvas, img, "cover");
                setCamera({
                    zoom,
                    ...fitPan(canvas, img, zoom, "cover")
                })
            };
        },
        []
    );

    useEffect(() => {
        if (canvas === null) return;

        const ctx = canvas.getContext("2d");
        if (ctx == null) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            canvas.width = width;
            canvas.height = height;
            setCanvasSize({ x: canvas.width, y: canvas.height });
            updateCamera();
        });

        observer.observe(canvas);

        return () => observer.disconnect();
    }, [canvas, updateCamera]);

    useEffect(() => {
        draw();
    }, [draw]);
    
    const memoizedExplorerContextValue: MapExplorerContextType = useMemo(() => ({
        locked,
        config: fullConfig,
        scale,
        unit,
        setCamera,
        loadImage,
        setPins,
        addPin,
        editPin,
        removePin,
        setLocked,
        toggleLocked,
        setScale,
        setUnit,
        zoom,
        fitToScreen,
        $canvas: canvas,
        $setCanvas: setCanvas,
        $clientToCanvas: clientToCanvas,
        $canvasSize: canvasSize,
    }), [
        locked,
        unit,
        scale,
        fullConfig,
        setCamera,
        loadImage,
        setPins,
        addPin,
        editPin,
        removePin,
        setLocked,
        toggleLocked,
        zoom,
        fitToScreen,
        canvas,
        setCanvas,
        clientToCanvas,
        canvasSize,
    ]);

    const memoizedCameraContextValue: MapCameraContextType = useMemo(() => ({
        camera,
        $canvasToWorld: canvasToWorld,
        $worldToCanvas: worldToCanvas,
    }), [
        camera,
        canvasToWorld,
        worldToCanvas,
    ]);

    return (
        <MapExplorerContext.Provider value={memoizedExplorerContextValue}>
            <MapExplorerPinsContext.Provider value={pins}>
                <MapExplorerCameraContext.Provider value={memoizedCameraContextValue}>
                    {props.children}
                </MapExplorerCameraContext.Provider>
            </MapExplorerPinsContext.Provider>
        </MapExplorerContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMapExplorer() {
    const ctx = useMapExplorer_();
    if (ctx === null) {
        throw new Error(
            `"useMapExplorer()" must only be used inside a "MapExplorerContextProvider"`
        );
    }
    return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMapCamera() {
    const ctx = useMapCamera_();
    if (ctx === null) {
        throw new Error(
            `"useMapCamera()" must only be used inside a "MapExplorerContextProvider"`
        );
    }
    return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMapPins() {
    const ctx = useMapPins_();
    if (ctx === null) {
        throw new Error(
            `"useMapPins()" must only be used inside a "MapExplorerContextProvider"`
        );
    }
    return ctx;
}
