export interface Tracker {
    id: number;
    hardwareId: number;
    name: string;
    position: [number, number, number];
    rotation: [number, number, number, number];
    isActive: boolean;
}
