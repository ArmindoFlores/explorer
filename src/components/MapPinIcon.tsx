import {
    memo,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getMouseEventCoordinates, type Vector2 } from "../utils";
import { faLocationDot, faPencil, faTrash } from "@fortawesome/free-solid-svg-icons";
import styles from "./MapPinIcon.module.css";
import { useMapCamera, useMapExplorer } from "./MapExplorerContext";
import { v4 as uuidv4 } from "uuid";

// eslint-disable-next-line react-refresh/only-export-components
export class MapPin {
    id: string;
    x: number;
    y: number;
    name: string;
    description: string;
    visible: boolean;
    metadata: string;
    minZoom?: number;
    maxZoom?: number;

    constructor(
        x: number,
        y: number,
        id: string | undefined = undefined,
        name: string | undefined = undefined,
        description: string = "",
        metadata: string = "",
        maxZoom: number | undefined = undefined,
        minZoom: number | undefined = undefined
    ) {
        this.id = id ?? uuidv4();
        this.name = name ?? this.id;
        this.description = description;
        this.metadata = metadata;
        this.x = x;
        this.y = y;
        this.visible = true;
        this.maxZoom = maxZoom;
        this.minZoom = minZoom;
    }
}

function anchor(
    position: Vector2,
    size: Vector2,
    anchor: "top" | "bottom" = "top"
): Vector2 {
    return {
        x: position.x - size.x / 2,
        y: position.y + (anchor === "bottom" ? 0 : -1) * size.y,
    };
}

