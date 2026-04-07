import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./MapPin.module.css";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Camera, Vector2 } from "../utils";

export interface MapPinType {
    id: string;
    x: number;
    y: number;
    minZoom?: number;
    maxZoom?: number;
}

function transformCoords(coordinates: Vector2, camera: Camera): Vector2 {
    return {
        x: coordinates.x * camera.zoom + camera.x,
        y: coordinates.y * camera.zoom + camera.y,
    };
}

function anchor(position: Vector2, size: Vector2): Vector2 {
    return {
        x: position.x - size.x / 2,
        y: position.y - size.y,
    };
}

export function MapPin({ pin, camera }: { pin: MapPinType, camera: Camera }) {
    const self = useRef<HTMLDivElement>(null);

    const [selfSize, setSelfSize] = useState<Vector2>({ x: 0, y: 0 });

    const visible = useMemo(() => {
        return (pin.maxZoom === undefined || camera.zoom <= pin.maxZoom) && (pin.minZoom === undefined || camera.zoom <= pin.minZoom);
    }, [pin.minZoom, pin.maxZoom, camera.zoom]);

    const {x, y} = anchor(transformCoords(pin, camera), selfSize);

    useLayoutEffect(() => {
        if (self.current === null) return;
        setSelfSize({ x: self.current.clientWidth, y: self.current.clientHeight });
    }, []);
    
    return (
        <div ref={self} className={`${styles.pin} ${!visible ? styles.hidden : ''}`} style={{ top: y, left: x }} title={pin.id}>
            <FontAwesomeIcon icon={faLocationDot} />
        </div>
    );
}
