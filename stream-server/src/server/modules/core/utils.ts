import * as _ from 'lodash';

export interface Color { r: number; g: number; b: number; a: number; }

export class Utils {
    // adapted from: https://stackoverflow.com/a/5624139/4090817
    public static hexToRgb(hex: string): Color {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: 255
        } : { r: 255, g: 255, b: 255, a: 255 };
    }


    public static getGradientColor(gradients: Color[], value: number): Color {
        for (let i = 0; i < gradients.length - 1; i++) {
            const currPercent = i / (gradients.length - 1);
            const nextPercent = (i + 1) / (gradients.length - 1);

            if (currPercent <= value && value <= nextPercent) {
                const gradientPos = (value - currPercent) / (nextPercent - currPercent);
                return Utils.lerpColor(gradients[i], gradients[i + 1], gradientPos);
            }
        }

        return { r: 0, g: 0, b: 0, a: 0 };
    }


    public static lerpColor(col1: Color, col2: Color, weight: number): Color {
        return {
            r: Math.floor(Utils.lerp(col1.r, col2.r, weight)),
            g: Math.floor(Utils.lerp(col1.g, col2.g, weight)),
            b: Math.floor(Utils.lerp(col1.b, col2.b, weight)),
            a: Math.floor(Utils.lerp(col1.a, col2.a, weight))
        };
    }

    public static lerp(val1: number, val2: number, weight: number): number {
        return val1 + weight * (val2 - val1);
    }
}
