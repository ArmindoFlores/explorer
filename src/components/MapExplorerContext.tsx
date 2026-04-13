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
    camera: Camera;
    pins: MapPin[];
    locked: boolean;
    config: MapExplorerConfig;

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
    zoom: (amount: number, redraw?: boolean) => number;
    fitToScreen: () => void;

    // internals
    $canvas: HTMLCanvasElement | null;
    $canvasSize: Vector2;
    $setCanvas: (canvas: HTMLCanvasElement | null) => void;
    $draw: () => void;
    $updateCamera: () => void;
    $clientToCanvas: (coordinates: Vector2) => Vector2;
    $canvasToWorld: (coordinates: Vector2) => Vector2;
    $worldToCanvas: (coordinates: Vector2) => Vector2;
}

const MapExplorerContext = createContext<MapExplorerContextType | null>(null);
const useMapExplorer_ = () => useContext(MapExplorerContext);

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
    const zoomRef = useRef<number>(1);
    const panRef = useRef<Vector2>({ x: 0, y: 0 });

    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [locked, setLocked] = useState(false);
    const [pins, setPins] = useState<MapPin[]>([]);
    const [camera, _setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
    const [canvasSize, setCanvasSize] = useState<Vector2>({ x: 0, y: 0 });

    const fullConfig = useMemo(
        () => deepMerge(DEFAULT_MAP_EXPLORER_CONFIG, props.config ?? {}),
        [props.config]
    );

    useLayoutEffect(() => {
        canvasRef.current = canvas;
    }, [canvas]);

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

    const updateCamera = useCallback(() => {
        _setCamera({ ...panRef.current, zoom: zoomRef.current });
    }, []);

    const setCamera = useCallback(
        (cameraOrSetter: Camera | ((oldCamera: Camera) => Camera)) => {
            if (typeof cameraOrSetter === "function") {
                const setter = cameraOrSetter;
                _setCamera((oldCamera) => {
                    const camera = setter({ ...oldCamera });
                    panRef.current = { x: camera.x, y: camera.y };
                    zoomRef.current = camera.zoom;
                    return camera;
                });
            } else {
                const camera = cameraOrSetter;
                panRef.current = { x: camera.x, y: camera.y };
                zoomRef.current = camera.zoom;
                _setCamera(camera);
            }
        },
        []
    );

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

    const zoom = useCallback(
        (amount: number, redraw: boolean = true) => {
            if (canvasRef.current === null) return 1;

            const zoomFactor = 1 + amount;
            const previousZoom = zoomRef.current;
            zoomRef.current = Math.max(zoomRef.current * zoomFactor, 0.01);

            const realZoomFactor = zoomRef.current / previousZoom;
            const centerX = canvasRef.current.width / 2;
            const centerY = canvasRef.current.height / 2;

            panRef.current.x =
                centerX + (panRef.current.x - centerX) * realZoomFactor;
            panRef.current.y =
                centerY + (panRef.current.y - centerY) * realZoomFactor;

            updateCamera();
            if (redraw) {
                draw();
            }
            return zoomRef.current;
        },
        [draw, updateCamera]
    );

    const fitToScreen = useCallback(() => {
        if (canvasRef.current === null || imageRef.current === null) return;

        zoomRef.current = fitZoom(canvasRef.current, imageRef.current, "cover");
        panRef.current = fitPan(
            canvasRef.current,
            imageRef.current,
            zoomRef.current,
            "cover"
        );
        updateCamera();
        draw();
    }, [draw, updateCamera]);

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
                zoomRef.current = fitZoom(canvas, img, "cover");
                panRef.current = fitPan(canvas, img, zoomRef.current, "cover");
                updateCamera();
                draw();
            };
        },
        [updateCamera, draw]
    );

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
            if (imageRef.current?.complete) draw();
        });

        observer.observe(canvas);

        return () => observer.disconnect();
    }, [canvas, draw]);

    useEffect(() => {
        draw();
    }, [camera, draw]);

    const memoizedValue: MapExplorerContextType = useMemo(
        () => ({
            camera,
            pins,
            locked,
            config: fullConfig,
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
            $canvas: canvas,
            $setCanvas: setCanvas,
            $updateCamera: updateCamera,
            $draw: draw,
            $clientToCanvas: clientToCanvas,
            $canvasToWorld: canvasToWorld,
            $canvasSize: canvasSize,
            $worldToCanvas: worldToCanvas,
        }),
        [
            camera,
            pins,
            locked,
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
            updateCamera,
            draw,
            clientToCanvas,
            canvasToWorld,
            canvasSize,
            worldToCanvas,
        ]
    );

    return (
        <MapExplorerContext.Provider value={memoizedValue}>
            {props.children}
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
