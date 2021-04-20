export type Point = [number, number];
export abstract class PointUtils {
    /**
     * Adds two or more points
     */
    public static add(...points: [number, number][]): Point {
        let x = 0;
        let y = 0;

        points.forEach((p) => {
            x += p[0];
            y += p[1];
        });

        return [x, y];
    }

    /**
     * Subtracts points from firstPoint: firstPoint - point[0] - point[1] ...
     */
    public static sub(firstPoint: Point, ...points: Point[]): Point {
        let x = firstPoint[0];
        let y = firstPoint[1];

        points.forEach((p) => {
            x -= p[0];
            y -= p[1];
        });

        return [x, y];
    }


    /**
     * Divides a point by a number.
     * @returns A new Point instance
     */
    public static divideBy(point: Point, by: number): Point {
        if (by !== 0) {
            return [point[0] / by, point[1] / by];
        } else {
            // not correct, but probably better than exception
            return [0, 0];
        }
    }


    public static multiply(...points: Point[]): Point {
        const result: Point = [1, 1];

        for (const point of points) {
            result[0] = result[0] * point[0];
            result[1] = result[1] * point[1];
        }

        return result;
    }

    public static multiplyNum(point: Point, by: number): Point {
        return [point[0] * by, point[1] * by];
    }

    public static distanceBetween(p1: Point, p2: Point): number {
        return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
    }

    public static isEqual(p1: Point, p2: Point): boolean {
        return p1[0] === p2[0] && p1[1] === p2[1];
    }

    public static isOnLine(point: number[], lineStart: number[], lineEnd: number[]): boolean {
        // see: https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line#Line_defined_by_two_points
        const x0 = point[0];
        const y0 = point[1];
        const x1 = lineStart[0];
        const y1 = lineStart[1];
        const x2 = lineEnd[0];
        const y2 = lineEnd[1];

        const distance = (Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1))
            / Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

        return Math.abs(distance) < 0.001;
    }

    /**
     * Checks if the point is contained inside a given polygon.
     * BoundingRect[0] == topLeft, BoundingRect[1] == bottomRight
     * See http://stackoverflow.com/a/218081/4090817
     */
    public static isInPolygon(p: Point, polygon: Point[], boundingRect: Point[]): boolean {
        if (!PointUtils.isInRectangle(p, boundingRect)) {
            return false;
        }

        let intersections = 0;
        const startPoint: Point = [boundingRect[0][0] - 0.0001, p[1] - 0.0001];
        for (let index = 0; index < polygon.length; index++) {
            if (PointUtils.areIntersecting(polygon[index], polygon[(index + 1) % polygon.length], startPoint, p)) {
                intersections++;
            }
        }

        // tslint:disable-next-line:no-bitwise
        return (intersections & 1) === 1;
    }
    /**
     *  Checks if point is inside given rectangle.
     *  Assuming rectangle[0] == topLeft, rectangle[1] == bottomRight
     */
    public static isInRectangle(p: Point, rectangle: Point[]): boolean {
        return p[0] > rectangle[0][0] && p[0] < rectangle[1][0]
            && p[1] > rectangle[0][1] && p[1] < rectangle[1][1];
    }

    /**
     * Determines if two vectors are intersecting
     */
    private static areIntersecting(v1start: Point, v1end: Point, v2start: Point, v2end: Point): boolean {

        /* Adapted from http://stackoverflow.com/a/218081/4090817 */

        // Convert vector 1 to a line (line 1) of infinite length.
        // We want the line in linear equation standard form: A*x + B*y + C = 0
        // See: http://en.wikipedia.org/wiki/Linear_equation
        const a1 = v1end[1] - v1start[1];
        const b1 = v1start[0] - v1end[0];
        const c1 = (v1end[0] * v1start[1]) - (v1start[0] * v1end[1]);

        // Every point (x,y), that solves the equation above, is on the line,
        // every point that does not solve it, is not. The equation will have a
        // positive result if it is on one side of the line and a negative one
        // if is on the other side of it. We insert (x1,y1) and (x2,y2) of vector
        // 2 into the equation above.
        let d1 = (a1 * v2start[0]) + (b1 * v2start[1]) + c1;
        let d2 = (a1 * v2end[0]) + (b1 * v2end[1]) + c1;

        // If d1 and d2 both have the same sign, they are both on the same side
        // of our line 1 and in that case no intersection is possible. Careful,
        // 0 is a special case, that's why we don't test ">=" and "<=",
        // but "<" and ">".
        if (d1 > 0 && d2 > 0) { return false; }
        if (d1 < 0 && d2 < 0) { return false; }

        // The fact that vector 2 intersected the infinite line 1 above doesn't
        // mean it also intersects the vector 1. Vector 1 is only a subset of that
        // infinite line 1, so it may have intersected that line before the vector
        // started or after it ended. To know for sure, we have to repeat the
        // the same test the other way round. We start by calculating the
        // infinite line 2 in linear equation standard form.
        const a2 = v2end[1] - v2start[1];
        const b2 = v2start[0] - v2end[0];
        const c2 = (v2end[0] * v2start[1]) - (v2start[0] * v2end[1]);

        // Calculate d1 and d2 again, this time using points of vector 1.
        d1 = (a2 * v1start[0]) + (b2 * v1start[1]) + c2;
        d2 = (a2 * v1end[0]) + (b2 * v1end[1]) + c2;

        // Again, if both have the same sign (and neither one is 0),
        // no intersection is possible.
        if (d1 > 0 && d2 > 0) { return false; }
        if (d1 < 0 && d2 < 0) { return false; }

        // If we get here, only two possibilities are left. Either the two
        // vectors intersect in exactly one point or they are collinear, which
        // means they intersect in any number of points from zero to infinite.
        // TODO: not sure how to handle this case
        // if ((a1 * b2) - (a2 * b1) == 0.0f) return COLLINEAR;
        if ((a1 * b2) - (a2 * b1) === 0.0) { return false; }

        // If they are not collinear, they must intersect in exactly one point.
        return true;
    }

    // see: http://www.mathopenref.com/coordpolygonarea2.html
    public static area(path: Point[]): number {
        let area = 0;

        for (let i = 0; i < path.length; i++) {
            const curr = path[i];
            const next = path[(i + 1) % path.length];
            area += (curr[0] + next[0]) * (curr[1] - next[1]);
        }

        return Math.abs(area / 2);
    }

    public static areaOf(path: number[][]): number {
        let area = 0;

        for (let i = 0; i < path.length; i++) {
            const curr = path[i];
            const next = path[(i + 1) % path.length];
            area += (curr[0] + next[0]) * (curr[1] - next[1]);
        }

        return Math.abs(area / 2);
    }
}
