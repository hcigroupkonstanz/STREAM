export interface ColorTable {
    id: number;
    plotIds: number[];
    // [id, r, g, b, a][]
    colors: [number, number, number, number, number][];
    htmlColors: string[];
}
