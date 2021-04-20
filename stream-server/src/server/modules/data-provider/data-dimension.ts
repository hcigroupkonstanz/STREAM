import * as _ from 'lodash';
import * as moment from 'moment';
import * as d3 from 'd3';
import { DataDimensionDefinition } from './data-dimension-definition';
import { ErrorHandler, Serializable } from '../core';

export class DataDimension extends Serializable {

    private readonly ids: { [id: string]: number } = {};
    private readonly inverseIds: { [id: number]: string } = {};
    private idCounter = 0;

    private min: number;
    private max: number;

    public readonly data: any[] = [];
    public maxAggregation = 0;

    private ticks: { name: string, value: number }[] = [];

    public get column(): string {
        return this.definition.column;
    }



    public constructor(private definition: DataDimensionDefinition, data: any[]) {
        super();
        this.setData(data);
    }


    private setData(data: any[]): void {
        const rawValues: number[] = [];

        for (const d of data) {
            const val = d[this.definition.column];
            rawValues.push(this.transform(val));
            this.data.push(val);
        }

        // min / max
        this.max = Number(_.max(rawValues));
        if (this.definition.treatZeroAsNull) {
            this.min = Number(_(rawValues).filter(x => !!x).min());
        } else {
            this.min = Number(_.min(rawValues));
        }


        if (this.definition.type === 'metric') {
            if (this.definition.min !== undefined) {
                this.min = Number(this.definition.min);
            }

            if (this.definition.max !== undefined) {
                this.max = Number(this.definition.max);
            }
        }

        if (this.definition.type === 'categorical') {
            // pad dimensions so that edge values are visible
            this.min -= 1;
            this.max += 1;
        }

        // ticks
        switch (this.definition.type) {
            case 'categorical':
                if (this.definition.mapping) {
                    // for padding
                    this.ticks.push({
                        name: '',
                        value: 0
                    });

                    for (const key of _.keys(this.definition.mapping)) {
                        this.ticks.push({
                            name: key || '',
                            value: this.normalize(this.definition.mapping[key]) || 0
                        });
                    }

                    // for padding
                    this.ticks.push({
                        name: '',
                        value: 1
                    });
                } else if (this.definition.mappingFn) {
                    this.ticks.push({
                        name: '',
                        value: 0
                    });
                } else if (this.idCounter < 15) {
                    // for padding
                    this.ticks.push({
                        name: '',
                        value: 0
                    });

                    for (let i = 0; i < this.idCounter; i++) {
                        this.ticks.push({
                            name: this.inverseIds[i] || 'Unknown',
                            value: this.normalize(i)
                        });
                    }

                    // for padding
                    this.ticks.push({
                        name: '',
                        value: 1
                    });
                }
                break;


            case 'metric':
                const ticks = d3.scaleLinear()
                    .domain([this.min, this.max])
                    .nice(10)
                    .ticks(10);

                for (const tick of ticks) {
                    this.ticks.push({
                        name: `${tick}`,
                        value: this.normalize(tick, true) || 0
                    });
                }
                break;


            case 'time':
                for (let i = 0; i <= 10; i++) {
                    const tickVal = Math.ceil((i / 10) * (this.max - this.min) + this.min);

                    this.ticks.push({
                        name: moment.unix(tickVal).format(this.definition.format) || '',
                        value: this.normalize(tickVal)
                    });
                }
                break;


            default:
                ErrorHandler.logError(`Unknown type`);
                break;
        }

        if (this.definition.ticks) {
            this.ticks = [];
            for (const tick of this.definition.ticks) {
                this.ticks.push({
                    name: tick.name || '',
                    value: this.normalize(tick.value, true) || 0
                });
            }
        }
    }

    public normalize(val: number | null, forceNotNull = false): number {
        if (val === null || (this.definition.treatZeroAsNull && val === 0 && !forceNotNull)) {
            return null;
        }

        const limitedVal = Math.min(Math.max(this.min, val), this.max);
        return Math.max(0, Math.min((limitedVal - this.min) / (this.max - this.min), 1));
    }

    public transform(val: any): number | null {
        if (val === null) {
            return null;
        }

        if (this.definition.treatZeroAsNull && Number(val) === 0) {
            return null;
        }

        switch (this.definition.type) {
        case 'categorical':
            if (this.definition.mapping) {
                return this.definition.mapping[val];
            } else if (this.definition.mappingFn) {
                return this.definition.mappingFn(val);
            } else {
                // assuming ID column
                if (this.ids[val] === undefined) {
                    this.inverseIds[this.idCounter] = val;
                    this.ids[val] = this.idCounter;
                    this.idCounter++;
                }
                return this.ids[val];
            }

        case 'metric':
            return Number(val);

        case 'time':
            try {
                return moment(val, this.definition.format).unix();
            } catch (e) {
                ErrorHandler.logError(`Unable to parse time ${val} with ${this.definition.format}: ${e.message}`);
                return null;
            }

        default:
            ErrorHandler.logError(`Unknown dimension type`);
            return null;
        }
    }


    public toJson(): any {
        return {
            column: this.definition.column,
            displayName: this.definition.displayName,
            ticks: this.ticks,
            hideTicks: this.definition.hideTicks || false,
            maxAggregation: this.maxAggregation,
            rawValues: this.data
        };
    }
}
