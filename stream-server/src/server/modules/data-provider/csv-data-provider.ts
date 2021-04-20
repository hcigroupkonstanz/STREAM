import { AggregationDefinition } from './aggregation-definition';
import * as _ from 'lodash';
import * as fs from 'fs';
import { DataDimensionDefinition } from './data-dimension-definition';
import { DataProvider } from './data-provider';
import { Parser } from 'csv-parse';


export interface CsvConfig {
    file: string;
    delimiter: string;
}

export class CsvDataProvder extends DataProvider {
    public serviceName = 'CsvDataProvider';
    public groupName = 'data';

    public constructor(private csvConfig: CsvConfig, private dimensionDefinitions: DataDimensionDefinition[], aggregationDefinitions: AggregationDefinition[]) {
        super(dimensionDefinitions, aggregationDefinitions);
    }

    public init(): void {
        // see http://csv.adaltas.com/parse/
        const parser = new Parser({
            auto_parse: true,
            auto_parse_date: true,
            delimiter: this.csvConfig.delimiter
        });


        let dataCounter = 1;

        parser.on('readable', () => {
            let columns: any;
            let isFirst = true;
            const csvDims: string[] = [];
            const definedDims: string[] = [];

            while (columns = parser.read()) {

                // first line should contain dimension names
                if (isFirst) {
                    for (const dim of columns) {
                        csvDims.push(dim);
                        if (_.find(this.dimensionDefinitions, { column: dim })) {
                            definedDims.push(dim);
                        }
                    }

                    if (definedDims.length !== this.dimensionDefinitions.length) {
                        this.logError(`Tried to load ${this.dimensionDefinitions.length} dimensions, but found ${definedDims.length}!`);
                    }

                    isFirst = false;
                } else {
                    const data: any = { id: dataCounter };

                    for (let i = 0; i < columns.length; i++) {
                        const dimIndex = definedDims.indexOf(csvDims[i]);
                        if (dimIndex >= 0) {
                            data[definedDims[dimIndex]] = columns[i];
                        }
                    }

                    this.addData(data);
                    dataCounter++;
                }
            }
        });

        parser.on('error', (err) => {
            this.logError(err.message);
        });

        parser.on('finish', () => {
            this.logDebug(`Loaded ${dataCounter} rows from CSV file`);
            this.initialized.next(true);
        });


        fs.readFile(this.csvConfig.file, 'utf8', (err, content) => {
            if (err) {
                this.logError(err.message);
            } else {
                this.logInfo(`Loading CSV content from ${this.csvConfig.file}`);
                parser.write(content);
            }
            parser.end();
        });
    }
}
