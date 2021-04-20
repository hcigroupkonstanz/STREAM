import { Point } from './point-utils';
import * as _ from 'lodash';

export class Utils {

    // TODO: suboptimal..
    public static getSecondaryColor(col: string): string {
        switch (col) {
        case '#F44336': // red
            // return '#ef9a9a'; // 200
            return '#e57373'; // 300
        case '#9C27B0': // purple
            // return '#CE93D8'; // 200
            return '#BA68C8'; // 300
        case '#3F51B5': // indigo
            // return '#9FA8DA'; // 200
            return '#7986CB'; // 300
        case '#2196F3': // blue
            // return '#90CAF9'; // 200
            return '#64B5F6'; // 300
        case '#4CAF50': // green
            // return '#A5D6A7'; // 200
            return '#81C784'; // 300
        case '#FFEB3B': // yellow
            // return '#FFF59D'; // 200
            return '#FFF176'; // 300
        case '#FF9800': // orange
            // return '#FFCC80'; // 200
            return '#FFB74D'; // 300
        case '#00BCD4': // cyan
            // return '#80DEEA'; // 200
            return '#4DD0E1'; // 300

        default:
            return '#FFFFFF';
        }
    }



    // see: https://stackoverflow.com/a/2117523/4090817
    public static uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            // tslint:disable-next-line:no-bitwise
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
    }

    public static padLeft(str: string, length: number): string {
        while (str.length < length) {
            str = '0' + str;
        }
        return str;
    }

    public static getBaseUrl() {
        return window.location.href.replace(/\!+/, '').replace(/\#+/, '');
    }

    public static buildBoundingRect(polygon: Point[]): Point[] {
        if (polygon.length === 0) {
            return [[0, 0], [0, 0]];
        }

        const topLeft: Point = [polygon[0][0], polygon[0][1]];
        const bottomRight: Point = [polygon[0][0], polygon[0][1]];

        for (const p of polygon) {
            topLeft[0] = Math.min(topLeft[0], p[0]);
            topLeft[1] = Math.min(topLeft[1], p[1]);
            bottomRight[0] = Math.max(bottomRight[0], p[0]);
            bottomRight[1] = Math.max(bottomRight[1], p[1]);
        }

        return [topLeft, bottomRight];
    }


    public static getGradientColor(gradients: {stop: number, color: string}[], value: number): string {
        const sortedGradients = _.sortBy(gradients, 'stop');

        for (let i = 0; i < sortedGradients.length - 1; i++) {
            const currStop = sortedGradients[i];
            const nextStop = sortedGradients[i + 1];

            if (gradients[i].stop <= value && value <= gradients[i + 1].stop) {
                const range = nextStop.stop - currStop.stop;
                const gradientPos = (value - currStop.stop) / range;
                return Utils.lerpColor(currStop.color, nextStop.color, gradientPos);
            }
        }


        if (value <= 0) {
            return sortedGradients[0].color;
        } else {
            return sortedGradients[sortedGradients.length - 1].color;
        }
    }


    public static lerpColor(col1: string, col2: string, weight: number): string {
        const rgb1 = Utils.hex2rgb(col1);
        const rgb2 = Utils.hex2rgb(col2);

        // let hsv1 = Utils.rgb2hsv(rgb1.r, rgb1.g, rgb1.b);
        // let hsv2 = Utils.rgb2hsv(rgb2.r, rgb2.g, rgb2.b);

        // let resultHsv = {
        //     h: Utils.lerp(hsv1.h, hsv2.h, weight),
        //     s: Utils.lerp(hsv1.s, hsv2.s, weight),
        //     v: Utils.lerp(hsv1.v, hsv2.v, weight),
        // };
        // let resultRgb = Utils.hsv2rgb(resultHsv.h, resultHsv.s, resultHsv.v);
        const resultRgb = {
            r: Math.floor(Utils.lerp(rgb1.r, rgb2.r, weight)),
            g: Math.floor(Utils.lerp(rgb1.g, rgb2.g, weight)),
            b: Math.floor(Utils.lerp(rgb1.b, rgb2.b, weight))
        };

        return Utils.rgbToHex(resultRgb.r, resultRgb.g, resultRgb.b);
    }

    public static lerp(val1: number, val2: number, weight: number): number {
        return val1 + weight * (val2 - val1);
    }


    // adapted from http://stackoverflow.com/a/5624139/4090817
    public static rgbToHex(r, g, b): string {
        return '#' + Utils.componentToHex(r) + Utils.componentToHex(g) + Utils.componentToHex(b);
    }

    // adapted from http://stackoverflow.com/a/5624139/4090817
    public static componentToHex(c): string {
        const hex = c.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }

    // adapted from http://stackoverflow.com/a/5624139/4090817
    public static hex2rgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }



    // adapted from: http://stackoverflow.com/a/8023734/4090817
    public static rgb2hsv(r255, g255, b255) {
        let rr, gg, bb;
        const r = r255 / 255;
        const g = g255 / 255;
        const b = b255 / 255;
        const v = Math.max(r, g, b);
        const diff = v - Math.min(r, g, b);

        let h = 0;
        let s = 0;

        if (diff !== 0) {
            s = diff / v;
            rr = Utils.diffc(v, r, diff);
            gg = Utils.diffc(v, g, diff);
            bb = Utils.diffc(v, b, diff);

            if (r === v) {
                h = bb - gg;
            } else if (g === v) {
                h = (1 / 3) + rr - bb;
            } else if (b === v) {
                h = (2 / 3) + gg - rr;
            }

            if (h < 0) {
                h += 1;
            } else if (h > 1) {
                h -= 1;
            }
        }

        return {
            h: Math.round(h * 360),
            s: s,
            v: v
        };
    }

    private static diffc(v, c, diff) {
        return (v - c) / 6 / diff + 1 / 2;
    }


    // adapted from: https://github.com/tmpvar/hsv2rgb
    private static set(r, g, b, out) {
        out[0] = Math.round(r * 255);
        out[1] = Math.round(g * 255);
        out[2] = Math.round(b * 255);
    }

    // adapted from: https://github.com/tmpvar/hsv2rgb
    public static hsv2rgb(h, s, v) {
        const out = [0, 0, 0];
        h = h % 360;
        s = _.clamp(s, 0, 1);
        v = _.clamp(v, 0, 1);

        // Grey
        if (!s) {
            out[0] = out[1] = out[2] = Math.ceil(v * 255);
        } else {
            const b = ((1 - s) * v);
            const vb = v - b;
            const hm = h % 60;
            // tslint:disable-next-line:no-bitwise
            switch ((h / 60) | 0) {
                case 0: Utils.set(v, vb * h / 60 + b, b, out); break;
                case 1: Utils.set(vb * (60 - hm) / 60 + b, v, b, out); break;
                case 2: Utils.set(b, v, vb * hm / 60 + b, out); break;
                case 3: Utils.set(b, vb * (60 - hm) / 60 + b, v, out); break;
                case 4: Utils.set(vb * hm / 60 + b, b, v, out); break;
                case 5: Utils.set(v, b, vb * (60 - hm) / 60 + b, out); break;
            }
        }

        return {
            r: out[0],
            g: out[1],
            b: out[2]
        };
    }
}
