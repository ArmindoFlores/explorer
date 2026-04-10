import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { Vector2 } from "../utils";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import styles from "./MapPinIcon.module.css";
import { useMapExplorer } from "./MapExplorerContext";
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line react-refresh/only-export-components
export class MapPin {
    id: string;
    x: number;
    y: number;
    name: string;
    description: string;
    minZoom?: number;
    maxZoom?: number;
    
    constructor(
        x: number,
        y: number,
        id: string | undefined = undefined,
        name: string | undefined = undefined,
        description: string = "Hello world!\n\nWhat is going on?",
        maxZoom: number | undefined = undefined,
        minZoom: number | undefined = undefined
    ) {
        this.id = id ?? uuidv4();
        this.name = name ?? this.id;
        this.description = description;
        this.x = x;
        this.y = y;
        this.maxZoom = maxZoom;
        this.minZoom = minZoom;
    }
};

function anchor(position: Vector2, size: Vector2): Vector2 {
    return {
        x: position.x - size.x / 2,
        y: position.y - size.y,
    };
}

export function MapPinIcon({ pin }: { pin: MapPin }) {
    const pinRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const { $canvasSize, $worldToCanvas, camera } = useMapExplorer();

    const [pinSize, setPinSize] = useState<Vector2>({ x: 0, y: 0 });
    const [popupSize, setPopupSize] = useState<Vector2>({ x: 0, y: 0 });
    const [popupVisible, setPopupVisible] = useState(true);
    const [popupHovered, setPopupHovered] = useState(false);
    const [pinHovered, setPinHovered] = useState(false);

    const pinCanvasPosition = useMemo(() => $worldToCanvas(pin), [$worldToCanvas, pin]);
    const {x: pinX, y: pinY} = useMemo(() => anchor(pinCanvasPosition, pinSize), [pinCanvasPosition, pinSize]);
    const {x: popupX, y: popupY} = useMemo(() => {
        if (pinCanvasPosition.y >= $canvasSize.y / 2) {
            return anchor({ x: pinCanvasPosition.x, y: pinCanvasPosition.y - pinSize.y }, popupSize);
        }
        return anchor({ x: pinCanvasPosition.x, y: pinCanvasPosition.y + pinSize.y }, popupSize);       
    }, [$canvasSize.y, pinCanvasPosition, popupSize, pinSize.y]);

    if (!pinHovered && !popupHovered && popupVisible) {
        setPopupVisible(false);
    }

    const visible = useMemo(() => {
        return (pin.maxZoom === undefined || camera.zoom <= pin.maxZoom) && (pin.minZoom === undefined || camera.zoom <= pin.minZoom);
    }, [pin.minZoom, pin.maxZoom, camera.zoom]);

    useLayoutEffect(() => {
        if (pinRef.current === null) return;
        setPinSize({ x: pinRef.current.clientWidth, y: pinRef.current.clientHeight });
    }, []);

    useLayoutEffect(() => {
        if (popupRef.current === null) return;
        setPopupSize({ x: popupRef.current.clientWidth, y: popupRef.current.clientHeight });
    }, [popupVisible]);
    
    return (
        <>
            <div
                ref={popupRef}
                className={`${styles.popupContainer} ${!popupVisible ? styles.hidden : ''}`}
                style={{ top: popupY, left: popupX }}
                onMouseEnter={() => setPopupHovered(true)}
                onMouseLeave={() => setPopupHovered(false)}
            >
                <div className={styles.popup}>
                    <b>{pin.name}</b>
                    <div>
                        {
                            pin.description.split("\n\n").map((line, idx) => <p key={idx}>{line}</p>)
                        }
                    </div>
                </div>
            </div>
            <div
                ref={pinRef}
                className={`${styles.pin} ${!visible ? styles.hidden : ''}`}
                style={{ top: pinY, left: pinX }}
                onMouseEnter={() => { setPinHovered(true); setPopupVisible(true); }}
                onMouseLeave={() => setPinHovered(false)}
            >
                <FontAwesomeIcon icon={faLocationDot} />
            </div>
        </>
    );
}
