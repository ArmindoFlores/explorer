export interface Vector2 {
    x: number;
    y: number;
}

export interface Camera extends Vector2 {
    zoom: number;
}

type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function squaredDistance(v1: Vector2, v2: Vector2): number {
    return Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2);
}

export function distance(v1: Vector2, v2: Vector2): number {
    return Math.sqrt(squaredDistance(v1, v2));
}

function isPlainObject(val: unknown): val is object {
    return typeof val === "object" && val !== null && !Array.isArray(val);
}

export function deepMerge<T extends object>(defaults: T, overrides: DeepPartial<T>): T {
    const result = {...defaults};

    for (const key in overrides) {
        const overrideValue = overrides[key];
        const defaultValue = result[key];

        if (isPlainObject(overrideValue) && isPlainObject(defaultValue)) {
            result[key] = deepMerge(defaultValue, overrideValue);
        } else if (overrideValue !== undefined) {
            result[key] = overrideValue as T[typeof key];
        }
    }

    return result;
}

function getNativeEvent(event: Event | React.SyntheticEvent): Event {
    if ((event as React.SyntheticEvent).nativeEvent !== undefined) {
        return (event as React.SyntheticEvent).nativeEvent;
    }
    return event as Event;
}

function isMouseEvent(event: MouseEvent | TouchEvent): event is MouseEvent {
    return (event as MouseEvent).clientX !== undefined && (event as MouseEvent).clientY !== undefined;
}

export function getMouseEventCoordinates<E extends HTMLElement>(event: MouseEvent | React.MouseEvent<E> | React.TouchEvent<E>): Vector2 {
    const nativeEvent = getNativeEvent(event) as MouseEvent | TouchEvent;

    if (isMouseEvent(nativeEvent)) {
        return { x: nativeEvent.clientX, y: nativeEvent.clientY };
    }
    if (nativeEvent.type === "touchend") {
        return {
            x: nativeEvent.changedTouches[0].clientX,
            y: nativeEvent.changedTouches[0].clientY
        };
    }
    return {
        x: nativeEvent.touches[0].clientX,
        y: nativeEvent.touches[0].clientY
    };
}
