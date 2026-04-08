export interface Vector2 {
    x: number;
    y: number;
}

export interface Camera extends Vector2 {
    zoom: number;
}

export function squaredDistance(v1: Vector2, v2: Vector2): number {
    return Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2);
}

export function distance(v1: Vector2, v2: Vector2): number {
    return Math.sqrt(squaredDistance(v1, v2));
}
