import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./MapPinIcon.module.css";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Vector2 } from "../utils";
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line react-refresh/only-export-components
export class MapPin {
    id: string;
    x: number;
    y: number;
    minZoom?: number;
    maxZoom?: number;
    
    constructor(x: number, y: number, id: string | undefined = undefined, maxZoom: number | undefined = undefined, minZoom: number | undefined = undefined) {
        this.id = id ?? uuidv4();
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

export function MapPinIcon({ pin, worldToCanvas, zoom }: { pin: MapPin, worldToCanvas: (coords: Vector2) => Vector2, zoom: number }) {
    const self = useRef<HTMLDivElement>(null);

    const [selfSize, setSelfSize] = useState<Vector2>({ x: 0, y: 0 });

    const {x, y} = useMemo(() => anchor(worldToCanvas(pin), selfSize), [worldToCanvas, pin, selfSize]);

    const visible = useMemo(() => {
        return (pin.maxZoom === undefined || zoom <= pin.maxZoom) && (pin.minZoom === undefined || zoom <= pin.minZoom);
    }, [pin.minZoom, pin.maxZoom, zoom]);


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