export const MapPinIcon = memo(({
    pin,
    onEdit,
    onDelete,
}: {
    pin: MapPin;
    onEdit: (pin: MapPin) => void;
    onDelete: (pin: MapPin) => void;
}) => {
    const pinRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const isClick = useRef(false);
    const lastMousePosition = useRef<Vector2>({ x: 0, y: 0 });
    const { $canvasSize, editPin, locked, config } = useMapExplorer();
    const { camera, $worldToCanvas } = useMapCamera();

    const [pinSize, setPinSize] = useState<Vector2>({ x: 0, y: 0 });
    const [popupSize, setPopupSize] = useState<Vector2>({ x: 0, y: 0 });
    const [popupVisible, setPopupVisible] = useState(true);
    const [popupHovered, setPopupHovered] = useState(false);
    const [pinHovered, setPinHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const pinCanvasPosition = useMemo(
        () => $worldToCanvas(pin),
        [$worldToCanvas, pin]
    );
    const popupAnchorPosition = useMemo(
        () => (pinCanvasPosition.y >= $canvasSize.y / 2 ? "top" : "bottom"),
        [$canvasSize.y, pinCanvasPosition]
    );
    const { x: pinX, y: pinY } = useMemo(
        () => anchor(pinCanvasPosition, pinSize),
        [pinCanvasPosition, pinSize]
    );
    const { x: popupX, y: popupY } = useMemo(() => {
        if (popupAnchorPosition === "top") {
            return anchor(
                { x: pinCanvasPosition.x, y: pinCanvasPosition.y - pinSize.y },
                popupSize,
                popupAnchorPosition
            );
        }
        return anchor(
            { x: pinCanvasPosition.x, y: pinCanvasPosition.y },
            popupSize,
            popupAnchorPosition
        );
    }, [popupAnchorPosition, pinCanvasPosition, popupSize, pinSize.y]);

    if (((!pinHovered && !popupHovered) || isDragging) && popupVisible) {
        setPopupVisible(false);
    }

    const visible = useMemo(() => {
        return (
            (pin.maxZoom === undefined || camera.zoom <= pin.maxZoom) &&
            (pin.minZoom === undefined || camera.zoom <= pin.minZoom)
        );
    }, [pin.minZoom, pin.maxZoom, camera.zoom]);

    const handleMapPinStartDrag = useCallback(
        (
            event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>
        ) => {
            const { x, y } = getMouseEventCoordinates(event);
            setIsDragging(true);
            lastMousePosition.current = { x, y };
            isClick.current = true;
        },
        []
    );

    const handleMapPinClick = useCallback(
        (
            event:
                | MouseEvent
                | React.MouseEvent<HTMLElement>
                | React.TouchEvent<HTMLElement>
        ) => {
            if (event.type.startsWith("touch")) {
                // on mobile, this should make the popup visible
                setPopupVisible(true);
                event.preventDefault();
            }
        },
        []
    );

    const handleMapPinStopDrag = useCallback(
        (
            event:
                | MouseEvent
                | React.MouseEvent<HTMLElement>
                | React.TouchEvent<HTMLElement>
        ) => {
            if (isClick.current) {
                handleMapPinClick(event);
            }
            setIsDragging(false);
        },
        [handleMapPinClick]
    );

    const handleMapPinDrag = useCallback(
        (
            event:
                | MouseEvent
                | React.MouseEvent<HTMLElement>
                | React.TouchEvent<HTMLElement>
        ) => {
            if (!isDragging) return;

            const { x: clientX, y: clientY } = getMouseEventCoordinates(event);
            const dx = clientX - lastMousePosition.current.x;
            const dy = clientY - lastMousePosition.current.y;

            lastMousePosition.current = { x: clientX, y: clientY };
            isClick.current = false;

            editPin(pin.id, (oldPin) => ({
                ...oldPin,
                x: oldPin.x + dx / camera.zoom,
                y: oldPin.y + dy / camera.zoom,
            }));
        },
        [isDragging, editPin, pin.id, camera.zoom]
    );

    const handleEdit = useCallback(() => {
        onEdit(pin);
    }, [onEdit, pin]);

    const handleTryDelete = useCallback(() => {
        onDelete(pin);
    }, [onDelete, pin]);

    useLayoutEffect(() => {
        if (pinRef.current === null) return;
        setPinSize({
            x: pinRef.current.clientWidth,
            y: pinRef.current.clientHeight,
        });
    }, []);

    useLayoutEffect(() => {
        if (popupRef.current === null) return;
        setPopupSize({
            x: popupRef.current.clientWidth,
            y: popupRef.current.clientHeight,
        });
    }, [popupVisible]);

    useEffect(() => {
        if (!isDragging) return;

        document.addEventListener("mousemove", handleMapPinDrag);
        document.addEventListener("mouseup", handleMapPinStopDrag);

        return () => {
            document.removeEventListener("mousemove", handleMapPinDrag);
            document.removeEventListener("mouseup", handleMapPinStopDrag);
        };
    }, [handleMapPinDrag, handleMapPinStopDrag, isDragging]);

    return (
        <>
            <div
                ref={popupRef}
                className={`${styles.popupContainer} ${!popupVisible ? styles.hidden : ""}`}
                style={{ top: popupY, left: popupX }}
                onMouseEnter={() => setPopupHovered(true)}
                onMouseLeave={() => setPopupHovered(false)}
            >
                <div
                    className={`${styles.popup} ${popupAnchorPosition === "bottom" ? styles.anchorBottom : styles.anchorTop}`}
                >
                    <section className={styles.header}>
                        <b>{pin.name}</b>
                        {config.canEdit && !locked && (
                            <div>
                                <button
                                    className={styles.iconButton}
                                    onClick={handleEdit}
                                >
                                    <FontAwesomeIcon icon={faPencil} />
                                </button>
                                <button
                                    className={styles.iconButton}
                                    onClick={handleTryDelete}
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        )}
                    </section>
                    <section className={styles.body}>
                        {pin.description.split("\n\n").map((line, idx) => (
                            <p key={idx}>{line}</p>
                        ))}
                    </section>
                </div>
            </div>
            <div
                ref={pinRef}
                className={`${styles.pin} ${!visible ? styles.hidden : ""}`}
                style={{ top: pinY, left: pinX }}
                onMouseEnter={() => {
                    setPinHovered(true);
                    setPopupVisible(true);
                }}
                onMouseLeave={() => setPinHovered(false)}
                onMouseDown={
                    !locked && config.canEdit
                        ? handleMapPinStartDrag
                        : undefined
                }
                onTouchStart={
                    !locked && config.canEdit
                        ? handleMapPinStartDrag
                        : undefined
                }
                onTouchEnd={handleMapPinStopDrag}
                onTouchMove={handleMapPinDrag}
            >
                <FontAwesomeIcon
                    className={!pin.visible ? styles.transparent : undefined}
                    icon={faLocationDot}
                    stroke="black"
                    strokeWidth={20}
                />
            </div>
        </>
    );
});

MapPinIcon.displayName = "MapPinIcon";
